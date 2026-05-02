import puppeteer from 'puppeteer';
import path from 'path';

(async () => {
    const extensionPath = path.resolve('dist');

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--no-first-run',
            '--no-default-browser-check'
        ]
    });

    try {
        await new Promise(r => setTimeout(r, 2000));

        const targets = await browser.targets();
        const swTarget = targets.find(t => t.type() === 'service_worker');
        if (!swTarget) { console.error('No SW found'); return; }

        const pages = await browser.pages();
        const page = pages[0];
        await page.setViewport({ width: 1280, height: 800 });

        // Go to a simple page where we can interact with elements
        await page.goto('https://example.com', { waitUntil: 'networkidle2' });

        const swWorker = await swTarget.worker();
        await swWorker.evaluate(async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) await chrome.tabs.sendMessage(tab.id, { action: 'toggle-game' });
        });

        await new Promise(r => setTimeout(r, 5000)); // wait for init

        // Find the "More information..." link to click and turn into a physics object
        const linkRect = await page.evaluate(() => {
            const el = document.querySelector('a');
            if (el) {
                const rect = el.getBoundingClientRect();
                return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }
            return null;
        });

        if (!linkRect) {
            console.error('Could not find link to click');
            return;
        }

        console.log(`Clicking element at ${linkRect.x}, ${linkRect.y} to convert to physics...`);
        
        // Wait a bit, then click the link so it turns into a block
        await page.mouse.click(linkRect.x, linkRect.y);
        
        // Wait for it to fall
        await new Promise(r => setTimeout(r, 1000));

        // Now test jumping
        console.log('Testing jump by pressing W multiple times...');
        await page.keyboard.press('KeyW');
        await new Promise(r => setTimeout(r, 500));
        await page.keyboard.press('KeyW'); // Should not jump again if fixed, but will jump if bugged
        await new Promise(r => setTimeout(r, 500));
        await page.keyboard.press('KeyW'); // Third jump?
        await new Promise(r => setTimeout(r, 500));

        console.log('Test completed. Watch the browser to see if the stickman keeps jumping mid-air.');
        // Wait a few seconds for visual verification
        await new Promise(r => setTimeout(r, 3000));
    } finally {
        await browser.close();
    }
})();
