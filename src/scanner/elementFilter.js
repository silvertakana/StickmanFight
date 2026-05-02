// src/scanner/elementFilter.js
// Rules for deciding which DOM elements make good physics platforms.

/** Minimum dimensions for an element to be considered a platform */
const MIN_WIDTH = 40;
const MIN_HEIGHT = 15;

/** Tags that are always good candidates */
const GOOD_TAGS = new Set([
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'P', 'IMG', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT',
    'LI', 'TD', 'TH', 'BLOCKQUOTE', 'PRE', 'CODE',
    'NAV', 'HEADER', 'FOOTER', 'ASIDE', 'SECTION', 'ARTICLE',
    'VIDEO', 'AUDIO', 'FIGURE', 'FIGCAPTION', 'A'
]);

/** Tags to always skip */
const SKIP_TAGS = new Set([
    'HTML', 'BODY', 'HEAD', 'SCRIPT', 'STYLE', 'LINK', 'META',
    'BR', 'HR', 'NOSCRIPT', 'SVG', 'PATH', 'CIRCLE', 'RECT',
    'IFRAME' // Cross-origin issues
]);

/**
 * Determines if a DOM element should become a physics platform.
 * @param {HTMLElement} el - The element to test
 * @returns {{ valid: boolean, rect: DOMRect | null }}
 */
export function shouldInclude(el) {
    const tag = el.tagName;

    // Skip known bad tags
    if (SKIP_TAGS.has(tag)) return { valid: false, rect: null };

    // Must be visible
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return { valid: false, rect: null };
    }

    const rect = el.getBoundingClientRect();

    // Must be within the viewport
    if (rect.bottom < 0 || rect.top > window.innerHeight ||
        rect.right < 0 || rect.left > window.innerWidth) {
        return { valid: false, rect: null };
    }

    // Must meet minimum size
    if (rect.width < MIN_WIDTH || rect.height < MIN_HEIGHT) {
        return { valid: false, rect: null };
    }

    // Good tags pass automatically
    if (GOOD_TAGS.has(tag)) return { valid: true, rect };

    // For generic divs/spans: only include if they are "leaf" nodes
    // (contain text directly, not just wrapper divs)
    if (tag === 'DIV' || tag === 'SPAN') {
        const hasDirectText = Array.from(el.childNodes).some(
            n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0
        );
        const hasNoBlockChildren = !el.querySelector('div, p, section, article, header, footer, nav, aside');
        if (hasDirectText || hasNoBlockChildren) {
            return { valid: true, rect };
        }
        return { valid: false, rect: null };
    }

    return { valid: false, rect: null };
}
