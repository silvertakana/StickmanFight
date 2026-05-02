import html2canvas from 'html2canvas';

/** Tags to strip during html2canvas capture to prevent CSP/cloning crashes */
const HTML2CANVAS_IGNORED_TAGS = new Set([
    'IFRAME', 'SCRIPT', 'NOSCRIPT', 'VIDEO', 'SVG', 'PATH',
    'FOREIGNOBJECT', 'OBJECT', 'EMBED'
]);

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

        // Check if the element contains complex tags that html2canvas struggles with
        const complexTags = ['SVG', 'IFRAME', 'EMBED', 'OBJECT', 'VIDEO', 'CANVAS'];
        const isComplex = complexTags.includes(this.domElement.tagName.toUpperCase()) ||
                          complexTags.some(tag => this.domElement.querySelector(tag) !== null);

        let texturePromise;

        if (isComplex) {
            // HYBRID FALLBACK: Native Viewport Capture
            texturePromise = new Promise((resolve, reject) => {
                // Get fresh viewport coordinates in case the user scrolled
                const viewportRect = this.domElement.getBoundingClientRect();
                
                // Hide element AFTER getting rect, but BEFORE capture
                chrome.runtime.sendMessage({ action: 'capture-screen' }, (response) => {
                    // Hide immediately after capture is taken by the background script!
                    this.domElement.style.opacity = '0';
                    this.domElement.style.pointerEvents = 'none';

                    if (chrome.runtime.lastError || !response || !response.dataUrl) {
                        return reject(new Error('Native capture failed'));
                    }

                    const img = new Image();
                    img.onload = () => {
                        const cropCanvas = document.createElement('canvas');
                        cropCanvas.width = rect.width;
                        cropCanvas.height = rect.height;
                        const cropCtx = cropCanvas.getContext('2d');
                        
                        // Account for Retina displays (native capture scales up)
                        const dpr = window.devicePixelRatio || 1;
                        
                        // Crop the exact element from the full screen capture
                        cropCtx.drawImage(
                            img,
                            viewportRect.left * dpr,
                            viewportRect.top * dpr,
                            viewportRect.width * dpr,
                            viewportRect.height * dpr,
                            0, 0, rect.width, rect.height
                        );
                        resolve(cropCanvas);
                    };
                    img.onerror = () => reject(new Error('Image load failed'));
                    img.src = response.dataUrl;
                });
            });
        } else {
            // STANDARD PATH: html2canvas
            this.domElement.classList.add('stickman-html2canvas-target');
            this.domElement.style.opacity = '0';
            this.domElement.style.pointerEvents = 'none';

            texturePromise = html2canvas(this.domElement, {
                backgroundColor: null,
                scale: 1,
                width: rect.width,
                height: rect.height,
                logging: false,
                useCORS: true,
                imageTimeout: 150,
                foreignObjectRendering: true,
                onclone: (clonedDoc) => {
                    const clonedEls = clonedDoc.querySelectorAll('.stickman-html2canvas-target');
                    for (const el of clonedEls) {
                        el.style.opacity = '1';
                        el.classList.remove('stickman-html2canvas-target');
                    }
                },
                ignoreElements: (node) => {
                    if (!node || !node.tagName) return false;
                    const tag = node.tagName.toUpperCase();
                    if (HTML2CANVAS_IGNORED_TAGS.has(tag)) return true;
                    if (tag === 'LINK') {
                        const rel = node.getAttribute('rel');
                        return !rel || rel.toLowerCase() !== 'stylesheet';
                    }
                    return false;
                }
            });
        }

        // Create a visible Phaser sprite IMMEDIATELY with a placeholder
        const textureKey = `dom-capture-${Date.now()}-${Math.random()}`;
        const fallback = document.createElement('canvas');
        fallback.width = rect.width;
        fallback.height = rect.height;
        const ctx = fallback.getContext('2d');
        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        ctx.fillRect(0, 0, rect.width, rect.height);
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
            this.domElement.classList.remove('stickman-html2canvas-target');
            
            if (canvas && canvas.width > 0 && canvas.height > 0) {
                const checkCtx = canvas.getContext('2d');
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
                        const texCtx = texCanvas.getContext('2d');
                        texCtx.clearRect(0, 0, texCanvas.width, texCanvas.height);
                        texCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, texCanvas.width, texCanvas.height);
                        tex.update();
                    }
                }
            }
        }).catch(err => {
            this.domElement.classList.remove('stickman-html2canvas-target');
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
    }
}
