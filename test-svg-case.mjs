import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    const results = await page.evaluate(() => {
        const centerEls = document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 3);
        const svg = centerEls.find(e => e.tagName.toLowerCase() === 'svg');
        if (!svg) return "no svg found";
        return {
            tagName: svg.tagName,
            isAtomicTag: ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'IMG', 'CANVAS', 'VIDEO', 'SVG', 'A', 'LABEL'].includes(svg.tagName)
        };
    });

    console.log("SVG eval:", JSON.stringify(results, null, 2));

    await browser.close();
})();
