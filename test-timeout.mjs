import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });
    
    const results = await page.evaluate(async () => {
        const el = document.querySelector('div.RNNXgb'); 
        
        const start1 = performance.now();
        await html2canvas(el, { imageTimeout: 0, scale: 1 });
        const time1 = performance.now() - start1;
        
        const start2 = performance.now();
        await html2canvas(el, { imageTimeout: 500, scale: 1 });
        const time2 = performance.now() - start2;
        
        const start3 = performance.now();
        await html2canvas(el, { imageTimeout: 15000, scale: 1 });
        const time3 = performance.now() - start3;
        
        return { timeout0: time1, timeout500: time2, timeout15000: time3 };
    });
    
    console.log(results);
    await browser.close();
})();
