import Phaser from "/vendor/.vite-deps-phaser.js__v--a2a3c9b5.js";

export default class Projectile {
    constructor(scene, x, y, targetX, targetY) {
        this.scene = scene;
        
        // Calculate velocity vector
        const speed = 8;
        const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
        const velocityX = Math.cos(angle) * speed;
        const velocityY = Math.sin(angle) * speed;

        // Create visual (mini boss sprite)
        this.sprite = scene.add.sprite(x, y, 'boss-frame-1');
        this.sprite.setScale(0.05);
        this.sprite.play('boss-idle');

        // Create Matter physics body
        this.gameObject = scene.matter.add.gameObject(this.sprite, {
            shape: { type: 'circle', radius: 8 },
            label: 'projectile',
            friction: 0,
            frictionAir: 0,
            restitution: 1, // Bouncy
            ignoreGravity: true
        });

        this.gameObject.body.gameObjectClass = this;

        this.gameObject.setPosition(x, y);
        this.gameObject.setVelocity(velocityX, velocityY);

        // Auto-destroy after 5 seconds to prevent memory leaks
        this.timerEvent = scene.time.delayedCall(5000, () => {
            this.destroy();
        });
    }

    destroy() {
        if (this.timerEvent) {
            this.timerEvent.remove(false);
            this.timerEvent = null;
        }
        if (this.gameObject && this.gameObject.body) {
            this.scene.matter.world.remove(this.gameObject.body);
            this.gameObject.destroy();
        }
        if (this.sprite) {
            this.sprite.destroy();
        }
    }
}
