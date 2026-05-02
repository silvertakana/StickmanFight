# Phase 5: Polish & Edge Cases

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add keyboard shortcut activation, proper teardown/cleanup, sticky navbar handling, performance guards, and a visual indicator that the game is active.

**Architecture:** Miscellaneous polish tasks that harden the extension for real-world usage across diverse websites.

---

### Task 1: Add Keyboard Shortcut to Toggle

**Files:**
- Modify: `manifest.json`
- Modify: `src/content.js`

- [ ] **Step 1: Add a command to manifest.json**

Add to `manifest.json`:

```json
"commands": {
    "toggle-game": {
        "suggested_key": {
            "default": "Alt+Shift+S"
        },
        "description": "Toggle Stickman Fight"
    }
}
```

- [ ] **Step 2: Add background listener for the command**

Create `src/background.js`:

```javascript
// src/background.js
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-game') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            chrome.tabs.sendMessage(tab.id, { action: 'toggle-game' });
        }
    }
});
```

Add to `manifest.json`:

```json
"background": {
    "service_worker": "src/background.js"
}
```

- [ ] **Step 3: Commit**

```bash
git add manifest.json src/background.js
git commit -m "feat: add Alt+Shift+S keyboard shortcut to toggle game"
```

---

### Task 2: Active Game Indicator

**Files:**
- Modify: `src/game/bootstrap.js`

- [ ] **Step 1: Add a small "GAME ACTIVE" badge**

In `startGame()`, after creating the Shadow DOM container, add a visual indicator:

```javascript
// Inside shadow DOM, add a small indicator badge
const badge = document.createElement('div');
badge.id = 'stickman-badge';
badge.textContent = '⚔️ Stickman Fight — Alt+Shift+S to exit';
badge.style.cssText = `
    position: fixed;
    top: 8px;
    right: 8px;
    padding: 6px 12px;
    background: rgba(0, 0, 0, 0.7);
    color: #e8eaed;
    font-family: 'Segoe UI', sans-serif;
    font-size: 12px;
    border-radius: 6px;
    z-index: 2147483647;
    pointer-events: none;
    opacity: 0.8;
    transition: opacity 2s;
`;
shadow.appendChild(badge);

// Fade out after 3 seconds
setTimeout(() => { badge.style.opacity = '0'; }, 3000);
```

- [ ] **Step 2: Commit**

```bash
git add src/game/bootstrap.js
git commit -m "feat: add active game indicator badge"
```

---

### Task 3: Handle Sticky/Fixed Elements

**Files:**
- Modify: `src/scanner/elementFilter.js`

- [ ] **Step 1: Detect and handle fixed/sticky positioned elements**

Add to `shouldInclude()` before the `GOOD_TAGS` check:

```javascript
// Fixed/sticky elements (navbars, cookie banners) are problematic
// because they float above the page. Include them but flag them.
const position = style.position;
if (position === 'fixed' || position === 'sticky') {
    // Still include — they make great platforms at the top/bottom of the viewport
    return { valid: true, rect, isFixed: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scanner/elementFilter.js
git commit -m "feat: handle fixed/sticky positioned elements in scanner"
```

---

### Task 4: Performance Guard — Limit Block Count

**Files:**
- Modify: `src/scanner/DOMScanner.js`

- [ ] **Step 1: Add a maximum block count**

At the top of `DOMScanner.scan()`, add a limit:

```javascript
const MAX_BLOCKS = 80; // Prevent lag on element-heavy pages
```

In the scanning loop, add a break condition:

```javascript
if (this.blocks.length >= MAX_BLOCKS) {
    console.log(`[StickmanFight] Hit max block limit (${MAX_BLOCKS}), stopping scan`);
    break;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scanner/DOMScanner.js
git commit -m "feat: add max block count guard to prevent lag"
```

---

### Task 5: Proper Teardown and Cleanup

**Files:**
- Modify: `src/game/bootstrap.js`
- Modify: `src/scenes/OverlayScene.js`

- [ ] **Step 1: Restore DOM element visibility on teardown**

In `OverlayScene`, add a `shutdown` handler:

```javascript
// In OverlayScene.create(), add:
this.events.on('shutdown', () => {
    // Restore all hidden DOM elements
    if (this.domScanner) {
        for (const block of this.domScanner.blocks) {
            if (block.domElement) {
                block.domElement.style.opacity = '';
                block.domElement.style.pointerEvents = '';
            }
        }
        this.domScanner.clear();
    }
});
```

- [ ] **Step 2: Ensure stopGame() triggers scene shutdown**

In `bootstrap.js`, `stopGame()` already calls `gameInstance.destroy(true)` which triggers scene shutdown. Verify this chain works.

- [ ] **Step 3: Commit**

```bash
git add src/game/bootstrap.js src/scenes/OverlayScene.js
git commit -m "feat: restore DOM elements on game teardown"
```

---

### Task 6: Final Integration Test

- [ ] **Step 1: Build and test full flow**

```bash
pnpm run build
```

- [ ] **Step 2: Test on 3 different websites**

Test on each: Wikipedia, Google, and a news site (e.g., BBC).

For each site verify:
1. Game activates via popup click
2. Game activates via `Alt+Shift+S`
3. Badge appears and fades
4. Stickman lands on real DOM elements
5. Clicking elements screenshots them and they fall
6. Deactivating restores the page to normal
7. No console errors

- [ ] **Step 3: Verify standalone mode still works**

```bash
pnpm run dev
```

Open `http://localhost:3000` — the original standalone game with the fake Google page should still work perfectly.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "milestone: Phase 5 complete — extension polished with shortcuts, cleanup, and guards"
```
