import Phaser from "/vendor/.vite-deps-phaser.js__v--02aae984.js";
import Projectile from "/src/entities/Projectile.js.js";

export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;

        // --- Tuning constants ---
        this.MOVE_SPEED = 4;          // Max horizontal speed (px/step)
        this.JUMP_VELOCITY = -9;      // Instant upward impulse
        this.AIR_CONTROL = 1;         // Full air control (1 = same speed as ground)
        this.ANIM_SPEED_MULT = 1;   // Multiplier to match animation frame speed to movement

        // --- Compound body: main body + ground sensor ---
        const Bodies = scene.matter.bodies;

        // Main collision body (slightly narrower, chamfered to avoid catching edges)
        const mainBody = Bodies.rectangle(0, 0, 22, 70, {
            chamfer: { radius: 6 },
            label: 'playerBody'
        });

        // Small sensor at the bottom to detect ground contact
        const groundSensor = Bodies.rectangle(0, 38, 18, 6, {
            isSensor: true,
            label: 'groundSensor'
        });

        // Combine into a compound body
        const compoundBody = scene.matter.body.create({
            parts: [mainBody, groundSensor],
            // Zero surface friction prevents wall-sticking when jumping
            friction: 0,
            frictionStatic: 0,
            // Air friction provides natural deceleration when no input is held
            frictionAir: 0.04,
            restitution: 0,
            label: 'player'
        });

        // The center of mass is calculated by Matter.js and stored in compoundBody.position.
        // Since we created the main body at (0,0), this position is exactly the offset 
        // between the visual center (0,0) and the physical center of mass.
        const centerOfMassOffset = { x: compoundBody.position.x, y: compoundBody.position.y };

        // Create the visual sprite and attach the compound body
        this.sprite = scene.add.sprite(x, y, 'stickman-idle');
        this.sprite.setScale(1.0); // Adjust scale to match physics body
        const playerColor = this._determinePlayerColor();
        this.sprite.setTint(playerColor).setTintMode(Phaser.TintModes.FILL); // Color stickman based on page background
        this.gameObject = scene.matter.add.gameObject(this.sprite);
        this.gameObject.setExistingBody(compoundBody);
        
        // Adjust the display origin so the sprite visually aligns with the main body
        this.gameObject.setDisplayOrigin(
            this.gameObject.width / 2 + centerOfMassOffset.x, 
            this.gameObject.height / 2 + centerOfMassOffset.y
        );

        this.gameObject.setPosition(x, y);

        this.body = this.gameObject.body;
        this.sensorBody = groundSensor;

        // Prevent rotation so the stickman stays upright
        scene.matter.body.setInertia(this.body, Infinity);

        // --- Ground detection via sensor collisions ---
        this.isTouchingGround = false; // Track active ground contact

        scene.matter.world.on('beforeupdate', () => {
            this.isTouchingGround = false;
        });

        const handleCollisions = (event) => {
            for (const pair of event.pairs) {
                if (this._isSensorPair(pair)) {
                    this.isTouchingGround = true;
                }
            }
        };

        scene.matter.world.on('collisionstart', handleCollisions);
        scene.matter.world.on('collisionactive', handleCollisions);

        // --- Input ---
        this.keys = scene.input.keyboard.addKeys('W,A,S,D,SPACE');
        
        // Virtual inputs for touch screens
        this.virtualLeft = false;
        this.virtualRight = false;
        this.virtualJump = false;

        this.lastShootDirection = 1;
        this.lastShootTime = 0;
    }

    _determinePlayerColor() {
        let element = document.body;
        let bgColor = 'rgba(0, 0, 0, 0)';
        
        while (element) {
            const style = window.getComputedStyle(element);
            bgColor = style.backgroundColor;
            if (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                break;
            }
            element = element.parentElement;
        }

        // If background is fully transparent (default web page), it renders as white
        if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
            return 0x000000; // Black stickman on white background
        }

        const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1], 10);
            const g = parseInt(rgbMatch[2], 10);
            const b = parseInt(rgbMatch[3], 10);
            
            // Perceived luminance formula
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            return luminance > 128 ? 0x000000 : 0xffffff;
        }
        
        return 0x000000; // Default to black
    }

    /** Check if a collision pair involves the ground sensor and a non-sensor body */
    _isSensorPair(pair) {
        const { bodyA, bodyB } = pair;
        return (
            (bodyA === this.sensorBody && !bodyB.isSensor) ||
            (bodyB === this.sensorBody && !bodyA.isSensor)
        );
    }

    get isGrounded() {
        return this.isTouchingGround;
    }

    update() {
        const velocity = this.body.velocity;
        const speedMultiplier = this.isGrounded ? 1 : this.AIR_CONTROL;

        // --- Horizontal movement (setVelocity for snappy control) ---
        let isMoving = false;
        if (this.keys.A.isDown || this.virtualLeft) {
            this.gameObject.setVelocityX(-this.MOVE_SPEED * speedMultiplier);
            this.sprite.setFlipX(true);
            isMoving = true;
        } else if (this.keys.D.isDown || this.virtualRight) {
            this.gameObject.setVelocityX(this.MOVE_SPEED * speedMultiplier);
            this.sprite.setFlipX(false);
            isMoving = true;
        } else if (this.isGrounded) {
            // Stop quickly on ground when no input (frictionAir handles air decel)
            this.gameObject.setVelocityX(velocity.x * 0.6);
        }

        // --- Jump (instant velocity, only when grounded) ---
        if ((this.keys.W.isDown || this.virtualJump) && this.isGrounded) {
            this.gameObject.setVelocityY(this.JUMP_VELOCITY);
            this.scene.soundClick.play(); // Use click sound for jump
        }

        // --- Shoot ---
        if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
            // "depending on the previous shoot position" - alternating the shoot direction
            this.lastShootDirection = this.lastShootDirection === 1 ? -1 : 1;
            
            const targetX = this.gameObject.x + (this.lastShootDirection * 100);
            new Projectile(this.scene, this.gameObject.x, this.gameObject.y, targetX, this.gameObject.y);
            this.scene.soundImpactLight.play(); // Play a sound for shooting
        }

        // --- Animations ---
        if (!this.isGrounded) {
            if (velocity.y < 0) {
                this.sprite.setTexture('stickman-jump-up');
                this.sprite.stop(); // Stop any playing animations
            } else {
                this.sprite.setTexture('stickman-jump-down');
                this.sprite.stop();
            }
        } else if (isMoving) {
            this.sprite.play('run', true);
            this.sprite.anims.timeScale = Math.max(0.1, Math.abs(velocity.x) / this.MOVE_SPEED) * this.ANIM_SPEED_MULT;
        } else {
            this.sprite.play('idle', true);
            this.sprite.anims.timeScale = 1;
        }
    }
}
