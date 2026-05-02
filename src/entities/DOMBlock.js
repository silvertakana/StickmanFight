// src/entities/DOMBlock.js

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

        // Make the block permanently visible for debugging
        this.domElement.style.outline = '2px dashed #00ff00';
        this.domElement.style.outlineOffset = '-2px';
    }

    takeHit() {
        if (this.isFallen) return;
        this.hits++;

        if (this.hits >= this.maxHits) {
            this.fallOut();
        } else {
            const el = this.domElement;
            el.style.outline = '3px solid red';
            setTimeout(() => { 
                if (!this.isFallen) el.style.outline = '2px dashed #00ff00'; 
            }, 150);
        }
    }

    fallOut() {
        if (this.isFallen) return;
        this.isFallen = true;

        const rect = this.rect;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Remove the invisible static body
        this.scene.matter.world.remove(this.body);

        // Hide the real DOM element instantly so it looks "detached"
        this.domElement.style.opacity = '0';
        this.domElement.style.pointerEvents = 'none';

        // Create a visible Phaser sprite IMMEDIATELY with a placeholder (or empty) so physics/dragging works instantly
        // We'll use a blank texture initially
        const tempKey = `temp-${Date.now()}-${Math.random()}`;
        const fallback = document.createElement('canvas');
        fallback.width = rect.width;
        fallback.height = rect.height;
        // Optionally fill with a subtle color or leave transparent. Let's use a subtle outline or gray so they see they grabbed it
        const ctx = fallback.getContext('2d');
        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        ctx.fillRect(0, 0, rect.width, rect.height);
        this.scene.textures.addCanvas(tempKey, fallback);

        const sprite = this.scene.add.sprite(centerX, centerY, tempKey);
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

        // Asynchronously capture the DOM element (we unhide it briefly off-screen or just accept that it might capture the transparent state?
        // Wait, html2canvas needs the element to not be display:none, but opacity: 0 might be captured as transparent!
        // Actually, we can temporarily restore opacity, capture, and hide again.
        this._captureTexture();
    }

    async _captureTexture() {
        const rect = this.rect;
        let textureKey = `dom-capture-${Date.now()}-${Math.random()}`;

        try {
            console.time(`[StickmanFight] _captureTexture ${textureKey}`);
            const img = window.__stickmanScreenshotImage;
            
            // Fallback if screenshot failed
            if (!img) {
                console.warn('[StickmanFight] No screenshot available, keeping placeholder.');
                return;
            }

            const dpr = window.devicePixelRatio || 1;
            
            const canvas = document.createElement('canvas');
            canvas.width = rect.width;
            canvas.height = rect.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
            ctx.drawImage(
                img,
                rect.left * dpr,
                rect.top * dpr,
                rect.width * dpr,
                rect.height * dpr,
                0,
                0,
                rect.width,
                rect.height
            );

            // Check if blank just in case, though much less likely now
            let isBlank = true;
            if (ctx && canvas.width > 0 && canvas.height > 0) {
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = new Uint32Array(imgData.data.buffer);
                for (let i = 0; i < pixels.length; i++) {
                    if (pixels[i] !== 0) {
                        isBlank = false;
                        break;
                    }
                }
            }

            if (!isBlank && this.scene && this.scene.textures) {
                this.scene.textures.addCanvas(textureKey, canvas);
                if (this.fallenSprite && this.fallenSprite.active) {
                    this.fallenSprite.setTexture(textureKey);
                }
            } else if (isBlank) {
                console.warn('[StickmanFight] Cropped image is blank, keeping placeholder.');
            }
            console.timeEnd(`[StickmanFight] _captureTexture ${textureKey}`);
        } catch (err) {
            console.warn('[StickmanFight] _captureTexture failed', err);
        }
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
