const decomp = !__vite__cjsImport1_polyDecomp.__esModule ? __vite__cjsImport1_polyDecomp : __vite__cjsImport1_polyDecomp.default;// src/game/bootstrap.js
import Phaser from "/vendor/.vite-deps-phaser.js__v--a2a3c9b5.js";
import __vite__cjsImport1_polyDecomp from "/vendor/.vite-deps-poly-decomp.js__v--a2a3c9b5.js";
import OverlayScene from "/src/scenes/OverlayScene.js.js";

window.decomp = decomp;

export async function startGame(difficulty = 'medium') {
    if (window.__stickmanGameInstance || window.__stickmanIsStarting) return; // Already running or starting
    window.__stickmanIsStarting = true;
    window.__stickmanDifficulty = difficulty;

    // Capture the clean screen before injecting the game UI
    try {
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'capture-screen' }, resolve);
        });
        
        if (response && response.dataUrl) {
            const img = new Image();
            img.src = response.dataUrl;
            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve; // Continue even if it fails
            });
            window.__stickmanScreenshotImage = img;
        } else {
            console.warn("[StickmanFight] Screen capture failed:", response?.error);
            window.__stickmanScreenshotImage = null;
        }
    } catch (err) {
        console.warn("[StickmanFight] Error capturing screen:", err);
        window.__stickmanScreenshotImage = null;
    }

    // Create a host element for Shadow DOM isolation
    const host = document.createElement('div');
    host.id = 'stickman-fight-host';
    host.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2147483647;
        pointer-events: auto;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
    `;
    document.body.appendChild(host);


    // Attach Shadow DOM to isolate from host page CSS
    const shadow = host.attachShadow({ mode: 'open' });

    // CRITICAL FIX: Shadow DOMs do not inherit @font-face from document.head!
    // We MUST manually inject the font-face into the shadow root so the Canvas can render it.
    const shadowFontStyle = document.createElement('style');
    shadowFontStyle.textContent = `
        @font-face {
            font-family: 'EB Garamond';
            font-style: normal;
            font-weight: 100 900;
            src: url('${chrome.runtime.getURL('assets/fonts/EB_Garamond/EBGaramond-VariableFont_wght.ttf')}') format('truetype');
        }
    `;
    shadow.appendChild(shadowFontStyle);

    // Create game container inside shadow
    const container = document.createElement('div');
    container.id = 'game-container';
    container.style.cssText = 'width: 100%; height: 100%;';
    shadow.appendChild(container);

    // Inside shadow DOM, add a small indicator badge
    const badge = document.createElement('div');
    badge.id = 'stickman-badge';
    badge.textContent = '⚔️ Stickman Fight — Alt+Shift+S to exit';
    badge.style.cssText = `
        position: fixed;
        top: 8px;
        right: 8px;
        padding: 6px 12px;
        background: rgba(0, 0, 0, 0.7);
        color: #e8eaed;
        font-family: 'Segoe UI', sans-serif;
        font-size: 12px;
        border-radius: 6px;
        z-index: 2147483647;
        pointer-events: none;
        opacity: 0.8;
        transition: opacity 2s;
    `;
    shadow.appendChild(badge);

    // Fade out after 3 seconds
    window.__stickmanBadgeTimeout = setTimeout(() => { 
        if (badge && badge.parentNode) {
            badge.style.opacity = '0'; 
        }
    }, 3000);

    // Lock page scroll
    document.body.dataset.stickmanPrevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const config = {
        type: Phaser.WEBGL,
        scale: {
            mode: Phaser.Scale.RESIZE,
            parent: container,
            width: '100%',
            height: '100%'
        },
        transparent: true, // Key: transparent background!
        scene: [OverlayScene],
        physics: {
            default: 'matter',
            matter: {
                gravity: { y: 1 },
                debug: false
            }
        }
    };

    window.__stickmanGameInstance = new Phaser.Game(config);
    window.__stickmanIsStarting = false;
}

export function stopGame() {
    if (!window.__stickmanGameInstance) return;
    
    window.__stickmanGameInstance.destroy(true);
    window.__stickmanGameInstance = null;

    if (window.__stickmanBadgeTimeout) {
        clearTimeout(window.__stickmanBadgeTimeout);
    }

    const host = document.getElementById('stickman-fight-host');
    if (host) host.remove();

    // Restore scroll
    document.body.style.overflow = document.body.dataset.stickmanPrevOverflow || '';
    delete document.body.dataset.stickmanPrevOverflow;
    
    window.__stickmanScreenshotImage = null;
    window.__stickmanIsStarting = false;
}
