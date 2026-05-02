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
        console.time('[StickmanFight] DOMScanner.scan total');
        this.clear();

        // Ignore our own injected elements
        const hostEl = document.getElementById('stickman-fight-host');

        // Process top-down so we don't get stuck in the footer
        const allElements = document.querySelectorAll('*');
        let blocksData = []; // Array of { rect, el, valid }
        const MAX_BLOCKS = 80;

        for (const el of allElements) {
            // Skip our own game container
            if (hostEl && hostEl.contains(el)) continue;

            const result = shouldInclude(el);
            if (!result.valid) continue;

            const rect = result.rect;

            // Check against existing blocks using exact DOM hierarchy
            let skipCurrent = false;
            let indicesToRemove = [];

            for (let i = 0; i < blocksData.length; i++) {
                const existingEl = blocksData[i].el;
                
                // If the existing element contains the current element,
                // the existing element is a parent wrapper. We want to KEEP the child.
                // We only remove the wrapper if it's visually invisible (structural).
                if (existingEl.contains(el)) {
                    const style = window.getComputedStyle(existingEl);
                    const bgColor = style.backgroundColor;
                    const hasBg = bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent';
                    const hasBorder = parseInt(style.borderWidth) > 0 && style.borderStyle !== 'none';
                    const hasShadow = style.boxShadow && style.boxShadow !== 'none';
                    
                    if (!hasBg && !hasBorder && !hasShadow) {
                        // It's an invisible wrapper. Remove it.
                        indicesToRemove.push(i);
                    }
                } 
                // If the current element contains an existing element,
                // the current element is a parent wrapper. We want to SKIP it if it's invisible.
                else if (el.contains(existingEl)) {
                    const style = window.getComputedStyle(el);
                    const bgColor = style.backgroundColor;
                    const hasBg = bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent';
                    const hasBorder = parseInt(style.borderWidth) > 0 && style.borderStyle !== 'none';
                    const hasShadow = style.boxShadow && style.boxShadow !== 'none';

                    if (!hasBg && !hasBorder && !hasShadow) {
                        // Invisible wrapper, skip it.
                        skipCurrent = true;
                        break;
                    }
                }
            }

            if (skipCurrent) continue;

            // Remove any parent wrappers we found
            blocksData = blocksData.filter((_, index) => !indicesToRemove.includes(index));

            blocksData.push({ rect, el });
        }

        // Now create the actual physics blocks (up to MAX_BLOCKS)
        for (let i = 0; i < Math.min(blocksData.length, MAX_BLOCKS); i++) {
            const block = new DOMBlock(this.scene, blocksData[i].el, blocksData[i].rect);
            this.blocks.push(block);
        }

        console.log(`[StickmanFight] Scanned ${allElements.length} elements, created ${this.blocks.length} physics blocks`);
        console.timeEnd('[StickmanFight] DOMScanner.scan total');
    }

    /** Remove all physics bodies (for cleanup/teardown) */
    clear() {
        for (const block of this.blocks) {
            block.destroy();
        }
        this.blocks = [];
    }
}
