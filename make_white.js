const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const dir = 'public/assets/sprites/stickman/StickmanPack';

async function processDir(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            await processDir(fullPath);
        } else if (fullPath.endsWith('.png')) {
            console.log('Processing', fullPath);
            const img = await Jimp.read(fullPath);
            img.scan(0, 0, img.bitmap.width, img.bitmap.height, function(x, y, idx) {
                // Get alpha
                const alpha = this.bitmap.data[idx + 3];
                if (alpha > 0) {
                    // Set to white
                    this.bitmap.data[idx + 0] = 255; // R
                    this.bitmap.data[idx + 1] = 255; // G
                    this.bitmap.data[idx + 2] = 255; // B
                }
            });
            await img.write(fullPath);
        }
    }
}

processDir(dir).then(() => console.log('Done!')).catch(console.error);
