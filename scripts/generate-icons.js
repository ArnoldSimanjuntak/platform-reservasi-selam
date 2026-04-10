// Generate PWA icons from SVG template
// Run: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

// SVG template — SulutDive logo (diving mask + waves)
function createSvgIcon(size) {
    const padding = Math.round(size * 0.15);
    const innerSize = size - padding * 2;
    const cx = size / 2;
    const cy = size / 2;
    const r = innerSize / 2;
    const fontSize = Math.round(size * 0.22);
    const smallFont = Math.round(size * 0.11);
    const waveY = cy + r * 0.15;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#023E8A"/>
      <stop offset="100%" style="stop-color:#0077B6"/>
    </linearGradient>
  </defs>
  <!-- Background circle -->
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="url(#bg)"/>
  <!-- Wave decoration -->
  <path d="M ${padding} ${waveY} Q ${cx * 0.5} ${waveY - r * 0.15} ${cx} ${waveY} T ${size - padding} ${waveY}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="${Math.max(2, Math.round(size * 0.02))}"/>
  <path d="M ${padding} ${waveY + r * 0.12} Q ${cx * 0.5} ${waveY - r * 0.03} ${cx} ${waveY + r * 0.12} T ${size - padding} ${waveY + r * 0.12}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="${Math.max(2, Math.round(size * 0.02))}"/>
  <!-- Text -->
  <text x="${cx}" y="${cy - r * 0.08}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">SD</text>
  <text x="${cx}" y="${cy + r * 0.28}" font-family="Arial, sans-serif" font-size="${smallFont}" font-weight="500" fill="rgba(255,255,255,0.85)" text-anchor="middle" dominant-baseline="middle">DIVE</text>
</svg>`;
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
    const svg = createSvgIcon(size);
    const filename = `icon-${size}x${size}.svg`;
    fs.writeFileSync(path.join(iconsDir, filename), svg);
    console.log(`✓ Generated ${filename}`);
});

// Also generate a favicon SVG
const faviconSvg = createSvgIcon(32);
fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), faviconSvg);
console.log('✓ Generated favicon.svg');

console.log('\nDone! SVG icons generated.');
console.log('Note: For production, convert SVGs to PNG using a tool like:');
console.log('  npx svg2png-many public/icons/*.svg');
console.log('Or use https://realfavicongenerator.net with your final logo.');
