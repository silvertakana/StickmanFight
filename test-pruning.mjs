import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });
    
    const results = await page.evaluate(async () => {
        const target = document.querySelector('div.RNNXgb'); 
        
        // Inject 20k garbage nodes as siblings to document.body
        const container = document.createElement('div');
        for (let i = 0; i < 20000; i++) {
            const child = document.createElement('div');
            child.innerHTML = '<span>Test</span>';
            container.appendChild(child);
        }
        document.body.appendChild(container);
        
        const start1 = performance.now();
        const canvas1 = await html2canvas(target, { scale: 1 });
        const time1 = performance.now() - start1;
        
        const start2 = performance.now();
        const canvas2 = await html2canvas(target, { 
            scale: 1,
            ignoreElements: (node) => {
                // Keep target, ancestors, and descendants. Ignore everything else!
                if (node === target || node === document.body || node === document.documentElement) return false;
                if (!node || !node.tagName) return false;
                
                const pos = target.compareDocumentPosition(node);
                const isDescendant = (pos & Node.DOCUMENT_POSITION_CONTAINED_BY);
                const isAncestor = (pos & Node.DOCUMENT_POSITION_CONTAINS);
                
                if (!isDescendant && !isAncestor) {
                    // It's a sibling of an ancestor, or totally unrelated.
                    // If we prune it, does the layout break?
                    // Let's only prune nodes that are far away or injected!
                    // What if we prune our massive container?
                    if (node === container) return true;
                }
                
                return false;
            }
        });
        const time2 = performance.now() - start2;
        
        return { 
            timeNormal: time1, 
            timePruned: time2,
            match: canvas1.toDataURL() === canvas2.toDataURL()
        };
    });
    
    console.log(results);
    await browser.close();
})();
