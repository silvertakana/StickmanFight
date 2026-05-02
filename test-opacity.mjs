import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });
    
    const result = await page.evaluate(async () => {
        const btn = document.querySelector('input[type="submit"]') || document.querySelector('button') || document.querySelector('div.RNNXgb');
        
        const originalOpacity = window.getComputedStyle(btn).opacity;
        
        // Mark and hide
        const captureId = '12345';
        btn.dataset.stickmanCaptureId = captureId;
        
        // Hide it in a way that maybe html2canvas doesn't care about?
        // Wait, what if we use opacity: 0.01?
        btn.style.opacity = '0';
        
        const canvas = await html2canvas(btn, {
            onclone: (clonedDoc) => {
                const clonedEl = clonedDoc.querySelector(`[data-stickman-capture-id="${captureId}"]`);
                if (clonedEl) {
                    clonedEl.style.opacity = '1';
                    clonedEl.style.visibility = 'visible';
                    clonedEl.style.display = 'block';
                }
            }
        });
        
        return {
            originalOpacity,
            computedOpacityAfterHide: window.getComputedStyle(btn).opacity,
            width: canvas.width,
            height: canvas.height
        };
    });
    
    console.log("Result on Google:", result);
    await browser.close();
})();
