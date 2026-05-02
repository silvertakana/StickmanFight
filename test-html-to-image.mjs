import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Navigating to Google...');
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    console.log('Injecting html-to-image...');
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.js' });

    console.log('Executing capture...');
    const result = await page.evaluate(async () => {
        // Find the search bar form or input wrapper
        const searchBar = document.querySelector('textarea, input[type="text"]').closest('div[jsname]') || document.querySelector('form');
        if (!searchBar) throw new Error('Search bar not found');

        const rect = searchBar.getBoundingClientRect();
        
        console.log(`Original rect: width=${rect.width}, height=${rect.height}`);

        const canvas = await window.htmlToImage.toCanvas(searchBar, {
            width: rect.width,
            height: rect.height,
            pixelRatio: window.devicePixelRatio || 1,
            skipFonts: false,
            style: {
                margin: '0',
                top: '0',
                left: '0',
                width: rect.width + 'px',
                height: rect.height + 'px',
                boxSizing: 'border-box',
                transform: 'none'
            }
        });

        return {
            originalWidth: rect.width,
            originalHeight: rect.height,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            dataUrl: canvas.toDataURL('image/png')
        };
    });

    console.log(`Capture complete!`);
    console.log(`Target Rect: ${result.originalWidth}x${result.originalHeight}`);
    console.log(`Canvas Size: ${result.canvasWidth}x${result.canvasHeight}`);

    const base64 = result.dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync('debug-search-bar.png', Buffer.from(base64, 'base64'));
    console.log('Saved generated image to debug-search-bar.png');

    await browser.close();
})();
