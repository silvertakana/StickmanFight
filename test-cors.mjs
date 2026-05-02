import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });
    
    const results = await page.evaluate(async () => {
        const target = document.querySelector('div.RNNXgb'); 
        
        const start = performance.now();
        await html2canvas(target, { useCORS: true, scale: 1 });
        const time1 = performance.now() - start;
        
        const start2 = performance.now();
        await html2canvas(target, { useCORS: false, scale: 1 });
        const time2 = performance.now() - start2;
        
        return { withCORS: time1, withoutCORS: time2 };
    });
    
    console.log(results);
    await browser.close();
})();
