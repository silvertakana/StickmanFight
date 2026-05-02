# Phase 2: Game Overlay

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Inject a transparent Phaser canvas over any webpage, with proper CSS isolation and extension-aware asset loading. The stickman should be able to run and jump on the floor of the browser window.

**Architecture:** `bootstrap.js` creates a Shadow DOM host element, injects the Phaser game inside it, and uses `assetLoader.js` to resolve asset paths via `chrome.runtime.getURL()`. `OverlayScene.js` is a minimal scene with just the floor, player, and transparent background.

---

### Task 1: Create the Asset Loader Utility

**Files:**
- Create: `src/game/assetLoader.js`

- [ ] **Step 1: Write the asset loader**

```javascript
// src/game/assetLoader.js
// Resolves asset paths for both standalone and extension modes.

const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL;

/**
 * Returns the correct path for an asset.
 * In extension mode: chrome.runtime.getURL('assets/foo.png')
 * In standalone mode: 'assets/foo.png' (relative, as before)
 */
export function resolveAssetPath(relativePath) {
    if (isExtension) {
        return chrome.runtime.getURL(relativePath);
    }
    return relativePath;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/assetLoader.js
git commit -m "feat: add asset loader utility for dual-mode path resolution"
```

---

### Task 2: Create the Bootstrap Module

**Files:**
- Create: `src/game/bootstrap.js`

- [ ] **Step 1: Write bootstrap.js**

This module creates the Shadow DOM host, injects the Phaser canvas, and starts the game.

```javascript
// src/game/bootstrap.js
import Phaser from 'phaser';
import decomp from 'poly-decomp';
import OverlayScene from '../scenes/OverlayScene.js';

window.decomp = decomp;

let gameInstance = null;

export function startGame() {
    if (gameInstance) return; // Already running

    // Create a host element for Shadow DOM isolation
    const host = document.createElement('div');
    host.id = 'stickman-fight-host';
    host.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2147483647;
        pointer-events: auto;
    `;
    document.body.appendChild(host);

    // Attach Shadow DOM to isolate from host page CSS
    const shadow = host.attachShadow({ mode: 'open' });

    // Create game container inside shadow
    const container = document.createElement('div');
    container.id = 'game-container';
    container.style.cssText = 'width: 100%; height: 100%;';
    shadow.appendChild(container);

    // Lock page scroll
    document.body.dataset.stickmanPrevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const config = {
        type: Phaser.WEBGL,
        scale: {
            mode: Phaser.Scale.RESIZE,
            parent: container,
            width: '100%',
            height: '100%'
        },
        transparent: true, // Key: transparent background!
        scene: [OverlayScene],
        physics: {
            default: 'matter',
            matter: {
                gravity: { y: 1 },
                debug: false
            }
        }
    };

    gameInstance = new Phaser.Game(config);
}

export function stopGame() {
    if (!gameInstance) return;
    
    gameInstance.destroy(true);
    gameInstance = null;

    const host = document.getElementById('stickman-fight-host');
    if (host) host.remove();

    // Restore scroll
    document.body.style.overflow = document.body.dataset.stickmanPrevOverflow || '';
    delete document.body.dataset.stickmanPrevOverflow;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/bootstrap.js
git commit -m "feat: add bootstrap module with Shadow DOM and transparent Phaser canvas"
```

---

### Task 3: Create OverlayScene

**Files:**
- Create: `src/scenes/OverlayScene.js`

- [ ] **Step 1: Write OverlayScene.js**

A minimal scene that loads the player assets and creates a floor. The DOM scanning comes in Phase 3.

```javascript
// src/scenes/OverlayScene.js
import Phaser from 'phaser';
import Player from '../entities/Player.js';
import { resolveAssetPath } from '../game/assetLoader.js';

export default class OverlayScene extends Phaser.Scene {
    constructor() {
        super('OverlayScene');
    }

    preload() {
        // Load player sprites via extension-aware paths
        this.load.spritesheet('stickman-run',
            resolveAssetPath('assets/sprites/stickman/StickmanPack/Run/thickRunSheet.png'),
            { frameWidth: 64, frameHeight: 64 }
        );
        this.load.spritesheet('stickman-idle',
            resolveAssetPath('assets/sprites/stickman/StickmanPack/Idle/thickIdleSheet.png'),
            { frameWidth: 64, frameHeight: 64 }
        );
        this.load.image('stickman-jump-up',
            resolveAssetPath('assets/sprites/stickman/StickmanPack/Jump/JumpUp.png')
        );
        this.load.image('stickman-jump-down',
            resolveAssetPath('assets/sprites/stickman/StickmanPack/Jump/JumpDown.png')
        );

        // Load SFX
        this.load.audio('click',
            resolveAssetPath('assets/audio/sfx/interface/Audio/click_001.ogg')
        );
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const centerX = width / 2;

        // Floor (bottom of viewport)
        this.matter.add.rectangle(centerX, height + 10, width * 2, 40, {
            isStatic: true, label: 'ground'
        });

        // Side walls
        this.matter.add.rectangle(-20, height / 2, 40, height * 2, {
            isStatic: true, label: 'wall-left'
        });
        this.matter.add.rectangle(width + 20, height / 2, 40, height * 2, {
            isStatic: true, label: 'wall-right'
        });

        // Animations
        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNumbers('stickman-run', { start: 0, end: 8 }),
            frameRate: 15, repeat: -1
        });
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('stickman-idle', { start: 0, end: 5 }),
            frameRate: 10, repeat: -1
        });

        // Sound (for jump)
        this.soundClick = this.sound.add('click', { volume: 0.4 });

        // Spawn player at bottom-left
        this.player = new Player(this, 100, height - 100);

        // Mouse spring for dragging DOM blocks (Phase 3+)
        this.matter.add.mouseSpring({
            length: 0.01, stiffness: 0.2, damping: 0.1
        });
    }

    update(time, delta) {
        this.player.update();
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scenes/OverlayScene.js
git commit -m "feat: add OverlayScene with player, floor, and transparent background"
```

---

### Task 4: Wire Content Script to Bootstrap

**Files:**
- Modify: `src/content.js`

- [ ] **Step 1: Update content.js to import and call bootstrap**

```javascript
// src/content.js
import { startGame, stopGame } from './game/bootstrap.js';

let gameActive = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggle-game') {
        if (!gameActive) {
            startGame();
        } else {
            stopGame();
        }
        gameActive = !gameActive;
        sendResponse({ active: gameActive });
    }
});
```

- [ ] **Step 2: Commit**

```bash
git add src/content.js
git commit -m "feat: wire content script to game bootstrap"
```

---

### Task 5: End-to-End Test — Stickman on a Real Website

- [ ] **Step 1: Build and reload**

```bash
pnpm run build
```

Then go to `chrome://extensions` and click the reload button on the extension.

- [ ] **Step 2: Test on a real site**

1. Navigate to `https://en.wikipedia.org`
2. Click the extension icon → "Start Game"
3. Verify: A transparent canvas appears over Wikipedia
4. Verify: The stickman spawns at bottom-left and falls to the floor
5. Verify: WASD movement works — the stickman runs and jumps
6. Verify: The Wikipedia page is visible beneath the stickman
7. Verify: The page cannot scroll (overflow hidden)

- [ ] **Step 3: Test deactivation**

1. Click the extension icon → "Stop Game"
2. Verify: The canvas is removed, Wikipedia is scrollable again

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "milestone: Phase 2 complete — stickman runs on transparent overlay"
```
