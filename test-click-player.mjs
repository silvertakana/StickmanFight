import puppeteer from 'puppeteer';
import path from 'path';

(async () => {
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
    
    // Listen to console logs to capture Phaser/Matter errors
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.text().includes('[StickmanFight]')) {
            console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
        }
    });

    page.on('pageerror', err => {
        console.error('[BROWSER ERROR]', err.toString());
    });
    
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    
    console.log("Pressing Alt+Shift+S to start game...");
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('KeyS');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');
    
    await new Promise(r => setTimeout(r, 2000)); // Wait for game to initialize
    
    const result = await page.evaluate(async () => {
        const host = document.getElementById('stickman-fight-host');
        if (!host) return { error: "Host not found - Game did not start" };
        
        const shadow = host.shadowRoot;
        const canvas = shadow.querySelector('canvas');
        if (!canvas) return { error: "Canvas not found" };
        
        const game = window.__stickmanGameInstance;
        if (!game) return { error: "Game instance not found" };
        
        const scene = game.scene.scenes[0];
        const player = scene.player;
        const matter = scene.matter;
        
        if (!player) return { error: "Player not found" };

        const logs = [];
        const log = (msg) => logs.push(`[${Date.now()}] ${msg}`);
        
        // Track matter.world.remove
        const originalRemove = matter.world.remove;
        matter.world.remove = function(body) {
            log(`World.remove called for body: ${body.label}`);
            return originalRemove.apply(this, arguments);
        };
        
        // Track position changes to NaN
        let playerX = player.gameObject.x;
        let playerNaNTriggered = false;
        
        log(`Initial Player Pos: ${player.gameObject.x}, ${player.gameObject.y}`);
        
        // Dispatch click on player
        log(`Clicking player at ${player.gameObject.x}, ${player.gameObject.y}`);
        const downEvt = new MouseEvent('pointerdown', { 
            clientX: player.gameObject.x, 
            clientY: player.gameObject.y, 
            bubbles: true, 
            cancelable: true 
        });
        canvas.dispatchEvent(downEvt);
        
        // Wait 10 frames
        for (let i = 0; i < 10; i++) {
            await new Promise(r => requestAnimationFrame(r));
            if (isNaN(player.gameObject.x) && !playerNaNTriggered) {
                playerNaNTriggered = true;
                log(`FRAME ${i}: Player X became NaN!`);
            }
        }
        
        log(`Final Player Pos: ${player.gameObject.x}, ${player.gameObject.y}`);
        log(`Player active? ${player.gameObject.active}, body exists? ${!!player.gameObject.body}`);
        
        return { success: true, logs };
    });
    
    console.log("\n=== TEST RESULT ===");
    if (result.error) {
        console.error(result.error);
    } else {
        result.logs.forEach(l => console.log(l));
    }
    
    await browser.close();
})();
