// src/scenes/OverlayScene.js
import Phaser from 'phaser';
import Player from '../entities/Player.js';
import { resolveAssetPath } from '../game/assetLoader.js';

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

        // Spawn player at bottom-left
        this.player = new Player(this, 100, height - 100);

        // Mouse spring for dragging DOM blocks (Phase 3+)
        this.matter.add.mouseSpring({
            length: 0.01, stiffness: 0.2, damping: 0.1
        });
    }

    update(time, delta) {
        this.player.update();
    }
}
