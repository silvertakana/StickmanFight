import puppeteer from 'puppeteer';
import path from 'path';

(async () => {
    const extensionPath = path.resolve('C:/dev/StickmanFight/dist');

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

    const targets = await browser.targets();
    const swTarget = targets.find(t => t.type() === 'service_worker');
    if (!swTarget) { console.error('No SW found'); await browser.close(); return; }
    
    const pages = await browser.pages();
    const page = pages[0];
    await page.setViewport({ width: 1280, height: 800 });

    const logs = [];
    page.on('console', msg => {
        logs.push(msg.text());
        console.log(`[PAGE CONSOLE] ${msg.text()}`);
    });
    page.on('pageerror', err => console.error(`[PAGE ERROR] ${err.message}`));

    // Go to google to see if CSP blocks fonts
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    const swWorker = await swTarget.worker();
    await swWorker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) await chrome.tabs.sendMessage(tab.id, { action: 'toggle-game' });
    });

    await new Promise(r => setTimeout(r, 3000));
    
    await browser.close();
})();
