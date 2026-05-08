import * as THREE from 'three';

/* ───────────────────────── helpers ───────────────────────── */
const makeCanvas = (size = 512) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext('2d')! };
};

const toTexture = (canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1, anisotropy = 8) => {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = anisotropy;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const toLinearTexture = (canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1, anisotropy = 8) => {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = anisotropy;
  return t;
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const lerpHex = (c1: number[], c2: number[], t: number) => c1.map((v, i) => Math.round(v + (c2[i] - v) * t));

/* ───────────────────── WOOD PLANK FLOORS ───────────────────── */

const paintPlankBoard = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  baseRGB: number[], darkRGB: number[],
) => {
  // base color with subtle tonal shift per plank
  const tonal = rand(-0.08, 0.08);
  const tinted = baseRGB.map(v => Math.max(0, Math.min(255, v + v * tonal)));
  ctx.fillStyle = `rgb(${tinted[0]|0},${tinted[1]|0},${tinted[2]|0})`;
  ctx.fillRect(x, y, w, h);

  // long horizontal grain streaks
  const streaks = 60;
  for (let i = 0; i < streaks; i++) {
    const sy = y + Math.random() * h;
    const alpha = rand(0.02, 0.10);
    const dark = lerpHex(tinted, darkRGB, rand(0.4, 0.9));
    ctx.strokeStyle = `rgba(${dark[0]},${dark[1]},${dark[2]},${alpha})`;
    ctx.lineWidth = rand(0.4, 1.2);
    ctx.beginPath();
    ctx.moveTo(x, sy);
    let cy = sy;
    const segs = 6;
    for (let s = 1; s <= segs; s++) {
      const cx = x + (w / segs) * s;
      cy += rand(-1.2, 1.2);
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // occasional knot
  if (Math.random() < 0.18) {
    const kx = x + rand(0.1, 0.9) * w;
    const ky = y + rand(0.2, 0.8) * h;
    const kr = rand(2, 5);
    const grad = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr * 3);
    grad.addColorStop(0, `rgba(${darkRGB[0]},${darkRGB[1]},${darkRGB[2]},0.55)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(kx, ky, kr * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // plank seams (top + bottom edge)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
};

const createWoodPlankAlbedo = (baseRGB: number[], darkRGB: number[], repeatX: number, repeatY: number) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = `rgb(${baseRGB[0]},${baseRGB[1]},${baseRGB[2]})`;
  ctx.fillRect(0, 0, 1024, 1024);

  const plankRows = 6;
  const plankH = 1024 / plankRows;
  // staggered plank pattern
  for (let r = 0; r < plankRows; r++) {
    const offset = (r % 2) * 280;
    let x = -offset;
    while (x < 1024) {
      const pw = rand(220, 360);
      paintPlankBoard(ctx, x, r * plankH, pw, plankH, baseRGB, darkRGB);
      // vertical seam
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x + pw, r * plankH);
      ctx.lineTo(x + pw, r * plankH + plankH);
      ctx.stroke();
      x += pw;
    }
  }

  // soft global vignette for ambient occlusion feel
  const vg = ctx.createRadialGradient(512, 512, 200, 512, 512, 720);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, 1024, 1024);

  return toTexture(canvas, repeatX, repeatY);
};

const createWoodPlankNormal = (repeatX: number, repeatY: number) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 1024, 1024);

  const plankRows = 6;
  const plankH = 1024 / plankRows;
  // plank seams as darker grooves
  for (let r = 0; r <= plankRows; r++) {
    const y = r * plankH;
    ctx.fillStyle = 'rgba(80,80,200,0.85)';
    ctx.fillRect(0, y - 1, 1024, 2);
  }
  for (let r = 0; r < plankRows; r++) {
    const offset = (r % 2) * 280;
    let x = -offset;
    while (x < 1024) {
      const pw = rand(220, 360);
      ctx.fillStyle = 'rgba(80,80,200,0.85)';
      ctx.fillRect(x + pw - 1, r * plankH, 2, plankH);
      x += pw;
    }
  }
  // grain micro-noise
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const a = Math.random() * 0.08;
    ctx.fillStyle = `rgba(${128 + (Math.random() - 0.5) * 20},${128},${255},${a})`;
    ctx.fillRect(x, y, 1, 1);
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

const createWoodPlankRoughness = (repeatX: number, repeatY: number) => {
  const { canvas, ctx } = makeCanvas(1024);
  // mid-roughness base ~ matte-satin finish
  ctx.fillStyle = '#a0a0a0';
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 6000; i++) {
    const a = Math.random() * 0.4;
    const v = 80 + Math.floor(Math.random() * 80);
    ctx.fillStyle = `rgba(${v},${v},${v},${a})`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 1.2, 1.2);
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

/** Walnut floor — dark warm brown for living/dining */
export const createWoodFloorTexture = (repeatX = 1, repeatY = 1) => {
  return createWoodPlankAlbedo([88, 60, 38], [38, 22, 14], repeatX, repeatY);
};
export const createWoodFloorNormal = (repeatX = 1, repeatY = 1) => createWoodPlankNormal(repeatX, repeatY);
export const createWoodFloorRoughness = (repeatX = 1, repeatY = 1) => createWoodPlankRoughness(repeatX, repeatY);

/** Oak floor — light warm tone for bedrooms */
export const createOakFloorTexture = (repeatX = 1, repeatY = 1) => {
  return createWoodPlankAlbedo([186, 148, 100], [120, 86, 56], repeatX, repeatY);
};
export const createOakFloorNormal = (repeatX = 1, repeatY = 1) => createWoodPlankNormal(repeatX, repeatY);
export const createOakFloorRoughness = (repeatX = 1, repeatY = 1) => createWoodPlankRoughness(repeatX, repeatY);

/* ───────────────────── CERAMIC TILE (bathroom) ───────────────────── */
export const createTileTexture = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(512);
  // base off-white tile
  ctx.fillStyle = '#eef0ef';
  ctx.fillRect(0, 0, 512, 512);

  const tileSize = 128;
  // per-tile slight tonal variation + soft veining
  for (let y = 0; y < 512; y += tileSize) {
    for (let x = 0; x < 512; x += tileSize) {
      const v = 235 + Math.floor(Math.random() * 18);
      ctx.fillStyle = `rgb(${v},${v - 2},${v - 4})`;
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
      // soft veins
      ctx.strokeStyle = `rgba(180,180,180,${rand(0.05, 0.12)})`;
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const sx = x + Math.random() * tileSize;
        const sy = y + Math.random() * tileSize;
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(
          sx + rand(-30, 30), sy + rand(-30, 30),
          sx + rand(-30, 30), sy + rand(-30, 30),
          sx + rand(-40, 40), sy + rand(-40, 40)
        );
        ctx.stroke();
      }
    }
  }
  // dark grout lines
  ctx.strokeStyle = '#9aa0a3';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 512; i += tileSize) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
  }
  return toTexture(canvas, repeatX, repeatY);
};

export const createTileNormal = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 512, 512);
  // grout grooves recessed
  ctx.fillStyle = 'rgba(80,80,200,1)';
  const tileSize = 128;
  for (let i = 0; i <= 512; i += tileSize) {
    ctx.fillRect(i - 2, 0, 4, 512);
    ctx.fillRect(0, i - 2, 512, 4);
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

export const createTileRoughness = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(512);
  // glossy tile face
  ctx.fillStyle = '#404040';
  ctx.fillRect(0, 0, 512, 512);
  // rougher grout
  ctx.fillStyle = '#c8c8c8';
  const tileSize = 128;
  for (let i = 0; i <= 512; i += tileSize) {
    ctx.fillRect(i - 2, 0, 4, 512);
    ctx.fillRect(0, i - 2, 512, 4);
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

/* ───────────────────── MARBLE (kitchen counters/floor) ───────────────────── */
export const createMarbleTexture = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(1024);
  // very light warm marble base
  ctx.fillStyle = '#f1ede5';
  ctx.fillRect(0, 0, 1024, 1024);
  // big grey veins
  ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = `rgba(110,108,104,${rand(0.18, 0.35)})`;
    ctx.lineWidth = rand(1.5, 4);
    ctx.beginPath();
    let x = rand(0, 1024), y = rand(0, 1024);
    ctx.moveTo(x, y);
    for (let s = 0; s < 8; s++) {
      x += rand(60, 180) * (Math.random() < 0.5 ? -1 : 1);
      y += rand(60, 180) * (Math.random() < 0.5 ? -1 : 1);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // micro veins
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = `rgba(140,138,134,${rand(0.05, 0.18)})`;
    ctx.lineWidth = rand(0.4, 1.0);
    ctx.beginPath();
    let x = rand(0, 1024), y = rand(0, 1024);
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += rand(-90, 90);
      y += rand(-90, 90);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return toTexture(canvas, repeatX, repeatY);
};

export const createMarbleRoughness = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = '#1f1f1f';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1500; i++) {
    const a = Math.random() * 0.06;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

/* ───────────────────── WALL PLASTER (warm matte) ───────────────────── */
export const createWallTexture = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(512);
  // warm off-white base
  ctx.fillStyle = '#f5f3ee';
  ctx.fillRect(0, 0, 512, 512);
  // soft cloud-like luminance variation
  for (let i = 0; i < 25; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const r = rand(40, 140);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,250,240,${rand(0.04, 0.10)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
  }
  // fine plaster speckle
  for (let i = 0; i < 2500; i++) {
    const a = Math.random() * 0.045;
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
  }
  return toTexture(canvas, repeatX, repeatY);
};

export const createWallNormal = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 512, 512);
  // very fine plaster bump
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const v = 128 + (Math.random() - 0.5) * 16;
    const a = Math.random() * 0.4;
    ctx.fillStyle = `rgba(${v|0},${v|0},255,${a})`;
    ctx.fillRect(x, y, 1.2, 1.2);
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

/* ───────────────────── DOOR / FURNITURE WOOD ───────────────────── */
/** Single-board vertical-grain wood texture for doors and furniture panels */
const createBoardWoodAlbedo = (baseRGB: number[], darkRGB: number[], repeatX: number, repeatY: number) => {
  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = `rgb(${baseRGB[0]},${baseRGB[1]},${baseRGB[2]})`;
  ctx.fillRect(0, 0, 512, 512);
  // long vertical grain
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * 512;
    const alpha = rand(0.04, 0.16);
    const dark = lerpHex(baseRGB, darkRGB, rand(0.4, 0.95));
    ctx.strokeStyle = `rgba(${dark[0]},${dark[1]},${dark[2]},${alpha})`;
    ctx.lineWidth = rand(0.4, 1.4);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    let cx = x;
    const segs = 10;
    for (let s = 1; s <= segs; s++) {
      const cy = (512 / segs) * s;
      cx += rand(-1.4, 1.4);
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  // a few darker streaks
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * 512;
    ctx.strokeStyle = `rgba(${darkRGB[0]},${darkRGB[1]},${darkRGB[2]},${rand(0.18, 0.32)})`;
    ctx.lineWidth = rand(1, 2.5);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    let cx = x;
    for (let s = 1; s <= 8; s++) {
      cx += rand(-2.5, 2.5);
      ctx.lineTo(cx, (512 / 8) * s);
    }
    ctx.stroke();
  }
  // soft vignette
  const vg = ctx.createRadialGradient(256, 256, 100, 256, 256, 360);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, 512, 512);
  return toTexture(canvas, repeatX, repeatY);
};

const createBoardWoodNormal = (repeatX: number, repeatY: number) => {
  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * 512;
    const a = Math.random() * 0.18;
    ctx.fillStyle = `rgba(110,110,255,${a})`;
    ctx.fillRect(x, 0, 0.6, 512);
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

/** Warm walnut texture for door panels and dark furniture */
export const createDoorWoodTexture = (repeatX = 1, repeatY = 1) =>
  createBoardWoodAlbedo([110, 70, 42], [50, 28, 14], repeatX, repeatY);
export const createDoorWoodNormal = (repeatX = 1, repeatY = 1) =>
  createBoardWoodNormal(repeatX, repeatY);

/* ───────────────────── FABRIC (sofa/bedding) ───────────────────── */
export const createFabricTexture = (rgb: number[], repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  ctx.fillRect(0, 0, 512, 512);
  // weave noise
  for (let y = 0; y < 512; y += 2) {
    for (let x = 0; x < 512; x += 2) {
      const v = (Math.random() - 0.5) * 16;
      const a = Math.random() * 0.4;
      ctx.fillStyle = `rgba(${Math.max(0, rgb[0] + v)|0},${Math.max(0, rgb[1] + v)|0},${Math.max(0, rgb[2] + v)|0},${a})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  // subtle weave lines
  for (let i = 0; i < 512; i += 3) {
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
  }
  return toTexture(canvas, repeatX, repeatY);
};

export const createFabricNormal = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const v = 128 + (Math.random() - 0.5) * 24;
    ctx.fillStyle = `rgba(${v|0},${v|0},255,0.4)`;
    ctx.fillRect(x, y, 1, 1);
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

/* ───────────────────── GRASS / LAWN ───────────────────── */
export const createGrassTexture = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(1024);
  // base — manicured lawn
  ctx.fillStyle = '#5e8c4a';
  ctx.fillRect(0, 0, 1024, 1024);
  // soft tonal patches (mowed pattern + clumping)
  const palette = [
    [88, 130, 70], [76, 116, 60], [104, 144, 80], [62, 100, 52],
    [130, 160, 96], [70, 110, 56], [96, 138, 78], [82, 124, 66],
  ];
  for (let i = 0; i < 320; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    const r = rand(20, 90);
    const c = palette[(Math.random() * palette.length) | 0];
    const a = rand(0.25, 0.55);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 1024);
  }
  // fine blade noise
  for (let i = 0; i < 18000; i++) {
    const v = (Math.random() - 0.5) * 35;
    const r = 88 + v, gC = 130 + v, b = 70 + v * 0.4;
    const a = Math.random() * 0.7;
    ctx.fillStyle = `rgba(${Math.max(0, r) | 0},${Math.max(0, gC) | 0},${Math.max(0, b) | 0},${a})`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, rand(0.6, 1.6), rand(1.2, 2.2));
  }
  // occasional wildflower / dandelion specks
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    const palette2 = ['255,236,158', '255,255,255', '255,210,180', '230,180,200'];
    const col = palette2[(Math.random() * palette2.length) | 0];
    ctx.fillStyle = `rgba(${col},${rand(0.5, 0.9)})`;
    ctx.beginPath();
    ctx.arc(x, y, rand(0.8, 2.0), 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas, repeatX, repeatY, 16);
};

export const createGrassNormal = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 1024, 1024);
  // tiny vertical blade bumps
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    const v = 128 + (Math.random() - 0.5) * 30;
    ctx.fillStyle = `rgba(${v | 0},${v | 0},255,0.45)`;
    ctx.fillRect(x, y, 0.8, rand(1, 2.4));
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

/* ───────────────────── MULCH (planting bed) ───────────────────── */
export const createMulchTexture = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = '#3a2415';
  ctx.fillRect(0, 0, 512, 512);
  // chip-like specks
  for (let i = 0; i < 3500; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const tone = Math.random();
    const r = 60 + tone * 50, g = 36 + tone * 35, b = 22 + tone * 18;
    ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${rand(0.4, 0.95)})`;
    ctx.fillRect(x, y, rand(1.5, 4), rand(1.5, 4));
  }
  return toTexture(canvas, repeatX, repeatY);
};

/* ───────────────────── STONE PATH ───────────────────── */
export const createStoneTexture = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = '#9a958c';
  ctx.fillRect(0, 0, 512, 512);
  // mottled stone tone
  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const v = 130 + (Math.random() - 0.5) * 50;
    ctx.fillStyle = `rgba(${v | 0},${(v - 6) | 0},${(v - 14) | 0},${rand(0.2, 0.55)})`;
    ctx.fillRect(x, y, rand(2, 6), rand(2, 6));
  }
  // dark cracks
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = 'rgba(40,36,30,0.35)';
    ctx.lineWidth = rand(0.4, 1.2);
    ctx.beginPath();
    let x = Math.random() * 512, y = Math.random() * 512;
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      x += rand(-20, 20); y += rand(-20, 20);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return toTexture(canvas, repeatX, repeatY);
};
