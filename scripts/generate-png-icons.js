// Generate PWA PNG icons from SVG using sharp (bundled with Next.js)
// Run: node scripts/generate-png-icons.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

function createSvg(size) {
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.35;
    const fontSize = Math.round(size * 0.22);
    const smallFont = Math.round(size * 0.11);
    const waveY = cy + r * 0.15;
    const pad = size * 0.15;

    return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#023E8A"/>
      <stop offset="100%" style="stop-color:#0077B6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="url(#bg)"/>
  <path d="M ${pad} ${waveY} Q ${cx * 0.5} ${waveY - r * 0.15} ${cx} ${waveY} T ${size - pad} ${waveY}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="${Math.max(2, Math.round(size * 0.02))}"/>
  <path d="M ${pad} ${waveY + r * 0.12} Q ${cx * 0.5} ${waveY - r * 0.03} ${cx} ${waveY + r * 0.12} T ${size - pad} ${waveY + r * 0.12}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="${Math.max(2, Math.round(size * 0.02))}"/>
  <text x="${cx}" y="${cy - r * 0.08}" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">SD</text>
  <text x="${cx}" y="${cy + r * 0.28}" font-family="Arial,Helvetica,sans-serif" font-size="${smallFont}" font-weight="500" fill="rgba(255,255,255,0.85)" text-anchor="middle" dominant-baseline="middle">DIVE</text>
</svg>`);
}

async function generateIcons() {
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    
    if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir, { recursive: true });
    }

    for (const size of sizes) {
        const svg = createSvg(size);
        const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
        
        await sharp(svg)
            .resize(size, size)
            .png()
            .toFile(outputPath);
        
        console.log(`✓ icon-${size}x${size}.png`);
    }

    // Also generate favicon.ico (32x32 PNG, renamed)
    const faviconSvg = createSvg(32);
    await sharp(faviconSvg)
        .resize(32, 32)
        .png()
        .toFile(path.join(__dirname, '..', 'public', 'favicon.png'));
    
    console.log('✓ favicon.png');
    console.log('\nDone! All PNG icons generated.');
}

generateIcons().catch(console.error);
