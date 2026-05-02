// src/content.js
// Content script — injected into all pages by manifest.json
// Listens for messages from the popup to activate/deactivate the game.
import { startGame, stopGame } from './game/bootstrap.js';

window.__stickmanHMRCount = (window.__stickmanHMRCount || 0) + 1;
console.log(`[StickmanFight] content.js loaded (HMR count: ${window.__stickmanHMRCount})`);

let gameActive = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggle-game') {
        if (!gameActive) {
            startGame();
        } else {
            stopGame();
        }
        gameActive = !gameActive;
        sendResponse({ active: gameActive });
    }
});
