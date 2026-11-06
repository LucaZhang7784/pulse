'use strict';

// Generates assets/icon.png (a 32x32 ring) for the tray icon. Pure Node — no
// image libraries — using zlib and a hand-rolled PNG encoder.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 32;
const H = 32;

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(rgba, width, height) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter type 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Draw a filled ring: green arc top-left, amber top-right, red bottom-right.
// Simpler visual: a filled circle with a dark outline and a "pulse" notch.
const rgba = Buffer.alloc(W * H * 4);
const cx = 15.5;
const cy = 15.5;
const rOuter = 14;
const rInner = 9;

function setPx(x, y, r, g, b, a) {
  const i = (y * W + x) * 4;
  rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
}

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (d <= rOuter && d >= rInner) {
      // color by angle: top = green, right = amber, bottom = red
      const ang = Math.atan2(y - cy, x - cx); // -PI..PI
      let col;
      if (ang < -Math.PI / 2) col = [34, 197, 94];      // top-left green
      else if (ang < 0) col = [34, 197, 94];             // top-right green
      else if (ang < Math.PI / 2) col = [245, 158, 11];  // bottom-right amber
      else col = [239, 68, 68];                          // bottom-left red
      setPx(x, y, col[0], col[1], col[2], 255);
    } else if (d < rInner) {
      setPx(x, y, 255, 255, 255, 200); // inner dot
    }
  }
}

const out = path.join(__dirname, '..', 'assets', 'icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, encodePNG(rgba, W, H));
console.log('wrote', out);
