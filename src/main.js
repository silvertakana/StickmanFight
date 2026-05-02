import Phaser from 'phaser';
import decomp from 'poly-decomp';
import MainScene from './scenes/MainScene.js';

window.decomp = decomp;

export const gameConfig = {
    type: Phaser.WEBGL,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        width: '100%',
        height: '100%'
    },
    backgroundColor: '#202124',
    scene: [MainScene],
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1 },
            debug: true // For visualizing physics bounds during dev
        }
    }
};

if (typeof window !== 'undefined') {
    new Phaser.Game(gameConfig);
}
