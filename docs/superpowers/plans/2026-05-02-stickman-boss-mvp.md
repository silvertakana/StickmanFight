# Stickman Boss MVP Implementation Plan (Google Theme)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or executing-plans.

**Goal:** Build Phase 1 featuring the Google Dark Mode layout. UI elements act as static platforms initially. Boss/Player projectiles and Player 2 dragging can dislodge them into active physics objects.

**Architecture:** 
- **GoogleElement**: Encapsulates a Phaser RenderTexture wrapped in a Matter Sprite. Starts `isStatic: true`. On sufficient hits or pointer drag, transitions to `isStatic: false` with mass proportional to its size.
- **MainScene**: Lays out the Google homepage (Logo, Search Bar, Buttons, Footer). Manages pointer events to detach UI.
- **Player**: WASD controlled Matter physics body. Interacts physically with all UI elements.

**Tech Stack:** HTML5, JavaScript, Vite, Phaser 3, Matter.js

---

### Task 1: Core Game Configuration
- Set up Vite + Phaser.
- Dark mode background `#202124`.

### Task 2: GoogleElement Entity
- Create `src/entities/GoogleElement.js`.
- Render UI via `RenderTexture` for accurate visuals and future textured-shatter support.
- Implement `takeHit()` and `fallOut()` (static to dynamic transition).

### Task 3: MainScene Google Layout
- Create `src/scenes/MainScene.js`.
- Instantiate Google Elements: Logo, Search Bar, Buttons, Footer.
- Implement `pointerdown` global listener to call `fallOut()` on UI elements, allowing Player 2 to rip them off the page.

### Task 4: Stickman Player Setup
- Create `src/entities/Player.js` for WASD movement.
- Player naturally collides with both static and dynamic UI elements.
