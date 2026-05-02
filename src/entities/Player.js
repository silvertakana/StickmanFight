import Phaser from 'phaser';

export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;

        // --- Tuning constants ---
        this.MOVE_SPEED = 4;          // Max horizontal speed (px/step)
        this.JUMP_VELOCITY = -9;      // Instant upward impulse
        this.AIR_CONTROL = 1;         // Full air control (1 = same speed as ground)
        this.ANIM_SPEED_MULT = 1.5;   // Multiplier to match animation frame speed to movement

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
        this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL); // Make the stickman completely white
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
        this.groundContactCount = 0; // Track number of active ground contacts

        scene.matter.world.on('collisionstart', (event) => {
            for (const pair of event.pairs) {
                if (this._isSensorPair(pair)) {
                    this.groundContactCount++;
                }
            }
        });

        scene.matter.world.on('collisionend', (event) => {
            for (const pair of event.pairs) {
                if (this._isSensorPair(pair)) {
                    this.groundContactCount = Math.max(0, this.groundContactCount - 1);
                }
            }
        });

        // --- Input ---
        this.keys = scene.input.keyboard.addKeys('W,A,S,D,SPACE');
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
        return this.groundContactCount > 0;
    }

    update() {
        const velocity = this.body.velocity;
        const speedMultiplier = this.isGrounded ? 1 : this.AIR_CONTROL;

        // --- Horizontal movement (setVelocity for snappy control) ---
        let isMoving = false;
        if (this.keys.A.isDown) {
            this.gameObject.setVelocityX(-this.MOVE_SPEED * speedMultiplier);
            this.sprite.setFlipX(true);
            isMoving = true;
        } else if (this.keys.D.isDown) {
            this.gameObject.setVelocityX(this.MOVE_SPEED * speedMultiplier);
            this.sprite.setFlipX(false);
            isMoving = true;
        } else if (this.isGrounded) {
            // Stop quickly on ground when no input (frictionAir handles air decel)
            this.gameObject.setVelocityX(velocity.x * 0.6);
        }

        // --- Jump (instant velocity, only when grounded) ---
        if (this.keys.W.isDown && this.isGrounded) {
            this.gameObject.setVelocityY(this.JUMP_VELOCITY);
            this.scene.soundClick.play(); // Use click sound for jump
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
            if (this.sprite.anims.currentAnim?.key !== 'run') {
                this.sprite.play('run');
            }
            this.sprite.anims.timeScale = Math.max(0.1, Math.abs(velocity.x) / this.MOVE_SPEED) * this.ANIM_SPEED_MULT;
        } else {
            if (this.sprite.anims.currentAnim?.key !== 'idle') {
                this.sprite.play('idle');
            }
            this.sprite.anims.timeScale = 1;
        }
    }
}
