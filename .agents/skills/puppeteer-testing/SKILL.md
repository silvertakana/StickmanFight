---
name: puppeteer-testing
description: Use when testing browser extension behavior, debugging DOM interactions, profiling html2canvas performance, diagnosing physics bugs, or verifying element rendering in a real browser. Triggers on "test with puppeteer", "use puppeteer", "puppeteer", "browser test", "extension test", "e2e test", "end to end", "integration test"
---

# Puppeteer Testing for StickmanFight

## Overview

Puppeteer launches a real Chromium browser to test the StickmanFight extension against live webpages. Use it to diagnose rendering bugs, profile performance, verify DOM scanning, and test physics interactions that cannot be replicated in jsdom/Vitest.

## When to Use

- **DOM scanning validation** — verify `elementFilter.js` on a real page
- **html2canvas debugging** — test capture fidelity, performance, CSP crashes
- **Physics interaction bugs** — click/drag elements, track body states
- **Extension lifecycle** — toggle game via service worker, test popup
- **Performance profiling** — measure execution time of specific operations

## Test Patterns

### Pattern 1: Headless Page Test (simplest)

For testing code against a live webpage without the extension loaded.

```javascript
import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    // Inject external scripts if needed
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });

    // Run code in the browser context
    const results = await page.evaluate(async () => {
        // All code here runs IN the browser
        const el = document.querySelector('form');
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
    });

    console.log(results);
    await browser.close();
})();
```

### Pattern 2: Inject Project Source Code

For testing `elementFilter.js` or `DOMScanner.js` logic on a real page.

```javascript
import puppeteer from 'puppeteer';
import fs from 'fs';

const filterCode = fs.readFileSync('./src/scanner/elementFilter.js', 'utf-8');

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    const results = await page.evaluate((code) => {
        // Strip ES module exports so it runs as a plain script
        const cleanCode = code.replace(/export /g, '');
        const func = new Function(cleanCode + `
            // Your test logic here using shouldInclude(), etc.
            const allElements = document.querySelectorAll('*');
            let count = 0;
            for (const el of allElements) {
                if (shouldInclude(el).valid) count++;
            }
            return count;
        `);
        return func();
    }, filterCode);

    console.log(`Found ${results} valid elements`);
    await browser.close();
})();
```

### Pattern 3: Extension-Loaded Test (full integration)

For testing the actual extension with physics, player, and DOM blocks.

```javascript
import puppeteer from 'puppeteer';
import path from 'path';

(async () => {
    const extensionPath = path.resolve('C:/dev/StickmanFight/dist');

    // MUST use headless: false — extensions require full Chrome
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

    // Find the extension's service worker to get its ID
    const targets = await browser.targets();
    const swTarget = targets.find(t => t.type() === 'service_worker');
    if (!swTarget) { console.error('No SW found'); await browser.close(); return; }
    const extensionId = swTarget.url().split('/')[2];
    console.log(`Extension ID: ${extensionId}`);

    // Navigate to test page
    const pages = await browser.pages();
    const page = pages[0];
    await page.setViewport({ width: 1280, height: 800 });

    // Capture ALL console logs from the page
    const logs = [];
    page.on('console', msg => {
        logs.push(msg.text());
        if (msg.text().includes('[StickmanFight]')) {
            console.log(`[PAGE] ${msg.text()}`);
        }
    });
    page.on('pageerror', err => console.error(`[PAGE ERROR] ${err.message}`));

    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    // Toggle the game via the service worker
    const swWorker = await swTarget.worker();
    await swWorker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) await chrome.tabs.sendMessage(tab.id, { action: 'toggle-game' });
    });

    // Wait for game to initialize
    await new Promise(r => setTimeout(r, 5000));

    // Verify game started
    const hostExists = await page.evaluate(() => !!document.getElementById('stickman-fight-host'));
    console.log(`Game running: ${hostExists}`);

    // Use page.mouse for real clicks that reach the Phaser canvas
    await page.mouse.click(640, 300);
    await new Promise(r => setTimeout(r, 1500));

    // Dump logs
    logs.filter(l => l.includes('[StickmanFight]')).forEach(l => console.log(l));

    await browser.close();
})();
```

### Pattern 4: Performance Profiling

For measuring `html2canvas` execution time or comparing approaches.

```javascript
const results = await page.evaluate(async () => {
    const target = document.querySelector('.target-selector');

    const start = performance.now();
    const canvas = await html2canvas(target, {
        backgroundColor: null,
        scale: 1,
        logging: false,
        ignoreElements: (node) => {
            const tag = node.tagName?.toUpperCase();
            return ['IFRAME', 'SCRIPT', 'SVG', 'PATH'].includes(tag);
        }
    });
    const elapsed = performance.now() - start;

    return {
        timeMs: elapsed,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        dataUrl: canvas.toDataURL().substring(0, 50)
    };
});
```

### Pattern 5: Save Screenshot for Visual Inspection

```javascript
import fs from 'fs';

// Inside page.evaluate:
const dataUrl = canvas.toDataURL('image/png');

// Back in Node:
const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
fs.writeFileSync('debug-capture.png', Buffer.from(base64, 'base64'));
console.log('Saved debug-capture.png');
```

## File Naming Convention

All test scripts use `.mjs` extension and live in the project root:

| Pattern | Naming | Example |
|---------|--------|---------|
| Feature test | `test-{feature}.mjs` | `test-drag.mjs` |
| Performance | `test-perf-{area}.mjs` | `test-perf-search.mjs` |
| Debugging | `test-{bug-area}.mjs` | `test-click-debug.mjs` |
| html2canvas | `test-h2c.mjs`, `test-onclone.mjs` | — |

## Critical Rules

1. **Always use `.mjs`** — the project's `package.json` doesn't set `"type": "module"`, so ESM imports require `.mjs`
2. **Extension tests need `headless: false`** — Chrome extensions cannot load in headless mode
3. **Service worker for game toggle** — use `swTarget.worker().evaluate()` to send `toggle-game` message
4. **Shadow DOM isolation** — the game canvas lives inside a Shadow DOM; use `page.mouse.click(x, y)` to dispatch real browser events that reach Phaser's input system
5. **Build before extension tests** — run `pnpm build` before testing with the extension loaded; HMR doesn't apply to extension tests
6. **Strip `export` from injected code** — when injecting project source via `page.evaluate`, remove ES module syntax with `.replace(/export /g, '')`
7. **Always close browser** — wrap in try/finally or ensure `browser.close()` runs

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `page.evaluate(() => chrome.runtime...)` | Chrome APIs live in the extension's isolated world, not the main world. Use `swWorker.evaluate()` |
| Testing with `headless: "new"` when extension needed | Extensions require `headless: false` |
| Forgetting `waitUntil: 'networkidle2'` | Page may not be fully loaded; scripts and styles might be missing |
| Using `.js` extension | Use `.mjs` for ESM imports |
| Not waiting after toggle-game | Game needs ~5s to scan DOM and create physics blocks |
