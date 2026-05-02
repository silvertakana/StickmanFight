// src/content.js
// Content script — injected into all pages by manifest.json
// Listens for messages from the popup to activate/deactivate the game.

let gameActive = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggle-game') {
        if (!gameActive) {
            activateGame();
        } else {
            deactivateGame();
        }
        gameActive = !gameActive;
        sendResponse({ active: gameActive });
    }
});

async function activateGame() {
    console.log('[StickmanFight] Activating game overlay...');
    // Phase 2 will implement: import and call bootstrap.js here
}

function deactivateGame() {
    console.log('[StickmanFight] Deactivating game overlay...');
    // Phase 5 will implement: teardown logic here
}
