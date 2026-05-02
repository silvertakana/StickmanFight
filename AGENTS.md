# AGENTS.md

## Project Overview

Stickman Boss Fight is a two-player, physics-based local co-op browser game built with Phaser 3, Matter.js, HTML5, JavaScript, and Vite. One player controls a stickman via WASD, and the other player manipulates a simulated Google homepage via mouse. UI elements start as static physics platforms but can be detached into active dynamic physics objects (falling out) during gameplay.

## Setup Commands

- Install dependencies: `npm install`
- Start development server: `npm run dev`
- Build for production: `npm run build`

## Development Workflow

- The project uses Vite as the build tool and dev server.
- Run `npm run dev` to start the local development server (typically on `http://localhost:3000`).
- Changes to source files in `src/` will automatically trigger hot-reloading in the browser.
- Main entry point is `index.html` and `src/main.js`.
- Core entities are located in `src/entities/` and scenes in `src/scenes/`.

## Testing Instructions

- Test framework: Vitest (environment: jsdom)
- Run all tests: `npm test`

## Code Style

- Language: Vanilla JavaScript (ES6+)
- Framework: Phaser 3 with Matter.js physics integration
- The project follows a class-based approach for Phaser Entities (e.g., `GoogleElement`, `Player`) and Scenes (`MainScene`).
- Variables and functions use `camelCase`, while Classes use `PascalCase`.

## Build and Deployment

- Build process: `npm run build` generates static assets via Vite.
- Output directory: `/dist`
- The contents of the `/dist` directory can be deployed to any static web host.

## Important Context & Technical Patterns

- **Physics Engine**: Use `this.matter` for physics bodies, NOT Arcade Physics.
- **Dynamic Entities**: `GoogleElement` encapsulates a Phaser `RenderTexture` wrapped in a Matter Sprite. It starts with `isStatic: true` and transitions to `isStatic: false` upon sufficient hits or pointer drag events.
- **Documentation & Plans**: Check `docs/superpowers/plans/` for the current implementation phase (e.g., `2026-05-02-stickman-boss-mvp.md`).

## Troubleshooting

- If Vite server gives port conflicts, check `vite.config.js` for port configuration.
- If Phaser Matter bodies render incorrectly, verify the physics debug mode is enabled in the Phaser config in `src/main.js` for visual debugging.
