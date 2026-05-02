// src/game/virtualControls.js
// Shared touch control buttons for mobile/tablet — used by both OverlayScene and MainScene.

/**
 * Creates virtual on-screen buttons for touch devices.
 * Binds them directly to the player's virtual input flags.
 *
 * @param {Phaser.Scene} scene - The active Phaser scene
 * @param {Player} player - The player entity to control
 * @param {number} width - Scene width
 * @param {number} height - Scene height
 */
export function createVirtualControls(scene, player, width, height) {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouch) return;

    const btnStyle = {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'Arial',
        backgroundColor: '#000000',
        padding: { x: 15, y: 10 },
        fixedWidth: 60,
        align: 'center'
    };

    const ALPHA_NORMAL = 0.4;
    const ALPHA_PRESSED = 0.8;

    const makeButton = (x, y, label, onDown, onUp) => {
        const btn = scene.add.text(x, y, label, btnStyle)
            .setScrollFactor(0)
            .setInteractive()
            .setAlpha(ALPHA_NORMAL)
            .setDepth(100);

        btn.on('pointerdown', () => { onDown(); btn.setAlpha(ALPHA_PRESSED); });
        btn.on('pointerup', () => { onUp(); btn.setAlpha(ALPHA_NORMAL); });
        btn.on('pointerout', () => { onUp(); btn.setAlpha(ALPHA_NORMAL); });
        return btn;
    };

    makeButton(30, height - 80, '❮',
        () => { player.virtualLeft = true; },
        () => { player.virtualLeft = false; }
    );

    makeButton(110, height - 80, '❯',
        () => { player.virtualRight = true; },
        () => { player.virtualRight = false; }
    );

    makeButton(width - 90, height - 80, '▲',
        () => { player.virtualJump = true; },
        () => { player.virtualJump = false; }
    );
}
