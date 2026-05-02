// src/popup.js
const startMenu = document.getElementById('start-menu');
const stopMenu = document.getElementById('stop-menu');
const statusText = document.getElementById('status');
const btnStop = document.getElementById('btn-stop');
const diffButtons = document.querySelectorAll('#start-menu .btn');

async function checkGameState() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    
    try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'get-state' });
        if (response?.active) {
            startMenu.style.display = 'none';
            stopMenu.style.display = 'block';
            statusText.textContent = 'Game running on this page!';
        } else {
            startMenu.style.display = 'block';
            stopMenu.style.display = 'none';
            statusText.textContent = 'Select difficulty to play';
        }
    } catch (err) {
        startMenu.style.display = 'block';
        stopMenu.style.display = 'none';
        statusText.textContent = 'Ready to play on this page';
    }
}

// Check state immediately
checkGameState();

// Start Game from difficulty buttons
diffButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        const difficulty = btn.getAttribute('data-diff');
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        try {
            await chrome.tabs.sendMessage(tab.id, { 
                action: 'toggle-game',
                difficulty: difficulty
            });
            window.close(); // Close the extension popup
        } catch (err) {
            statusText.textContent = 'Connection lost. Please refresh the web page!';
        }
    });
});

// Stop Game
btnStop.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
        await chrome.tabs.sendMessage(tab.id, { action: 'toggle-game' });
        window.close(); // Close popup after stopping
    } catch (err) {
        statusText.textContent = 'Connection lost. Please refresh the web page!';
    }
});
