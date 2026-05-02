import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });
    
    const dataUrl = await page.evaluate(async () => {
        const searchBoxWrapper = document.querySelector('div.RNNXgb');
        
        const canvas = await html2canvas(searchBoxWrapper, {
            backgroundColor: null,
            scale: 1,
            ignoreElements: (node) => {
                if (!node || !node.tagName) return false;
                const tag = node.tagName.toUpperCase();
                if (tag === 'IFRAME' || tag === 'SCRIPT' || tag === 'NOSCRIPT' || tag === 'VIDEO' || tag === 'SVG' || tag === 'PATH' || tag === 'OBJECT' || tag === 'EMBED') {
                    return true;
                }
                return false;
            }
        });
        
        return canvas.toDataURL('image/png');
    });
    
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync("search_bar.png", base64Data, 'base64');
    
    // Also capture the Google Logo
    const logoDataUrl = await page.evaluate(async () => {
        const logo = document.querySelector('.lnXdpd, [alt="Google"], img[src*="googlelogo"]');
        if (!logo) return null;
        
        const canvas = await html2canvas(logo, {
            backgroundColor: null,
            scale: 1,
            ignoreElements: (node) => {
                if (!node || !node.tagName) return false;
                const tag = node.tagName.toUpperCase();
                if (tag === 'IFRAME' || tag === 'SCRIPT' || tag === 'NOSCRIPT' || tag === 'VIDEO' || tag === 'SVG' || tag === 'PATH' || tag === 'OBJECT' || tag === 'EMBED') {
                    return true;
                }
                return false;
            }
        });
        
        return canvas.toDataURL('image/png');
    });
    
    if (logoDataUrl) {
        const logoBase64 = logoDataUrl.replace(/^data:image\/png;base64,/, "");
        fs.writeFileSync("google_logo.png", logoBase64, 'base64');
    }
    
    console.log("Images saved!");
    
    await browser.close();
})();
