import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';

(async () => {
    // Read search bar png
    if (fs.existsSync('search_bar.png')) {
        const buffer = fs.readFileSync('search_bar.png');
        const img = await loadImage(buffer);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height).data;
        
        let isSolid = true;
        const r = data[0], g = data[1], b = data[2], a = data[3];
        let diffPixels = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] !== r || data[i+1] !== g || data[i+2] !== b || data[i+3] !== a) {
                isSolid = false;
                diffPixels++;
            }
        }
        
        console.log(`Search Bar - isSolid: ${isSolid}, diffPixels: ${diffPixels}/${data.length/4}, size: ${img.width}x${img.height}`);
    }
})();
