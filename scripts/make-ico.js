'use strict';

// Generates build/icon.ico (a 256x256 ring) for the Windows installer/exe.
// Pure Node — no image libraries. An .ico can embed a PNG (Vista+), so the same
// PNG encoder from make-icon.js is reused here at 256px and wrapped in the
// ICONDIR/ICONDIRENTRY header.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 256;
const H = 256;

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
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const rgba = Buffer.alloc(W * H * 4);
const cx = W / 2;
const cy = H / 2;
const rOuter = W * 0.42;
const rInner = W * 0.28;

function setPx(x, y, r, g, b, a) {
  const i = (y * W + x) * 4;
  rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
}

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (d <= rOuter && d >= rInner) {
      const ang = Math.atan2(y - cy, x - cx);
      let col;
      if (ang < -Math.PI / 2) col = [34, 197, 94];
      else if (ang < 0) col = [34, 197, 94];
      else if (ang < Math.PI / 2) col = [245, 158, 11];
      else col = [239, 68, 68];
      setPx(x, y, col[0], col[1], col[2], 255);
    } else if (d < rInner) {
      setPx(x, y, 255, 255, 255, 210);
    }
  }
}

const png = encodePNG(rgba, W, H);

// ICO container: ICONDIR + one ICONDIRENTRY + the PNG bytes.
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // type: icon
icoHeader.writeUInt16LE(1, 4); // count

const entry = Buffer.alloc(16);
entry[0] = 0; // width 256
entry[1] = 0; // height 256
entry[2] = 0; // palette
entry[3] = 0; // reserved
entry.writeUInt16LE(1, 4);   // planes
entry.writeUInt16LE(32, 6);  // bit count
entry.writeUInt32LE(png.length, 8);   // bytes in resource
entry.writeUInt32LE(22, 12);          // image offset

const ico = Buffer.concat([icoHeader, entry, png]);
const out = path.join(__dirname, '..', 'build', 'icon.ico');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, ico);
console.log('wrote', out, ico.length, 'bytes');
