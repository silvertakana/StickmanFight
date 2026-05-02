import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.setContent(`
        <html>
            <body>
                <button id="my-button" style="background: red; padding: 20px; color: white;">Smash Me</button>
            </body>
        </html>
    `);
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });
    
    const result = await page.evaluate(async () => {
        const btn = document.getElementById('my-button');
        
        // Mark and hide
        const captureId = '123';
        btn.dataset.stickmanCaptureId = captureId;
        btn.style.opacity = '0';
        
        // Capture
        const canvas = await html2canvas(btn, {
            onclone: (clonedDoc) => {
                const clonedEl = clonedDoc.querySelector(`[data-stickman-capture-id="${captureId}"]`);
                if (clonedEl) {
                    clonedEl.style.opacity = '1';
                }
            }
        });
        
        // Check if canvas is completely empty/transparent
        const ctx = canvas.getContext('2d');
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let hasPixels = false;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 0) {
                hasPixels = true;
                break;
            }
        }
        
        return {
            hasPixels,
            width: canvas.width,
            height: canvas.height
        };
    });
    
    console.log("Result:", result);
    await browser.close();
})();
