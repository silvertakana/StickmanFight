import Phaser from 'phaser';
import GoogleElement from '../entities/GoogleElement.js';
import Player from '../entities/Player.js';
import Boss from '../entities/Boss.js';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    preload() {
        // Load Stickman sprites
        this.load.spritesheet('stickman-run', 'assets/sprites/stickman/StickmanPack/Run/Run.png?v=3', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('stickman-idle', 'assets/sprites/stickman/StickmanPack/Idle/Thin.png?v=3', { frameWidth: 64, frameHeight: 64 });
        this.load.image('stickman-jump-up', 'assets/sprites/stickman/StickmanPack/Jump/JumpUp.png?v=3');
        this.load.image('stickman-jump-down', 'assets/sprites/stickman/StickmanPack/Jump/JumpDown.png?v=3');

        // Load SFX
        this.load.audio('impact-light', 'assets/audio/sfx/impact/Audio/impactGeneric_light_000.ogg');
        this.load.audio('impact-heavy', 'assets/audio/sfx/impact/Audio/impactBell_heavy_000.ogg');
        this.load.audio('click', 'assets/audio/sfx/interface/Audio/click_001.ogg');
        this.load.audio('shatter', 'assets/audio/sfx/interface/Audio/bong_001.ogg');
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

        const getTextVertices = (textStr, fontSize, w, h) => {
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.ceil(w + 10)); // padding
            canvas.height = Math.max(1, Math.ceil(h + 10));
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            ctx.font = `${fontSize} 'Product Sans', 'Arial', sans-serif`;
            ctx.fillStyle = 'white';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillText(textStr, canvas.width / 2, canvas.height / 2);
            
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const getA = (x, y) => {
                if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return 0;
                return imgData[(y * canvas.width + x) * 4 + 3];
            };
            
            let startX = -1, startY = -1;
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    if (getA(x, y) > 128) { startX = x; startY = y; break; }
                }
                if (startX !== -1) break;
            }
            if (startX === -1) return null;
            
            const dirX = [0, 1, 1, 1, 0, -1, -1, -1];
            const dirY = [-1, -1, 0, 1, 1, 1, 0, -1];
            let cx = startX, cy = startY, cDir = 0;
            const path = [];
            let count = 0;
            
            do {
                path.push({ x: cx, y: cy });
                count++;
                cDir = (cDir + 6) % 8;
                let found = false;
                for (let i = 0; i < 8; i++) {
                    const d = (cDir + i) % 8;
                    if (getA(cx + dirX[d], cy + dirY[d]) > 128) {
                        cx += dirX[d];
                        cy += dirY[d];
                        cDir = d;
                        found = true;
                        break;
                    }
                }
                if (!found) break;
            } while ((cx !== startX || cy !== startY) && count < 2000);
            
            const simplified = [];
            let minX = Infinity, minY = Infinity;
            const step = Math.max(1, Math.floor(path.length / 40));
            const offsetX = canvas.width / 2;
            const offsetY = canvas.height / 2;
            for (let i = 0; i < path.length; i += step) {
                const px = path[i].x - offsetX;
                const py = path[i].y - offsetY;
                minX = Math.min(minX, px);
                minY = Math.min(minY, py);
                simplified.push(`${px} ${py}`);
            }
            return { verts: simplified.join(' '), minX, minY };
        };

        let startX = centerX - (totalWidth / 2);
        for (let i = 0; i < googleLetters.length; i++) {
            const letter = googleLetters[i];
            const dims = letterWidths[i];
            
            const shapeData = getTextVertices(letter.char, letter.size, dims.w, dims.h);
            const shapeConfig = shapeData && shapeData.verts ? { type: 'fromVerts', verts: shapeData.verts } : undefined;
            
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
                origMinX: shapeData ? shapeData.minX : undefined,
                origMinY: shapeData ? shapeData.minY : undefined
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

        // ===== SOUNDS =====
        this.soundImpactLight = this.sound.add('impact-light', { volume: 0.3 });
        this.soundImpactHeavy = this.sound.add('impact-heavy', { volume: 0.5 });
        this.soundClick = this.sound.add('click', { volume: 0.4 });
        this.soundShatter = this.sound.add('shatter', { volume: 0.6 });

        // ===== STICKMAN =====
        this.player = new Player(this, 100, height - 100);

        // ===== BOSS =====
        this.boss = new Boss(this, width - 150, 150);

        // ===== COLLISION HANDLING =====
        const handleCollision = (event) => {
            event.pairs.forEach(pair => {
                const { bodyA, bodyB, collision } = pair;
                
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
                                staticBody.gameObjectClass.takeHit();
                                this.soundShatter.play();
                            }
                        } else if (speed > 2) {
                            // Light impact sound
                            if (!this.soundImpactLight.isPlaying) {
                                this.soundImpactLight.play();
                            }
                        }
                    } else if (staticBody.label === 'playerBody' || dynamicBody.label === 'playerBody') {
                        const speed = Math.hypot(dynamicBody.velocity.x, dynamicBody.velocity.y);
                        if (speed > 5 && !this.soundImpactHeavy.isPlaying) {
                            this.soundImpactHeavy.play();
                        }
                        
                        // Player hit by projectile
                        if (staticBody.label === 'projectile' || dynamicBody.label === 'projectile') {
                            console.log('Player hit by projectile!');
                        }
                    } else if (staticBody.label === 'bossBody' || dynamicBody.label === 'bossBody') {
                        // Boss takes damage from fast moving objects (UI elements thrown by P2)
                        if (dynamicBody.label === 'google-ui' && !dynamicBody.isStatic) {
                            const speed = Math.hypot(dynamicBody.velocity.x, dynamicBody.velocity.y);
                            if (speed > 8) {
                                this.boss.takeHit(25);
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
    }

    update(time, delta) {
        this.player.update();
        if (this.boss) {
            this.boss.update(time, this.player);
        }
    }
}
