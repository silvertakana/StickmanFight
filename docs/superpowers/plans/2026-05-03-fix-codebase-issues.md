# Fix Codebase Issues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up severe memory leaks, performance bottlenecks (O(N²) loops), and logic bugs in the StickmanFight extension.

**Architecture:** We will patch the entity destruction lifecycle to clean up Phaser texture resources and timers, optimize the DOM scanner by breaking early and reordering expensive checks, bind proper canvas exit events for dragging, and safely manage global DOM/Chrome listeners.

**Tech Stack:** JavaScript, Phaser 3, Matter.js, Chrome Extension API

---

### Task 1: Fix Memory Leaks (DOMBlock & Projectile)

**Files:**
- Modify: `src/entities/DOMBlock.js`
- Modify: `src/entities/Projectile.js`

- [ ] **Step 1: Save the texture key in DOMBlock**

Modify `src/entities/DOMBlock.js`. In the `fallOut` method, assign `this.textureKey = textureKey;` right after it's defined.

```javascript
        const textureKey = `dom-capture-${Date.now()}-${Math.random()}`;
        this.textureKey = textureKey;
```

- [ ] **Step 2: Clean up the texture in DOMBlock destroy**

In `src/entities/DOMBlock.js`, modify the `destroy()` method to remove the texture from the Phaser Texture Manager.

```javascript
    destroy() {
        if (this.body && this.scene && this.scene.matter) {
            this.scene.matter.world.remove(this.body);
            this.body = null;
        }
        if (this.fallenSprite) {
            this.fallenSprite.destroy();
            this.fallenSprite = null;
        }
        if (this.textureKey && this.scene && this.scene.textures && this.scene.textures.exists(this.textureKey)) {
            this.scene.textures.remove(this.textureKey);
        }
    }
```

- [ ] **Step 3: Save the timer in Projectile**

Modify `src/entities/Projectile.js`. Change the delayed call to assign to `this.timerEvent`.

```javascript
        // Auto-destroy after 5 seconds to prevent memory leaks
        this.timerEvent = scene.time.delayedCall(5000, () => {
            this.destroy();
        });
```

- [ ] **Step 4: Clean up the timer in Projectile destroy**

In `src/entities/Projectile.js`, update `destroy()` to clean up the timer.

```javascript
    destroy() {
        if (this.timerEvent) {
            this.timerEvent.remove(false);
            this.timerEvent = null;
        }
        if (this.gameObject && this.gameObject.body) {
            this.scene.matter.world.remove(this.gameObject.body);
            this.gameObject.destroy();
        }
    }
```

- [ ] **Step 5: Commit Memory Leak Fixes**

```bash
git add src/entities/DOMBlock.js src/entities/Projectile.js
git commit -m "fix: resolve memory leaks in domblock textures and projectile timers"
```

### Task 2: Fix Performance Bottleneck (DOM Scanner)

**Files:**
- Modify: `src/scanner/DOMScanner.js`
- Modify: `src/scanner/elementFilter.js`

- [ ] **Step 1: Cap the scanner loop early**

Modify `src/scanner/DOMScanner.js`. The scanner currently processes the entire page before capping at 150 blocks. Move the `MAX_BLOCKS` limit into the `PHASE 1` loop to prevent O(N²) scaling on huge pages.

```javascript
        // PHASE 1: READ ONLY (prevents layout thrashing)
        const MAX_BLOCKS = 150; // Cap to prevent Matter.js from choking
        
        for (const el of allElements) {
            if (validElements.length >= MAX_BLOCKS) break;
            
            // Skip our own game container
            if (hostEl && hostEl.contains(el)) continue;
```

- [ ] **Step 2: Remove redundant cap in Phase 2**

In `src/scanner/DOMScanner.js`, simplify Phase 2 since `validElements` is already capped.

```javascript
        // PHASE 2: WRITE ONLY (instantiating blocks modifies the DOM)
        for (let i = 0; i < validElements.length; i++) {
            const { el, rect } = validElements[i];
            const block = new DOMBlock(this.scene, el, rect);
            this.blocks.push(block);
        }
```

- [ ] **Step 3: Defer expensive layout checks in Filter**

Modify `src/scanner/elementFilter.js`. Move the expensive `window.getComputedStyle(el)` call *below* all the cheap `rect` size/boundary checks.

```javascript
    const tag = el.tagName;

    if (SKIP_TAGS.has(tag)) return { valid: false, rect: null };

    const rect = el.getBoundingClientRect();

    if (rect.bottom < 0 || rect.top > window.innerHeight ||
        rect.right < 0 || rect.left > window.innerWidth) {
        return { valid: false, rect: null };
    }

    if (rect.width < MIN_WIDTH || rect.height < MIN_HEIGHT) {
        return { valid: false, rect: null };
    }

    // Reject massive containers that would trap the player
    const screenArea = window.innerWidth * window.innerHeight;
    if (rect.width * rect.height > screenArea * 0.4) {
        return { valid: false, rect: null };
    }

    // Reject elements that stretch the whole width of the screen (e.g. banners, navbars)
    if (rect.width > window.innerWidth * 0.90) {
        return { valid: false, rect: null };
    }

    // Reject elements that stretch almost the whole height of the screen (e.g. sidebars)
    if (rect.height > window.innerHeight * 0.75) {
        return { valid: false, rect: null };
    }

    // Do NOT parse children of atomic interactable elements.
    const atomicParent = el.parentElement?.closest('button, a, input, select, textarea, label');
    if (atomicParent) {
        return { valid: false, rect: null };
    }

    // --- EXPENSIVE STYLE CHECKS MOVED HERE ---
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return { valid: false, rect: null };
    }
```

- [ ] **Step 4: Commit Scanner Optimizations**

```bash
git add src/scanner/DOMScanner.js src/scanner/elementFilter.js
git commit -m "perf: eliminate O(N^2) scanner bottleneck and defer layout thrashing"
```

### Task 3: Fix Interaction & Physics Bugs

**Files:**
- Modify: `src/scenes/OverlayScene.js`
- Modify: `src/entities/Boss.js`

- [ ] **Step 1: Fix permanent glue drag constraint**

Modify `src/scenes/OverlayScene.js`. Extract the pointer up logic and bind it to both `pointerup` and `gameout` to prevent items getting stuck to the mouse.

```javascript
        const releaseDrag = () => {
            this.pendingDrag = null;
            if (this.dragConstraint) {
                this.matter.world.remove(this.dragConstraint);
                this.dragConstraint = null;
            }
        };

        this.input.on('pointerup', releaseDrag);
        this.input.on('gameout', releaseDrag); // Handles mouse leaving browser tab
```

- [ ] **Step 2: Cap Boss velocity**

Modify `src/entities/Boss.js` in the `update` method to prevent the Boss from orbiting out of control.

```javascript
        // Apply forces to reach target pos smoothly
        const dx = targetX - this.gameObject.x;
        const dy = hoverY - this.gameObject.y;
        this.gameObject.applyForce({ x: dx * 0.0001, y: dy * 0.0002 });

        // Cap maximum speed
        const speed = Math.hypot(this.gameObject.body.velocity.x, this.gameObject.body.velocity.y);
        if (speed > 4) {
            this.gameObject.setVelocity(
                (this.gameObject.body.velocity.x / speed) * 4,
                (this.gameObject.body.velocity.y / speed) * 4
            );
        }
```

- [ ] **Step 3: Commit Interaction Fixes**

```bash
git add src/scenes/OverlayScene.js src/entities/Boss.js
git commit -m "fix: resolve pointer glue bug and cap boss velocity"
```

### Task 4: Fix State, Errors, and Audio Leaks

**Files:**
- Modify: `src/game/bootstrap.js`
- Modify: `src/scenes/OverlayScene.js`
- Modify: `src/scenes/MainScene.js`

- [ ] **Step 1: Fix badge timeout null reference**

Modify `src/game/bootstrap.js`. Track the timeout to clear it cleanly.

```javascript
    // Fade out after 3 seconds
    window.__stickmanBadgeTimeout = setTimeout(() => { 
        if (badge && badge.parentNode) {
            badge.style.opacity = '0'; 
        }
    }, 3000);
```

In `stopGame()`:

```javascript
    if (window.__stickmanBadgeTimeout) {
        clearTimeout(window.__stickmanBadgeTimeout);
    }
    const host = document.getElementById('stickman-fight-host');
```

- [ ] **Step 2: Stop audio on scene shutdown**

Modify `src/scenes/OverlayScene.js`. Ensure background music stops properly.

```javascript
        this.events.on('shutdown', () => {
            if (this.bgmSoft) this.bgmSoft.stop();
            if (this.bgmTriangle) this.bgmTriangle.stop();
            
            // Restore all hidden DOM elements
```

- [ ] **Step 3: Safeguard deferred collision hits**

Modify *both* `src/scenes/OverlayScene.js` and `src/scenes/MainScene.js`. In the collision loop where `takeHit` is deferred:

```javascript
                            if (staticBody.gameObjectClass && typeof staticBody.gameObjectClass.takeHit === 'function') {
                                this.time.delayedCall(0, () => {
                                    if (staticBody.gameObjectClass && staticBody.gameObjectClass.scene) {
                                        staticBody.gameObjectClass.takeHit();
                                    }
                                });
                                this.soundShatter.play();
                            }
```

*(Apply this to the `MainScene.js` `takeHit` delay as well)*

- [ ] **Step 4: Commit State Fixes**

```bash
git add src/game/bootstrap.js src/scenes/OverlayScene.js src/scenes/MainScene.js
git commit -m "fix: resolve badge timeout error, safeguard collisions, and fix audio leak"
```

### Task 5: Fix Architecture Anti-Patterns

**Files:**
- Modify: `src/content.js`
- Modify: `src/entities/Player.js`

- [ ] **Step 1: Prevent duplicate message listeners**

Modify `src/content.js`. Remove old listeners before adding new ones (critical for HMR or double-injects).

```javascript
if (window.__stickmanMessageListener) {
    chrome.runtime.onMessage.removeListener(window.__stickmanMessageListener);
}

window.__stickmanMessageListener = (message, sender, sendResponse) => {
    if (message.action === 'toggle-game') {
```
*And at the end, replace the anonymous listener with `chrome.runtime.onMessage.addListener(window.__stickmanMessageListener);`*

- [ ] **Step 2: Decouple Player audio**

Modify `src/entities/Player.js`. Replace the hardcoded `soundClick` property reference with a dynamic sound call.

```javascript
        // --- Jump (instant velocity, only when grounded) ---
        if ((this.keys.W.isDown || this.virtualJump) && this.isGrounded) {
            this.gameObject.setVelocityY(this.JUMP_VELOCITY);
            this.scene.sound.play('click', { volume: 0.4 });
        }
```

- [ ] **Step 3: Commit Architecture Fixes**

```bash
git add src/content.js src/entities/Player.js
git commit -m "refactor: decouple player audio and prevent duplicate chrome listeners"
```
