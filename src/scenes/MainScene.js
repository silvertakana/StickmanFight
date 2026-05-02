import Phaser from 'phaser';
import GoogleElement from '../entities/GoogleElement.js';
import Player from '../entities/Player.js';
import Boss from '../entities/Boss.js';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    preload() {
        // Load Stickman sprites (V0.1 Thick)
        this.load.spritesheet('stickman-run', 'assets/sprites/stickman/StickmanPack/Run/thickRunSheet.png?v=7', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('stickman-idle', 'assets/sprites/stickman/StickmanPack/Idle/thickIdleSheet.png?v=7', { frameWidth: 64, frameHeight: 64 });
        
        // Load Thickened Jump frames (from V0.2)
        this.load.image('stickman-jump-up', 'assets/sprites/stickman/StickmanPack/Jump/JumpUp.png?v=5');
        this.load.image('stickman-jump-down', 'assets/sprites/stickman/StickmanPack/Jump/JumpDown.png?v=5');

        // Load Boss frames
        this.load.image('boss-frame-1', 'assets/sprites/enemy/boss_frame1.png');
        this.load.image('boss-frame-2', 'assets/sprites/enemy/boss_frame2.png');
        this.load.image('boss-frame-3', 'assets/sprites/enemy/boss_frame3.png');
        this.load.image('boss-frame-4', 'assets/sprites/enemy/boss_frame4.png');

        // Load Background Music
        this.load.audio('bgm-soft', 'assets/audio/songs/song_soft.wav');
        this.load.audio('bgm-triangle', 'assets/audio/songs/song_triangle.wav');

        // Load SFX
        this.load.audio('impact-light', 'assets/audio/sfx/impact/Audio/impactGeneric_light_000.ogg');
        this.load.audio('impact-heavy', 'assets/audio/sfx/impact/Audio/impactBell_heavy_000.ogg');
        this.load.audio('click', 'assets/audio/sfx/interface/Audio/click_001.ogg');
        this.load.audio('shatter', 'assets/audio/sfx/interface/Audio/bong_001.ogg');
        this.load.audio('ui-impact-1', 'assets/audio/sfx/impact/Audio/impactWood_light_000.ogg');
        this.load.audio('ui-impact-2', 'assets/audio/sfx/impact/Audio/impactWood_light_001.ogg');
        this.load.audio('ui-impact-3', 'assets/audio/sfx/impact/Audio/impactWood_light_002.ogg');
        this.load.audio('ui-impact-4', 'assets/audio/sfx/impact/Audio/impactWood_light_003.ogg');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const centerX = width / 2;

        // Floor (Bottom browser edge)
        this.matter.add.rectangle(centerX, height + 10, width * 2, 40, { isStatic: true, label: 'ground' });

        // Side walls to prevent objects from falling off
        this.matter.add.rectangle(-20, height / 2, 40, height * 2, { isStatic: true, label: 'wall-left' });
        this.matter.add.rectangle(width + 20, height / 2, 40, height * 2, { isStatic: true, label: 'wall-right' });

        // Helper to create text elements with tight colliders
        const createTextElement = (x, y, str, style, hits) => {
            const t = this.add.text(0, 0, str, style);
            const w = t.width;
            const h = t.height;
            t.destroy();
            new GoogleElement(this, x, y, w, h, (container, scene) => {
                const text = scene.add.text(0, 0, str, style).setOrigin(0.5);
                container.add(text);
            }, { maxHits: hits });
        };

        // ===== TOP NAV BAR =====
        // Left side: About, Store
        createTextElement(40, 22, 'About', { fontSize: '13px', color: '#e8eaed', fontFamily: 'Arial' }, 1);
        createTextElement(90, 22, 'Store', { fontSize: '13px', color: '#e8eaed', fontFamily: 'Arial' }, 1);

        // Right side: Gmail, Images, App Grid, Profile
        createTextElement(width - 210, 22, 'Gmail', { fontSize: '13px', color: '#e8eaed', fontFamily: 'Arial' }, 1);
        createTextElement(width - 150, 22, 'Images', { fontSize: '13px', color: '#e8eaed', fontFamily: 'Arial' }, 1);

        // App Grid (3x3 dots)
        new GoogleElement(this, width - 85, 22, 36, 36, (container, scene) => {
            const g = scene.add.graphics();
            const dotSize = 3;
            const spacing = 7;
            const startX = -spacing;
            const startY = -spacing;
            g.fillStyle(0xe8eaed, 1);
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    g.fillCircle(startX + col * spacing, startY + row * spacing, dotSize);
                }
            }
            container.add(g);
        }, { maxHits: 1 });

        // Profile circle
        new GoogleElement(this, width - 35, 22, 34, 34, (container, scene) => {
            const g = scene.add.graphics();
            g.fillStyle(0x8ab4f8, 1);
            g.fillCircle(0, 0, 16);
            const text = scene.add.text(0, 0, 'S', { fontSize: '16px', color: '#202124', fontFamily: 'Arial', fontStyle: 'bold' }).setOrigin(0.5);
            container.add([g, text]);
        }, { maxHits: 1 });

        // ===== GOOGLE LOGO (Multi-color) =====
        const logoY = height * 0.28;
        const googleLetters = [
            { char: 'G', color: '#4285F4', size: '96px' },
            { char: 'o', color: '#EA4335', size: '96px' },
            { char: 'o', color: '#FBBC05', size: '96px' },
            { char: 'g', color: '#4285F4', size: '96px' },
            { char: 'l', color: '#34A853', size: '96px' },
            { char: 'e', color: '#EA4335', size: '96px' }
        ];

        let totalWidth = 0;
        const letterWidths = [];
        for (const letter of googleLetters) {
            const t = this.add.text(0, 0, letter.char, {
                fontFamily: "'Product Sans', 'Arial', sans-serif",
                fontSize: letter.size
            });
            letterWidths.push({ w: t.width, h: t.height });
            totalWidth += t.width;
            t.destroy();
        }

        let startX = centerX - (totalWidth / 2);
        for (let i = 0; i < googleLetters.length; i++) {
            const letter = googleLetters[i];
            const dims = letterWidths[i];
            
            if (dims.w === 0 || dims.h === 0) {
                startX += dims.w;
                continue;
            }
            
            // Render exactly how Phaser renders to get a perfectly matching canvas texture
            const tempText = this.add.text(0, 0, letter.char, {
                fontFamily: "'Product Sans', 'Arial', sans-serif",
                fontSize: letter.size,
                color: letter.color
            }).setOrigin(0.5, 0.5);
            
            const texCanvas = tempText.canvas;
            const resX = texCanvas.width / tempText.width;
            const resY = texCanvas.height / tempText.height;
            
            // Add padding to prevent Moore neighborhood boundary crashes
            const pad = 10;
            const canvas = document.createElement('canvas');
            canvas.width = texCanvas.width + pad * 2;
            canvas.height = texCanvas.height + pad * 2;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(texCanvas, pad, pad);
            
            const w = canvas.width;
            const h = canvas.height;
            const imgData = ctx.getImageData(0, 0, w, h).data;
            const getA = (x, y) => {
                if (x < 0 || y < 0 || x >= w || y >= h) return 0;
                return imgData[(y * w + x) * 4 + 3];
            };
            
            let pStartX = -1, pStartY = -1;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    if (getA(x, y) > 128) { pStartX = x; pStartY = y; break; }
                }
                if (pStartX !== -1) break;
            }
            
            let shapeConfig = undefined;
            let origMinX = undefined, origMinY = undefined;
            
            if (pStartX !== -1) {
                const dirX = [0, 1, 1, 1, 0, -1, -1, -1];
                const dirY = [-1, -1, 0, 1, 1, 1, 0, -1];
                let cx = pStartX, cy = pStartY, cDir = 0;
                const path = [];
                let count = 0;
                do {
                    path.push({ x: cx, y: cy });
                    count++;
                    cDir = (cDir + 6) % 8;
                    let found = false;
                    for (let j = 0; j < 8; j++) {
                        const d = (cDir + j) % 8;
                        if (getA(cx + dirX[d], cy + dirY[d]) > 128) {
                            cx += dirX[d];
                            cy += dirY[d];
                            cDir = d;
                            found = true;
                            break;
                        }
                    }
                    if (!found) break;
                } while ((cx !== pStartX || cy !== pStartY) && count < 2000);
                
                const simplified = [];
                let minX = Infinity, minY = Infinity;
                const step = Math.max(1, Math.floor(path.length / 40));
                
                // Padded canvas center corresponds exactly to Phaser's visual origin!
                const offsetX = pad + (texCanvas.width / 2);
                const offsetY = pad + (texCanvas.height / 2);
                
                for (let j = 0; j < path.length; j += step) {
                    const px = (path[j].x - offsetX) / resX;
                    const py = (path[j].y - offsetY) / resY;
                    minX = Math.min(minX, px);
                    minY = Math.min(minY, py);
                    // Use toFixed to prevent massive precision strings
                    simplified.push(`${px.toFixed(2)} ${py.toFixed(2)}`);
                }
                
                if (simplified.length >= 3) {
                    const svgPath = 'M ' + simplified[0] + ' L ' + simplified.slice(1).join(' L ') + ' Z';
                    shapeConfig = { type: 'fromVerts', verts: svgPath };
                    origMinX = minX;
                    origMinY = minY;
                }
            }
            
            tempText.destroy();
            
            new GoogleElement(this, startX + dims.w / 2, logoY, dims.w, dims.h, (container, scene) => {
                const t = scene.add.text(0, 0, letter.char, {
                    fontFamily: "'Product Sans', 'Arial', sans-serif",
                    fontSize: letter.size,
                    color: letter.color
                }).setOrigin(0.5, 0.5);
                container.add(t);
            }, { 
                maxHits: 3, 
                shape: shapeConfig,
                origMinX: origMinX,
                origMinY: origMinY
            });
            
            startX += dims.w;
        }

        // ===== SEARCH BAR =====
        const searchBarY = height * 0.45;
        const searchBarW = 580;
        const searchBarH = 48;

        new GoogleElement(this, centerX, searchBarY, searchBarW, searchBarH, (container, scene, w, h) => {
            const g = scene.add.graphics();
            // Dark fill with subtle border
            g.fillStyle(0x303134, 1);
            g.lineStyle(1, 0x5f6368, 0.8);
            g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
            g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
            container.add(g);

            // + icon on left
            const plus = scene.add.text(-w / 2 + 25, 0, '+', {
                fontSize: '22px', color: '#9aa0a6', fontFamily: 'Arial'
            }).setOrigin(0.5);
            container.add(plus);

            // Placeholder text
            const text = scene.add.text(-w / 2 + 50, 0, 'Search Google or type a URL', {
                fontSize: '16px', color: '#9aa0a6', fontFamily: 'Arial'
            }).setOrigin(0, 0.5);
            container.add(text);

            // Right side icons layout
            const aiModeW = 90;
            const aiModeX = w / 2 - aiModeW - 10;
            const lensX = aiModeX - 25;
            const micX = lensX - 35;

            // Mic icon
            const micIcon = scene.add.graphics();
            micIcon.fillStyle(0x4285F4, 1); // Blue capsule
            micIcon.fillRoundedRect(micX - 3, -6, 6, 12, 3);
            micIcon.lineStyle(2, 0x34A853, 1); // Green U-shape
            micIcon.beginPath();
            micIcon.arc(micX, 2, 7, 0, Math.PI, false);
            micIcon.strokePath();
            micIcon.lineBetween(micX, 9, micX, 14); // Green stem
            container.add(micIcon);

            // Camera/Lens icon
            const lensIcon = scene.add.graphics();
            lensIcon.lineStyle(2, 0x4285F4, 1); // Blue box
            lensIcon.strokeRoundedRect(lensX - 8, -7, 16, 14, 4);
            lensIcon.fillStyle(0xea4335, 1); // Red dot
            lensIcon.fillCircle(lensX, 0, 3);
            container.add(lensIcon);

            // AI Mode button
            const aiG = scene.add.graphics();
            aiG.fillStyle(0x303134, 1);
            aiG.lineStyle(1, 0x5f6368, 1);
            aiG.fillRoundedRect(aiModeX, -14, aiModeW, 28, 14);
            aiG.strokeRoundedRect(aiModeX, -14, aiModeW, 28, 14);
            const aiText = scene.add.text(aiModeX + aiModeW / 2, 0, '✦ AI Mode', {
                fontSize: '12px', color: '#e8eaed', fontFamily: 'Arial'
            }).setOrigin(0.5);
            container.add([aiG, aiText]);
        }, { maxHits: 4 });

        // ===== BUTTONS ROW =====
        const btnY = height * 0.55;
        const btnGap = 15;

        // Google Search button
        new GoogleElement(this, centerX - 75 - btnGap / 2, btnY, 140, 38, (container, scene, w, h) => {
            const g = scene.add.graphics();
            g.fillStyle(0x303134, 1);
            g.lineStyle(1, 0x303134, 1);
            g.fillRoundedRect(-w / 2, -h / 2, w, h, 4);
            const text = scene.add.text(0, 0, 'Google Search', {
                fontSize: '14px', color: '#e8eaed', fontFamily: 'Arial'
            }).setOrigin(0.5);
            container.add([g, text]);
        });

        // I'm Feeling Lucky button
        new GoogleElement(this, centerX + 75 + btnGap / 2, btnY, 160, 38, (container, scene, w, h) => {
            const g = scene.add.graphics();
            g.fillStyle(0x303134, 1);
            g.lineStyle(1, 0x303134, 1);
            g.fillRoundedRect(-w / 2, -h / 2, w, h, 4);
            const text = scene.add.text(0, 0, "I'm Feeling Lucky", {
                fontSize: '14px', color: '#e8eaed', fontFamily: 'Arial'
            }).setOrigin(0.5);
            container.add([g, text]);
        });

        // ===== FOOTER TEXT =====
        createTextElement(centerX - 35, height * 0.62, 'Google offered in:', { fontSize: '13px', color: '#9aa0a6', fontFamily: 'Arial' }, 1);
        createTextElement(centerX + 35, height * 0.62, 'Māori', { fontSize: '13px', color: '#8ab4f8', fontFamily: 'Arial' }, 1);

        // ===== INPUT HANDLING =====

        // Enable multi-touch for pinch to zoom
        this.input.addPointer(2);
        
        this.pinchDist = null;
        this.baseZoom = 1;
        this.panStartX = 0;
        this.panStartY = 0;

        this.input.on('pointermove', (pointer) => {
            const p1 = this.input.pointer1;
            const p2 = this.input.pointer2;

            if (p1.isDown && p2.isDown) {
                const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
                const cx = (p1.x + p2.x) / 2;
                const cy = (p1.y + p2.y) / 2;

                if (this.pinchDist === null) {
                    this.pinchDist = dist;
                    this.baseZoom = this.cameras.main.zoom;
                    this.panStartX = this.cameras.main.scrollX + cx / this.baseZoom;
                    this.panStartY = this.cameras.main.scrollY + cy / this.baseZoom;
                } else {
                    const scale = dist / this.pinchDist;
                    const newZoom = Phaser.Math.Clamp(this.baseZoom * scale, 0.3, 3);
                    this.cameras.main.setZoom(newZoom);
                    this.cameras.main.scrollX = this.panStartX - cx / newZoom;
                    this.cameras.main.scrollY = this.panStartY - cy / newZoom;
                }
            } else {
                this.pinchDist = null;
            }
        });

        // Pointer Interaction for Player 2
        this.input.on('pointerdown', (pointer) => {
            if (this.input.pointer1.isDown && this.input.pointer2.isDown) return;

            const bodies = this.matter.world.engine.world.bodies;
            const worldPoint = { x: pointer.worldX, y: pointer.worldY };
            const clickedBodies = this.matter.query.point(bodies, worldPoint);
            
            for (const body of clickedBodies) {
                if (body.label === 'google-ui' && body.isStatic) {
                    if (body.gameObjectClass) {
                        body.gameObjectClass.fallOut();
                        break;
                    }
                }
            }
        });

        this.matter.add.mouseSpring({
            length: 0.01,
            stiffness: 0.2,
            damping: 0.1
        });

        // ===== ANIMATIONS =====
        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNumbers('stickman-run', { start: 0, end: 8 }),
            frameRate: 15,
            repeat: -1
        });
        
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('stickman-idle', { start: 0, end: 5 }),
            frameRate: 10,
            repeat: -1
        });

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

        // ===== SOUNDS =====
        this.soundImpactLight = this.sound.add('impact-light', { volume: 0.3 });
        this.soundImpactHeavy = this.sound.add('impact-heavy', { volume: 0.5 });
        this.soundClick = this.sound.add('click', { volume: 0.4 });
        this.soundShatter = this.sound.add('shatter', { volume: 0.6 });
        this.soundUIImpacts = [
            this.sound.add('ui-impact-1'),
            this.sound.add('ui-impact-2'),
            this.sound.add('ui-impact-3'),
            this.sound.add('ui-impact-4')
        ];

        // ===== STICKMAN =====
        this.player = new Player(this, 100, height - 100);

        // ===== BOSS ANIMATION =====
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

        // ===== BOSS =====
        this.boss = new Boss(this, width - 150, 150);

        // ===== COLLISION HANDLING =====
        const handleCollision = (event) => {
            event.pairs.forEach(pair => {
                const { bodyA, bodyB, collision } = pair;
                
                const parentA = bodyA.parent || bodyA;
                const parentB = bodyB.parent || bodyB;

                // General tactile physics sound for any objects hitting
                if (!parentA.isSensor && !parentB.isSensor) {
                    const isCharacter = parentA.label === 'playerBody' || parentB.label === 'playerBody' || parentA.label === 'bossBody' || parentB.label === 'bossBody';
                    
                    if (!isCharacter) {
                        const speedA = parentA.isStatic ? 0 : Math.hypot(parentA.velocity.x, parentA.velocity.y);
                        const speedB = parentB.isStatic ? 0 : Math.hypot(parentB.velocity.x, parentB.velocity.y);
                        const relativeSpeed = speedA + speedB;
                        
                        if (relativeSpeed > 1) {
                            if (this.time.now - (this.lastTactileSoundTime || 0) > 50) {
                                const impactSound = Phaser.Utils.Array.GetRandom(this.soundUIImpacts);
                                const vol = Phaser.Math.Clamp(relativeSpeed / 15, 0.05, 0.4);
                                impactSound.play({ volume: vol, rate: 0.9 + Math.random() * 0.2 });
                                this.lastTactileSoundTime = this.time.now;
                            }
                        }
                    }
                }
                
                const checkHit = (staticPart, dynamicPart) => {
                    const staticBody = staticPart.parent || staticPart;
                    const dynamicBody = dynamicPart.parent || dynamicPart;
                    
                    if (staticBody.label === 'google-ui' && staticBody.isStatic && !dynamicBody.isStatic) {
                        const speed = Math.hypot(dynamicBody.velocity.x, dynamicBody.velocity.y);
                        // Avoid using Infinity for mass
                        const mass = dynamicBody.mass === Infinity ? 1 : dynamicBody.mass;
                        const momentum = speed * mass;
                        
                        // 'thrown hard' -> high speed/momentum
                        // 'pressed too hard' -> deep collision penetration (depth > 2)
                        if (speed > 8 || momentum > 8 || collision.depth > 3) {
                            if (staticBody.gameObjectClass && typeof staticBody.gameObjectClass.takeHit === 'function') {
                                // Defer the hit resolution to avoid removing physics bodies while Matter.js 
                                // is still iterating through the active collision pairs, which causes random crashes.
                                this.time.delayedCall(0, () => {
                                    if (staticBody.gameObjectClass && staticBody.gameObjectClass.scene) {
                                        staticBody.gameObjectClass.takeHit();
                                    }
                                });
                                this.soundShatter.play();
                            }
                        } else if (speed > 2) {
                            // Light impact sound
                            if (!this.soundImpactLight.isPlaying) {
                                this.soundImpactLight.play();
                            }
                        }
                    } else if (staticBody.label === 'player' || staticBody.label === 'playerBody') {
                        const otherBody = dynamicBody;

                        const speed = Math.hypot(dynamicBody.velocity.x, dynamicBody.velocity.y);
                        if (speed > 5 && !this.soundImpactHeavy.isPlaying) {
                            this.soundImpactHeavy.play();
                        }
                        
                        // Player hit by projectile
                        if (otherBody.label === 'projectile') {
                            this.player.takeHit();
                            if (otherBody.gameObjectClass) {
                                otherBody.gameObjectClass.destroy();
                            }
                        }
                    } else if (staticBody.label === 'bossBody') {
                        const otherBody = dynamicBody;

                        // Boss hit by projectile
                        if (otherBody.label === 'projectile') {
                            if (this.boss) this.boss.takeHit(1);
                            if (otherBody.gameObjectClass) {
                                otherBody.gameObjectClass.destroy();
                            }
                        }

                        // Boss takes damage from fast moving objects (UI elements thrown by P2)
                        if (otherBody.label === 'google-ui' && !otherBody.isStatic) {
                            const speed = Math.hypot(otherBody.velocity.x, otherBody.velocity.y);
                            if (speed > 8) {
                                if (this.boss) this.boss.takeHit(1);
                                this.soundImpactHeavy.play();
                            }
                        }
                    }
                };

                checkHit(bodyA, bodyB);
                checkHit(bodyB, bodyA);
            });
        };

        this.matter.world.on('collisionstart', handleCollision);
        this.matter.world.on('collisionactive', handleCollision);

        // --- Virtual Touch Controls ---
        this._createVirtualControls(width, height);
    }

    _createVirtualControls(width, height) {
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (!isTouch) return;

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

        const leftBtn = this.add.text(30, height - 80, '❮', btnStyle).setScrollFactor(0).setInteractive().setAlpha(alphaNormal).setDepth(100);
        leftBtn.on('pointerdown', () => { this.player.virtualLeft = true; leftBtn.setAlpha(alphaPressed); });
        leftBtn.on('pointerup', () => { this.player.virtualLeft = false; leftBtn.setAlpha(alphaNormal); });
        leftBtn.on('pointerout', () => { this.player.virtualLeft = false; leftBtn.setAlpha(alphaNormal); });

        const rightBtn = this.add.text(110, height - 80, '❯', btnStyle).setScrollFactor(0).setInteractive().setAlpha(alphaNormal).setDepth(100);
        rightBtn.on('pointerdown', () => { this.player.virtualRight = true; rightBtn.setAlpha(alphaPressed); });
        rightBtn.on('pointerup', () => { this.player.virtualRight = false; rightBtn.setAlpha(alphaNormal); });
        rightBtn.on('pointerout', () => { this.player.virtualRight = false; rightBtn.setAlpha(alphaNormal); });

        const jumpBtn = this.add.text(width - 90, height - 80, '▲', btnStyle).setScrollFactor(0).setInteractive().setAlpha(alphaNormal).setDepth(100);
        jumpBtn.on('pointerdown', () => { this.player.virtualJump = true; jumpBtn.setAlpha(alphaPressed); });
        jumpBtn.on('pointerup', () => { this.player.virtualJump = false; jumpBtn.setAlpha(alphaNormal); });
        jumpBtn.on('pointerout', () => { this.player.virtualJump = false; jumpBtn.setAlpha(alphaNormal); });
    }

    update(time, delta) {
        this.player.update();
        if (this.boss) {
            this.boss.update(time, this.player);
        }
    }
}
