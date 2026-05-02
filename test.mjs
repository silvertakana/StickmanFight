import puppeteer from 'puppeteer';
import path from 'path';

(async () => {
    const extensionPath = path.resolve('C:/dev/StickmanFight/dist');
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`
        ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    page.on('console', msg => console.log(`[PAGE] ${msg.text()}`));
    
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    
    // Inject script to start game directly
    await page.evaluate(() => {
        window.postMessage({ type: 'STICKMAN_TOGGLE' }, '*');
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Inject script to bypass chrome commands and just call startGame
    await page.evaluate(async () => {
        // We can just import it dynamically from the extension context!
        // But easier: trigger it if the game hasn't started.
        if (!window.__stickmanGameInstance) {
            console.log("Game not started! Finding content script...");
            // Simulate receiving the message from background
            window.dispatchEvent(new CustomEvent('toggle-stickman-game')); // wait we don't have this
        }
    });
    
    await browser.close();
})();
