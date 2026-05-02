// src/background.js
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-game') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            chrome.tabs.sendMessage(tab.id, { action: 'toggle-game' });
        }
    }
});
