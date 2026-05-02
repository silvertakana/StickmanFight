import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' });
    
    const logoDataUrl = await page.evaluate(async () => {
        const logo = document.querySelector('.lnXdpd, [alt="Google"], img[src*="googlelogo"]');
        if (!logo) return null;
        
        try {
            const canvas = await html2canvas(logo, {
                backgroundColor: null,
                scale: 1,
                ignoreElements: (node) => {
                    if (!node || !node.tagName) return false;
                    const tag = node.tagName.toUpperCase();
                    if (tag === 'IFRAME' || tag === 'SCRIPT' || tag === 'NOSCRIPT' || tag === 'VIDEO' || tag === 'OBJECT' || tag === 'EMBED' || tag === 'FOREIGNOBJECT' || tag === 'IMAGE') {
                        return true;
                    }
                    return false;
                }
            });
            return {
                width: canvas.width,
                height: canvas.height,
                dataUrl: canvas.toDataURL('image/png').substring(0, 50) + '...'
            };
        } catch (e) {
            return { error: e.message };
        }
    });
    
    console.log("Logo Capture:", logoDataUrl);
    
    await browser.close();
})();
