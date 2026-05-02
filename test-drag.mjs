import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    
    // We need to serve the game or inject the code.
    // Since the game is running on localhost:5173 (Vite), let's go there!
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    // Wait for the game to initialize and elements to be converted
    await new Promise(r => setTimeout(r, 2000));
    
    // Inject a mouse drag simulation
    const result = await page.evaluate(async () => {
        const errors = [];
        window.addEventListener('error', e => errors.push(e.message));
        
        // Find the ground or a block
        // Wait, the game is an extension? No, pnpm run dev runs the Vite dev server which hosts the extension build or a test page?
        // Let's check what's on the page.
        const host = document.getElementById('stickman-fight-host');
        if (!host) return { error: "Host not found" };
        
        // Let's trigger a click in the center of the screen to detach a block
        const x = window.innerWidth / 2;
        const y = window.innerHeight / 2;
        
        const evt = new MouseEvent('pointerdown', {
            clientX: x, clientY: y, bubbles: true, cancelable: true
        });
        document.elementFromPoint(x, y).dispatchEvent(evt);
        
        await new Promise(r => setTimeout(r, 500));
        
        return { errors, success: true };
    });
    
    console.log(result);
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();
