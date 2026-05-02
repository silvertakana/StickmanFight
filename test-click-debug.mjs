import puppeteer from 'puppeteer';
import path from 'path';

(async () => {
    const extensionPath = path.resolve('C:/dev/StickmanFight/dist');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--no-first-run',
            '--no-default-browser-check'
        ]
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const targets = await browser.targets();
    const swTarget = targets.find(t => t.type() === 'service_worker');
    const extensionId = swTarget.url().split('/')[2];
    console.log(`Extension ID: ${extensionId}`);

    const pages = await browser.pages();
    const page = pages[0];
    await page.setViewport({ width: 1280, height: 800 });
    
    const consoleLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        consoleLogs.push(text);
        if (text.includes('[StickmanFight]')) {
            console.log(`[PAGE] ${text}`);
        }
    });
    page.on('pageerror', err => console.error(`[PAGE ERROR] ${err.message}`));

    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    console.log('Google loaded.');
    
    // Inject a global bridge BEFORE the game starts, so we can expose the game state 
    // from the extension's isolated world to the main world via DOM attributes
    await page.evaluateOnNewDocument(() => {
        // This runs in main world before any scripts
    });
    
    // Start game via service worker
    const swWorker = await swTarget.worker();
    await swWorker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            await chrome.tabs.sendMessage(tab.id, { action: 'toggle-game' });
        }
    });
    console.log('Sent toggle-game.');
    await new Promise(r => setTimeout(r, 5000));
    
    // Use chrome.scripting.executeScript to run code in the content script's isolated world
    // This lets us access window.__stickmanGameInstance
    const bodyPositions = await swWorker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const game = window.__stickmanGameInstance;
                if (!game) return { error: 'Game not found' };
                
                const scene = game.scene.scenes[0];
                const allBodies = scene.matter.world.engine.world.bodies;
                
                const domBlocks = allBodies.filter(b => b.label === 'dom-block' && b.isStatic);
                const player = scene.player;
                
                return {
                    domBlocks: domBlocks.slice(0, 5).map(b => ({
                        x: b.position.x,
                        y: b.position.y,
                        w: b.bounds.max.x - b.bounds.min.x,
                        h: b.bounds.max.y - b.bounds.min.y
                    })),
                    totalDomBlocks: domBlocks.length,
                    player: {
                        x: player.gameObject.x,
                        y: player.gameObject.y
                    },
                    canvasSize: {
                        w: scene.scale.width,
                        h: scene.scale.height
                    }
                };
            }
        });
        return results[0].result;
    });
    
    console.log('\nBody positions from extension context:');
    console.log(JSON.stringify(bodyPositions, null, 2));
    
    if (bodyPositions.error) {
        console.error(bodyPositions.error);
        await browser.close();
        return;
    }
    
    // Now click the ACTUAL position of the first DOM block
    const firstBlock = bodyPositions.domBlocks[0];
    console.log(`\n=== TEST 1: Click DOM block at (${firstBlock.x.toFixed(0)}, ${firstBlock.y.toFixed(0)}) ===`);
    await page.mouse.click(firstBlock.x, firstBlock.y);
    await new Promise(r => setTimeout(r, 1500));
    
    // Check state after first click
    const afterClick1 = await swWorker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const scene = window.__stickmanGameInstance.scene.scenes[0];
                const allBodies = scene.matter.world.engine.world.bodies;
                const fallen = allBodies.filter(b => b.label === 'dom-block-fallen');
                const statics = allBodies.filter(b => b.label === 'dom-block' && b.isStatic);
                
                return {
                    fallenCount: fallen.length,
                    staticCount: statics.length,
                    fallenDetails: fallen.map(b => ({
                        x: b.position.x, y: b.position.y,
                        isNaN: isNaN(b.position.x)
                    }))
                };
            }
        });
        return results[0].result;
    });
    console.log('After click 1:', JSON.stringify(afterClick1, null, 2));
    
    // === TEST 2: Click the fallen block again ===
    if (afterClick1.fallenCount > 0) {
        const fallenPos = afterClick1.fallenDetails[0];
        console.log(`\n=== TEST 2: Click fallen block at (${fallenPos.x.toFixed(0)}, ${fallenPos.y.toFixed(0)}) ===`);
        await page.mouse.click(fallenPos.x, fallenPos.y);
        await new Promise(r => setTimeout(r, 1500));
        
        const afterClick2 = await swWorker.evaluate(async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const scene = window.__stickmanGameInstance.scene.scenes[0];
                    const allBodies = scene.matter.world.engine.world.bodies;
                    const fallen = allBodies.filter(b => b.label === 'dom-block-fallen');
                    const sprites = scene.children.list.filter(c => c.type === 'Sprite');
                    
                    return {
                        fallenCount: fallen.length,
                        fallenDetails: fallen.map(b => ({
                            x: b.position.x, y: b.position.y,
                            isNaN: isNaN(b.position.x),
                            vx: b.velocity.x, vy: b.velocity.y
                        })),
                        activeSprites: sprites.filter(s => s.active).length,
                        visibleSprites: sprites.filter(s => s.visible).length,
                        offscreen: sprites.filter(s => s.y > 2000 || s.y < -500).length
                    };
                }
            });
            return results[0].result;
        });
        console.log('After click 2:', JSON.stringify(afterClick2, null, 2));
        
        if (afterClick2.fallenCount === 0) {
            console.error('!!! BLOCK DISAPPEARED AFTER SECOND CLICK !!!');
        }
    } else {
        console.error('No fallen blocks after first click!');
    }
    
    // === TEST 3: Click player ===
    console.log(`\n=== TEST 3: Click player at (${bodyPositions.player.x.toFixed(0)}, ${bodyPositions.player.y.toFixed(0)}) ===`);
    // Get fresh player position
    const freshPlayer = await swWorker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const scene = window.__stickmanGameInstance.scene.scenes[0];
                return {
                    x: scene.player.gameObject.x,
                    y: scene.player.gameObject.y,
                    active: scene.player.gameObject.active,
                    visible: scene.player.sprite.visible
                };
            }
        });
        return results[0].result;
    });
    console.log('Player before click:', JSON.stringify(freshPlayer, null, 2));
    
    await page.mouse.click(freshPlayer.x, freshPlayer.y);
    await new Promise(r => setTimeout(r, 1500));
    
    const playerAfter = await swWorker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const scene = window.__stickmanGameInstance.scene.scenes[0];
                return {
                    x: scene.player.gameObject.x,
                    y: scene.player.gameObject.y,
                    active: scene.player.gameObject.active,
                    visible: scene.player.sprite.visible,
                    isNaN: isNaN(scene.player.gameObject.x)
                };
            }
        });
        return results[0].result;
    });
    console.log('Player after click:', JSON.stringify(playerAfter, null, 2));
    
    // === DUMP LOGS ===
    console.log('\n=== ALL STICKMAN CLICK LOGS ===');
    consoleLogs.filter(l => l.includes('[CLICK]')).forEach(l => console.log(l));
    
    await new Promise(r => setTimeout(r, 1000));
    await browser.close();
    console.log('\nDone.');
})();
