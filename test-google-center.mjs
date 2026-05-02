import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    const results = await page.evaluate(() => {
        const centerEls = document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 3);
        return centerEls.map(el => ({
            tag: el.tagName,
            id: el.id,
            className: el.className,
            src: el.src,
            alt: el.alt,
            styleImg: window.getComputedStyle(el).backgroundImage,
            text: el.innerText ? el.innerText.substring(0, 20) : ''
        }));
    });

    console.log("Elements at center of screen:", JSON.stringify(results, null, 2));

    await browser.close();
})();
