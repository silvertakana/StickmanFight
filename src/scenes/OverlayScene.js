// src/scenes/OverlayScene.js
import Phaser from 'phaser';
import Player from '../entities/Player.js';
import { resolveAssetPath } from '../game/assetLoader.js';
import DOMScanner from '../scanner/DOMScanner.js';

export default class OverlayScene extends Phaser.Scene {
    constructor() {
        super('OverlayScene');
    }

    preload() {
        // Load player sprites via extension-aware paths
        this.load.spritesheet('stickman-run',
            resolveAssetPath('assets/sprites/stickman/StickmanPack/Run/thickRunSheet.png'),
            { frameWidth: 64, frameHeight: 64 }
        );
        this.load.spritesheet('stickman-idle',
            resolveAssetPath('assets/sprites/stickman/StickmanPack/Idle/thickIdleSheet.png'),
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

        // Sound (for jump)
        this.soundClick = this.sound.add('click', { volume: 0.4 });
        this.soundImpactLight = this.sound.add('impact-light', { volume: 0.3 });
        this.soundShatter = this.sound.add('shatter', { volume: 0.6 });

        // Spawn player at bottom-left
        this.player = new Player(this, 100, height - 100);

        // --- Touch Controls ---
        // Enable multi-touch so Player 1 and Player 2 can interact simultaneously
        this.input.addPointer(2);

        // Scan the DOM and create invisible physics bodies
        this.domScanner = new DOMScanner(this);
        this.domScanner.scan();

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
                        const speed = Math.hypot(dynamicBody.velocity.x, dynamicBody.velocity.y);
                        if (speed > 6 || collision.depth > 3) {
                            if (staticBody.gameObjectClass) {
                                staticBody.gameObjectClass.takeHit();
                                this.soundShatter.play();
                            }
                        } else if (speed > 2) {
                            if (!this.soundImpactLight.isPlaying) {
                                this.soundImpactLight.play();
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
            length: 0.01, stiffness: 0.2, damping: 0.1
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

    update(time, delta) {
        this.player.update();
    }
}
