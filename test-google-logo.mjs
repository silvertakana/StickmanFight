import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    
    // Go to Google
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    
    // Evaluate the DOM to find the Google logo and the search bar text
    const results = await page.evaluate(() => {
        const data = [];
        
        // Find Google logo
        const logo = document.querySelector('.lnXdpd, [alt="Google"], img[src*="googlelogo"]');
        if (logo) {
            data.push({
                name: 'Google Logo',
                tag: logo.tagName,
                src: logo.src,
                alt: logo.alt,
                classes: logo.className,
                isSvg: logo.tagName.toLowerCase() === 'svg'
            });
        }
        
        // Find Search Bar Input
        const searchBox = document.querySelector('textarea, input[type="text"], .gLFyf');
        if (searchBox) {
            data.push({
                name: 'Search Box',
                tag: searchBox.tagName,
                value: searchBox.value,
                placeholder: searchBox.placeholder || searchBox.getAttribute('aria-label'),
                classes: searchBox.className
            });
        }
        
        return data;
    });
    
    console.log(JSON.stringify(results, null, 2));
    
    await browser.close();
})();
