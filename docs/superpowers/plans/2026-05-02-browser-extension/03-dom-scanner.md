# Phase 3: DOM Scanner

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scan the host page's DOM, filter for significant visible elements, and create invisible Matter.js static bodies that align with them — turning the webpage into a physics level.

**Architecture:** `DOMScanner.js` traverses the DOM using `querySelectorAll`, applies filtering rules from `elementFilter.js`, and calls `getBoundingClientRect()` to get screen positions. For each qualifying element, it creates a `DOMBlock` entity — an invisible static Matter.js body. The scanner stores references so blocks can be updated or destroyed later.

---

### Task 1: Create the Element Filter

**Files:**
- Create: `src/scanner/elementFilter.js`

- [ ] **Step 1: Write the filter**

```javascript
// src/scanner/elementFilter.js
// Rules for deciding which DOM elements make good physics platforms.

/** Minimum dimensions for an element to be considered a platform */
const MIN_WIDTH = 40;
const MIN_HEIGHT = 15;

/** Tags that are always good candidates */
const GOOD_TAGS = new Set([
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'P', 'IMG', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT',
    'LI', 'TD', 'TH', 'BLOCKQUOTE', 'PRE', 'CODE',
    'NAV', 'HEADER', 'FOOTER', 'ASIDE', 'SECTION', 'ARTICLE',
    'VIDEO', 'AUDIO', 'FIGURE', 'FIGCAPTION', 'A'
]);

/** Tags to always skip */
const SKIP_TAGS = new Set([
    'HTML', 'BODY', 'HEAD', 'SCRIPT', 'STYLE', 'LINK', 'META',
    'BR', 'HR', 'NOSCRIPT', 'SVG', 'PATH', 'CIRCLE', 'RECT',
    'IFRAME' // Cross-origin issues
]);

/**
 * Determines if a DOM element should become a physics platform.
 * @param {HTMLElement} el - The element to test
 * @returns {{ valid: boolean, rect: DOMRect | null }}
 */
export function shouldInclude(el) {
    const tag = el.tagName;

    // Skip known bad tags
    if (SKIP_TAGS.has(tag)) return { valid: false, rect: null };

    // Must be visible
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return { valid: false, rect: null };
    }

    const rect = el.getBoundingClientRect();

    // Must be within the viewport
    if (rect.bottom < 0 || rect.top > window.innerHeight ||
        rect.right < 0 || rect.left > window.innerWidth) {
        return { valid: false, rect: null };
    }

    // Must meet minimum size
    if (rect.width < MIN_WIDTH || rect.height < MIN_HEIGHT) {
        return { valid: false, rect: null };
    }

    // Good tags pass automatically
    if (GOOD_TAGS.has(tag)) return { valid: true, rect };

    // For generic divs/spans: only include if they are "leaf" nodes
    // (contain text directly, not just wrapper divs)
    if (tag === 'DIV' || tag === 'SPAN') {
        const hasDirectText = Array.from(el.childNodes).some(
            n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0
        );
        const hasNoBlockChildren = !el.querySelector('div, p, section, article, header, footer, nav, aside');
        if (hasDirectText || hasNoBlockChildren) {
            return { valid: true, rect };
        }
        return { valid: false, rect: null };
    }

    return { valid: false, rect: null };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scanner/elementFilter.js
git commit -m "feat: add element filter rules for DOM-to-physics mapping"
```

---

### Task 2: Create the DOMBlock Entity

**Files:**
- Create: `src/entities/DOMBlock.js`

- [ ] **Step 1: Write DOMBlock.js**

This replaces `GoogleElement` for extension mode. It wraps an invisible Matter.js body aligned to a real DOM element.

```javascript
// src/entities/DOMBlock.js
// An invisible static Matter.js body aligned to a real DOM element.
// When destroyed, it screenshots the element and becomes a dynamic falling sprite.

export default class DOMBlock {
    constructor(scene, domElement, rect) {
        this.scene = scene;
        this.domElement = domElement;
        this.rect = rect;
        this.isFallen = false;
        this.hits = 0;
        this.maxHits = Math.max(1, Math.ceil((rect.width * rect.height) / 20000));

        // Create invisible static physics body at the element's screen position
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        this.body = scene.matter.add.rectangle(centerX, centerY, rect.width, rect.height, {
            isStatic: true,
            label: 'dom-block',
            chamfer: { radius: Math.min(rect.width, rect.height) * 0.05 }
        });

        // Store reference on the body for collision lookups
        this.body.gameObjectClass = this;
        this.body.domElement = domElement;
    }

    takeHit() {
        if (this.isFallen) return;
        this.hits++;

        if (this.hits >= this.maxHits) {
            // Phase 4 will replace this with the screenshot pipeline
            this.fallOut();
        } else {
            // Visual feedback: briefly highlight the real DOM element
            const el = this.domElement;
            const prevOutline = el.style.outline;
            el.style.outline = '3px solid red';
            setTimeout(() => { el.style.outline = prevOutline; }, 150);
        }
    }

    fallOut() {
        if (this.isFallen) return;
        this.isFallen = true;

        // For now (before Phase 4): just hide the element and remove body
        this.domElement.style.opacity = '0.3';
        this.scene.matter.world.remove(this.body);

        // Phase 4 will: screenshot → texture → dynamic sprite
    }

    destroy() {
        if (this.body) {
            this.scene.matter.world.remove(this.body);
            this.body = null;
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/DOMBlock.js
git commit -m "feat: add DOMBlock entity — invisible physics body aligned to DOM elements"
```

---

### Task 3: Create the DOM Scanner

**Files:**
- Create: `src/scanner/DOMScanner.js`

- [ ] **Step 1: Write DOMScanner.js**

```javascript
// src/scanner/DOMScanner.js
// Traverses the host page DOM and creates DOMBlock physics bodies.

import { shouldInclude } from './elementFilter.js';
import DOMBlock from '../entities/DOMBlock.js';

export default class DOMScanner {
    constructor(scene) {
        this.scene = scene;
        this.blocks = [];
    }

    /**
     * Scan the current viewport and create physics bodies.
     * Call this once when the game activates.
     */
    scan() {
        this.clear();

        // Ignore our own injected elements
        const hostEl = document.getElementById('stickman-fight-host');

        const allElements = document.querySelectorAll('*');
        const rects = []; // Track placed rects to avoid heavy overlaps

        for (const el of allElements) {
            // Skip our own game container
            if (hostEl && hostEl.contains(el)) continue;

            const result = shouldInclude(el);
            if (!result.valid) continue;

            const rect = result.rect;

            // Skip if this rect heavily overlaps an already-placed rect
            // (prevents double physics bodies for nested elements)
            const dominated = rects.some(existing =>
                rect.left >= existing.left - 5 &&
                rect.right <= existing.right + 5 &&
                rect.top >= existing.top - 5 &&
                rect.bottom <= existing.bottom + 5
            );
            if (dominated) continue;

            rects.push(rect);

            const block = new DOMBlock(this.scene, el, rect);
            this.blocks.push(block);
        }

        console.log(`[StickmanFight] Scanned ${allElements.length} elements, created ${this.blocks.length} physics blocks`);
    }

    /** Remove all physics bodies (for cleanup/teardown) */
    clear() {
        for (const block of this.blocks) {
            block.destroy();
        }
        this.blocks = [];
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scanner/DOMScanner.js
git commit -m "feat: add DOMScanner — traverses DOM and creates physics blocks"
```

---

### Task 4: Integrate Scanner into OverlayScene

**Files:**
- Modify: `src/scenes/OverlayScene.js`

- [ ] **Step 1: Import and call the scanner in `create()`**

Add these lines to `OverlayScene.create()` after the player spawn:

```javascript
// At the top of the file, add:
import DOMScanner from '../scanner/DOMScanner.js';

// Inside create(), after `this.player = new Player(...)`:
this.domScanner = new DOMScanner(this);
this.domScanner.scan();
```

- [ ] **Step 2: Add collision handling for DOMBlocks**

Add collision logic to `OverlayScene.create()`, after the scanner call:

```javascript
// Collision handling for DOM blocks
this.matter.world.on('collisionstart', (event) => {
    event.pairs.forEach(pair => {
        const { bodyA, bodyB, collision } = pair;
        const parentA = bodyA.parent || bodyA;
        const parentB = bodyB.parent || bodyB;

        const checkHit = (staticBody, dynamicBody) => {
            if (staticBody.label === 'dom-block' && staticBody.isStatic && !dynamicBody.isStatic) {
                const speed = Math.hypot(dynamicBody.velocity.x, dynamicBody.velocity.y);
                if (speed > 6 || collision.depth > 3) {
                    if (staticBody.gameObjectClass) {
                        staticBody.gameObjectClass.takeHit();
                    }
                }
            }
        };

        checkHit(parentA, parentB);
        checkHit(parentB, parentA);
    });
});
```

- [ ] **Step 3: Add pointer click to detach DOM blocks**

```javascript
// Click-to-detach DOM blocks (Boss player mechanic)
this.input.on('pointerdown', (pointer) => {
    const bodies = this.matter.world.engine.world.bodies;
    const worldPoint = { x: pointer.worldX, y: pointer.worldY };
    const clicked = this.matter.query.point(bodies, worldPoint);

    for (const body of clicked) {
        if (body.label === 'dom-block' && body.isStatic && body.gameObjectClass) {
            body.gameObjectClass.fallOut();
            break;
        }
    }
});
```

- [ ] **Step 4: Commit**

```bash
git add src/scenes/OverlayScene.js
git commit -m "feat: integrate DOMScanner into OverlayScene with collision handling"
```

---

### Task 5: End-to-End Test — Stickman on Real DOM Elements

- [ ] **Step 1: Build and reload extension**

```bash
pnpm run build
```

Reload the extension in `chrome://extensions`.

- [ ] **Step 2: Test on Wikipedia**

1. Navigate to `https://en.wikipedia.org`
2. Activate the game via popup
3. Verify: Console logs `[StickmanFight] Scanned X elements, created Y physics blocks`
4. Verify: The stickman can jump on headings, paragraphs, and images
5. Verify: The stickman falls through empty whitespace
6. Verify: Clicking on a DOM block makes it fade out (opacity 0.3)

- [ ] **Step 3: Test on Google**

1. Navigate to `https://www.google.com`
2. Activate the game
3. Verify: The search bar, buttons, and logo act as platforms

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "milestone: Phase 3 complete — DOM elements are physics platforms"
```
