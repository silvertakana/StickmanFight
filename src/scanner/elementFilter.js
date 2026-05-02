// src/scanner/elementFilter.js
// Rules for deciding which DOM elements make good physics platforms.

const MIN_WIDTH = 15;
const MIN_HEIGHT = 15;

const SKIP_TAGS = new Set([
    'HTML', 'BODY', 'HEAD', 'SCRIPT', 'STYLE', 'LINK', 'META',
    'BR', 'HR', 'NOSCRIPT', 'PATH', 'CIRCLE', 'RECT',
    'IFRAME' // Cross-origin issues break canvas capture
]);

export function shouldInclude(el) {
    const tag = el.tagName.toUpperCase();

    if (SKIP_TAGS.has(tag)) return { valid: false, rect: null };

    const rect = el.getBoundingClientRect();

    if (rect.bottom < 0 || rect.top > window.innerHeight ||
        rect.right < 0 || rect.left > window.innerWidth) {
        return { valid: false, rect: null };
    }

    if (rect.width < MIN_WIDTH || rect.height < MIN_HEIGHT) {
        return { valid: false, rect: null };
    }

    // Reject massive containers that would trap the player
    const screenArea = window.innerWidth * window.innerHeight;
    if (rect.width * rect.height > screenArea * 0.4) {
        return { valid: false, rect: null };
    }

    // Reject elements that stretch the whole width of the screen (e.g. banners, navbars)
    if (rect.width > window.innerWidth * 0.90) {
        return { valid: false, rect: null };
    }

    // Reject elements that stretch almost the whole height of the screen (e.g. sidebars)
    if (rect.height > window.innerHeight * 0.75) {
        return { valid: false, rect: null };
    }

    // Do NOT parse children of atomic interactable elements.
    const atomicParent = el.parentElement?.closest('button, a, input, select, textarea, label');
    if (atomicParent) {
        return { valid: false, rect: null };
    }

    // --- EXPENSIVE STYLE CHECKS MOVED HERE ---
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return { valid: false, rect: null };
    }

    // Determine visual styling
    const hasBackground = style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent';
    const hasBorder = style.borderWidth !== '0px' && style.borderStyle !== 'none';
    const hasShadow = style.boxShadow !== 'none';
    const hasBgImage = style.backgroundImage !== 'none';
    const hasVisualStyling = hasBackground || hasBorder || hasShadow || hasBgImage;

    // Determine direct content
    const hasDirectText = Array.from(el.childNodes).some(
        n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0
    );
    const hasDirectMedia = Array.from(el.children).some(
        c => ['IMG', 'SVG', 'CANVAS', 'VIDEO'].includes(c.tagName.toUpperCase())
    );
    
    const isAtomicTag = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'IMG', 'CANVAS', 'VIDEO', 'SVG', 'A', 'LABEL'].includes(tag);

    // If it has NO visual styling AND NO direct content, it's an invisible wrapper. SKIP IT.
    // However, if it's an atomic tag (like A or LABEL), we keep it even if it has no background!
    if (!hasVisualStyling && !hasDirectText && !hasDirectMedia && !isAtomicTag) {
        return { valid: false, rect: null };
    }

    // If it is an invisible wrapper that DOES have direct text/media, it is valid!
    // If it HAS visual styling, it's a valid structural block (like a colored navbar or card).
    
    // Fixed/sticky elements flag
    const position = style.position;
    if (position === 'fixed' || position === 'sticky') {
        return { valid: true, rect, isFixed: true };
    }

    return { valid: true, rect };
}
