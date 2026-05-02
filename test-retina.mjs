import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 }); // Simulate Retina display!
    
    console.log('Navigating to Google...');
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    console.log('Injecting html-to-image...');
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.js' });

    console.log('Executing capture tests...');
    const result = await page.evaluate(async () => {
        const searchBar = document.querySelector('textarea, input[type="text"]').closest('div[jsname]') || document.querySelector('form');
        const rect = searchBar.getBoundingClientRect();
        
        // Test 1: Forced dimensions
        const c1 = await window.htmlToImage.toCanvas(searchBar, {
            width: rect.width,
            height: rect.height,
            pixelRatio: 1, // forced 1
            style: { width: rect.width + 'px', height: rect.height + 'px', transform: 'none' }
        });

        // Test 2: Native pixelRatio without forced dimensions
        const c2 = await window.htmlToImage.toCanvas(searchBar, {
            width: rect.width,
            height: rect.height,
            pixelRatio: window.devicePixelRatio,
            style: { transform: 'none' }
        });

        return {
            rect: { w: rect.width, h: rect.height },
            t1: { w: c1.width, h: c1.height, pixelRatio: window.devicePixelRatio },
            t2: { w: c2.width, h: c2.height }
        };
    });

    console.log(result);
    await browser.close();
})();
