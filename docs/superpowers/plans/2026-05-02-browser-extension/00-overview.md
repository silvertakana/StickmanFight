# Browser Extension Conversion — Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert StickmanFight from a standalone Vite web app into a Chrome Extension (Manifest V3) that injects the game as a transparent overlay onto any webpage, turning live DOM elements into physics platforms.

**Architecture:** A content script injects a full-screen transparent Phaser canvas over the host page. A DOM scanner reads `getBoundingClientRect()` for visible elements and spawns invisible Matter.js static bodies. When elements are "destroyed," `html2canvas` screenshots them, hides the real DOM node, and the physics body becomes dynamic with the screenshot as its texture.

**Tech Stack:** Phaser 4 + Matter.js, Vite 8, `@crxjs/vite-plugin`, `html2canvas`, Chrome Manifest V3

---

## Phases

Each phase is a self-contained plan document that produces working, testable software on its own.

| Phase | Document | What It Builds |
|-------|----------|----------------|
| 1 | [01-extension-scaffold.md](./01-extension-scaffold.md) | Manifest V3, Vite CRX plugin, content script entry point, popup toggle |
| 2 | [02-game-overlay.md](./02-game-overlay.md) | Transparent canvas injection, asset loading via `chrome.runtime.getURL`, Shadow DOM isolation |
| 3 | [03-dom-scanner.md](./03-dom-scanner.md) | DOM traversal, element filtering, invisible Matter.js body creation, scroll locking |
| 4 | [04-element-destruction.md](./04-element-destruction.md) | `html2canvas` integration, screenshot-to-texture pipeline, DOM hiding on detach |
| 5 | [05-polish.md](./05-polish.md) | Activation UI, keyboard shortcut, cleanup/teardown, edge case handling |

## File Structure (Final State)

```
StickmanFight/
├── manifest.json                    # Chrome Extension Manifest V3
├── vite.config.js                   # Updated with @crxjs/vite-plugin
├── package.json                     # New deps: @crxjs/vite-plugin, html2canvas
├── public/
│   ├── icons/                       # Extension icons (16, 48, 128px)
│   └── assets/                      # Existing sprites, audio (unchanged)
├── src/
│   ├── content.js                   # NEW: Content script entry point
│   ├── popup.html                   # NEW: Extension popup UI
│   ├── popup.js                     # NEW: Popup logic (toggle game)
│   ├── game/
│   │   ├── bootstrap.js             # NEW: Creates Phaser game on host page
│   │   └── assetLoader.js           # NEW: Wraps paths with chrome.runtime.getURL
│   ├── scanner/
│   │   ├── DOMScanner.js            # NEW: Traverses DOM, filters elements
│   │   └── elementFilter.js         # NEW: Rules for what makes a "good" platform
│   ├── entities/
│   │   ├── Player.js                # MODIFY: Remove hardcoded asset paths
│   │   ├── Boss.js                  # MODIFY: Remove hardcoded asset paths
│   │   ├── Projectile.js            # KEEP: No changes needed
│   │   ├── DOMBlock.js              # NEW: Replaces GoogleElement for live DOM
│   │   └── GoogleElement.js         # KEEP: Legacy, used for standalone mode
│   └── scenes/
│       ├── MainScene.js             # KEEP: Legacy standalone mode
│       └── OverlayScene.js          # NEW: Extension mode scene
└── index.html                       # KEEP: Standalone dev/testing mode
```

## Execution Order

Phases must be executed in order (1→2→3→4→5). Each phase builds on the previous one. However, **Phase 1 + 2 together** produce the first testable milestone (stickman running on a blank overlay).

## Key Decisions

1. **Dual-mode support:** We keep `index.html` and `MainScene.js` intact so the game can still run standalone via `pnpm run dev`. The extension mode uses `OverlayScene.js` instead.
2. **Shadow DOM:** The Phaser canvas is wrapped in a Shadow DOM to prevent host page CSS from affecting our game UI.
3. **Scroll locking:** When the game is active, we set `document.body.style.overflow = 'hidden'` to freeze the viewport as the arena.
4. **Asset loading:** All `this.load.image(...)` calls are wrapped through a helper that prepends `chrome.runtime.getURL()` when running as an extension.
