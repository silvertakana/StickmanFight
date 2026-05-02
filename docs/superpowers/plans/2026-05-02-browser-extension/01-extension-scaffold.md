# Phase 1: Extension Scaffold

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Chrome Extension Manifest V3 infrastructure with Vite, a content script entry point, and a popup toggle button.

**Architecture:** `@crxjs/vite-plugin` reads `manifest.json` and builds the extension automatically. The content script (`src/content.js`) is injected into all pages and listens for a message from the popup to activate the game.

**Tech Stack:** Vite 8, `@crxjs/vite-plugin`, Chrome Manifest V3

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the CRX Vite plugin and html2canvas**

```bash
pnpm add -D @crxjs/vite-plugin
pnpm add html2canvas
```

- [ ] **Step 2: Verify installation**

Run: `pnpm ls @crxjs/vite-plugin html2canvas`
Expected: Both packages listed with versions

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @crxjs/vite-plugin and html2canvas dependencies"
```

---

### Task 2: Create manifest.json

**Files:**
- Create: `manifest.json`

- [ ] **Step 1: Write the manifest**

```json
{
  "manifest_version": 3,
  "name": "Stickman Fight",
  "version": "1.0.0",
  "description": "Turn any webpage into a physics playground — fight as a stickman on live websites!",
  "permissions": ["activeTab"],
  "action": {
    "default_popup": "src/popup.html",
    "default_icon": {
      "16": "public/icons/icon16.png",
      "48": "public/icons/icon48.png",
      "128": "public/icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content.js"],
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": [
        "assets/*",
        "src/*"
      ],
      "matches": ["<all_urls>"]
    }
  ],
  "icons": {
    "16": "public/icons/icon16.png",
    "48": "public/icons/icon48.png",
    "128": "public/icons/icon128.png"
  }
}
```

- [ ] **Step 2: Create placeholder extension icons**

Create `public/icons/` directory. Generate or use placeholder 16x16, 48x48, and 128x128 PNG icons. A simple colored square with "SF" text works for dev.

- [ ] **Step 3: Commit**

```bash
git add manifest.json public/icons/
git commit -m "feat: add Chrome Extension manifest.json and icons"
```

---

### Task 3: Update Vite Config for CRX

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Update vite.config.js to use the CRX plugin**

```javascript
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  server: { port: 3000 },
  test: { environment: 'jsdom' },
  plugins: [crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        // Keep standalone mode working
        main: 'index.html'
      }
    }
  }
});
```

- [ ] **Step 2: Verify the dev server still starts**

Run: `pnpm run dev`
Expected: Vite starts without errors. The CRX plugin may output additional build info about the extension.

- [ ] **Step 3: Commit**

```bash
git add vite.config.js
git commit -m "feat: integrate @crxjs/vite-plugin into Vite config"
```

---

### Task 4: Create Content Script Entry Point

**Files:**
- Create: `src/content.js`

- [ ] **Step 1: Write the content script**

This script is injected into every page. It does nothing until it receives a "toggle" message from the popup.

```javascript
// src/content.js
// Content script — injected into all pages by manifest.json
// Listens for messages from the popup to activate/deactivate the game.

let gameActive = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggle-game') {
        if (!gameActive) {
            activateGame();
        } else {
            deactivateGame();
        }
        gameActive = !gameActive;
        sendResponse({ active: gameActive });
    }
});

async function activateGame() {
    console.log('[StickmanFight] Activating game overlay...');
    // Phase 2 will implement: import and call bootstrap.js here
}

function deactivateGame() {
    console.log('[StickmanFight] Deactivating game overlay...');
    // Phase 5 will implement: teardown logic here
}
```

- [ ] **Step 2: Commit**

```bash
git add src/content.js
git commit -m "feat: add content script with toggle message listener"
```

---

### Task 5: Create Popup HTML and JS

**Files:**
- Create: `src/popup.html`
- Create: `src/popup.js`

- [ ] **Step 1: Write popup.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      width: 220px;
      padding: 16px;
      font-family: 'Segoe UI', sans-serif;
      background: #1a1a2e;
      color: #e8eaed;
      margin: 0;
    }
    h1 {
      font-size: 16px;
      margin: 0 0 12px 0;
      text-align: center;
    }
    #toggle-btn {
      width: 100%;
      padding: 10px;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, #4285F4, #34A853);
      color: white;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    #toggle-btn:hover { opacity: 0.85; }
    #toggle-btn.active {
      background: linear-gradient(135deg, #EA4335, #FBBC05);
    }
    .status {
      text-align: center;
      font-size: 11px;
      color: #9aa0a6;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <h1>Stickman Fight</h1>
  <button id="toggle-btn">Start Game</button>
  <div class="status" id="status">Click to play on this page</div>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write popup.js**

```javascript
// src/popup.js
const btn = document.getElementById('toggle-btn');
const status = document.getElementById('status');

btn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggle-game' });
    
    if (response?.active) {
        btn.textContent = 'Stop Game';
        btn.classList.add('active');
        status.textContent = 'Game running on this page!';
    } else {
        btn.textContent = 'Start Game';
        btn.classList.remove('active');
        status.textContent = 'Click to play on this page';
    }
});
```

- [ ] **Step 3: Commit**

```bash
git add src/popup.html src/popup.js
git commit -m "feat: add extension popup with toggle button"
```

---

### Task 6: End-to-End Smoke Test

- [ ] **Step 1: Build the extension**

Run: `pnpm run build`
Expected: A `dist/` folder with the built extension files including `manifest.json`.

- [ ] **Step 2: Load in Chrome**

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` folder
4. Verify the extension icon appears in the toolbar

- [ ] **Step 3: Test the popup**

1. Navigate to any website (e.g., `https://example.com`)
2. Click the extension icon
3. Click "Start Game"
4. Open DevTools Console — verify `[StickmanFight] Activating game overlay...` is logged
5. Click again — verify `[StickmanFight] Deactivating game overlay...` is logged

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "milestone: Phase 1 complete — extension scaffold with popup toggle"
```
