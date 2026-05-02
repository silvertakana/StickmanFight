// src/scanner/elementFilter.js
// Rules for deciding which DOM elements make good physics platforms.

/** Minimum dimensions for an element to be considered a platform */
const MIN_WIDTH = 20;
const MIN_HEIGHT = 10;

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

    const rawRect = el.getBoundingClientRect();
    
    // Subtract padding and border to get the actual content box
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;
    const borderTop = parseFloat(style.borderTopWidth) || 0;
    const borderRight = parseFloat(style.borderRightWidth) || 0;
    const borderBottom = parseFloat(style.borderBottomWidth) || 0;

    const rect = {
        top: rawRect.top + borderTop + paddingTop,
        left: rawRect.left + borderLeft + paddingLeft,
        width: rawRect.width - (borderLeft + borderRight + paddingLeft + paddingRight),
        height: rawRect.height - (borderTop + borderBottom + paddingTop + paddingBottom),
        bottom: rawRect.bottom - borderBottom - paddingBottom,
        right: rawRect.right - borderRight - paddingRight
    };

    // Must be within the viewport
    if (rect.bottom < 0 || rect.top > window.innerHeight ||
        rect.right < 0 || rect.left > window.innerWidth) {
        return { valid: false, rect: null };
    }

    // Must meet minimum size
    if (rect.width < MIN_WIDTH || rect.height < MIN_HEIGHT) {
        return { valid: false, rect: null };
    }

    // Reject massive containers that would trap the player (e.g., > 40% of screen area)
    const area = rect.width * rect.height;
    const screenArea = window.innerWidth * window.innerHeight;
    if (area > screenArea * 0.4) {
        return { valid: false, rect: null };
    }

    // Do NOT parse children of atomic interactable elements.
    // If this element is INSIDE a button/link/input, we want to skip it
    // so the physics scanner only picks up the parent button!
    const atomicParent = el.parentElement?.closest('button, a, input, select, textarea, label');
    if (atomicParent) {
        return { valid: false, rect: null };
    }

    // Must meet minimum size
    if (rect.width < MIN_WIDTH || rect.height < MIN_HEIGHT) {
        return { valid: false, rect: null };
    }

    // Fixed/sticky elements (navbars, cookie banners) are problematic
    // because they float above the page. Include them but flag them.
    const position = style.position;
    if (position === 'fixed' || position === 'sticky') {
        // Still include — they make great platforms at the top/bottom of the viewport
        return { valid: true, rect, isFixed: true };
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
