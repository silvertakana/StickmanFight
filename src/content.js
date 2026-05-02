// src/content.js
// Content script — injected into all pages by manifest.json
// Listens for messages from the popup to activate/deactivate the game.
import { startGame, stopGame } from './game/bootstrap.js';

window.__stickmanHMRCount = (window.__stickmanHMRCount || 0) + 1;
console.log(`[StickmanFight] content.js loaded (HMR count: ${window.__stickmanHMRCount})`);

let gameActive = false;

if (window.__stickmanMessageListener) {
    chrome.runtime.onMessage.removeListener(window.__stickmanMessageListener);
}

window.__stickmanMessageListener = (message, sender, sendResponse) => {
    if (message.action === 'toggle-game') {
        if (!gameActive) {
            startGame(message.difficulty);
        } else {
            stopGame();
        }
        gameActive = !gameActive;
        sendResponse({ active: gameActive });
    } else if (message.action === 'get-state') {
        sendResponse({ active: gameActive });
    }
};

chrome.runtime.onMessage.addListener(window.__stickmanMessageListener);
