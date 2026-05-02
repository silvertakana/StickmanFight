import Phaser from 'phaser';
import Projectile from './Projectile.js';

export default class Boss {
    constructor(scene, x, y) {
        this.scene = scene;
        this.startX = x;
        this.startY = y;
        this.health = 100;
        this.lastFiredTime = 0;
        this.FIRE_COOLDOWN = 2000; // ms

        // Visual setup (scaled up red stickman)
        this.sprite = scene.add.sprite(x, y, 'stickman-idle');
        this.sprite.setScale(1.5);
        this.sprite.setTint(0xff0000).setTintMode(Phaser.TintModes.FILL); // Red boss

        // Physics setup
        this.gameObject = scene.matter.add.gameObject(this.sprite, {
            shape: { type: 'rectangle', width: 27, height: 84 }, // 18x56 scaled by 1.5
            label: 'bossBody',
            ignoreGravity: true, // Boss hovers
            frictionAir: 0.1,
            density: 0.05
        });

        // Prevent rotation
        scene.matter.body.setInertia(this.gameObject.body, Infinity);
        
        // Play idle anim
        this.sprite.play('idle');
    }

    takeHit(damage) {
        this.health -= damage;
        // Flash white when hit
        this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
        this.scene.time.delayedCall(100, () => {
            if (this.health > 0) this.sprite.setTint(0xff0000).setTintMode(Phaser.TintModes.FILL);
        });

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        // Simple death: drop to ground and turn grey
        this.sprite.setTint(0x555555).setTintMode(Phaser.TintModes.FILL);
        this.gameObject.setIgnoreGravity(false);
        this.gameObject.body.label = 'deadBoss'; // stop attacking
    }

    update(time, player) {
        if (this.health <= 0) return;

        // Hover movement (sine wave)
        const hoverY = this.startY + Math.sin(time / 500) * 50;
        
        // Slowly drift towards player horizontally if too far
        const distToPlayerX = player.gameObject.x - this.gameObject.x;
        let targetX = this.startX;
        if (Math.abs(distToPlayerX) > 300) {
            targetX += Math.sign(distToPlayerX) * 100; // Move slightly towards player
        }

        // Apply forces to reach target pos smoothly
        const dx = targetX - this.gameObject.x;
        const dy = hoverY - this.gameObject.y;
        this.gameObject.applyForce({ x: dx * 0.0001, y: dy * 0.0002 });

        // Face player
        if (distToPlayerX > 0) {
            this.sprite.setFlipX(false);
        } else {
            this.sprite.setFlipX(true);
        }

        // Firing logic
        if (time > this.lastFiredTime + this.FIRE_COOLDOWN) {
            this.lastFiredTime = time;
            new Projectile(this.scene, this.gameObject.x, this.gameObject.y, player.gameObject.x, player.gameObject.y);
        }
    }
}
