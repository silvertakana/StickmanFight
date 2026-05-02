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
            this._dissolveAndDestroy();
            return;
        }

        if (this.fallenSprite) {
            this._applyNoiseOverlay(this.projectileHits);
        }

        if (!this.isFallenButProcessed) {
            this.isFallen = true;
            this.fallOut();
        }
    }

    /**
     * Applies static TV-noise grain over the sprite's canvas texture.
     * @param {number} hitLevel - 1 or 2, controls noise density
     */
    _applyNoiseOverlay(hitLevel) {
        if (!this.textureKey || !this.scene || !this.scene.textures) return;
        const tex = this.scene.textures.get(this.textureKey);
        if (!tex) return;
        const source = tex.getSourceImage();
        if (!(source instanceof HTMLCanvasElement)) return;

        const w = source.width;
        const h = source.height;
        if (w === 0 || h === 0) return;

        const ctx = source.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // Noise density: hit 1 = 30% of pixels, hit 2 = 60%
        const density = hitLevel === 1 ? 0.30 : 0.60;
        // Noise opacity: hit 1 = semi-transparent, hit 2 = more opaque
        const noiseAlpha = hitLevel === 1 ? 0.45 : 0.75;

        for (let i = 0; i < data.length; i += 4) {
            // Skip fully transparent pixels (preserve shape)
            if (data[i + 3] < 10) continue;

            if (Math.random() < density) {
                // Random grayscale noise value
                const noise = Math.random() * 255;
                // Blend noise with existing pixel
                const blend = noiseAlpha;
                const invBlend = 1 - blend;
                data[i]     = Math.round(data[i]     * invBlend + noise * blend); // R
                data[i + 1] = Math.round(data[i + 1] * invBlend + noise * blend); // G
                data[i + 2] = Math.round(data[i + 2] * invBlend + noise * blend); // B
            }
        }

        ctx.putImageData(imageData, 0, 0);
        tex.update();
    }

    /**
     * Dissolve effect: rapidly animate noise grain to 100% coverage
     * while fading alpha, then destroy.
     */
    _dissolveAndDestroy() {
        if (!this.fallenSprite || !this.scene) {
            this.destroy();
            return;
        }

        const duration = 600; // ms
        const steps = 8;
        const stepDelay = duration / steps;
        let step = 0;

        const dissolveTimer = this.scene.time.addEvent({
            delay: stepDelay,
            repeat: steps - 1,
            callback: () => {
                step++;
                const progress = step / steps; // 0..1

                // Intensify noise on the texture
                this._applyDissolveNoise(progress);

                // Fade out alpha
                if (this.fallenSprite) {
                    this.fallenSprite.setAlpha(1 - progress * 0.9);
                }

                // Final step: destroy
                if (step >= steps) {
                    this.destroy();
                }
            }
        });
        this._dissolveTimer = dissolveTimer;
    }

    /**
     * Progressive dissolve noise — increases coverage and erases pixels.
     * @param {number} progress - 0 to 1
     */
    _applyDissolveNoise(progress) {
        if (!this.textureKey || !this.scene || !this.scene.textures) return;
        const tex = this.scene.textures.get(this.textureKey);
        if (!tex) return;
        const source = tex.getSourceImage();
        if (!(source instanceof HTMLCanvasElement)) return;

        const w = source.width;
        const h = source.height;
        if (w === 0 || h === 0) return;

        const ctx = source.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // Density ramps from 50% to 100%, noise dominance increases
        const density = 0.5 + progress * 0.5;
        const eraseChance = progress * 0.4; // Late-stage pixels get erased entirely

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 10) continue;

            if (Math.random() < density) {
                if (Math.random() < eraseChance) {
                    // Erase pixel (dissolve away)
                    data[i + 3] = 0;
                } else {
                    // Harsh static noise
                    const noise = Math.random() > 0.5 ? 255 : 0; // B&W static
                    data[i]     = noise;
                    data[i + 1] = noise;
                    data[i + 2] = noise;
                    // Slightly reduce alpha for shimmer effect
                    data[i + 3] = Math.max(0, data[i + 3] - Math.floor(Math.random() * 40 * progress));
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
        tex.update();
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

        // Apply existing noise if it was hit before falling
        // (noise is baked into the canvas texture, so it will carry over
        // once the real texture loads and _applyNoiseOverlay is re-called)

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

                        // Re-apply noise if hits occurred while the texture was loading
                        if (this.projectileHits > 0 && this.projectileHits < 3) {
                            this._applyNoiseOverlay(this.projectileHits);
                        }
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
        if (this._dissolveTimer) {
            this._dissolveTimer.remove();
            this._dissolveTimer = null;
        }
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
