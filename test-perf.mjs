import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });
    
    console.log("Measuring html2canvas performance on Google Logo...");
    
    const results = await page.evaluate(async () => {
        const logo = document.querySelector('.lnXdpd, [alt="Google"], img[src*="googlelogo"]');
        if (!logo) return { error: 'Logo not found' };
        
        const start = performance.now();
        
        try {
            await html2canvas(logo, {
                backgroundColor: null,
                scale: 1,
                ignoreElements: (node) => {
                    if (!node || !node.tagName) return false;
                    const tag = node.tagName.toUpperCase();
                    if (tag === 'IFRAME' || tag === 'SCRIPT' || tag === 'NOSCRIPT' || tag === 'VIDEO' || tag === 'OBJECT' || tag === 'EMBED' || tag === 'FOREIGNOBJECT' || tag === 'IMAGE') {
                        return true;
                    }
                    return false;
                }
            });
            const end = performance.now();
            return { timeMs: end - start, success: true };
        } catch (e) {
            return { error: e.message, timeMs: performance.now() - start };
        }
    });
    
    console.log("With SVG allowed:", results);
    
    const resultsWithoutSVG = await page.evaluate(async () => {
        const logo = document.querySelector('.lnXdpd, [alt="Google"], img[src*="googlelogo"]');
        if (!logo) return { error: 'Logo not found' };
        
        const start = performance.now();
        
        try {
            await html2canvas(logo, {
                backgroundColor: null,
                scale: 1,
                ignoreElements: (node) => {
                    // simulate the old ignore logic
                    // if (node === logo) return false; // DON'T add this, just use old logic
                    
                    if (!node || !node.tagName) return false;
                    const tag = node.tagName.toUpperCase();
                    if (tag === 'IFRAME' || tag === 'SCRIPT' || tag === 'NOSCRIPT' || tag === 'VIDEO' || tag === 'SVG' || tag === 'PATH' || tag === 'OBJECT' || tag === 'EMBED') {
                        return true;
                    }
                    return false;
                }
            });
            const end = performance.now();
            return { timeMs: end - start, success: true };
        } catch (e) {
            return { error: e.message, timeMs: performance.now() - start };
        }
    });
    
    console.log("With SVG blocked:", resultsWithoutSVG);
    
    await browser.close();
})();
