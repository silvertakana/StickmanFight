import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });
    
    console.log("Measuring html2canvas performance on Search Bar...");
    
    const results = await page.evaluate(async () => {
        const searchBox = document.querySelector('div.RNNXgb');
        if (!searchBox) return { error: 'Search box not found' };
        
        const start = performance.now();
        
        try {
            await html2canvas(searchBox, {
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
    
    console.log("Search Bar capture:", results);
    
    await browser.close();
})();
