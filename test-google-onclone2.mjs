import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });
    
    const result = await page.evaluate(async () => {
        const btn = document.querySelector('input[type="submit"]') || document.querySelector('button') || document.querySelector('div.RNNXgb');
        
        if (!btn) return { error: "Element not found" };
        
        const rect = btn.getBoundingClientRect();
        
        // Mark and hide
        const captureId = '12345';
        btn.dataset.stickmanCaptureId = captureId;
        btn.style.opacity = '0';
        
        // Capture
        const canvas = await html2canvas(btn, {
            width: rect.width,
            height: rect.height,
            onclone: (clonedDoc) => {
                const clonedEl = clonedDoc.querySelector(`[data-stickman-capture-id="${captureId}"]`);
                if (clonedEl) {
                    clonedEl.style.opacity = '1';
                }
            }
        });
        
        const ctx = canvas.getContext('2d');
        let hasPixels = false;
        if (canvas.width > 0 && canvas.height > 0) {
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] > 0) {
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
    
    console.log("Result on Google:", result);
    await browser.close();
})();
