/*
 * Builds icons/logo.svg and the PNGs beside it from one geometry definition.
 *
 * Why this exists: the extension needs real bitmap icons, and Chrome will not
 * accept SVG for `icons` or `action.default_icon` -- it silently falls back to a
 * blank puzzle piece. So the SVG alone is not enough. Rather than keep the
 * artwork in two places and let them drift, the shapes are declared once here and
 * both outputs are generated.
 *
 *   node icons/build-icons.mjs
 *
 * Change the numbers in SHAPES, re-run, and both files update together. The
 * geometry is authored in a 128-unit space and scaled to each output size, so a
 * single edit stays proportionally correct at 16px and at 128px.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const UNITS = 128;
const SIZES = [16, 32, 48, 128];

/** Rounded rectangle: the player plate and the rail. */
const plate = { kind: 'roundRect', x: 4, y: 4, w: 120, h: 120, r: 30, fill: '#0B0B0B', cls: 'plate' };
const rail = { kind: 'roundRect', x: 22, y: 44, w: 11, h: 40, r: 5.5, fill: '#E5484D', cls: 'rail' };

/** The play triangle. Offset right so the mark's combined mass balances. */
const play = { kind: 'triangle', points: [[62, 40], [62, 88], [102, 64]], fill: '#F2F2F2', cls: 'play' };

/** Painted in order; later shapes composite over earlier ones. */
const SHAPES = [plate, rail, play];

/* ---------------------------------------------------------------- geometry -- */

function inRoundRect(x, y, s) {
  if (x < s.x || x > s.x + s.w || y < s.y || y > s.y + s.h) return false;
  // Clamp to the inner edge, then fall back to the corner circle's radius. This
  // is the cheap form: exact enough at 16px and needs no trigonometry.
  const cx = Math.min(Math.max(x, s.x + s.r), s.x + s.w - s.r);
  const cy = Math.min(Math.max(y, s.y + s.r), s.y + s.h - s.r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= s.r * s.r;
}

function inTriangle(x, y, s) {
  const [a, b, c] = s.points;
  const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  const d1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d;
  const d2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d;
  const d3 = 1 - d1 - d2;
  return d1 >= 0 && d2 >= 0 && d3 >= 0;
}

function covers(x, y, s) {
  return s.kind === 'triangle' ? inTriangle(x, y, s) : inRoundRect(x, y, s);
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/* --------------------------------------------------------------- rasterise -- */

/** 4x4 supersampling. Enough to keep the 16px edges from looking chewed. */
const SS = 4;

function render(size) {
  const px = Buffer.alloc(size * size * 4); // transparent
  const scale = UNITS / size;
  const step = 1 / SS;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      for (const shape of SHAPES) {
        const [r, g, b] = rgb(shape.fill);
        let hits = 0;
        for (let sy = 0; sy < SS; sy++) {
          for (let sx = 0; sx < SS; sx++) {
            const ux = (x + (sx + 0.5) * step) * scale;
            const uy = (y + (sy + 0.5) * step) * scale;
            if (covers(ux, uy, shape)) hits++;
          }
        }
        if (!hits) continue;

        const a = hits / (SS * SS);
        const i = (y * size + x) * 4;
        const da = px[i + 3] / 255;
        const outA = a + da * (1 - a);
        if (outA <= 0) continue;
        for (let c = 0; c < 3; c++) {
          const src = [r, g, b][c];
          px[i + c] = Math.round((src * a + px[i + c] * da * (1 - a)) / outA);
        }
        px[i + 3] = Math.round(outA * 255);
      }
    }
  }
  return px;
}

/* -------------------------------------------------------------- png encode -- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(px, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // Filter byte 0 per scanline. With supersampled coverage already smooth, the
  // five filter types buy nothing here and each would need its own unfilter on
  // the way back in.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* -------------------------------------------------------------------- svg -- */

const n = (v) => Number(v.toFixed(2));

/*
 * The SVG adapts to the page it is embedded in; the PNGs do not.
 *
 * The plate is near-black because that is what a toolbar icon wants, but a README
 * is as likely to be dark, and #0B0B0B on GitHub's #0d1117 is indistinguishable:
 * the mark collapses to a floating triangle and a red sliver. So the SVG carries a
 * prefers-color-scheme query and inverts the plate and the play triangle when the
 * page behind it is dark.
 *
 * A media query inside an SVG referenced by <img> does respond to the embedding
 * document's colour scheme, which is what makes this work as one file rather than
 * a <picture> element with two sources. The PNGs stay fixed, because a toolbar
 * icon has no page behind it to adapt to and the extension loads the bitmaps.
 */
const style = `  <style>
    .plate { fill: ${plate.fill}; }
    .play { fill: ${play.fill}; }
    .rail { fill: ${rail.fill}; }
    @media (prefers-color-scheme: dark) {
      .plate { fill: ${play.fill}; }
      .play { fill: ${plate.fill}; }
    }
  </style>
`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${UNITS} ${UNITS}" width="${UNITS}" height="${UNITS}" role="img" aria-label="Simple YouTube">
  <!--
    GENERATED by icons/build-icons.mjs. Edit the shapes there, not here.

    Temporary mark. Kept deliberately simple so it survives being shrunk to
    16px, the size the toolbar actually uses: anything finer than a triangle
    and a rail turns to mud. The rail is present because it is the idea: six
    icons standing in for a sidebar, and at 16px it reads as a red edge, which
    is enough to keep the mark from being a generic play button.

    Punctuation note: the asides above use colons and em dashes on purpose. A
    double hyphen inside an XML comment is a fatal parse error rather than a
    style nit, and a browser reading a standalone .svg uses a strict XML
    parser, so getting it wrong renders the file as nothing at all.
  -->

${style}
  <!-- The player. Near-black on light pages, inverted by the query above on dark
       ones, so the rounded corner reads against either. -->
  <rect class="plate" x="${n(plate.x)}" y="${n(plate.y)}" width="${n(plate.w)}" height="${n(plate.h)}" rx="${n(plate.r)}" fill="${plate.fill}"/>

  <!-- The rail: the sidebar, reduced to what it is for. Red on both schemes, so
       it stays the one part of the mark that reads the same either way. -->
  <rect class="rail" x="${n(rail.x)}" y="${n(rail.y)}" width="${n(rail.w)}" height="${n(rail.h)}" rx="${n(rail.r)}" fill="${rail.fill}"/>

  <!-- The video. Offset right on purpose: centred alone it would pull the mark's
       combined optical mass left of centre once the rail's weight is added. -->
  <path class="play" d="M${play.points.map(([x, y]) => `${n(x)} ${n(y)}`).join(' L')} Z" fill="${play.fill}"/>
</svg>
`;

/* ------------------------------------------------------------------- write -- */

/**
 * Refuse to write a malformed SVG.
 *
 * A double hyphen inside an XML comment makes the document invalid, and because a
 * browser parses a standalone .svg with a strict XML parser the result is a file
 * that silently renders as nothing. There is no console error, no broken-image
 * icon, nothing to notice -- which is precisely why it needs a hard failure here
 * rather than a code reviewer's eye.
 */
function assertValidXml(doc, name) {
  for (const [, body] of doc.matchAll(/<!--([\s\S]*?)-->/g)) {
    if (body.includes('--')) {
      const line = doc.slice(0, doc.indexOf(body)).split('\n').length;
      throw new Error(`${name}: double hyphen inside an XML comment at line ${line}`);
    }
  }
  if (!doc.startsWith('<svg') || !doc.trimEnd().endsWith('</svg>')) {
    throw new Error(`${name}: does not look like a complete <svg> document`);
  }
}

assertValidXml(svg, 'logo.svg');
writeFileSync(join(OUT, 'logo.svg'), svg);
for (const size of SIZES) {
  writeFileSync(join(OUT, `icon-${size}.png`), encodePng(render(size), size));
  console.log(`icon-${size}.png`);
}
console.log('logo.svg');
