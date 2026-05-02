import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });
    
    const result = await page.evaluate(async () => {
        // Find the visible search bar
        const btn = document.querySelector('textarea') || document.querySelector('input[type="text"]');
        
        if (!btn) return { error: "Element not found" };
        
        const rect = btn.getBoundingClientRect();
        
        const captureId = '12345';
        btn.dataset.stickmanCaptureId = captureId;
        btn.style.opacity = '0'; // Hide it!
        
        const canvas = await html2canvas(btn, {
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
            height: canvas.height,
            rectWidth: rect.width
        };
    });
    
    console.log("Result on Google (textarea):", result);
    await browser.close();
})();
