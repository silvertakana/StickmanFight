import puppeteer from 'puppeteer';
import fs from 'fs';

const filterCode = fs.readFileSync('src/scanner/elementFilter.js', 'utf8');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    // Inject filter code
    // We need to strip the "export " from shouldInclude
    const injectedCode = filterCode.replace('export function shouldInclude', 'function shouldInclude')
                                   .replace(/export /g, '');
    
    const results = await page.evaluate((code) => {
        // execute the code
        const script = document.createElement('script');
        script.textContent = code + `
            window.runTest = () => {
                const results = [];
                const all = document.querySelectorAll('*');
                for (const el of all) {
                    try {
                        const res = shouldInclude(el);
                        // Is it the logo? Let's check alt text or class
                        const isLogo = el.alt === 'Google' || el.className.includes('lnXdpd') || el.id === 'hplogo';
                        if (isLogo) {
                            results.push({
                                tag: el.tagName,
                                class: el.className,
                                id: el.id,
                                valid: res.valid,
                                reason: 'logo found',
                                rect: el.getBoundingClientRect().toJSON(),
                                isAtomicParent: !!el.parentElement?.closest('button, a, input, select, textarea, label'),
                                hasBgImage: window.getComputedStyle(el).backgroundImage,
                                display: window.getComputedStyle(el).display,
                                visibility: window.getComputedStyle(el).visibility,
                                opacity: window.getComputedStyle(el).opacity,
                            });
                        }
                    } catch(e) {}
                }
                return results;
            }
        `;
        document.body.appendChild(script);
        return window.runTest();
    }, injectedCode);

    console.log("Results for Google logo elements:", JSON.stringify(results, null, 2));

    await browser.close();
})();
