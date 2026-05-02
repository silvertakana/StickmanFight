export default class Projectile {
    constructor(scene, x, y, targetX, targetY) {
        this.scene = scene;
        
        // Calculate velocity vector
        const speed = 8;
        const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
        const velocityX = Math.cos(angle) * speed;
        const velocityY = Math.sin(angle) * speed;

        // Create visual (red glowing orb)
        this.sprite = scene.add.graphics();
        this.sprite.fillStyle(0xff4444, 1);
        this.sprite.fillCircle(0, 0, 8);
        this.sprite.lineStyle(2, 0xffaaaa, 1);
        this.sprite.strokeCircle(0, 0, 8);

        // Create Matter physics body
        this.gameObject = scene.matter.add.gameObject(this.sprite, {
            shape: { type: 'circle', radius: 8 },
            label: 'projectile',
            friction: 0,
            frictionAir: 0,
            restitution: 1, // Bouncy
            ignoreGravity: true
        });

        this.gameObject.setPosition(x, y);
        this.gameObject.setVelocity(velocityX, velocityY);

        // Auto-destroy after 5 seconds to prevent memory leaks
        scene.time.delayedCall(5000, () => {
            this.destroy();
        });
    }

    destroy() {
        if (this.gameObject && this.gameObject.body) {
            this.scene.matter.world.remove(this.gameObject.body);
            this.gameObject.destroy();
        }
        if (this.sprite) {
            this.sprite.destroy();
        }
    }
}
