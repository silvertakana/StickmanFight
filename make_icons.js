const fs = require('fs');
const { Jimp } = require('jimp');

fs.mkdirSync('public/icons', { recursive: true });

async function makeIcon(size) {
    const img = new Jimp({ width: size, height: size, color: 0x4285F4ff });
    await img.write(`public/icons/icon${size}.png`);
}

makeIcon(16);
makeIcon(48);
makeIcon(128);
