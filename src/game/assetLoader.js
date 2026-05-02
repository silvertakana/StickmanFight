// src/game/assetLoader.js
// Resolves asset paths for both standalone and extension modes.

const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL;

/**
 * Returns the correct path for an asset.
 * In extension mode: chrome.runtime.getURL('assets/foo.png')
 * In standalone mode: 'assets/foo.png' (relative, as before)
 */
export function resolveAssetPath(relativePath) {
    if (isExtension) {
        return chrome.runtime.getURL(relativePath);
    }
    return relativePath;
}
