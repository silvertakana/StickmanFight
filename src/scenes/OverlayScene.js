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

        // Click-to-detach DOM blocks (Boss player mechanic)
        this.input.on('pointerdown', (pointer) => {
            const bodies = this.matter.world.engine.world.bodies;
            const worldPoint = { x: pointer.worldX, y: pointer.worldY };
            const clicked = this.matter.query.point(bodies, worldPoint);

            for (const body of clicked) {
                if (body.label === 'dom-block' && body.isStatic && body.gameObjectClass) {
                    body.gameObjectClass.fallOut();
                    break;
                }
            }
        });

        // Mouse spring for dragging DOM blocks (Phase 3+)
        this.matter.add.mouseSpring({
            length: 0.01, stiffness: 0.2, damping: 0.1
        });
    }

    update(time, delta) {
        this.player.update();
    }
}
