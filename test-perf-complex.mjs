import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://en.wikipedia.org/wiki/Main_Page', { waitUntil: 'networkidle2' });
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });
    
    console.log("Measuring html2canvas performance on a complex page...");
    
    const results = await page.evaluate(async () => {
        const target = document.querySelector('#mp-tfa'); // Today's featured article
        if (!target) return { error: 'Target not found' };
        
        const start = performance.now();
        const canvas1 = await html2canvas(target, {
            backgroundColor: null,
            scale: 1,
            logging: false,
        });
        const time1 = performance.now() - start;
        
        const start2 = performance.now();
        const canvas2 = await html2canvas(target, {
            backgroundColor: null,
            scale: 1,
            logging: false,
            ignoreElements: (node) => {
                if (node === target) return false;
                // Ignore elements that are not ancestors or descendants of target
                // Node.compareDocumentPosition:
                // 8 = target contains node (node is descendant)
                // 16 = node contains target (node is ancestor)
                const pos = target.compareDocumentPosition(node);
                const isDescendant = (pos & Node.DOCUMENT_POSITION_CONTAINED_BY);
                const isAncestor = (pos & Node.DOCUMENT_POSITION_CONTAINS);
                
                if (!isDescendant && !isAncestor && node !== document.body && node !== document.documentElement) {
                    // It's a sibling or elsewhere. If we ignore it, does it break?
                    // Let's test ignoring all SCRIPT, LINK, STYLE, SVG, etc
                }
                
                // standard ignore
                if (!node || !node.tagName) return false;
                const tag = node.tagName.toUpperCase();
                if (tag === 'IFRAME' || tag === 'SCRIPT' || tag === 'NOSCRIPT' || tag === 'VIDEO' || tag === 'SVG' || tag === 'PATH' || tag === 'OBJECT' || tag === 'EMBED') {
                    return true;
                }
                return false;
            }
        });
        const time2 = performance.now() - start2;
        
        return {
            normalTime: time1,
            ignoredTime: time2,
            normalData: canvas1.toDataURL().substring(0, 50),
            ignoredData: canvas2.toDataURL().substring(0, 50)
        };
    });
    
    console.log(results);
    
    await browser.close();
})();
