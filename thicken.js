const { Jimp } = require('jimp');
const path = require('path');

async function thickenImage(inputPath, outputPath) {
    try {
        const image = await Jimp.read(inputPath);
        const width = image.bitmap.width;
        const height = image.bitmap.height;

        const output = image.clone();

        // Pass 1: Make all non-transparent pixels pure white and fully opaque
        // This removes anti-aliasing fuzziness.
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (width * y + x) << 2;
                if (image.bitmap.data[idx + 3] > 50) { // threshold alpha
                    image.bitmap.data[idx] = 255;
                    image.bitmap.data[idx + 1] = 255;
                    image.bitmap.data[idx + 2] = 255;
                    image.bitmap.data[idx + 3] = 255;
                } else {
                    image.bitmap.data[idx + 3] = 0; // pure transparent
                }
            }
        }

        // Pass 2: Dilation (Thickening)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (width * y + x) << 2;
                
                // If the pixel in original is transparent, but neighbors are opaque
                if (image.bitmap.data[idx + 3] === 0) {
                    let shouldThicken = false;
                    
                    // Check a 3x3 grid around it
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const nIdx = (width * ny + nx) << 2;
                                if (image.bitmap.data[nIdx + 3] === 255) {
                                    shouldThicken = true;
                                }
                            }
                        }
                    }

                    if (shouldThicken) {
                        output.bitmap.data[idx] = 255;
                        output.bitmap.data[idx + 1] = 255;
                        output.bitmap.data[idx + 2] = 255;
                        output.bitmap.data[idx + 3] = 255;
                    } else {
                        output.bitmap.data[idx + 3] = 0;
                    }
                } else {
                    // It was opaque originally
                    output.bitmap.data[idx] = 255;
                    output.bitmap.data[idx + 1] = 255;
                    output.bitmap.data[idx + 2] = 255;
                    output.bitmap.data[idx + 3] = 255;
                }
            }
        }

        await output.write(outputPath);
        console.log(`Thickened: ${outputPath}`);
    } catch (err) {
        console.error(`Error processing ${inputPath}:`, err);
    }
}

async function main() {
    const idleInput = path.join(__dirname, 'public/assets/sprites/StickmanPack/Idle/Thin.png');
    const idleOutput = path.join(__dirname, 'public/assets/sprites/stickman/StickmanPack/Idle/thickIdleSheet.png');

    const runInput = path.join(__dirname, 'public/assets/sprites/StickmanPack/Run/Run.png');
    const runOutput = path.join(__dirname, 'public/assets/sprites/stickman/StickmanPack/Run/thickRunSheet.png');

    await thickenImage(idleInput, idleOutput);
    await thickenImage(runInput, runOutput);
}

main();
