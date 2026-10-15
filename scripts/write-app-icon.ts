import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function crc32(buf: Buffer): number {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]!;
    for (let k = 0; k < 8; k++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

const BG = [0x0c, 0x0f, 0x14] as const;
const ACCENT = [0x22, 0xd3, 0xee] as const;

function podiumPixel(x: number, y: number): [number, number, number] {
  const bars = [
    { x: 250, y: 470, w: 150, h: 250 },
    { x: 437, y: 330, w: 150, h: 390 },
    { x: 624, y: 410, w: 150, h: 310 },
  ];
  for (const bar of bars) {
    const inside =
      x >= bar.x && x < bar.x + bar.w && y >= bar.y && y < bar.y + bar.h;
    if (!inside) continue;
    const radius = 28;
    const left = x - bar.x;
    const top = y - bar.y;
    const right = bar.x + bar.w - 1 - x;
    const corner =
      (left < radius && top < radius && (radius - left) ** 2 + (radius - top) ** 2 > radius ** 2) ||
      (right < radius && top < radius && (radius - right) ** 2 + (radius - top) ** 2 > radius ** 2);
    if (corner) return [...BG];
    return [...ACCENT];
  }
  return [...BG];
}

export function writeAppIcon(path: string, size = 1024) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = podiumPixel(
        Math.min(1023, Math.floor((x * 1024) / size)),
        Math.min(1023, Math.floor((y * 1024) / size))
      );
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
}
