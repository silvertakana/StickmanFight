// src/scenes/OverlayScene.js
import Phaser from "/vendor/.vite-deps-phaser.js__v--a2a3c9b5.js";
import Player from "/src/entities/Player.js.js";
import Boss from "/src/entities/Boss.js.js";
import { resolveAssetPath } from "/src/game/assetLoader.js.js";
import DOMScanner from "/src/scanner/DOMScanner.js.js";

export default class OverlayScene extends Phaser.Scene {
    constructor() {
        super('OverlayScene');
    }

    preload() {
        // Load player sprites via extension-aware paths
        this.load.spritesheet('stickman-run',
            resolveAssetPath('assets/sprites/stickman/StickmanPack/Run/thickRunSheet.png?v=7'),
            { frameWidth: 64, frameHeight: 64 }
        );
        this.load.spritesheet('stickman-idle',
            resolveAssetPath('assets/sprites/stickman/StickmanPack/Idle/thickIdleSheet.png?v=7'),
            { frameWidth: 64, frameHeight: 64 }
        );
        this.load.image('stickman-jump-up',
            resolveAssetPath('assets/sprites/stickman/StickmanPack/Jump/JumpUp.png')
        );
        this.load.image('stickman-jump-down',
            resolveAssetPath('assets/sprites/stickman/StickmanPack/Jump/JumpDown.png')
        );

        // Load SFX
        this.load.audio('click',
            resolveAssetPath('assets/audio/sfx/interface/Audio/click_001.ogg')
        );
        this.load.audio('impact-light',
            resolveAssetPath('assets/audio/sfx/impact/Audio/impactGeneric_light_000.ogg'));
        this.load.audio('shatter',
            resolveAssetPath('assets/audio/sfx/interface/Audio/bong_001.ogg'));

        // Load Boss frames
        this.load.image('boss-frame-1', resolveAssetPath('assets/sprites/enemy/boss_frame1.png'));
        this.load.image('boss-frame-2', resolveAssetPath('assets/sprites/enemy/boss_frame2.png'));
        this.load.image('boss-frame-3', resolveAssetPath('assets/sprites/enemy/boss_frame3.png'));
        this.load.image('boss-frame-4', resolveAssetPath('assets/sprites/enemy/boss_frame4.png'));
        
        // Load Impact Heavy
        this.load.audio('impact-heavy', resolveAssetPath('assets/audio/sfx/impact/Audio/impactBell_heavy_000.ogg'));

        // Load Background Music
        this.load.audio('bgm-soft', resolveAssetPath('assets/audio/songs/song_soft.wav'));
        this.load.audio('bgm-triangle', resolveAssetPath('assets/audio/songs/song_triangle.wav'));

        // Load fonts natively using Phaser 4 API
        this.load.font('EB Garamond', resolveAssetPath('assets/fonts/EB_Garamond/EBGaramond-VariableFont_wght.ttf'), 'truetype', {
            weight: '100 900',
            style: 'normal'
        });
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const centerX = width / 2;

        // Floor (bottom of viewport)
        this.matter.add.rectangle(centerX, height + 10, width * 2, 40, {
            isStatic: true, label: 'ground'
        });

        // Side walls
        this.matter.add.rectangle(-20, height / 2, 40, height * 2, {
            isStatic: true, label: 'wall-left'
        });
        this.matter.add.rectangle(width + 20, height / 2, 40, height * 2, {
            isStatic: true, label: 'wall-right'
        });

        // Animations
        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNumbers('stickman-run', { start: 0, end: 8 }),
            frameRate: 15, repeat: -1
        });
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('stickman-idle', { start: 0, end: 5 }),
            frameRate: 10, repeat: -1
        });

        // Boss Animation
        this.anims.create({
            key: 'boss-idle',
            frames: [
                { key: 'boss-frame-1' },
                { key: 'boss-frame-2' },
                { key: 'boss-frame-3' },
                { key: 'boss-frame-4' }
            ],
            frameRate: 6,
            repeat: -1
        });

        // Sound (for jump)
        this.soundClick = this.sound.add('click', { volume: 0.4 });
        this.soundImpactLight = this.sound.add('impact-light', { volume: 0.3 });
        this.soundImpactHeavy = this.sound.add('impact-heavy', { volume: 0.5 });
        this.soundShatter = this.sound.add('shatter', { volume: 0.6 });

        // Spawn player at bottom-left
        this.player = new Player(this, 100, height - 100);

        // Spawn boss
        const difficulty = window.__stickmanDifficulty || 'medium';
        this.boss = new Boss(this, width - 150, 150, difficulty);
        console.log(`[StickmanFight] Boss spawned at ${width - 150}, 150 with difficulty: ${difficulty}`);

        // ===== BACKGROUND MUSIC =====
        this.bgmSoft = this.sound.add('bgm-soft', { volume: 0.35 });
        this.bgmTriangle = this.sound.add('bgm-triangle', { volume: 0.35 });

        this.bgmSoft.on('complete', () => {
            this.bgmTriangle.play();
        });
        this.bgmTriangle.on('complete', () => {
            this.bgmSoft.play();
        });

        // Start the first track
        this.bgmSoft.play();

        // --- Touch Controls ---
        // Enable multi-touch so Player 1 and Player 2 can interact simultaneously
        this.input.addPointer(2);

        // Scan the DOM and create invisible physics bodies
        this.domScanner = new DOMScanner(this);
        this.domScanner.scan();

        const releaseDrag = () => {
            this.pendingDrag = null;
            if (this.dragConstraint) {
                this.matter.world.remove(this.dragConstraint);
                this.dragConstraint = null;
            }
        };

        this.input.on('pointerup', releaseDrag);
        this.input.on('gameout', releaseDrag);

        this.events.on('shutdown', () => {
            // Restore all hidden DOM elements
            if (this.domScanner) {
                for (const block of this.domScanner.blocks) {
                    if (block.domElement) {
                        block.domElement.style.opacity = '';
                        block.domElement.style.pointerEvents = '';
                    }
                }
                this.domScanner.clear();
            }
        });

        // Collision handling for DOM blocks
        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach(pair => {
                const { bodyA, bodyB, collision } = pair;
                const parentA = bodyA.parent || bodyA;
                const parentB = bodyB.parent || bodyB;

                const checkHit = (staticBody, dynamicBody) => {
                    if (staticBody.label === 'dom-block' && staticBody.isStatic && !dynamicBody.isStatic) {
                        // Boss flying into static page elements should not damage them
                        if (dynamicBody.label === 'bossBody') return;

                        if (dynamicBody.label === 'projectile') {
                            if (staticBody.gameObjectClass && typeof staticBody.gameObjectClass.takeProjectileHit === 'function') {
                                staticBody.gameObjectClass.takeProjectileHit();
                            } else if (staticBody.gameObjectClass && typeof staticBody.gameObjectClass.fallOut === 'function') {
                                staticBody.gameObjectClass.fallOut();
                            }
                            if (dynamicBody.gameObjectClass) {
                                dynamicBody.gameObjectClass.destroy();
                            }
                            this.soundShatter.play();
                            return;
                        }

                        const speed = Math.hypot(dynamicBody.velocity.x, dynamicBody.velocity.y);
                        if (speed > 6 || collision.depth > 3) {
                            if (staticBody.gameObjectClass && typeof staticBody.gameObjectClass.takeHit === 'function') {
                                this.time.delayedCall(0, () => {
                                    if (staticBody.gameObjectClass && staticBody.gameObjectClass.scene) {
                                        staticBody.gameObjectClass.takeHit();
                                    }
                                });
                                this.soundShatter.play();
                            }
                        } else if (speed > 2) {
                            if (!this.soundImpactLight.isPlaying) {
                                this.soundImpactLight.play();
                            }
                        }
                    } else if (staticBody.label === 'dom-block-fallen') {
                        if (dynamicBody.label === 'projectile') {
                            if (staticBody.gameObjectClass && typeof staticBody.gameObjectClass.takeProjectileHit === 'function') {
                                staticBody.gameObjectClass.takeProjectileHit();
                            } else if (staticBody.gameObjectClass && typeof staticBody.gameObjectClass.destroy === 'function') {
                                staticBody.gameObjectClass.destroy();
                            }
                            if (dynamicBody.gameObjectClass) {
                                dynamicBody.gameObjectClass.destroy();
                            }
                            this.soundShatter.play();
                        }
                    } else if (staticBody.label === 'bossBody') {
                        // Boss takes damage from fast moving objects
                        const otherBody = dynamicBody;
                        
                        if (!otherBody.isStatic && otherBody.label === 'dom-block-fallen') {
                            const speed = Math.hypot(otherBody.velocity.x, otherBody.velocity.y);
                            if (speed > 4) {
                                if (this.boss) this.boss.takeHit(1);
                                if (!this.soundImpactHeavy.isPlaying) {
                                    this.soundImpactHeavy.play();
                                }
                            }
                        }
                    } else if (staticBody.label === 'player' || staticBody.label === 'playerBody') {
                        const otherBody = dynamicBody;
                        
                        if (otherBody.label === 'projectile') {
                            if (this.player) this.player.takeHit();
                            if (otherBody.gameObjectClass) {
                                otherBody.gameObjectClass.destroy();
                            }
                        }
                    }
                };

                checkHit(parentA, parentB);
                checkHit(parentB, parentA);
            });
        });

        // Mouse spring for dragging DOM blocks (Phase 3+)
        this.mouseSpringPlugin = this.matter.add.mouseSpring({
            length: 0.01, stiffness: 0.2, damping: 0.1,
            collisionFilter: {
                category: 0x0001,
                mask: ~0x0002, // Everything except category 2
                group: 0
            }
        });

        // Click-to-detach DOM blocks (Boss player mechanic)
        this.input.on('pointerdown', (pointer) => {
            const bodies = this.matter.world.engine.world.bodies;
            const worldPoint = { x: pointer.worldX, y: pointer.worldY };
            const clicked = this.matter.query.point(bodies, worldPoint);

            for (const body of clicked) {
                if (body.label === 'dom-block' && body.isStatic && body.gameObjectClass) {
                    const block = body.gameObjectClass;
                    block.fallOut();
                    
                    // Force the mouse spring to immediately grab the newly created body!
                    if (this.mouseSpringPlugin && block.fallenSprite) {
                        this.mouseSpringPlugin.constraint.bodyB = block.fallenSprite.body;
                        this.mouseSpringPlugin.constraint.pointB = { 
                            x: pointer.worldX - block.fallenSprite.x, 
                            y: pointer.worldY - block.fallenSprite.y 
                        };
                    }
                    break;
                }
            }
        });

        // --- Virtual Touch Controls ---
        this._createVirtualControls(width, height);
    }

    _createVirtualControls(width, height) {
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (!isTouch) return;

        // Base styling for buttons
        const btnStyle = {
            fontSize: '32px',
            color: '#ffffff',
            fontFamily: 'Arial',
            backgroundColor: '#000000',
            padding: { x: 15, y: 10 },
            fixedWidth: 60,
            align: 'center'
        };

        const alphaNormal = 0.4;
        const alphaPressed = 0.8;

        // Left Button
        const leftBtn = this.add.text(30, height - 80, '❮', btnStyle)
            .setScrollFactor(0)
            .setInteractive()
            .setAlpha(alphaNormal)
            .setDepth(100);

        leftBtn.on('pointerdown', () => {
            this.player.virtualLeft = true;
            leftBtn.setAlpha(alphaPressed);
        });
        leftBtn.on('pointerup', () => {
            this.player.virtualLeft = false;
            leftBtn.setAlpha(alphaNormal);
        });
        leftBtn.on('pointerout', () => {
            this.player.virtualLeft = false;
            leftBtn.setAlpha(alphaNormal);
        });

        // Right Button
        const rightBtn = this.add.text(110, height - 80, '❯', btnStyle)
            .setScrollFactor(0)
            .setInteractive()
            .setAlpha(alphaNormal)
            .setDepth(100);

        rightBtn.on('pointerdown', () => {
            this.player.virtualRight = true;
            rightBtn.setAlpha(alphaPressed);
        });
        rightBtn.on('pointerup', () => {
            this.player.virtualRight = false;
            rightBtn.setAlpha(alphaNormal);
        });
        rightBtn.on('pointerout', () => {
            this.player.virtualRight = false;
            rightBtn.setAlpha(alphaNormal);
        });

        // Jump Button
        const jumpBtn = this.add.text(width - 90, height - 80, '▲', btnStyle)
            .setScrollFactor(0)
            .setInteractive()
            .setAlpha(alphaNormal)
            .setDepth(100);

        jumpBtn.on('pointerdown', () => {
            this.player.virtualJump = true;
            jumpBtn.setAlpha(alphaPressed);
        });
        jumpBtn.on('pointerup', () => {
            this.player.virtualJump = false;
            jumpBtn.setAlpha(alphaNormal);
        });
        jumpBtn.on('pointerout', () => {
            this.player.virtualJump = false;
            jumpBtn.setAlpha(alphaNormal);
        });
    }

    /**
     * Samples the pre-captured screenshot (or body background) to determine
     * whether the page center is light or dark. Returns 0–1 luminance.
     */
    _detectBackgroundLuminance() {
        const img = window.__stickmanScreenshotImage;
        if (img && img.naturalWidth) {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);

                // Sample a 60×60 region at the center of the viewport
                const cx = Math.floor(canvas.width / 2);
                const cy = Math.floor(canvas.height / 2);
                const half = 30;
                const sx = Math.max(0, cx - half);
                const sy = Math.max(0, cy - half);
                const sw = Math.min(half * 2, canvas.width - sx);
                const sh = Math.min(half * 2, canvas.height - sy);
                const imageData = ctx.getImageData(sx, sy, sw, sh);

                let totalR = 0, totalG = 0, totalB = 0;
                const px = imageData.data;
                const count = px.length / 4;
                for (let i = 0; i < px.length; i += 4) {
                    totalR += px[i];
                    totalG += px[i + 1];
                    totalB += px[i + 2];
                }
                return (0.299 * (totalR / count) + 0.587 * (totalG / count) + 0.114 * (totalB / count)) / 255;
            } catch (_) { /* CORS / tainted canvas — fall through */ }
        }

        // Fallback: read computed body background
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        const match = bodyBg.match(/(\d+)/g);
        if (match && match.length >= 3) {
            const [r, g, b] = match.map(Number);
            return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        }

        // If everything fails, assume dark background
        return 0.15;
    }

    showEndGame(textStr) {
        if (this.isGameOver) return;
        this.isGameOver = true;

        const width = this.scale.width;
        const height = this.scale.height;

        // Detect page background and pick a contrasting, muted text color
        const luminance = this._detectBackgroundLuminance();
        const isDark = luminance < 0.5;
        const textColor  = isDark ? '#e8e4df' : '#1a1a2e';   // off-white / off-black
        const shadowColor = isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';

        const makeStyle = (align) => ({
            fontFamily: '"EB Garamond", serif',
            fontSize: '84px',
            fontStyle: 'normal',
            color: textColor,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: shadowColor,
                blur: 8,
                stroke: false,
                fill: true
            },
            align
        });

        const textObj = this.add.text(width / 2, height / 2, '', makeStyle('center'))
            .setOrigin(0.5).setDepth(1000).setScrollFactor(0);

        const cursorObj = this.add.text(width / 2, height / 2 - 5, '|', makeStyle('left'))
            .setOrigin(0, 0.5).setDepth(1000).setScrollFactor(0);

        let i = 0;
        let cursorVisible = true;
        let isTyping = true;
        
        const updateCursor = () => {
            cursorObj.setX(textObj.x + textObj.width / 2);
            cursorObj.setVisible(cursorVisible);
        };

        let cursorEvent = this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => {
                if (!isTyping) {
                    cursorVisible = !cursorVisible;
                } else {
                    cursorVisible = true;
                }
                updateCursor();
            }
        });
        
        // Typewriter effect
        this.time.addEvent({
            delay: 150,
            repeat: textStr.length - 1,
            callback: () => {
                i++;
                textObj.setText(textStr.substring(0, i));
                updateCursor();
                if (i === textStr.length) {
                    isTyping = false;
                }
            }
        });

        // After it finishes typing + 3 seconds wait
        const holdTime = (textStr.length * 150) + 3000;

        this.time.delayedCall(holdTime, () => {
            isTyping = true;
            // Typewriter delete effect
            this.time.addEvent({
                delay: 75,
                repeat: textStr.length - 1,
                callback: () => {
                    i--;
                    textObj.setText(textStr.substring(0, i));
                    updateCursor();
                    if (i === 0) {
                        isTyping = false;
                        cursorVisible = false;
                        updateCursor();
                        cursorEvent.remove();
                    }
                }
            });
        });
    }

    update(time, delta) {
        this.player.update();
        if (this.boss) {
            this.boss.update(time, this.player);
        }
    }
}
