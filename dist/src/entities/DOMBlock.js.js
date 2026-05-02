// Global cache for native viewport captures to prevent Chrome throttling 
// when multiple blocks (e.g., in an AOE explosion) fall simultaneously.
let sharedCapturePromise = null;

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

    takeProjectileHit() {
        this.projectileHits = (this.projectileHits || 0) + 1;

        if (this.projectileHits >= 3) {
            this.destroy();
            return;
        }

        if (this.fallenSprite) {
            if (this.projectileHits === 1) {
                this.fallenSprite.setTint(0xaaaaaa);
            } else if (this.projectileHits === 2) {
                this.fallenSprite.setTint(0x555555);
            }
        }

        if (!this.isFallenButProcessed) {
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

        // --- STACKING CONTEXT BREAKOUT ---
        // Elevate the element AND all its ancestors to the top of the stacking context.
        // This guarantees that even if trapped in a low z-index container, it pops 
        // over sticky headers before the screenshot is taken.
        const originalStyles = [];
        let curr = this.domElement;
        while (curr && curr !== document.body && curr !== document.documentElement) {
            const computed = window.getComputedStyle(curr);
            originalStyles.push({
                el: curr,
                zIndex: curr.style.zIndex,
                position: curr.style.position
            });
            if (computed.position === 'static') {
                curr.style.position = 'relative';
            }
            curr.style.zIndex = '2147483645';
            curr = curr.parentElement;
        }
        // -----------------------------------

        const viewportRect = this.domElement.getBoundingClientRect();

        // Batch concurrent capture requests into a single full-screen screenshot
        if (!sharedCapturePromise) {
            sharedCapturePromise = new Promise((resolve, reject) => {
                // Wait 60ms to guarantee the browser has actually painted the new 
                // recursive z-index tree to the screen compositor before we take the picture.
                setTimeout(() => {
                    chrome.runtime.sendMessage({ action: 'capture-screen' }, (response) => {
                        if (chrome.runtime.lastError || !response || !response.dataUrl) {
                            return reject(new Error('Native capture failed'));
                        }
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.onerror = () => reject(new Error('Image load failed'));
                        img.src = response.dataUrl;
                    });
                }, 60);
            });

            // Clear the cache shortly after so future distinct hits get a fresh capture
            setTimeout(() => {
                sharedCapturePromise = null;
            }, 150);
        }

        const texturePromise = sharedCapturePromise.then((fullScreenImg) => {
            // Restore original stacking context styles so the page doesn't stay broken
            for (const cache of originalStyles) {
                cache.el.style.zIndex = cache.zIndex;
                cache.el.style.position = cache.position;
            }

            // Hide element ONLY AFTER the shared screenshot is fully resolved!
            this.domElement.style.opacity = '0';
            this.domElement.style.pointerEvents = 'none';

            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = rect.width;
            cropCanvas.height = rect.height;
            const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
            
            // Account for Retina displays
            const dpr = window.devicePixelRatio || 1;
            
            // Crop out this specific element from the shared full screen capture
            cropCtx.drawImage(
                fullScreenImg,
                viewportRect.left * dpr,
                viewportRect.top * dpr,
                viewportRect.width * dpr,
                viewportRect.height * dpr,
                0, 0, rect.width, rect.height
            );
            return cropCanvas;
        });

        // Create a visible Phaser sprite IMMEDIATELY with an invisible placeholder
        const textureKey = `dom-capture-${Date.now()}-${Math.random()}`;
        this.textureKey = textureKey;
        const fallback = document.createElement('canvas');
        fallback.width = rect.width;
        fallback.height = rect.height;
        const ctx = fallback.getContext('2d', { willReadFrequently: true });
        // Must be completely transparent! If we draw a gray box here, the native 
        // captureVisibleTab will capture the screen WITH the gray box on top of the element!
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
        this.fallenSprite.body.gameObjectClass = this;

        // Apply existing tint if it was hit before falling
        if (this.projectileHits === 1) {
            this.fallenSprite.setTint(0xaaaaaa);
        } else if (this.projectileHits === 2) {
            this.fallenSprite.setTint(0x555555);
        }

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
                    console.warn('[StickmanFight] Tainted canvas (foreignObject CORS), using texture anyway');
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
            this.domElement.style.opacity = '0';
            this.domElement.style.pointerEvents = 'none';
            console.error('[StickmanFight] Texture capture error:', err);
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
        if (this.textureKey && this.scene && this.scene.textures && this.scene.textures.exists(this.textureKey)) {
            this.scene.textures.remove(this.textureKey);
        }
    }
}
