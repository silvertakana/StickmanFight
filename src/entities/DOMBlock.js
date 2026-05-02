import { toCanvas } from 'html-to-image';

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
            this.isFallen = true;
            this.fallOut();
        }
    }

    fallOut(suppressKick = false) {
        if (this.isFallenButProcessed) return;
        this.isFallenButProcessed = true;

        const rect = this.rect;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Remove the invisible static body outside the physics step
        if (this.scene && this.scene.time) {
            if (this.body) {
                this.body.isSensor = true;
                this.body.collisionFilter.mask = 0;
                this.body.label = 'dom-block-removed';
            }
            this.scene.time.delayedCall(0, () => {
                if (this.body && this.scene.matter && this.scene.matter.world) {
                    this.scene.matter.world.remove(this.body);
                }
            });
        }

        this.domElement.style.outline = 'none';

        // Use html-to-image for blazing fast, perfectly isolated off-screen rendering
        // Use html-to-image for blazing fast, perfectly isolated off-screen rendering
        const texturePromise = toCanvas(this.domElement, {
            width: rect.width,
            height: rect.height,
            pixelRatio: window.devicePixelRatio || 1, // Let it use high-res scaling to prevent internal SVG cropping
            skipFonts: false, // Keep fonts so text looks correct
            style: {
                // Force the clone to perfectly match the physics boundaries
                // and ignore any layout offsets or transforms from the original page
                margin: '0',
                top: '0',
                left: '0',
                width: rect.width + 'px',
                height: rect.height + 'px',
                boxSizing: 'border-box',
                transform: 'none'
            }
        }).then(canvas => {
            // Hide element ONLY AFTER the off-screen capture is fully complete!
            // This prevents the user from seeing any flicker or missing frames.
            this.domElement.style.opacity = '0';
            this.domElement.style.pointerEvents = 'none';

            // Ensure canvas is optimized for our physics engine's rapid readbacks
            const optimizedCanvas = document.createElement('canvas');
            optimizedCanvas.width = rect.width;
            optimizedCanvas.height = rect.height;
            const ctx = optimizedCanvas.getContext('2d', { willReadFrequently: true });
            
            // Draw the high-res generated canvas onto our 1x optimized canvas, 
            // perfectly downscaling it to our exact physics rect boundaries.
            ctx.drawImage(canvas, 0, 0, rect.width, rect.height);

            return optimizedCanvas;
        });

        // Create a visible Phaser sprite IMMEDIATELY with an invisible placeholder
        const textureKey = `dom-capture-${Date.now()}-${Math.random()}`;
        const fallback = document.createElement('canvas');
        fallback.width = rect.width;
        fallback.height = rect.height;
        const ctx = fallback.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, rect.width, rect.height);
        this.scene.textures.addCanvas(textureKey, fallback);

        const sprite = this.scene.add.sprite(centerX, centerY, textureKey);
        this.fallenSprite = this.scene.matter.add.gameObject(sprite, {
            label: 'dom-block-fallen',
            mass: (rect.width * rect.height) / 2000,
            friction: 0.5,
            restitution: 0.3,
            chamfer: { radius: Math.min(rect.width, rect.height) * 0.05 }
        });

        if (!suppressKick) {
            const mass = this.fallenSprite.body.mass;
            this.fallenSprite.setAngularVelocity((Math.random() - 0.5) * 0.08);
            this.fallenSprite.applyForce({
                x: (Math.random() - 0.5) * 0.015 * mass,
                y: -0.008 * mass
            });
        }

        texturePromise.then((canvas) => {
            if (canvas && canvas.width > 0 && canvas.height > 0) {
                const checkCtx = canvas.getContext('2d', { willReadFrequently: true });
                let hasPixels = true; 
                
                try {
                    const imgData = checkCtx.getImageData(0, 0, canvas.width, canvas.height).data;
                    hasPixels = false;
                    for (let i = 3; i < imgData.length; i += 4) {
                        if (imgData[i] > 10) { hasPixels = true; break; }
                    }
                } catch (e) {
                    console.warn('[StickmanFight] Tainted canvas, using texture anyway');
                }

                if (!hasPixels) return;

                if (this.scene && this.scene.textures) {
                    const tex = this.scene.textures.get(textureKey);
                    if (tex && tex.getSourceImage() instanceof HTMLCanvasElement) {
                        const texCanvas = tex.getSourceImage();
                        const texCtx = texCanvas.getContext('2d', { willReadFrequently: true });
                        texCtx.clearRect(0, 0, texCanvas.width, texCanvas.height);
                        texCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, texCanvas.width, texCanvas.height);
                        tex.update();
                    }
                }
            }
        }).catch(err => {
            // If html-to-image fails, at least hide the element so the player can interact
            this.domElement.style.opacity = '0';
            this.domElement.style.pointerEvents = 'none';
            console.error('[StickmanFight] html-to-image capture error:', err);
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
