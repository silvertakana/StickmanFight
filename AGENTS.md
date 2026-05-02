# AGENTS.md

## Project Overview

Stickman Fight is a browser extension game built with Phaser 3, Matter.js, JavaScript, and Vite (via CRXJS). It injects a transparent physics-based combat game over any live webpage. The user controls a stickman character via WASD/Touch controls. The extension scans the live DOM, converting interactable HTML elements (buttons, links, images) into static Matter.js physics platforms. When these elements are destroyed, `html2canvas` takes a localized screenshot and converts them into dynamic, falling physics objects.

## Setup Commands

- Install dependencies: `npm install` (or `pnpm install`)
- Start development server: `npm run dev` (This builds the extension and enables HMR via CRXJS).
- Build for production: `npm run build`

## Development Workflow

- The project uses Vite with `@crxjs/vite-plugin` to build a Chrome Extension.
- Run `npm run dev` to start the local development server.
- Load the unpacked extension from the `dist/` folder in Chrome (`chrome://extensions`).
- Hot-Module Replacement (HMR) is supported; changes in `src/` automatically update the extension.
- The entry points are `src/background.js`, `src/content.js`, and `src/popup.js`.
- The game engine runs in an isolated Shadow DOM to prevent CSS conflicts with the host page.

## Core Architecture

- **Phaser 3 & Matter.js**: The core game engine. Use `this.matter` for all physics bodies.
- **Shadow DOM Isolation**: The game canvas (`OverlayScene`) is injected into a Shadow DOM attached to the body of the host page.
- **DOM Scanner (`src/scanner/DOMScanner.js`)**: Traverses the live webpage, filtering out background elements and creating invisible static physics bodies (`DOMBlock`) over interactive elements.
- **Physics Conversion (`src/entities/DOMBlock.js`)**: Upon destruction, `DOMBlock` uses a Native Viewport Capture approach (`chrome.runtime.sendMessage({ action: 'capture-screen' })`) to take a high-speed, localized screenshot of the active tab. This is preferred over `html2canvas` because native capture completely bypasses DOM cloning constraints, tainted canvas CORS issues, and CPU-intensive rendering bottlenecks. The extension dynamically calculates the element's bounding rect and crops the native full-screen capture to accurately apply textures to falling physics objects.

## Testing Instructions

- Test framework: Vitest (environment: jsdom)
- Run all tests: `npm test`

## Code Style

- Language: Vanilla JavaScript (ES6+)
- Framework: Phaser 3 with Matter.js physics integration
- Variables and functions use `camelCase`, while Classes use `PascalCase`.

## Troubleshooting

- **CSP Violations / html2canvas Crashes**: Ensure `ignoreElements` in `DOMBlock.js` is correctly filtering out `<script>`, `<iframe>`, `<svg>`, `<path>`, and `<link>` (preloads) tags.
- **Vite/CRXJS Errors**: If the extension fails to reload, check the background script syntax or ensure `dist/` is correctly loaded.
- **Physics Debugging**: Matter.js debug mode can be enabled in `src/game/bootstrap.js` to visualize the invisible DOM colliders.
