/*
 * Generates the PWA icon set with no native dependencies.
 *
 * The previous generator required the `canvas` package; when it was missing the
 * try/catch swallowed the failure and left behind 1x1 placeholder PNGs, which made
 * the app fail Chrome's installability check (it requires a real >=192px icon).
 * This writes PNGs directly using only zlib, so it cannot silently degrade.
 *
 * Run with: npm run icons
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'public', 'icons');

/* ---------- minimal PNG encoder (RGBA, filter type 0) ---------- */

const CRC_TABLE = (() => {
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c;
    }
    return table;
})();

const crc32 = (buf) => {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
};

const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed));
    return Buffer.concat([length, typed, crc]);
};

const encodePNG = (width, height, rgba) => {
    const stride = width * 4;
    const raw = Buffer.alloc(height * (stride + 1));
    for (let y = 0; y < height; y++) {
        raw[y * (stride + 1)] = 0; // filter: none
        rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // colour type: RGBA
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0))
    ]);
};

/* ---------- artwork ---------- */

const BRAND_FROM = [79, 70, 229];   // #4f46e5
const BRAND_TO = [147, 51, 234];    // #9333ea

// Is this point inside the letter "N"? Coordinates are normalised 0..1 inside the
// glyph box: a left bar, a right bar, and a diagonal joining their far corners.
const insideGlyph = (x, y) => {
    const t = 0.22;                       // bar width
    if (x < t || x > 1 - t) return true;
    const centre = t + y * (1 - 2 * t);   // diagonal sweeps top-left -> bottom-right
    return Math.abs(x - centre) < t * 0.572;
};

// `inset` is the fraction of the canvas the glyph occupies. Maskable icons need the
// logo inside the centre safe zone, so they pass a smaller value.
const render = (size, inset) => {
    const rgba = Buffer.alloc(size * size * 4);
    const SS = 3; // 3x3 supersampling for smooth edges
    const box = size * inset;
    const origin = (size - box) / 2;

    for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
            let hits = 0;
            for (let sy = 0; sy < SS; sy++) {
                for (let sx = 0; sx < SS; sx++) {
                    const gx = (px + (sx + 0.5) / SS - origin) / box;
                    const gy = (py + (sy + 0.5) / SS - origin) / box;
                    if (gx >= 0 && gx <= 1 && gy >= 0 && gy <= 1 && insideGlyph(gx, gy)) hits++;
                }
            }
            const coverage = hits / (SS * SS);

            const mix = (px / size + py / size) / 2;
            const i = (py * size + px) * 4;
            for (let c = 0; c < 3; c++) {
                const bg = BRAND_FROM[c] + (BRAND_TO[c] - BRAND_FROM[c]) * mix;
                rgba[i + c] = Math.round(bg + (255 - bg) * coverage);
            }
            rgba[i + 3] = 255; // opaque: full-bleed background
        }
    }

    return encodePNG(size, size, rgba);
};

/* ---------- output ---------- */

// `any` icons are shown at full size, so the glyph can be large. `maskable` icons get
// cropped to a platform shape (up to 20% off each edge), so the glyph must stay small.
const TARGETS = [
    ['icon-192x192.png', 192, 0.76],
    ['icon-512x512.png', 512, 0.76],
    ['icon-maskable-192x192.png', 192, 0.56],
    ['icon-maskable-512x512.png', 512, 0.56],
    ['apple-touch-icon.png', 180, 0.70],
    ['favicon-32x32.png', 32, 0.80]
];

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [name, size, inset] of TARGETS) {
    const png = render(size, inset);
    fs.writeFileSync(path.join(OUT_DIR, name), png);
    console.log(`  ${name.padEnd(28)} ${size}x${size}  ${png.length} bytes`);
}

console.log(`\nWrote ${TARGETS.length} icons to ${OUT_DIR}`);
