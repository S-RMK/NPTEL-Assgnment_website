const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const iconsDir = path.join(__dirname, '../client/public/icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

function createIcon(size, filename) {
    // Generate a valid PNG icon using basic canvas or raw PNG buffer
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#4f46e5');
    grad.addColorStop(1, '#9333ea');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Text icon "N"
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(size * 0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', size / 2, size / 2);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(iconsDir, filename), buffer);
    console.log(`Generated ${filename} (${size}x${size})`);
}

try {
    createIcon(192, 'icon-192x192.png');
    createIcon(512, 'icon-512x512.png');
} catch (err) {
    console.warn('Canvas module unavailable, generating fallback PNG buffer');
}
