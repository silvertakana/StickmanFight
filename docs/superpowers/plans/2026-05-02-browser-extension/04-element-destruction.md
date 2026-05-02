# Phase 4: Element Destruction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a DOM block is destroyed, screenshot the real HTML element using `html2canvas`, create a Phaser sprite textured with that screenshot, hide the real element, and let the sprite fall as a dynamic physics body.

**Architecture:** `DOMBlock.fallOut()` is upgraded to: (1) call `html2canvas(domElement)` to capture the element's appearance, (2) load the resulting canvas as a Phaser texture, (3) create a Matter.js sprite with that texture, (4) set the real DOM element to `opacity: 0`, (5) apply forces so the screenshot-sprite tumbles away.

---

### Task 1: Upgrade DOMBlock with Screenshot Pipeline

**Files:**
- Modify: `src/entities/DOMBlock.js`

- [ ] **Step 1: Add the html2canvas import and async fallOut**

Replace the entire `DOMBlock.js` with:

```javascript
// src/entities/DOMBlock.js
import html2canvas from 'html2canvas';

export default class DOMBlock {
    constructor(scene, domElement, rect) {
        this.scene = scene;
        this.domElement = domElement;
        this.rect = rect;
        this.isFallen = false;
        this.hits = 0;
        this.maxHits = Math.max(1, Math.ceil((rect.width * rect.height) / 20000));

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        this.body = scene.matter.add.rectangle(centerX, centerY, rect.width, rect.height, {
            isStatic: true,
            label: 'dom-block',
            chamfer: { radius: Math.min(rect.width, rect.height) * 0.05 }
        });

        this.body.gameObjectClass = this;
        this.body.domElement = domElement;
    }

    takeHit() {
        if (this.isFallen) return;
        this.hits++;

        if (this.hits >= this.maxHits) {
            this.fallOut();
        } else {
            const el = this.domElement;
            const prevOutline = el.style.outline;
            el.style.outline = '3px solid red';
            setTimeout(() => { el.style.outline = prevOutline; }, 150);
        }
    }

    async fallOut() {
        if (this.isFallen) return;
        this.isFallen = true;

        const rect = this.rect;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Remove the invisible static body
        this.scene.matter.world.remove(this.body);

        let textureKey = `dom-capture-${Date.now()}-${Math.random()}`;

        try {
            // Screenshot the real DOM element
            const canvas = await html2canvas(this.domElement, {
                backgroundColor: null,        // Transparent background
                logging: false,
                useCORS: true,                // Attempt cross-origin images
                scale: 1,                     // 1:1 pixel ratio for performance
                width: rect.width,
                height: rect.height
            });

            // Add the canvas as a Phaser texture
            this.scene.textures.addCanvas(textureKey, canvas);
        } catch (err) {
            console.warn('[StickmanFight] html2canvas failed, using fallback', err);
            // Fallback: create a grey rectangle texture
            const fallback = document.createElement('canvas');
            fallback.width = rect.width;
            fallback.height = rect.height;
            const ctx = fallback.getContext('2d');
            ctx.fillStyle = '#666';
            ctx.fillRect(0, 0, rect.width, rect.height);
            this.scene.textures.addCanvas(textureKey, fallback);
        }

        // Hide the real DOM element
        this.domElement.style.opacity = '0';
        this.domElement.style.pointerEvents = 'none';

        // Create a visible Phaser sprite with the screenshot
        const sprite = this.scene.add.sprite(centerX, centerY, textureKey);
        this.fallenSprite = this.scene.matter.add.gameObject(sprite, {
            label: 'dom-block-fallen',
            mass: (rect.width * rect.height) / 2000,
            friction: 0.5,
            restitution: 0.3,
            chamfer: { radius: Math.min(rect.width, rect.height) * 0.05 }
        });

        // Give it a rotation kick and slight upward pop
        const mass = this.fallenSprite.body.mass;
        this.fallenSprite.setAngularVelocity((Math.random() - 0.5) * 0.08);
        this.fallenSprite.applyForce({
            x: (Math.random() - 0.5) * 0.015 * mass,
            y: -0.008 * mass
        });
    }

    destroy() {
        if (this.body) {
            this.scene.matter.world.remove(this.body);
            this.body = null;
        }
        if (this.fallenSprite) {
            this.fallenSprite.destroy();
            this.fallenSprite = null;
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/DOMBlock.js
git commit -m "feat: upgrade DOMBlock with html2canvas screenshot-to-physics pipeline"
```

---

### Task 2: Add Collision Sounds for DOM Blocks

**Files:**
- Modify: `src/scenes/OverlayScene.js`

- [ ] **Step 1: Load impact sounds in preload()**

Add to `OverlayScene.preload()`:

```javascript
this.load.audio('impact-light',
    resolveAssetPath('assets/audio/sfx/impact/Audio/impactGeneric_light_000.ogg'));
this.load.audio('shatter',
    resolveAssetPath('assets/audio/sfx/interface/Audio/bong_001.ogg'));
```

- [ ] **Step 2: Initialize sound objects in create()**

Add to `OverlayScene.create()` after `this.soundClick`:

```javascript
this.soundImpactLight = this.sound.add('impact-light', { volume: 0.3 });
this.soundShatter = this.sound.add('shatter', { volume: 0.6 });
```

- [ ] **Step 3: Play sounds on collision**

Update the collision handler to play sounds:

```javascript
const checkHit = (staticBody, dynamicBody) => {
    if (staticBody.label === 'dom-block' && staticBody.isStatic && !dynamicBody.isStatic) {
        const speed = Math.hypot(dynamicBody.velocity.x, dynamicBody.velocity.y);
        if (speed > 6 || collision.depth > 3) {
            if (staticBody.gameObjectClass) {
                staticBody.gameObjectClass.takeHit();
                this.soundShatter.play();
            }
        } else if (speed > 2) {
            if (!this.soundImpactLight.isPlaying) {
                this.soundImpactLight.play();
            }
        }
    }
};
```

- [ ] **Step 4: Commit**

```bash
git add src/scenes/OverlayScene.js
git commit -m "feat: add collision sounds for DOM block interactions"
```

---

### Task 3: End-to-End Test — Screenshot Destruction

- [ ] **Step 1: Build and reload**

```bash
pnpm run build
```

Reload extension in `chrome://extensions`.

- [ ] **Step 2: Test the destruction flow**

1. Navigate to `https://en.wikipedia.org`
2. Activate the game
3. Click on a heading or paragraph → it should:
   - Briefly freeze while `html2canvas` captures it
   - The real HTML element fades to transparent
   - A sprite with the element's screenshot appears and tumbles away under gravity
4. Verify: The fallen sprite collides with the floor and other elements
5. Verify: Sound effects play on collision

- [ ] **Step 3: Test CORS fallback**

1. Navigate to a page with cross-origin images
2. Activate and click an image element
3. Verify: If `html2canvas` fails, a grey fallback rectangle falls instead (no crash)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "milestone: Phase 4 complete — DOM elements screenshot and fall as physics sprites"
```
