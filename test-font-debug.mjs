import puppeteer from 'puppeteer';
import path from 'path';

(async () => {
    const extensionPath = path.resolve('C:/dev/StickmanFight/dist');

    // MUST use headless: false — extensions require full Chrome
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--no-first-run',
            '--no-default-browser-check'
        ]
    });

    await new Promise(r => setTimeout(r, 2000));

    // Find the extension's service worker to get its ID
    const targets = await browser.targets();
    const swTarget = targets.find(t => t.type() === 'service_worker');
    if (!swTarget) { console.error('No SW found'); await browser.close(); return; }
    
    // Navigate to test page
    const pages = await browser.pages();
    const page = pages[0];
    await page.setViewport({ width: 1280, height: 800 });

    // Capture ALL console logs from the page
    page.on('console', msg => {
        console.log(`[PAGE CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
    });
    page.on('pageerror', err => console.error(`[PAGE ERROR] ${err.message}`));
    
    // Track network requests to see if the TTF is loaded
    page.on('response', response => {
        const url = response.url();
        if (url.includes('.ttf') || url.includes('font')) {
            console.log(`[NETWORK] ${response.status()} ${url}`);
        }
    });

    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    // Toggle the game via the service worker
    const swWorker = await swTarget.worker();
    await swWorker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) await chrome.tabs.sendMessage(tab.id, { action: 'toggle-game' });
    });

    // Wait for game to initialize and assets to load
    await new Promise(r => setTimeout(r, 5000));

    // Trigger player death to show Game Over
    await page.evaluate(() => {
        if (window.__stickmanGameInstance) {
            const scene = window.__stickmanGameInstance.scene.scenes[0];
            if (scene && scene.player) {
                scene.player.die();
                console.log('Forced player death');
            }
        }
    });

    await new Promise(r => setTimeout(r, 4000));

    // Check if the font was actually added to document.fonts
    const fontInfo = await page.evaluate(() => {
        let loadedFonts = [];
        document.fonts.forEach(f => loadedFonts.push(`${f.family} ${f.weight} ${f.status}`));
        return loadedFonts;
    });
    
    console.log('[FONTS] Fonts in document.fonts:');
    console.log(fontInfo);

    // Take screenshot of the game over text
    await page.screenshot({ path: 'debug-gameover-font.png' });
    console.log('Saved debug-gameover-font.png');

    await browser.close();
})();
