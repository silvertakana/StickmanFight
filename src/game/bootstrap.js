// src/game/bootstrap.js
import Phaser from 'phaser';
import decomp from 'poly-decomp';
import OverlayScene from '../scenes/OverlayScene.js';

window.decomp = decomp;

let gameInstance = null;

export function startGame() {
    if (gameInstance) return; // Already running

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
    `;
    document.body.appendChild(host);

    // Attach Shadow DOM to isolate from host page CSS
    const shadow = host.attachShadow({ mode: 'open' });

    // Create game container inside shadow
    const container = document.createElement('div');
    container.id = 'game-container';
    container.style.cssText = 'width: 100%; height: 100%;';
    shadow.appendChild(container);

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

    gameInstance = new Phaser.Game(config);
}

export function stopGame() {
    if (!gameInstance) return;
    
    gameInstance.destroy(true);
    gameInstance = null;

    const host = document.getElementById('stickman-fight-host');
    if (host) host.remove();

    // Restore scroll
    document.body.style.overflow = document.body.dataset.stickmanPrevOverflow || '';
    delete document.body.dataset.stickmanPrevOverflow;
}
