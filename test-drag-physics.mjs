import puppeteer from 'puppeteer';
import path from 'path';

const PASS = '✅';
const FAIL = '❌';

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
    if (!swTarget) { console.error('No service worker found'); await browser.close(); return; }
    const extensionId = swTarget.url().split('/')[2];
    console.log(`Extension ID: ${extensionId}`);

    const pages = await browser.pages();
    const page = pages[0];
    await page.setViewport({ width: 1280, height: 800 });

    const logs = [];
    page.on('console', msg => {
        logs.push(msg.text());
        if (msg.text().includes('[StickmanFight]')) {
            console.log(`[PAGE] ${msg.text()}`);
        }
    });
    page.on('pageerror', err => console.error(`[PAGE ERROR] ${err.message}`));

    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    console.log('Google loaded.');

    // Toggle game on
    const swWorker = await swTarget.worker();
    await swWorker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) await chrome.tabs.sendMessage(tab.id, { action: 'toggle-game' });
    });
    console.log('Sent toggle-game.');
    await new Promise(r => setTimeout(r, 5000));

    // Helper: get state via message passing
    async function getGameState() {
        return await swWorker.evaluate(async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return { error: 'No active tab' };
            return await chrome.tabs.sendMessage(tab.id, { action: 'get-game-state' });
        });
    }

    // Get initial state
    const initialState = await getGameState();

    if (initialState.error) {
        console.error("Initial state error:", initialState.error);
        await browser.close();
        return;
    }
    console.log(`\nFound ${initialState.totalDomBlocks} static DOM blocks.`);
    console.log('First block:', JSON.stringify(initialState.blocks[0]));

    const target = initialState.blocks[0];

    // ===== TEST 1: Click (no drag) should NOT detach =====
    console.log('\n=== TEST 1: Click without drag should NOT detach ===');
    await page.mouse.click(target.x, target.y);
    await new Promise(r => setTimeout(r, 1000));

    const stateAfterClick = await getGameState();
    const clickDidNotDetach = stateAfterClick.fallenCount === 0;
    console.log(`  Static blocks: ${stateAfterClick.totalDomBlocks}, Fallen: ${stateAfterClick.fallenCount}`);
    console.log(`  ${clickDidNotDetach ? PASS : FAIL} Click alone did ${clickDidNotDetach ? 'NOT' : ''} detach (expected: no detach)`);

    // ===== TEST 2: Drag should detach =====
    console.log('\n=== TEST 2: Drag should detach a static block ===');
    const dragStartX = target.x;
    const dragStartY = target.y;
    const dragEndX = target.x + 80;
    const dragEndY = target.y + 60;

    await page.mouse.move(dragStartX, dragStartY);
    await page.mouse.down();
    // Move in small increments to simulate real drag
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
        const x = dragStartX + (dragEndX - dragStartX) * (i / steps);
        const y = dragStartY + (dragEndY - dragStartY) * (i / steps);
        await page.mouse.move(x, y);
        await new Promise(r => setTimeout(r, 30));
    }
    await page.mouse.up();
    await new Promise(r => setTimeout(r, 1500));

    const stateAfterDrag = await getGameState();
    const dragDidDetach = stateAfterDrag.fallenCount > 0;
    console.log(`  Static: ${stateAfterDrag.totalDomBlocks}, Fallen: ${stateAfterDrag.fallenCount}`);
    console.log(`  ${dragDidDetach ? PASS : FAIL} Drag ${dragDidDetach ? 'did' : 'did NOT'} detach (expected: detach)`);
    if (stateAfterDrag.fallenDetails.length > 0) {
        const f = stateAfterDrag.fallenDetails[0];
        console.log(`  Fallen body pos=(${f.x.toFixed(1)},${f.y.toFixed(1)}), vel=(${f.vx.toFixed(2)},${f.vy.toFixed(2)}), isNaN=${f.isNaN}`);
    }

    // ===== TEST 3: Post-physics drag should move the fallen block =====
    console.log('\n=== TEST 3: Post-physics drag on already-fallen block ===');
    // Wait for the block to settle
    await new Promise(r => setTimeout(r, 2000));

    // Get fresh position of fallen block
    const freshState = await getGameState();
    if (freshState.fallenCount === 0) {
        console.log(`  ${FAIL} No fallen blocks for Test 3`);
    } else {
        const fallenPos = freshState.fallenDetails[0];
        console.log(`  Fallen block at (${fallenPos.x.toFixed(1)}, ${fallenPos.y.toFixed(1)})`);

        // Drag it 150px to the right
        const dx2Start = fallenPos.x;
        const dy2Start = fallenPos.y;
        const dx2End = fallenPos.x + 150;
        const dy2End = fallenPos.y - 50;

        await page.mouse.move(dx2Start, dy2Start);
        await page.mouse.down();
        for (let i = 1; i <= 15; i++) {
            const x = dx2Start + (dx2End - dx2Start) * (i / 15);
            const y = dy2Start + (dy2End - dy2Start) * (i / 15);
            await page.mouse.move(x, y);
            await new Promise(r => setTimeout(r, 30));
        }
        // Hold for a moment while dragging
        await new Promise(r => setTimeout(r, 300));
        await page.mouse.up();
        await new Promise(r => setTimeout(r, 500));

        const stateAfterPostDrag = await getGameState();
        if (stateAfterPostDrag.fallenCount === 0) {
            console.log(`  ${FAIL} Fallen block disappeared!`);
        } else {
            const finalPos = stateAfterPostDrag.fallenDetails[0];
            const movedX = Math.abs(finalPos.x - fallenPos.x);
            const didMove = movedX > 20;
            const notCorrupted = !finalPos.isNaN;
            console.log(`  After drag: pos=(${finalPos.x.toFixed(1)},${finalPos.y.toFixed(1)}), moved ${movedX.toFixed(1)}px`);
            console.log(`  ${didMove ? PASS : FAIL} Block ${didMove ? 'moved' : 'did NOT move'} (expected: moved >20px)`);
            console.log(`  ${notCorrupted ? PASS : FAIL} Position ${notCorrupted ? 'valid' : 'is NaN (corrupted!)'}`);
        }
    }

    // ===== SUMMARY =====
    console.log('\n=== DRAG LOGS ===');
    logs.filter(l => l.includes('[DRAG]') || l.includes('fallOut')).forEach(l => console.log(`  ${l}`));

    console.log('\n=== DONE ===');
    await new Promise(r => setTimeout(r, 3000));
    await browser.close();
})();
