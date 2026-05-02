// src/scanner/DOMScanner.js
// Traverses the host page DOM and creates DOMBlock physics bodies.

import { shouldInclude } from './elementFilter.js';
import DOMBlock from '../entities/DOMBlock.js';

export default class DOMScanner {
    constructor(scene) {
        this.scene = scene;
        this.blocks = [];
    }

    /**
     * Scan the current viewport and create physics bodies.
     * Call this once when the game activates.
     */
    scan() {
        this.clear();

        // Ignore our own injected elements
        const hostEl = document.getElementById('stickman-fight-host');

        const allElements = document.querySelectorAll('*');
        const validElements = []; // Collect data to avoid layout thrashing
        const rects = []; // Track placed rects to avoid heavy overlaps

        // PHASE 1: READ ONLY (prevents layout thrashing)
        const MAX_BLOCKS = 150; // Cap to prevent Matter.js from choking on too many physics bodies
        for (const el of allElements) {
            if (validElements.length >= MAX_BLOCKS) break;

            // Skip our own game container
            if (hostEl && hostEl.contains(el)) continue;

            const result = shouldInclude(el);
            if (!result.valid) continue;

            const rect = result.rect;

            // Skip if this rect heavily overlaps an already-placed rect
            // (prevents double physics bodies for nested elements)
            const dominated = rects.some(existing =>
                rect.left >= existing.left - 5 &&
                rect.right <= existing.right + 5 &&
                rect.top >= existing.top - 5 &&
                rect.bottom <= existing.bottom + 5
            );
            if (dominated) continue;

            rects.push(rect);
            validElements.push({ el, rect });
        }

        // PHASE 2: WRITE ONLY (instantiating blocks modifies the DOM)
        for (let i = 0; i < validElements.length; i++) {
            const { el, rect } = validElements[i];
            const block = new DOMBlock(this.scene, el, rect);
            this.blocks.push(block);
        }

        console.log(`[StickmanFight] Scanned ${allElements.length} elements, created ${this.blocks.length} physics blocks`);
    }

    /** Remove all physics bodies (for cleanup/teardown) */
    clear() {
        for (const block of this.blocks) {
            block.destroy();
        }
        this.blocks = [];
    }
}
