// src/popup.js
const btn = document.getElementById('toggle-btn');
const status = document.getElementById('status');

btn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggle-game' });
        
        if (response?.active) {
            btn.textContent = 'Stop Game';
            btn.classList.add('active');
            status.textContent = 'Game running on this page!';
        } else {
            btn.textContent = 'Start Game';
            btn.classList.remove('active');
            status.textContent = 'Click to play on this page';
        }
    } catch (err) {
        status.textContent = 'Connection lost. Please refresh the web page!';
        btn.textContent = 'Error';
    }
});
