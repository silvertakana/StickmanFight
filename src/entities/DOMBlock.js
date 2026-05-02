// src/entities/DOMBlock.js
import html2canvas from 'html2canvas';

// Global queue to prevent html2canvas from crashing the browser by running in parallel
let renderQueue = Promise.resolve();

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
            this.isFallen = true; // Mark instantly
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
        if (this.isFallenButProcessed) return;
        this.isFallenButProcessed = true;

        const rect = this.rect;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Remove the invisible static body outside the physics step
        if (this.scene && this.scene.time) {
            this.scene.time.delayedCall(0, () => {
                if (this.body && this.scene.matter && this.scene.matter.world) {
                    this.scene.matter.world.remove(this.body);
                }
            });
        }

        // Add to the global queue so we only render one html2canvas at a time
        renderQueue = renderQueue.then(async () => {
            const oldOutline = this.domElement.style.outline;
            this.domElement.style.outline = 'none';

            let canvas = null;
            try {
                canvas = await html2canvas(this.domElement, {
                    backgroundColor: null,
                    scale: 1, // Keep scale 1 to maximize performance and prevent OOM
                    logging: false,
                    useCORS: true
                });
            } catch(e) {
                console.warn('[StickmanFight] html2canvas error:', e);
                this.domElement.style.outline = oldOutline;
            }

            // Hide the real DOM element
            this.domElement.style.opacity = '0';
            this.domElement.style.pointerEvents = 'none';

            const textureKey = `dom-capture-${Date.now()}-${Math.random()}`;
            if (canvas && this.scene && this.scene.textures) {
                this.scene.textures.addCanvas(textureKey, canvas);
            } else {
                // Fallback blank box if html2canvas fails
                canvas = document.createElement('canvas');
                canvas.width = rect.width;
                canvas.height = rect.height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
                ctx.fillRect(0, 0, rect.width, rect.height);
                this.scene.textures.addCanvas(textureKey, canvas);
            }

            // If the scene is destroyed while we were awaiting html2canvas, abort
            if (!this.scene || !this.scene.add) return;

            const sprite = this.scene.add.sprite(centerX, centerY, textureKey);
            
            // Adjust scale if canvas size differs from rect (e.g. padding/margins)
            if (canvas && canvas.width !== 0 && canvas.width !== rect.width) {
                 sprite.setScale(rect.width / canvas.width);
            }

            this.fallenSprite = this.scene.matter.add.gameObject(sprite, {
                label: 'dom-block-fallen',
                mass: (rect.width * rect.height) / 2000,
                friction: 0.5,
                restitution: 0.3,
                chamfer: { radius: Math.min(rect.width, rect.height) * 0.05 }
            });

            const mass = this.fallenSprite.body.mass;
            this.fallenSprite.setAngularVelocity((Math.random() - 0.5) * 0.08);
            this.fallenSprite.applyForce({
                x: (Math.random() - 0.5) * 0.015 * mass,
                y: -0.008 * mass
            });
            
            // Small pause between renders to let the browser breathe/render frames
            return new Promise(resolve => setTimeout(resolve, 10));
        }).catch(err => {
            console.error('[StickmanFight] Render queue error', err);
        });
    }

    destroy() {
        if (this.body && this.scene && this.scene.matter) {
            this.scene.matter.world.remove(this.body);
            this.body = null;
        }
        if (this.fallenSprite) {
            this.fallenSprite.destroy();
            this.fallenSprite = null;
        }
    }
}
