import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });
    
    const results = await page.evaluate(async () => {
        const elements = document.querySelectorAll('div, a, span, input, button');
        const timings = [];
        let totalTime = 0;
        
        // Pick 10 random elements to test
        const testElements = Array.from(elements).sort(() => 0.5 - Math.random()).slice(0, 10);
        
        for (let i = 0; i < testElements.length; i++) {
            const el = testElements[i];
            const start = performance.now();
            
            try {
                await html2canvas(el, {
                    backgroundColor: null,
                    scale: 1,
                    logging: false,
                    useCORS: true,
                    imageTimeout: 500,
                    ignoreElements: (node) => {
                        if (!node || !node.tagName) return false;
                        const tag = node.tagName.toUpperCase();
                        if (tag === 'IFRAME' || tag === 'SCRIPT' || tag === 'NOSCRIPT' || tag === 'VIDEO' || tag === 'SVG' || tag === 'PATH' || tag === 'OBJECT' || tag === 'EMBED') {
                            return true;
                        }
                        return false;
                    }
                });
            } catch (e) {
                // Ignore
            }
            
            const time = performance.now() - start;
            timings.push({ tag: el.tagName, classes: el.className, timeMs: time });
            totalTime += time;
        }
        
        return { timings, totalTime, avgTime: totalTime / testElements.length };
    });
    
    console.log(JSON.stringify(results, null, 2));
    
    await browser.close();
})();
