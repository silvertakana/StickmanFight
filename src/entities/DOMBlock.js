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
