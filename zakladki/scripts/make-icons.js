const sharp = require('sharp');
const fs = require('fs');
(async () => {
  const svg = fs.readFileSync('assets/icon.svg');
  await sharp(svg).resize(1024, 1024).png().toFile('assets/icon.png');
  const inner = await sharp(svg).resize(660, 660).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: inner, gravity: 'center' }]).png().toFile('assets/adaptive.png');
})();
