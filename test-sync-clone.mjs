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
        
        // 1. Start html2canvas
        const promise = html2canvas(btn);
        
        // 2. Hide immediately after calling it
        btn.style.opacity = '0';
        
        // 3. Await the promise
        const canvas = await promise;
        
        const ctx = canvas.getContext('2d');
        let hasPixels = false;
        if (canvas.width > 0 && canvas.height > 0) {
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] > 10) {
                    hasPixels = true;
                    break;
                }
            }
        }
        
        return {
            hasPixels,
            width: canvas.width,
            height: canvas.height
        };
    });
    
    console.log("Result of synchronous hide:", result);
    await browser.close();
})();
