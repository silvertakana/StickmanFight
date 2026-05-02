import Phaser from "/vendor/.vite-deps-phaser.js__v--a2a3c9b5.js";
import Projectile from "/src/entities/Projectile.js.js";

export default class Boss {
    constructor(scene, x, y, difficulty = 'medium') {
        this.scene = scene;
        this.startX = x;
        this.startY = y;
        this.health = 8;
        this.lastFiredTime = 0;

        this.FIRE_COOLDOWN = 500; // ms
        this.maxSpeed = 25;
        this.forceX = 0.0006;
        this.forceY = 0.0008;

        if (difficulty === 'easy') {
            this.health = 5;
            this.FIRE_COOLDOWN = 1000;
            this.maxSpeed = 15;
            this.forceX = 0.0003;
            this.forceY = 0.0004;
        } else if (difficulty === 'hard') {
            this.health = 12;
            this.FIRE_COOLDOWN = 250;
            this.maxSpeed = 35;
            this.forceX = 0.0010;
            this.forceY = 0.0012;
        }

        // Visual setup (custom scribble boss)
        this.sprite = scene.add.sprite(x, y, 'boss-frame-1');
        this.sprite.setScale(0.15); // Scale down large 1104px image

        // Physics setup
        this.gameObject = scene.matter.add.gameObject(this.sprite, {
            shape: { type: 'circle', radius: 50 }, // Roughly fits the scribble ball
            label: 'bossBody',
            ignoreGravity: true, // Boss hovers
            frictionAir: 0.1,
            density: 0.05,
            collisionFilter: {
                category: 0x0002
            }
        });

        // Prevent rotation
        scene.matter.body.setInertia(this.gameObject.body, Infinity);
        
        // Play idle anim
        this.sprite.play('boss-idle');
    }

    takeHit(damage = 1) {
        if (this.health <= 0) return;
        this.health -= damage;
        
        // Flash red when hit (Phaser 4 syntax for solid fill)
        this.sprite.setTint(0xc93838).setTintMode(Phaser.TintModes.FILL);
        this.scene.time.delayedCall(250, () => {
            if (this.health > 0) this.sprite.clearTint();
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
        if (this.scene.showEndGame) {
            this.scene.showEndGame('YOU WIN');
        }
    }

    update(time, player) {
        if (this.health <= 0) return;

        if (player && player.isDead) {
            if (!this.winTime) {
                this.winTime = time;
            }

            if (time < this.winTime + 3000) {
                // Fly towards the dead player's body for 3 seconds
                const dx = player.gameObject.x - this.gameObject.x;
                const dy = player.gameObject.y - this.gameObject.y;
                this.gameObject.applyForce({ x: dx * 0.0006, y: dy * 0.0008 });

                // Cap the approach speed
                const speed = Math.hypot(this.gameObject.body.velocity.x, this.gameObject.body.velocity.y);
                if (speed > 10) {
                    this.gameObject.setVelocity(
                        (this.gameObject.body.velocity.x / speed) * 10,
                        (this.gameObject.body.velocity.y / speed) * 10
                    );
                }
            } else {
                // Time's up, disable collisions and float upwards off screen
                this.gameObject.body.collisionFilter.mask = 0;
                this.gameObject.setVelocity(0, -3);
            }
            return; // Prevent normal AI and shooting
        }

        const pointer = this.scene.input.activePointer;

        // Target a point high above the player to ensure it is always flying
        let targetY = player.gameObject.y - 350 + Math.sin(time / 500) * 50;
        let targetX = player.gameObject.x;

        // Always run away from the cursor if it gets too close
        if (pointer) {
            const distToCursorX = this.gameObject.x - pointer.worldX;
            const distToCursorY = this.gameObject.y - pointer.worldY;
            const distToCursor = Math.hypot(distToCursorX, distToCursorY);
            
            // If the cursor is near, push target far away from cursor
            if (distToCursor < 500) {
                targetX += (distToCursorX / distToCursor) * 1000;
                targetY += (distToCursorY / distToCursor) * 1000;
            }
        }

        // Keep target inside the camera view so the boss doesn't run off screen
        const camView = this.scene.cameras.main.worldView;
        const padding = 120; // Keep some distance from the edge
        
        if (targetX < camView.left + padding) targetX = camView.left + padding;
        if (targetX > camView.right - padding) targetX = camView.right - padding;
        if (targetY < camView.top + padding) targetY = camView.top + padding;
        if (targetY > camView.bottom - padding) targetY = camView.bottom - padding;

        // Apply much stronger forces to reach target pos smoothly and quickly
        const dx = targetX - this.gameObject.x;
        const dy = targetY - this.gameObject.y;
        this.gameObject.applyForce({ x: dx * this.forceX, y: dy * this.forceY });

        // Cap maximum speed much higher
        const speed = Math.hypot(this.gameObject.body.velocity.x, this.gameObject.body.velocity.y);
        if (speed > this.maxSpeed) {
            this.gameObject.setVelocity(
                (this.gameObject.body.velocity.x / speed) * this.maxSpeed,
                (this.gameObject.body.velocity.y / speed) * this.maxSpeed
            );
        }

        // Face player
        const distToPlayerX = player.gameObject.x - this.gameObject.x;
        if (distToPlayerX > 0) {
            this.sprite.setFlipX(false);
        } else {
            this.sprite.setFlipX(true);
        }

        // Firing logic
        if (time > this.lastFiredTime + this.FIRE_COOLDOWN) {
            this.lastFiredTime = time;

            // Determine if Boss can see the player using a raycast
            const bodies = this.scene.matter.world.engine.world.bodies;
            const solidBodies = bodies.filter(b => 
                b.label === 'dom-block' || 
                b.label === 'dom-block-fallen' || 
                b.label === 'ground' || 
                b.label === 'wall-left' || 
                b.label === 'wall-right'
            );

            const rayStart = { x: this.gameObject.x, y: this.gameObject.y };
            const rayEnd = { x: player.gameObject.x, y: player.gameObject.y };
            
            let rayHits = [];
            if (Phaser.Physics.Matter.Matter.Query && Phaser.Physics.Matter.Matter.Query.ray) {
                rayHits = Phaser.Physics.Matter.Matter.Query.ray(solidBodies, rayStart, rayEnd);
            }
            
            const canSeePlayer = rayHits.length === 0;

            const cursorHolding = this.scene.mouseSpringPlugin && 
                                  this.scene.mouseSpringPlugin.constraint && 
                                  this.scene.mouseSpringPlugin.constraint.bodyB;

            let targetX = player.gameObject.x;
            let targetY = player.gameObject.y;

            if (canSeePlayer) {
                // raycast=yes -> shoot player
                targetX = player.gameObject.x;
                targetY = player.gameObject.y;
            } else if (!canSeePlayer && cursorHolding && pointer) {
                // raycast=no but cursor holding=yes -> shoot cursor
                targetX = pointer.worldX;
                targetY = pointer.worldY;
            } else {
                // neither -> shoot player
                targetX = player.gameObject.x;
                targetY = player.gameObject.y;
            }

            new Projectile(this.scene, this.gameObject.x, this.gameObject.y, targetX, targetY);
        }
    }
}
