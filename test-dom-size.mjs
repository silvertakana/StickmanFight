import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });
    
    console.log("Phase 1: Reproducing the 'seconds' lag by simulating a heavy DOM...");
    
    const results = await page.evaluate(async () => {
        // Step 1: Baseline
        const el = document.querySelector('div.RNNXgb');
        const start1 = performance.now();
        await html2canvas(el, { scale: 1, logging: false });
        const time1 = performance.now() - start1;
        
        // Step 2: Inject 10,000 hidden DOM nodes (simulating AdBlockers, Grammarly, React DevTools)
        const container = document.createElement('div');
        container.style.display = 'none';
        for (let i = 0; i < 10000; i++) {
            const child = document.createElement('div');
            child.className = 'injected-garbage-node';
            child.innerHTML = '<span>Test</span>';
            container.appendChild(child);
        }
        document.body.appendChild(container);
        
        // Step 3: Measure again
        const start2 = performance.now();
        await html2canvas(el, { scale: 1, logging: false });
        const time2 = performance.now() - start2;
        
        // Step 4: Inject 20,000 more
        for (let i = 0; i < 20000; i++) {
            const child = document.createElement('div');
            child.className = 'injected-garbage-node';
            child.innerHTML = '<span>Test</span>';
            container.appendChild(child);
        }
        
        // Step 5: Measure again
        const start3 = performance.now();
        await html2canvas(el, { scale: 1, logging: false });
        const time3 = performance.now() - start3;
        
        return {
            baselineMs: time1,
            with10kNodesMs: time2,
            with30kNodesMs: time3
        };
    });
    
    console.log(results);
    await browser.close();
})();
