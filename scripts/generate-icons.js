const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const svgPath = path.join(__dirname, '..', 'public', 'assets', 'images', 'logo-arroyo-seco.svg');
const outputDir = path.join(__dirname, '..', 'public', 'icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generate() {
  const svgBuffer = fs.readFileSync(svgPath);

  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
    console.log(`Generated icon-${size}x${size}.png`);
  }

  // Maskable icons: create exact-size canvas then composite logo centered
  for (const size of sizes) {
    const innerSize = Math.round(size * 0.7);
    const logoBuffer = await sharp(svgBuffer)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 28, g: 102, b: 214, alpha: 1 } }
    })
      .composite([{ input: logoBuffer, gravity: 'centre' }])
      .png()
      .toFile(path.join(outputDir, `icon-maskable-${size}x${size}.png`));
    console.log(`Generated icon-maskable-${size}x${size}.png`);
  }

  // Screenshots for richer PWA Install UI
  const screenshotDir = path.join(__dirname, '..', 'public', 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  // Desktop wide screenshot (1280x720)
  await sharp({
    create: { width: 1280, height: 720, channels: 4, background: { r: 28, g: 102, b: 214, alpha: 1 } }
  })
    .composite([{
      input: await sharp(svgBuffer).resize(300, 300, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
      gravity: 'centre'
    }])
    .png()
    .toFile(path.join(screenshotDir, 'screenshot-wide.png'));
  console.log('Generated screenshot-wide.png');

  // Mobile screenshot (750x1334)
  await sharp({
    create: { width: 750, height: 1334, channels: 4, background: { r: 28, g: 102, b: 214, alpha: 1 } }
  })
    .composite([{
      input: await sharp(svgBuffer).resize(300, 300, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
      gravity: 'centre'
    }])
    .png()
    .toFile(path.join(screenshotDir, 'screenshot-mobile.png'));
  console.log('Generated screenshot-mobile.png');

  console.log('Done!');
}

generate().catch(console.error);
