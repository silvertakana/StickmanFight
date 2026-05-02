import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    
    // Go to Google
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    
    // Inject html2canvas script from a CDN
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });
    
    // Run html2canvas on the search bar
    const results = await page.evaluate(async () => {
        const searchBoxWrapper = document.querySelector('div.RNNXgb');
        
        if (!searchBoxWrapper) return { error: 'No search box wrapper found' };
        
        try {
            const canvas = await html2canvas(searchBoxWrapper, {
                backgroundColor: null,
                scale: 1,
                logging: true,
                useCORS: true,
                ignoreElements: (node) => {
                    if (!node || !node.tagName) return false;
                    const tag = node.tagName.toUpperCase();
                    if (tag === 'IFRAME' || tag === 'SCRIPT' || tag === 'NOSCRIPT' || tag === 'VIDEO' || tag === 'SVG' || tag === 'PATH' || tag === 'OBJECT' || tag === 'EMBED') {
                        return true;
                    }
                    return false;
                }
            });
            
            return {
                width: canvas.width,
                height: canvas.height,
                dataUrl: canvas.toDataURL('image/png').substring(0, 50) + '...'
            };
        } catch (e) {
            return { error: e.message };
        }
    });
    
    console.log("Search Bar Capture:", results);
    
    await browser.close();
})();
