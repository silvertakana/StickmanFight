<div align="center">
  <img src="public/icons/icon128.png" alt="Stickman Fight Logo" width="128" height="128" />
  <h1>Stickman Fight</h1>
  <p>A browser extension that turns any webpage into a physics playground.</p>
</div>

Stickman Fight is a Chrome/Edge browser extension built with **Phaser 4** and **Matter.js**. It injects a transparent game canvas over your active browser tab, automatically mapping the webpage's DOM elements into invisible physical platforms.

When elements take enough damage, they are dynamically captured via `html2canvas` and converted into falling, tumbling physics sprites.

## Features

- **Live DOM Physics Mapping**: Intelligently scans the host webpage and turns headings, paragraphs, images, and buttons into static physics bodies.
- **Dynamic Element Destruction**: Break apart the webpage! Destroyed elements are screenshotted and converted into dynamic Matter.js bodies that fall under gravity.
- **Dual-Mode Development**: Run the game as a standalone web app for rapid iteration, or build it as a Manifest V3 browser extension.
- **Shadow DOM Isolation**: The game canvas is injected into a Shadow DOM to prevent CSS leakage from the host website.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [pnpm](https://pnpm.io/) package manager

## Installation & Setup

1. Clone the repository and install dependencies:

```bash
pnpm install
```

### Standalone Web Mode (For Rapid Development)

If you want to iterate on game mechanics without reloading the extension, you can run the game in standalone mode. It will render a simulated Google homepage as the playground.

```bash
pnpm run dev
```

### Browser Extension Mode

To test the game on real websites, you must build the extension.

1. Build the extension package:

```bash
pnpm run build
```

2. Load the unpacked extension into your browser:
   - **Microsoft Edge**: Navigate to `edge://extensions`
   - **Google Chrome**: Navigate to `chrome://extensions`
3. Enable **Developer mode** using the toggle switch.
4. Click **Load unpacked** and select the `dist/` folder generated in this project.

## Usage

1. Navigate to any website (e.g., Wikipedia, Google, a news site).
2. Activate the game by either:
   - Clicking the Stickman Fight extension icon in your toolbar.
   - Pressing the keyboard shortcut: `Alt + Shift + S`.
3. Use **W, A, S, D** to control the stickman character.
4. Use your **Mouse** to click and drag elements (Boss controls).

> [!NOTE]
> When the game is active, page scrolling is temporarily locked to turn your current viewport into the game arena. Deactivate the game to restore normal browsing.

## Architecture Highlights

- **Vite & `@crxjs/vite-plugin`**: Powers the build pipeline, enabling fast HMR during extension development.
- **`OverlayScene.js`**: The main Phaser scene responsible for extension mode, handling the transparent background and collision logic.
- **`DOMScanner.js`**: Traverses the DOM tree and uses `getBoundingClientRect()` to perfectly align Matter.js bodies with visible HTML elements.
- **`DOMBlock.js`**: Manages the lifecycle of a physical DOM element, including the transition from an invisible static body to a dynamic `html2canvas` sprite upon destruction.
