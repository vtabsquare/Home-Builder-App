import * as THREE from 'three';

/* ───────────────────────── helpers ───────────────────────── */
const makeCanvas = (size = 512) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext('2d')! };
};

const toTexture = (canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1, anisotropy = 16) => {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = anisotropy;
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  return t;
};

const toLinearTexture = (canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1, anisotropy = 16) => {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = anisotropy;
  t.generateMipmaps = true;
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
  const tonal = rand(-0.12, 0.12);
  const tinted = baseRGB.map(v => Math.max(0, Math.min(255, v + v * tonal)));
  ctx.fillStyle = `rgb(${tinted[0]|0},${tinted[1]|0},${tinted[2]|0})`;
  ctx.fillRect(x, y, w, h);

  // Rich layered grain streaks
  for (let pass = 0; pass < 3; pass++) {
    const streaks = pass === 0 ? 80 : pass === 1 ? 40 : 20;
    for (let i = 0; i < streaks; i++) {
      const sy = y + Math.random() * h;
      const alpha = pass === 0 ? rand(0.02, 0.07) : pass === 1 ? rand(0.05, 0.14) : rand(0.08, 0.22);
      const dark = lerpHex(tinted, darkRGB, rand(0.3 + pass * 0.2, 0.9));
      ctx.strokeStyle = `rgba(${dark[0]},${dark[1]},${dark[2]},${alpha})`;
      ctx.lineWidth = pass === 0 ? rand(0.3, 0.8) : pass === 1 ? rand(0.5, 1.5) : rand(1, 2.5);
      ctx.beginPath();
      ctx.moveTo(x, sy);
      let cy = sy;
      const segs = 8;
      for (let s = 1; s <= segs; s++) {
        const cx2 = x + (w / segs) * s;
        cy += rand(-1.5, 1.5);
        ctx.lineTo(cx2, cy);
      }
      ctx.stroke();
    }
  }

  // Pore texture micro-dots
  for (let i = 0; i < 300; i++) {
    const px = x + Math.random() * w;
    const py = y + Math.random() * h;
    const dark = lerpHex(tinted, darkRGB, rand(0.6, 1.0));
    ctx.fillStyle = `rgba(${dark[0]},${dark[1]},${dark[2]},${rand(0.1, 0.4)})`;
    ctx.fillRect(px, py, rand(0.3, 0.8), rand(0.3, 0.8));
  }

  // Realistic knot with ring structure
  if (Math.random() < 0.22) {
    const kx = x + rand(0.15, 0.85) * w;
    const ky = y + rand(0.2, 0.8) * h;
    const kr = rand(3, 8);
    for (let ring = 3; ring >= 0; ring--) {
      const grad = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr * (ring + 1));
      const alpha = ring === 0 ? 0.7 : ring === 1 ? 0.45 : ring === 2 ? 0.25 : 0.12;
      grad.addColorStop(0, `rgba(${darkRGB[0]},${darkRGB[1]},${darkRGB[2]},${alpha})`);
      grad.addColorStop(0.5, `rgba(${darkRGB[0]+20},${darkRGB[1]+10},${darkRGB[2]+5},${alpha * 0.5})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(kx, ky, kr * (ring + 1) * 1.3, kr * (ring + 1), rand(-0.2, 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Plank seam with shadow gradient
  const seam = ctx.createLinearGradient(x, y, x, y + 2);
  seam.addColorStop(0, 'rgba(0,0,0,0.5)');
  seam.addColorStop(0.5, 'rgba(0,0,0,0.15)');
  seam.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = seam;
  ctx.fillRect(x, y, w, 2);
};

const createWoodPlankAlbedo = (baseRGB: number[], darkRGB: number[], repeatX: number, repeatY: number) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = `rgb(${baseRGB[0]},${baseRGB[1]},${baseRGB[2]})`;
  ctx.fillRect(0, 0, 1024, 1024);

  const plankRows = 6;
  const plankH = 1024 / plankRows;
  for (let r = 0; r < plankRows; r++) {
    const offset = (r % 2) * 280;
    let x = -offset;
    while (x < 1024) {
      const pw = rand(200, 380);
      paintPlankBoard(ctx, x, r * plankH, pw, plankH, baseRGB, darkRGB);
      // Vertical seam with double-line highlight/shadow
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x + pw, r * plankH);
      ctx.lineTo(x + pw, r * plankH + plankH);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x + pw + 1.2, r * plankH);
      ctx.lineTo(x + pw + 1.2, r * plankH + plankH);
      ctx.stroke();
      x += pw;
    }
  }

  // Lacquer sheen variation — bright streaks simulating light gloss
  for (let i = 0; i < 8; i++) {
    const gx = Math.random() * 1024;
    const grad = ctx.createLinearGradient(gx - 60, 0, gx + 60, 0);
    grad.addColorStop(0, 'rgba(255,250,240,0)');
    grad.addColorStop(0.5, `rgba(255,250,240,${rand(0.03, 0.08)})`);
    grad.addColorStop(1, 'rgba(255,250,240,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);
  }

  // Soft vignette for ambient occlusion
  const vg = ctx.createRadialGradient(512, 512, 200, 512, 512, 720);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.22)');
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
  // Deep seam grooves
  for (let r = 0; r <= plankRows; r++) {
    const y = r * plankH;
    ctx.fillStyle = 'rgba(60,60,180,1)';
    ctx.fillRect(0, y - 1.5, 1024, 3);
    // Raised edge highlight
    ctx.fillStyle = 'rgba(140,140,255,0.6)';
    ctx.fillRect(0, y + 2, 1024, 1.5);
  }
  for (let r = 0; r < plankRows; r++) {
    const offset = (r % 2) * 280;
    let x = -offset;
    while (x < 1024) {
      const pw = rand(200, 380);
      ctx.fillStyle = 'rgba(60,60,180,1)';
      ctx.fillRect(x + pw - 1, r * plankH, 2, plankH);
      ctx.fillStyle = 'rgba(140,140,255,0.5)';
      ctx.fillRect(x + pw + 1.5, r * plankH, 1, plankH);
      x += pw;
    }
  }
  // Grain micro-normal noise
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const nx = 128 + (Math.random() - 0.5) * 18;
    const ny = 128 + (Math.random() - 0.5) * 8;
    const a = Math.random() * 0.15;
    ctx.fillStyle = `rgba(${nx|0},${ny|0},255,${a})`;
    ctx.fillRect(x, y, rand(0.8, 2), rand(0.8, 4));
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

const createWoodPlankRoughness = (repeatX: number, repeatY: number) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = '#8c8c8c'; // mid satin
  ctx.fillRect(0, 0, 1024, 1024);
  // Glossy streak highlights (lacquer)
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * 1024;
    const grad = ctx.createLinearGradient(x - 40, 0, x + 40, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, `rgba(30,30,30,${rand(0.3, 0.6)})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);
  }
  // Rough grain variation
  for (let i = 0; i < 8000; i++) {
    const a = Math.random() * 0.35;
    const v = 70 + Math.floor(Math.random() * 100);
    ctx.fillStyle = `rgba(${v},${v},${v},${a})`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, rand(0.5, 2), rand(0.5, 3));
  }
  // Seam roughness (darker = rougher groove)
  const plankRows = 6;
  const plankH = 1024 / plankRows;
  for (let r = 0; r <= plankRows; r++) {
    ctx.fillStyle = 'rgba(200,200,200,0.9)';
    ctx.fillRect(0, r * plankH - 1, 1024, 2);
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

export const createWoodFloorTexture = (repeatX = 1, repeatY = 1) =>
  createWoodPlankAlbedo([82, 52, 30], [32, 18, 10], repeatX, repeatY);
export const createWoodFloorNormal = (repeatX = 1, repeatY = 1) => createWoodPlankNormal(repeatX, repeatY);
export const createWoodFloorRoughness = (repeatX = 1, repeatY = 1) => createWoodPlankRoughness(repeatX, repeatY);

export const createOakFloorTexture = (repeatX = 1, repeatY = 1) =>
  createWoodPlankAlbedo([192, 152, 104], [118, 82, 52], repeatX, repeatY);
export const createOakFloorNormal = (repeatX = 1, repeatY = 1) => createWoodPlankNormal(repeatX, repeatY);
export const createOakFloorRoughness = (repeatX = 1, repeatY = 1) => createWoodPlankRoughness(repeatX, repeatY);

/* ───────────────────── POLISHED CERAMIC TILE ───────────────────── */
export const createTileTexture = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = '#edf0ef';
  ctx.fillRect(0, 0, 1024, 1024);

  const tileSize = 256;
  for (let ty = 0; ty < 1024; ty += tileSize) {
    for (let tx = 0; tx < 1024; tx += tileSize) {
      const v = 232 + Math.floor(Math.random() * 20);
      const warmth = Math.random() * 8;
      ctx.fillStyle = `rgb(${v},${v - warmth/2|0},${v - warmth|0})`;
      ctx.fillRect(tx + 3, ty + 3, tileSize - 6, tileSize - 6);

      // Tile surface micro-sheen
      const shine = ctx.createLinearGradient(tx, ty, tx + tileSize, ty + tileSize);
      shine.addColorStop(0, `rgba(255,255,255,${rand(0.05, 0.12)})`);
      shine.addColorStop(0.4, `rgba(255,255,255,0)`);
      shine.addColorStop(0.6, `rgba(0,0,0,0)`);
      shine.addColorStop(1, `rgba(0,0,0,${rand(0.03, 0.08)})`);
      ctx.fillStyle = shine;
      ctx.fillRect(tx + 3, ty + 3, tileSize - 6, tileSize - 6);

      // Fine veining per tile
      ctx.strokeStyle = `rgba(180,178,174,${rand(0.04, 0.1)})`;
      ctx.lineWidth = 0.5;
      for (let vi = 0; vi < 8; vi++) {
        ctx.beginPath();
        const sx = tx + Math.random() * tileSize;
        const sy = ty + Math.random() * tileSize;
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(
          sx + rand(-50, 50), sy + rand(-50, 50),
          sx + rand(-50, 50), sy + rand(-50, 50),
          sx + rand(-70, 70), sy + rand(-70, 70)
        );
        ctx.stroke();
      }
    }
  }

  // Grout — recessed with shadow/highlight
  ctx.strokeStyle = '#8a9290';
  ctx.lineWidth = 5;
  for (let i = 0; i <= 1024; i += tileSize) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 1024; i += tileSize) {
    ctx.beginPath(); ctx.moveTo(i + 3, 0); ctx.lineTo(i + 3, 1024); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i + 3); ctx.lineTo(1024, i); ctx.stroke();
  }
  return toTexture(canvas, repeatX, repeatY);
};

export const createTileNormal = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 1024, 1024);
  const tileSize = 256;
  // Deep grout grooves
  for (let i = 0; i <= 1024; i += tileSize) {
    ctx.fillStyle = 'rgba(50,50,180,1)';
    ctx.fillRect(i - 3, 0, 6, 1024);
    ctx.fillRect(0, i - 3, 1024, 6);
  }
  // Raised tile edges highlight
  for (let i = 0; i <= 1024; i += tileSize) {
    ctx.fillStyle = 'rgba(150,150,255,0.5)';
    ctx.fillRect(i + 3, 0, 2, 1024);
    ctx.fillRect(0, i + 3, 1024, 2);
  }
  // Surface micro-bump
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    const v = 128 + (Math.random() - 0.5) * 10;
    ctx.fillStyle = `rgba(${v|0},${v|0},255,0.08)`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

export const createTileRoughness = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(1024);
  // Very glossy tile face
  ctx.fillStyle = '#282828';
  ctx.fillRect(0, 0, 1024, 1024);
  // Grout is much rougher
  ctx.strokeStyle = '#c8c8c8';
  ctx.lineWidth = 5;
  const tileSize = 256;
  for (let i = 0; i <= 1024; i += tileSize) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
  }
  // Subtle tile surface variation
  for (let i = 0; i < 1000; i++) {
    ctx.fillStyle = `rgba(60,60,60,${rand(0.05, 0.2)})`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

/* ───────────────────── LUXURY MARBLE ───────────────────── */
export const createMarbleTexture = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(2048);
  // Rich warm marble base with subtle variation
  const baseGrad = ctx.createLinearGradient(0, 0, 2048, 2048);
  baseGrad.addColorStop(0, '#f4f0e8');
  baseGrad.addColorStop(0.3, '#f8f5f0');
  baseGrad.addColorStop(0.6, '#f0ece4');
  baseGrad.addColorStop(1, '#ede9e0');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 2048, 2048);

  // Large primary veins — bold diagonal sweeps
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(${150 + i * 8},${145 + i * 6},${135 + i * 5},${rand(0.25, 0.45)})`;
    ctx.lineWidth = rand(3, 9);
    ctx.beginPath();
    let vx = rand(0, 2048), vy = rand(0, 2048);
    ctx.moveTo(vx, vy);
    for (let s = 0; s < 10; s++) {
      vx += rand(80, 240) * (Math.random() < 0.5 ? -1 : 1);
      vy += rand(80, 240) * (Math.random() < 0.5 ? -1 : 1);
      ctx.lineTo(vx, vy);
    }
    ctx.stroke();

    // Vein halo
    ctx.strokeStyle = `rgba(200,195,185,${rand(0.08, 0.16)})`;
    ctx.lineWidth = rand(12, 25);
    ctx.stroke();
  }

  // Medium secondary veins
  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = `rgba(${160 + i * 4},${155 + i * 3},${145 + i * 3},${rand(0.1, 0.28)})`;
    ctx.lineWidth = rand(1, 4);
    ctx.beginPath();
    let vx = rand(0, 2048), vy = rand(0, 2048);
    ctx.moveTo(vx, vy);
    for (let s = 0; s < 7; s++) {
      vx += rand(-150, 150); vy += rand(-150, 150);
      ctx.lineTo(vx, vy);
    }
    ctx.stroke();
  }

  // Fine hairline veins
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = `rgba(160,155,145,${rand(0.04, 0.14)})`;
    ctx.lineWidth = rand(0.3, 1.2);
    ctx.beginPath();
    let vx = rand(0, 2048), vy = rand(0, 2048);
    ctx.moveTo(vx, vy);
    for (let s = 0; s < 5; s++) {
      vx += rand(-120, 120); vy += rand(-120, 120);
      ctx.lineTo(vx, vy);
    }
    ctx.stroke();
  }

  // Crystal sparkle inclusions
  for (let i = 0; i < 120; i++) {
    const sx = rand(0, 2048), sy = rand(0, 2048);
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, rand(2, 6));
    grad.addColorStop(0, `rgba(255,252,245,${rand(0.3, 0.7)})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx - 6, sy - 6, 12, 12);
  }

  return toTexture(canvas, repeatX, repeatY);
};

export const createMarbleRoughness = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = '#141414'; // very polished
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2000; i++) {
    const a = Math.random() * 0.08;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, rand(0.5, 1.5), rand(0.5, 1.5));
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

/* ───────────────────── WALL PLASTER (fine coat) ───────────────────── */
export const createWallTexture = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(1024);
  // Warm base with very subtle paint-roll variation
  ctx.fillStyle = '#f4f1ec';
  ctx.fillRect(0, 0, 1024, 1024);

  // Paint roller direction variation (horizontal bands)
  for (let y = 0; y < 1024; y += 3) {
    const v = 240 + (Math.random() - 0.5) * 8;
    ctx.strokeStyle = `rgba(${v|0},${(v-2)|0},${(v-5)|0},${rand(0.02, 0.06)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Soft cloud luminance
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    const r = rand(50, 160);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,252,245,${rand(0.05, 0.12)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 1024);
  }

  // Fine plaster stipple
  for (let i = 0; i < 5000; i++) {
    const a = Math.random() * 0.04;
    const dark = Math.random() < 0.5;
    ctx.fillStyle = dark ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 1.5})`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, rand(0.5, 1.5), rand(0.5, 1.5));
  }

  return toTexture(canvas, repeatX, repeatY);
};

export const createWallNormal = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    const v = 128 + (Math.random() - 0.5) * 20;
    const a = Math.random() * 0.35;
    ctx.fillStyle = `rgba(${v|0},${v|0},255,${a})`;
    ctx.fillRect(x, y, rand(0.8, 2), rand(0.8, 2));
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

/* ───────────────────── DOOR / FURNITURE WOOD ───────────────────── */
const createBoardWoodAlbedo = (baseRGB: number[], darkRGB: number[], repeatX: number, repeatY: number) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = `rgb(${baseRGB[0]},${baseRGB[1]},${baseRGB[2]})`;
  ctx.fillRect(0, 0, 1024, 1024);

  // Multi-pass vertical grain
  for (let pass = 0; pass < 3; pass++) {
    const count = pass === 0 ? 300 : pass === 1 ? 80 : 20;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * 1024;
      const alpha = pass === 0 ? rand(0.03, 0.12) : pass === 1 ? rand(0.08, 0.2) : rand(0.15, 0.35);
      const dark = lerpHex(baseRGB, darkRGB, rand(0.3 + pass * 0.2, 0.95));
      ctx.strokeStyle = `rgba(${dark[0]},${dark[1]},${dark[2]},${alpha})`;
      ctx.lineWidth = pass === 0 ? rand(0.3, 0.9) : pass === 1 ? rand(0.6, 2.0) : rand(1.5, 4.0);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      let cx2 = x;
      for (let s = 1; s <= 12; s++) {
        cx2 += rand(-2, 2);
        ctx.lineTo(cx2, (1024 / 12) * s);
      }
      ctx.stroke();
    }
  }

  // Medullary rays (cross-grain glint)
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * 1024;
    const a = rand(0.03, 0.08);
    ctx.strokeStyle = `rgba(255,245,225,${a})`;
    ctx.lineWidth = rand(0.3, 1.0);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y + rand(-20, 20));
    ctx.stroke();
  }

  // Pore micro-dots
  for (let i = 0; i < 600; i++) {
    const px = Math.random() * 1024, py = Math.random() * 1024;
    const dark = lerpHex(baseRGB, darkRGB, rand(0.7, 1.0));
    ctx.fillStyle = `rgba(${dark[0]},${dark[1]},${dark[2]},${rand(0.15, 0.45)})`;
    ctx.fillRect(px, py, rand(0.4, 1.0), rand(0.4, 1.0));
  }

  const vg = ctx.createRadialGradient(512, 512, 100, 512, 512, 720);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, 1024, 1024);
  return toTexture(canvas, repeatX, repeatY);
};

const createBoardWoodNormal = (repeatX: number, repeatY: number) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 1024;
    const a = Math.random() * 0.22;
    ctx.fillStyle = `rgba(100,100,255,${a})`;
    ctx.fillRect(x, 0, rand(0.4, 1.0), 1024);
  }
  // Pore normals
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    ctx.fillStyle = `rgba(60,60,200,${rand(0.2, 0.5)})`;
    ctx.fillRect(x, y, rand(0.5, 1.2), rand(0.5, 1.2));
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

export const createDoorWoodTexture = (repeatX = 1, repeatY = 1) =>
  createBoardWoodAlbedo([118, 75, 46], [52, 30, 16], repeatX, repeatY);
export const createDoorWoodNormal = (repeatX = 1, repeatY = 1) =>
  createBoardWoodNormal(repeatX, repeatY);

/* ───────────────────── FABRIC ───────────────────── */
export const createFabricTexture = (rgb: number[], repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  ctx.fillRect(0, 0, 512, 512);
  // Woven grid pattern
  for (let y = 0; y < 512; y += 2) {
    for (let x = 0; x < 512; x += 2) {
      const offset = (Math.floor(y / 2) % 2 === 0) ? 0 : 1;
      if ((Math.floor(x / 2) + offset) % 2 === 0) {
        const v = (Math.random() - 0.5) * 20;
        const a = rand(0.1, 0.3);
        ctx.fillStyle = `rgba(${Math.max(0, rgb[0]+v)|0},${Math.max(0, rgb[1]+v)|0},${Math.max(0, rgb[2]+v)|0},${a})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }
  // Thread lines
  for (let i = 0; i < 512; i += 2) {
    ctx.strokeStyle = `rgba(0,0,0,${rand(0.03, 0.07)})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
  }
  return toTexture(canvas, repeatX, repeatY);
};

export const createFabricNormal = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 2) {
    for (let x = 0; x < 512; x += 2) {
      const offset = (Math.floor(y / 2) % 2 === 0) ? 0 : 1;
      const isWarp = (Math.floor(x / 2) + offset) % 2 === 0;
      const nx = isWarp ? 128 + 20 : 128 - 20;
      const ny = isWarp ? 128 - 10 : 128 + 10;
      ctx.fillStyle = `rgba(${nx},${ny},255,0.4)`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

/* ───────────────────── GRASS / LAWN ───────────────────── */
export const createGrassTexture = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = '#5a8a46';
  ctx.fillRect(0, 0, 1024, 1024);

  const palette = [
    [88, 130, 70], [76, 116, 60], [104, 144, 80], [62, 100, 52],
    [130, 160, 96], [70, 110, 56], [96, 138, 78], [82, 124, 66], [50, 90, 44],
  ];

  // Mown pattern — alternating light/dark strips
  for (let x = 0; x < 1024; x += 16) {
    const light = Math.floor(x / 16) % 2 === 0;
    ctx.fillStyle = light ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, 0, 16, 1024);
  }

  // Color patches
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    const r = rand(12, 70);
    const c = palette[(Math.random() * palette.length) | 0];
    const a = rand(0.2, 0.5);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 1024);
  }

  // Fine blade noise
  for (let i = 0; i < 25000; i++) {
    const v = (Math.random() - 0.5) * 40;
    const r = 88 + v, gC = 130 + v, b = 70 + v * 0.4;
    const a = Math.random() * 0.75;
    ctx.fillStyle = `rgba(${Math.max(0, r)|0},${Math.max(0, gC)|0},${Math.max(0, b)|0},${a})`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, rand(0.4, 1.4), rand(1.0, 2.5));
  }

  // Wildflower specks
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    const p2 = ['255,236,158', '255,255,255', '255,210,180', '230,180,200', '200,240,200'];
    const col = p2[(Math.random() * p2.length) | 0];
    ctx.fillStyle = `rgba(${col},${rand(0.4, 0.9)})`;
    ctx.beginPath();
    ctx.arc(x, y, rand(0.6, 2.2), 0, Math.PI * 2);
    ctx.fill();
  }

  return toTexture(canvas, repeatX, repeatY, 16);
};

export const createGrassNormal = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    const v = 128 + (Math.random() - 0.5) * 32;
    ctx.fillStyle = `rgba(${v|0},${v|0},255,0.5)`;
    ctx.fillRect(x, y, rand(0.5, 1.2), rand(1, 2.8));
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

/* ───────────────────── MULCH ───────────────────── */
export const createMulchTexture = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = '#3a2415';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const tone = Math.random();
    const r = 60 + tone * 55, g = 36 + tone * 38, b = 22 + tone * 20;
    ctx.fillStyle = `rgba(${r|0},${g|0},${b|0},${rand(0.4, 0.95)})`;
    ctx.fillRect(x, y, rand(1.5, 5), rand(1.5, 5));
  }
  return toTexture(canvas, repeatX, repeatY);
};

/* ───────────────────── STONE PATH ───────────────────── */
export const createStoneTexture = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = '#8a8580';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const v = 120 + (Math.random() - 0.5) * 55;
    ctx.fillStyle = `rgba(${v|0},${(v-5)|0},${(v-12)|0},${rand(0.2, 0.6)})`;
    ctx.fillRect(x, y, rand(2, 7), rand(2, 7));
  }
  for (let i = 0; i < 50; i++) {
    ctx.strokeStyle = 'rgba(35,32,25,0.4)';
    ctx.lineWidth = rand(0.4, 1.4);
    ctx.beginPath();
    let x = Math.random() * 512, y = Math.random() * 512;
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += rand(-25, 25); y += rand(-25, 25);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return toTexture(canvas, repeatX, repeatY);
};

/* ───────────────────── CONCRETE (exterior walls/foundation) ───────────────────── */
export const createConcreteTexture = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = '#c8c4bc';
  ctx.fillRect(0, 0, 1024, 1024);

  // Aggregate particles
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    const v = 150 + (Math.random() - 0.5) * 60;
    const a = rand(0.1, 0.5);
    ctx.fillStyle = `rgba(${v|0},${(v-5)|0},${(v-10)|0},${a})`;
    ctx.fillRect(x, y, rand(0.5, 3), rand(0.5, 3));
  }

  // Form-liner horizontal lines (poured concrete)
  for (let y = 0; y < 1024; y += rand(20, 40)) {
    ctx.strokeStyle = `rgba(80,76,70,${rand(0.05, 0.15)})`;
    ctx.lineWidth = rand(0.4, 1.2);
    ctx.beginPath();
    ctx.moveTo(0, y);
    let cx2 = 0, cy = y;
    while (cx2 < 1024) {
      cx2 += rand(30, 80);
      cy += rand(-0.5, 0.5);
      ctx.lineTo(cx2, cy);
    }
    ctx.stroke();
  }

  // Tie holes
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    ctx.fillStyle = 'rgba(80,75,65,0.4)';
    ctx.beginPath();
    ctx.arc(x, y, rand(1.5, 3), 0, Math.PI * 2);
    ctx.fill();
  }

  return toTexture(canvas, repeatX, repeatY);
};

export const createConcreteNormal = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 10000; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    const v = 128 + (Math.random() - 0.5) * 24;
    ctx.fillStyle = `rgba(${v|0},${v|0},255,${rand(0.1, 0.35)})`;
    ctx.fillRect(x, y, rand(0.5, 2), rand(0.5, 2));
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

export const createConcreteRoughness = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(512);
  ctx.fillStyle = '#c0c0c0'; // fairly rough
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3000; i++) {
    const v = 100 + Math.random() * 120;
    ctx.fillStyle = `rgba(${v|0},${v|0},${v|0},${rand(0.2, 0.6)})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, rand(1, 4), rand(1, 4));
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};

/* ───────────────────── ROOFING MATERIAL ───────────────────── */
export const createRoofingTexture = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = '#1a1a1e';
  ctx.fillRect(0, 0, 1024, 1024);

  // Standing seam metal appearance
  const seamSpacing = 64;
  for (let x = 0; x < 1024; x += seamSpacing) {
    // Seam ridge
    const grad = ctx.createLinearGradient(x - 4, 0, x + 10, 0);
    grad.addColorStop(0, 'rgba(50,50,55,0)');
    grad.addColorStop(0.3, 'rgba(80,80,88,0.9)');
    grad.addColorStop(0.5, 'rgba(100,100,110,0.6)');
    grad.addColorStop(1, 'rgba(30,30,35,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 4, 0, 14, 1024);
  }

  // Panel surface variation
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    const v = 20 + Math.random() * 30;
    ctx.fillStyle = `rgba(${v|0},${v|0},${v+3|0},${rand(0.1, 0.4)})`;
    ctx.fillRect(x, y, rand(1, 4), rand(1, 4));
  }

  return toTexture(canvas, repeatX, repeatY);
};

export const createRoofingNormal = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 1024, 1024);

  const seamSpacing = 64;
  for (let x = 0; x < 1024; x += seamSpacing) {
    // Seam protrusion normal
    ctx.fillStyle = 'rgba(160,160,255,0.9)';
    ctx.fillRect(x, 0, 2, 1024);
    ctx.fillStyle = 'rgba(60,60,200,0.8)';
    ctx.fillRect(x + 2, 0, 2, 1024);
    ctx.fillStyle = 'rgba(80,80,210,0.6)';
    ctx.fillRect(x + 8, 0, 2, 1024);
  }

  return toLinearTexture(canvas, repeatX, repeatY);
};

/* ───────────────────── PAINTED STUCCO (exterior) ───────────────────── */
export const createStuccoTexture = (color: [number, number, number] = [245, 242, 235], repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
  ctx.fillRect(0, 0, 1024, 1024);

  // Stucco aggregate texture
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    const v = (Math.random() - 0.5) * 25;
    const a = rand(0.05, 0.25);
    const isDark = Math.random() < 0.4;
    ctx.fillStyle = isDark
      ? `rgba(${Math.max(0, color[0]+v-20)|0},${Math.max(0, color[1]+v-20)|0},${Math.max(0, color[2]+v-20)|0},${a})`
      : `rgba(${Math.min(255, color[0]+v+15)|0},${Math.min(255, color[1]+v+15)|0},${Math.min(255, color[2]+v+10)|0},${a * 0.8})`;
    const size = rand(0.5, 2.5);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  return toTexture(canvas, repeatX, repeatY);
};

export const createStuccoNormal = (repeatX = 1, repeatY = 1) => {
  const { canvas, ctx } = makeCanvas(1024);
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    const v = 128 + (Math.random() - 0.5) * 28;
    const a = rand(0.15, 0.5);
    ctx.fillStyle = `rgba(${v|0},${v|0},255,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, rand(0.5, 2), 0, Math.PI * 2);
    ctx.fill();
  }
  return toLinearTexture(canvas, repeatX, repeatY);
};