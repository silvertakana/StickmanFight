import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });
    
    const result = await page.evaluate(async () => {
        const btn = document.querySelector('div.RNNXgb');
        
        if (!btn) return { error: "Element not found" };
        
        const canvas = await html2canvas(btn);
        
        return {
            width: canvas.width,
            height: canvas.height
        };
    });
    
    console.log("Result on Google (no opacity hide):", result);
    await browser.close();
})();
