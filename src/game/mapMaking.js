// src/game/mapMaking.js
import { cell_size, ROWS, COLS } from "./engine.js";

// Vite / ESM safe:
const grassUrl = new URL("../assets/grass.png", import.meta.url).href;
const rockUrl  = new URL("../assets/rock.png", import.meta.url).href;

const grassImg = new Image();
grassImg.onload = () => console.log("grass loaded", grassImg.src);
grassImg.onerror = (e) => console.error("grass load failed", grassImg.src, e);
grassImg.src = grassUrl;

const rockImg = new Image();
rockImg.onload = () => console.log("rock loaded", rockImg.src);
rockImg.onerror = (e) => console.error("rock load failed", rockImg.src, e);
rockImg.src = rockUrl;


export function getTileLayout(ctx) {
  const tile = cell_size;
  const canvasW = ctx.canvas.width;
  const canvasH = ctx.canvas.height;
  const offsetX = Math.floor((canvasW - tile * COLS) / 2);
  const offsetY = Math.floor((canvasH - tile * ROWS) / 2);
  return { tile, offsetX, offsetY };
}

export function cellCenter(ctx, col, row) {
  const { tile, offsetX, offsetY } = getTileLayout(ctx);
  return {
    px: offsetX + col * tile + tile / 2,
    py: offsetY + row * tile + tile / 2,
    tile
  };
}

/**
 * グリッド（草タイル + 線）を描画
 * 画像が未読み込み／壊れている場合はフォールバックで塗りつぶす
 */
export function drawGrid(ctx) {
  const { tile, offsetX, offsetY } = getTileLayout(ctx);
  const gridW = tile * COLS;
  const gridH = tile * ROWS;

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const x = offsetX + c * tile;
      const y = offsetY + r * tile;
      ctx.drawImage(grassImg, x, y, tile, tile);
    }
  }
  // グリッド線（上に重ねる）
  ctx.strokeStyle = "#3d3f3fff";
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    const x = offsetX + c * tile + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, offsetY + 0.5);
    ctx.lineTo(x, offsetY + gridH + 0.5);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    const y = offsetY + r * tile + 0.5;
    ctx.beginPath();
    ctx.moveTo(offsetX + 0.5, y);
    ctx.lineTo(offsetX + gridW + 0.5, y);
    ctx.stroke();
  }
}

// 障害物
export let obstacles = [];

export function generateObstacles(count, COLS, ROWS, forbidden = []) {
  obstacles = [];
  while (obstacles.length < count) {
    const c = Math.floor(Math.random() * COLS);
    const r = Math.floor(Math.random() * ROWS);
    if (
      obstacles.some(o => o.c === c && o.r === r) ||
      forbidden.some(f => f.c === c && f.r === r)
    ) continue;
    obstacles.push({ c, r });
  }
}

export function bulletHitsObstacle(x, y, cell_size) {
  const c = Math.floor(x / cell_size);
  const r = Math.floor(y / cell_size);
  return obstacles.some(o => o.c === c && o.r === r);
}

export function isBlocked(c, r) {
  return obstacles.some(o => o.c === c && o.r === r);
}

/**
 * 障害物を描画（岩）
 * rockImg が壊れている／未読み込みならフォールバックで四角を描く
 */
export function drawObstacles(ctx, cell_size) {
  const scale = 0.7; // 岩の縮小率
  const size = cell_size * scale;
  const offset = (cell_size - size) / 2;

  for (let o of obstacles) {
    const x = o.c * cell_size + offset;
    const y = o.r * cell_size + offset;
    ctx.drawImage(rockImg, x, y, size, size);
  }
}

