import puppeteer from 'puppeteer';
import fs from 'fs';

const elementFilterCode = fs.readFileSync('./src/scanner/elementFilter.js', 'utf-8');

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Set a typical viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Go to Google
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    
    // Inject the logic
    const results = await page.evaluate((filterCode) => {
        // Strip exports from filter code to run in browser
        const cleanCode = filterCode.replace(/export /g, '');
        
        // Create a function body
        const scriptContent = cleanCode + `
            const blocks = [];
            const allElements = document.querySelectorAll('*');
            const validElements = [];
            const rects = [];
            
            for (const el of allElements) {
                const result = shouldInclude(el);
                if (!result.valid) continue;
                
                const rect = result.rect;
                const dominated = rects.some(existing =>
                    rect.left >= existing.left - 5 &&
                    rect.right <= existing.right + 5 &&
                    rect.top >= existing.top - 5 &&
                    rect.bottom <= existing.bottom + 5
                );
                if (dominated) continue;
                
                rects.push(rect);
                
                // Get some identifiable info
                let idInfo = el.id ? '#' + el.id : '';
                let classInfo = el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : '';
                let text = el.textContent ? el.textContent.substring(0, 30).trim() : '';
                
                validElements.push({
                    tag: el.tagName,
                    identifier: el.tagName.toLowerCase() + idInfo + classInfo,
                    text: text,
                    rect: {
                        width: rect.width,
                        height: rect.height,
                        top: rect.top,
                        left: rect.left
                    }
                });
            }
            return validElements;
        `;
        
        const func = new Function(scriptContent);
        return func();
    }, elementFilterCode);
    
    console.log(JSON.stringify(results, null, 2));
    
    await browser.close();
})();
