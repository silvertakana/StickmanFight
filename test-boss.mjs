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
    const extensionId = swTarget.url().split('/')[2];
    console.log(`Extension ID: ${extensionId}`);

    // Navigate to test page
    const pages = await browser.pages();
    const page = pages[0];
    await page.setViewport({ width: 1280, height: 800 });

    // Capture ALL console logs from the page
    const logs = [];
    page.on('console', msg => {
        logs.push(msg.text());
        if (msg.text().includes('[StickmanFight]')) {
            console.log(`[PAGE] ${msg.text()}`);
        }
    });
    page.on('pageerror', err => console.error(`[PAGE ERROR] ${err.message}`));

    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    // Toggle the game via the service worker
    const swWorker = await swTarget.worker();
    await swWorker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) await chrome.tabs.sendMessage(tab.id, { action: 'toggle-game' });
    });

    console.log('Game toggled, waiting for initialization...');
    // Wait for game to initialize and boss to spawn
    await new Promise(r => setTimeout(r, 5000));

    // Verify game started
    const hostExists = await page.evaluate(() => !!document.getElementById('stickman-fight-host'));
    console.log(`Game running: ${hostExists}`);

    // Verify boss spawned
    const bossSpawned = logs.some(l => l.includes('Boss spawned'));
    console.log(`Boss spawned: ${bossSpawned}`);
    
    // Dump logs
    console.log('--- LOGS ---');
    logs.filter(l => l.includes('[StickmanFight]')).forEach(l => console.log(l));

    await browser.close();
})();
