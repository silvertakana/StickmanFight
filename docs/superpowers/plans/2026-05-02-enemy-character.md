# Enemy Boss Character Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the AI-controlled Boss character that hovers, targets the player, shoots projectiles, and can take damage from physics objects.

**Architecture:** 
- **Boss Entity:** A Matter.js physics body that ignores gravity, hovers using a sine-wave pattern, and tracks the player. Uses a scaled-up, red-tinted stickman sprite.
- **Projectile Entity:** A Matter.js body representing the boss's attack, which moves in a straight line toward the player.
- **MainScene Integration:** Instantiates the Boss, passes the Player reference for targeting, and manages collisions between the Boss, Player, Projectiles, and Google UI elements.

**Tech Stack:** Phaser 3, Matter.js, JavaScript

---

### Task 1: Create the Projectile Entity

**Files:**
- Create: `src/entities/Projectile.js`

- [ ] **Step 1: Write the minimal implementation**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/Projectile.js
git commit -m "feat: add boss projectile entity"
```

### Task 2: Create the Boss Entity

**Files:**
- Create: `src/entities/Boss.js`

- [ ] **Step 1: Write the minimal implementation**

```javascript
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
        this.sprite.setTintFill(0xff0000); // Red boss

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
        this.sprite.setTintFill(0xffffff);
        this.scene.time.delayedCall(100, () => {
            if (this.health > 0) this.sprite.setTintFill(0xff0000);
        });

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        // Simple death: drop to ground and turn grey
        this.sprite.setTintFill(0x555555);
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
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/Boss.js
git commit -m "feat: add AI-controlled boss entity"
```

### Task 3: Integrate Boss into MainScene

**Files:**
- Modify: `src/scenes/MainScene.js`

- [ ] **Step 1: Update MainScene to instantiate and update Boss**

Modify `src/scenes/MainScene.js` to add the import at the top:
```javascript
import Player from '../entities/Player.js';
import Boss from '../entities/Boss.js';
```

Modify `src/scenes/MainScene.js` (in `create()`, after Player instantiation):
```javascript
        // ===== STICKMAN =====
        this.player = new Player(this, 100, height - 100);

        // ===== BOSS =====
        this.boss = new Boss(this, width - 150, 150);
```

Modify `src/scenes/MainScene.js` (in `update()`, add `time` param and call `boss.update`):
```javascript
    update(time, delta) {
        this.player.update();
        if (this.boss) {
            this.boss.update(time, this.player);
        }
    }
```

- [ ] **Step 2: Handle Boss and Projectile collisions**

Modify `src/scenes/MainScene.js` (inside `handleCollision`, `checkHit` function):
```javascript
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
```

- [ ] **Step 3: Commit**

```bash
git add src/scenes/MainScene.js
git commit -m "feat: integrate boss and projectile collisions in MainScene"
```
