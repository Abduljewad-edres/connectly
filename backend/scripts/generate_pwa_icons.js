import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure output directory exists
const publicDir = path.resolve(__dirname, '../../frontend/public');
const iconsDir = path.resolve(publicDir, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Pure Node PNG Encoder
function createPNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }
  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ -1) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Non-interlaced

  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    rawData[y * scanlineLength] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * scanlineLength + 1 + x * 4;
      rawData[dstIdx] = rgbaBuffer[srcIdx];
      rawData[dstIdx + 1] = rgbaBuffer[srcIdx + 1];
      rawData[dstIdx + 2] = rgbaBuffer[srcIdx + 2];
      rawData[dstIdx + 3] = rgbaBuffer[srcIdx + 3];
    }
  }

  const idat = zlib.deflateSync(rawData, { level: 9 });

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/**
 * Render Connectly Brand Icon
 * @param {number} size - Width & height in pixels
 * @param {boolean} isMaskable - If true, adds safe zone padding for adaptive icons
 */
function renderConnectlyIcon(size, isMaskable = false) {
  const buffer = Buffer.alloc(size * size * 4);

  // Background colors: Connectly Deep Navy
  const bgR = 11, bgG = 15, bgB = 25; // #0b0f19

  // Emblem geometry
  const center = size / 2;
  // If maskable, safe zone radius is ~38% of size, otherwise ~44%
  const badgeRadius = isMaskable ? size * 0.42 : size * 0.46;
  const cornerRadius = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Distance from center
      const dx = x - center;
      const dy = y - center;

      if (isMaskable) {
        // Maskable icon fills the entire canvas with dark navy background
        // and places the branded emblem inside the safe zone
        buffer[idx] = bgR;
        buffer[idx + 1] = bgG;
        buffer[idx + 2] = bgB;
        buffer[idx + 3] = 255;
      } else {
        // Rounded squircle container with subtle glow
        const dCornerX = Math.max(0, Math.abs(dx) - (badgeRadius - cornerRadius));
        const dCornerY = Math.max(0, Math.abs(dy) - (badgeRadius - cornerRadius));
        const distFromRoundedRect = Math.sqrt(dCornerX * dCornerX + dCornerY * dCornerY);

        if (distFromRoundedRect > cornerRadius) {
          // Transparent outside rounded corner
          buffer[idx] = 0;
          buffer[idx + 1] = 0;
          buffer[idx + 2] = 0;
          buffer[idx + 3] = 0;
          continue;
        }

        // Fill background with subtle dark gradient
        const tBg = (y / size);
        buffer[idx] = Math.round(11 + 6 * tBg);
        buffer[idx + 1] = Math.round(15 + 8 * tBg);
        buffer[idx + 2] = Math.round(25 + 15 * tBg);
        buffer[idx + 3] = 255;
      }

      // Draw Connectly Branded Emblem
      // Scale factor relative to safe zone
      const emblemScale = isMaskable ? size * 0.58 : size * 0.72;
      const nx = dx / (emblemScale / 2); // -1 to 1
      const ny = dy / (emblemScale / 2); // -1 to 1
      const dist = Math.sqrt(nx * nx + ny * ny);

      // Gradient colors: Indigo #4f46e5 to Purple #7c3aed to Violet #8b5cf6
      const tGrad = (nx + ny + 2) / 4; // 0 to 1 diagonally
      const gradR = Math.round(79 * (1 - tGrad) + 139 * tGrad);
      const gradG = Math.round(70 * (1 - tGrad) + 92 * tGrad);
      const gradB = Math.round(229 * (1 - tGrad) + 246 * tGrad);

      // Outer ring of Connectly "C" (radius 0.45 to 0.75, angle opening on the right side)
      const angle = Math.atan2(ny, nx); // -PI to PI
      const inRing = dist >= 0.42 && dist <= 0.76;
      // Opening angle on the right between -35 deg and +35 deg
      const inOpening = angle > -0.55 && angle < 0.55;

      // Center community node (dot)
      const distCenter = Math.sqrt(nx * nx + ny * ny);
      const inCenterDot = distCenter <= 0.22;

      // Connectivity nodes on tips of the "C"
      const tipTopDist = Math.sqrt((nx - 0.55) ** 2 + (ny - -0.38) ** 2);
      const tipBotDist = Math.sqrt((nx - 0.55) ** 2 + (ny - 0.38) ** 2);
      const inTips = tipTopDist <= 0.16 || tipBotDist <= 0.16;

      // Satellite connectivity dots
      const satDist = Math.sqrt((nx - 0.62) ** 2 + (ny - 0.0) ** 2);
      const inSatDot = satDist <= 0.11;

      if ((inRing && !inOpening) || inTips || inCenterDot || inSatDot) {
        // Bright gradient fill for emblem
        buffer[idx] = gradR;
        buffer[idx + 1] = gradG;
        buffer[idx + 2] = gradB;
        buffer[idx + 3] = 255;

        // Inner highlight on center dot
        if (inCenterDot && distCenter <= 0.12) {
          buffer[idx] = 255;
          buffer[idx + 1] = 255;
          buffer[idx + 2] = 255;
          buffer[idx + 3] = 255;
        }
      } else {
        // Subtle ambient glow around the emblem
        if (dist > 0.35 && dist < 0.85) {
          const glow = Math.max(0, 1 - Math.abs(dist - 0.6) / 0.25);
          buffer[idx] = Math.min(255, buffer[idx] + Math.round(glow * 35));
          buffer[idx + 1] = Math.min(255, buffer[idx + 1] + Math.round(glow * 30));
          buffer[idx + 2] = Math.min(255, buffer[idx + 2] + Math.round(glow * 75));
        }
      }
    }
  }

  return createPNG(size, size, buffer);
}

// Generate Icons
console.log('Generating Connectly PWA icons...');

const icon192 = renderConnectlyIcon(192, false);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), icon192);
console.log('✓ Created icon-192.png (' + icon192.length + ' bytes)');

const icon512 = renderConnectlyIcon(512, false);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), icon512);
console.log('✓ Created icon-512.png (' + icon512.length + ' bytes)');

const maskable192 = renderConnectlyIcon(192, true);
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192.png'), maskable192);
console.log('✓ Created icon-maskable-192.png (' + maskable192.length + ' bytes)');

const maskable512 = renderConnectlyIcon(512, true);
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), maskable512);
console.log('✓ Created icon-maskable-512.png (' + maskable512.length + ' bytes)');

const appleTouch = renderConnectlyIcon(180, false);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), appleTouch);
console.log('✓ Created apple-touch-icon.png (' + appleTouch.length + ' bytes)');

// Also generate SVG vector icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="connectlyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="50%" stop-color="#7c3aed" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0f19" />
      <stop offset="100%" stop-color="#141a29" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#bgGrad)" />
  <g transform="translate(256, 256)" filter="url(#glow)">
    <!-- Outer Arc / 'C' -->
    <path d="M 98 -75 A 125 125 0 1 0 98 75" fill="none" stroke="url(#connectlyGrad)" stroke-width="44" stroke-linecap="round" />
    <!-- Center Node -->
    <circle cx="0" cy="0" r="32" fill="url(#connectlyGrad)" />
    <circle cx="0" cy="0" r="14" fill="#ffffff" />
    <!-- Connector satellite dot -->
    <circle cx="108" cy="0" r="18" fill="#a855f7" />
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf8');
console.log('✓ Created icon.svg');

console.log('All Connectly PWA icons successfully generated!');

