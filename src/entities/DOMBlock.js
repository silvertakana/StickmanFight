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
