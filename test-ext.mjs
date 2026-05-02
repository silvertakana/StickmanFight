import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Let's create a minimal test page and inject the game scripts so we can test the physics engine!
// Wait, the game is already built and served by the extension.
// It's much easier to just load the extension into Puppeteer and test it on Google!

(async () => {
    // 1. Launch Puppeteer with the extension loaded
    const extensionPath = path.resolve('C:/dev/StickmanFight/dist');
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`
        ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // 2. Go to Google
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    
    // 3. Wait for the extension to inject the game
    await new Promise(r => setTimeout(r, 2000));
    
    // 4. Trigger the game start if needed? The extension might need a click on the popup.
    // Wait, let's see if the game is auto-started or needs a message.
    const result = await page.evaluate(async () => {
        const errors = [];
        window.addEventListener('error', e => errors.push(e.message));
        
        // Find the shadow host
        const host = document.getElementById('stickman-fight-host');
        if (!host) {
            // Send message to background to start game?
            return { error: "Host not found", errors };
        }
        
        // We have the shadow root.
        const shadow = host.shadowRoot;
        const canvas = shadow.querySelector('canvas');
        if (!canvas) return { error: "Canvas not found" };
        
        // Let's find an element to click
        const btn = document.querySelector('textarea') || document.querySelector('input[name="q"]') || document.querySelector('center');
        if (!btn) return { error: "Target element not found" };
        
        const rect = btn.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        
        // Log state before
        const beforeClickOpacity = window.getComputedStyle(btn).opacity;
        
        // Simulate drag: pointerdown, move, pointerup
        const downEvt = new MouseEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, cancelable: true });
        canvas.dispatchEvent(downEvt);
        
        await new Promise(r => setTimeout(r, 50));
        
        const moveEvt = new MouseEvent('pointermove', { clientX: x + 100, clientY: y + 100, bubbles: true, cancelable: true });
        window.dispatchEvent(moveEvt);
        
        await new Promise(r => setTimeout(r, 300)); // Wait for html2canvas to finish
        
        // Log state after
        const afterDragOpacity = window.getComputedStyle(btn).opacity;
        
        return { 
            success: true, 
            errors,
            beforeClickOpacity,
            afterDragOpacity,
            targetTag: btn.tagName
        };
    });
    
    console.log("Result:", result);
    await browser.close();
})();
