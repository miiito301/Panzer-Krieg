// src/game/engine.js
import { runEnemyTurn } from "./enemyAI.js";
import {
  drawGrid,
  cellCenter,
  isBlocked,
  generateObstacles,
  drawObstacles,
  bulletHitsObstacle,
} from "./mapMaking.js";

/* ---------- 設定 ---------- */
export const ROWS = 8;
export const COLS = 18;
export const BULLET_RANGE_CELLS = 5;
export const cell_size = 80; // 1セルのピクセルサイズ
const DEFAULT_ACTIONS_PER_TURN = 4;

/* ---------- state ---------- */
let ctx = null;
let rafId = null;

let currentTurn = "player";
// playerActionsLeft is initialized later (or defaults to DEFAULT_ACTIONS_PER_TURN)
let playerActionsLeft = DEFAULT_ACTIONS_PER_TURN;

/*Explosion */
const explosionImg = new Image();
explosionImg.onload = () => console.log("explosion loaded", explosionImg.src);
explosionImg.src = new URL("../assets/explosion.png", import.meta.url).href;

const DIR_VECTORS = [
  { x: 0, y: -1 }, // UP
  { x: 1, y: 0 }, // RIGHT
  { x: 0, y: 1 }, // DOWN
  { x: -1, y: 0 }, // LEFT
];

/* ---------- actors (with HP) ---------- */
export const tank = {
  c: 0,
  r: ROWS - 1,
  dir: 0,
  locked: false,
  hp: 100,
  // template fields (may be set by setTankTemplates)
  attack: 50,
  range: BULLET_RANGE_CELLS,
  armorFront: 0,
  armorSide: 0,
  armorRear: 0,
  actionsPerTurn: DEFAULT_ACTIONS_PER_TURN,
  malfunctionProb: 0.05,
};

export const enemy = {
  c: COLS - 1,
  r: 0,
  dir: 2,
  locked: false,
  hp: 100,
  attack: 50,
  range: BULLET_RANGE_CELLS,
  armorFront: 0,
  armorSide: 0,
  armorRear: 0,
  actionsPerTurn: DEFAULT_ACTIONS_PER_TURN,
  malfunctionProb: 0.08,
};

/* ---------- bullets (pixel coords) ---------- */
let bullets = [];

/* ---------- game state ---------- */
let gameOver = false;
let winner = null;

/* ---------- malfunction HUD ---------- */
let malfunctionMessage = "";
let malfunctionTimer = 0;

/* ---------- utils ---------- */
export function initCanvas(canvas) {
  canvas.width = COLS * cell_size;
  canvas.height = ROWS * cell_size;
}

// --- 画像キャッシュと読み込みヘルパー（ファイル先頭近くに追加） ---
const spriteCache = {}; // id -> HTMLImageElement

function loadSprite(id) {
  if (!id) return null;
  if (spriteCache[id]) return spriteCache[id];
  const img = new Image();
  // Vite-friendlyなパス解決（ビルド時に解決される）
  try {
    img.src = new URL(`../assets/tank_above/${id}_above.png`, import.meta.url).href;
  } catch (e) {
    img.src = `/assets/tank_above/${id}_above.png`;
  }
  spriteCache[id] = img;
  return img;
}

/**
 * Apply selected tank templates (from TankSelect)
 * playerTemplate / enemyTemplate are objects matching fields in tankDefs
 */
export function setTankTemplates(playerTemplate, enemyTemplate) {
  if (playerTemplate) {
    tank.hp = playerTemplate.hp ?? 100;
    tank.attack = playerTemplate.attack ?? tank.attack;
    tank.range = playerTemplate.range ?? tank.range;
    tank.armorFront = playerTemplate.armorFront ?? tank.armorFront;
    tank.armorSide = playerTemplate.armorSide ?? tank.armorSide;
    tank.armorRear = playerTemplate.armorRear ?? tank.armorRear;
    tank.actionsPerTurn = playerTemplate.actionsPerTurn ?? tank.actionsPerTurn;
    tank.malfunctionProb = playerTemplate.malfunctionProb ?? tank.malfunctionProb;
    playerActionsLeft = tank.actionsPerTurn ?? DEFAULT_ACTIONS_PER_TURN;
    // 追加：スプライト ID を保存してプリロード
    tank.spriteId = playerTemplate.id ?? playerTemplate.spriteId ?? null;
    if (tank.spriteId) loadSprite(tank.spriteId);
  }
  if (enemyTemplate) {
    enemy.hp = enemyTemplate.hp ?? 100;
    enemy.attack = enemyTemplate.attack ?? enemy.attack;
    enemy.range = enemyTemplate.range ?? enemy.range;
    enemy.armorFront = enemyTemplate.armorFront ?? enemy.armorFront;
    enemy.armorSide = enemyTemplate.armorSide ?? enemy.armorSide;
    enemy.armorRear = enemyTemplate.armorRear ?? enemy.armorRear;
    enemy.actionsPerTurn = enemyTemplate.actionsPerTurn ?? enemy.actionsPerTurn;
    enemy.malfunctionProb = enemyTemplate.malfunctionProb ?? enemy.malfunctionProb;
    // 追加：スプライト ID を保存してプリロード
    enemy.spriteId = enemyTemplate.id ?? enemyTemplate.spriteId ?? null;
    if (enemy.spriteId) loadSprite(enemy.spriteId);
  }
}


// bullet sprite cache + loader
let bulletImg = null;
function loadBulletImage() {
  if (bulletImg) return bulletImg;
  const img = new Image();
  try {
    img.src = new URL("../assets/tank_bullet.png", import.meta.url).href;
  } catch (e) {
    img.src = "/assets/tank_bullet.png";
  }
  bulletImg = img;
  return img;
}

/* ---------- bullet creation ---------- */
function createBulletFromActor(actor) {
  const { px, py, tile } = cellCenter(ctx, actor.c, actor.r);
  const vec = DIR_VECTORS[actor.dir];
  const speed = tile * 0.6;
  const maxDistanceCells = actor.range ?? BULLET_RANGE_CELLS;
  const maxDistance = tile * maxDistanceCells;
  return {
    x: px + vec.x * tile * 0.5,
    y: py + vec.y * tile * 0.5,
    dx: vec.x,
    dy: vec.y,
    speed,
    traveled: 0,
    maxDistance,
    radius: Math.max(2, tile * 0.18),
    owner: actor === tank ? "player" : "enemy",
    damage: actor.attack ?? 50,
  };
}

/* ---------- draw bullets ---------- */
function drawBullets() {
  // desired draw size in pixels (relative to cell size)
  const drawSize = Math.max(6, cell_size * 0.5);
  if (bulletImg && bulletImg.complete && bulletImg.naturalWidth > 0) {
    // draw image for each bullet (disable smoothing for pixel-art)
    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    for (let b of bullets) {
      ctx.save();
      ctx.translate(b.x, b.y);
      // rotate so the bullet sprite (upright) visually follows direction (optional)
      if (b.dx === 1) ctx.rotate(Math.PI / 2);
      else if (b.dx === -1) ctx.rotate(-Math.PI / 2);
      else if (b.dy === 1) ctx.rotate(Math.PI);
      // draw centered
      ctx.drawImage(bulletImg, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.restore();
    }
    ctx.imageSmoothingEnabled = prevSmoothing;
  }
}

/* ---------- bullets update & collision ---------- */
function updateBullets() {
  if (bullets.length === 0) {
    if (tank.locked) tank.locked = false;
    return;
  }
  const canvasW = ctx.canvas.width;
  const canvasH = ctx.canvas.height;
  // move bullets
  for (let b of bullets) {
    b.x += b.dx * b.speed;
    b.y += b.dy * b.speed;
    b.traveled += Math.abs(b.dx * b.speed) + Math.abs(b.dy * b.speed);
  }
  bullets = bullets.filter((b) => {
    // bounds / range check
    const inBounds = b.x >= 0 && b.x <= canvasW && b.y >= 0 && b.y <= canvasH;
    const notExpired = b.traveled < b.maxDistance;
    if (!inBounds || !notExpired) return false;
    // obstacle hit?
    if (bulletHitsObstacle(b.x, b.y, cell_size)) {
      // optional: spawn effect here
      return false;
    }
    // target is opposite side
    const target = b.owner === "player" ? enemy : tank;
    const { px: tx, py: ty, tile } = cellCenter(ctx, target.c, target.r);
    const dx = b.x - tx;
    const dy = b.y - ty;
    const dist2 = dx * dx + dy * dy;
    const hitThreshold = Math.pow(tile * 0.45, 2); // threshold
    if (dist2 <= hitThreshold) {
      // Use bullet movement direction (b.dx, b.dy) to determine which WORLD side was hit.
      // Mapping (world sides): 0=UP,1=RIGHT,2=DOWN,3=LEFT
      // If bullet moves right (b.dx === 1), it came from left and hits target's LEFT (3).
      let impactWorldSide = null;
      if (b.dx === 1) impactWorldSide = 3;      // bullet moving right -> hit left side
      else if (b.dx === -1) impactWorldSide = 1;// bullet moving left -> hit right side
      else if (b.dy === 1) impactWorldSide = 0; // bullet moving down -> hit top (UP)
      else if (b.dy === -1) impactWorldSide = 2;// bullet moving up -> hit bottom (DOWN)
      else {
        // fallback: use relative position (dominant axis) if dx/dy not set (shouldn't happen)
        if (Math.abs(dx) >= Math.abs(dy)) impactWorldSide = dx > 0 ? 1 : 3;
        else impactWorldSide = dy > 0 ? 2 : 0;
      }
      // Convert to relative side vs target orientation
      // relative = 0(front), 1(right side), 2(rear), 3(left side)
      const relative = (impactWorldSide - (target.dir % 4) + 4) % 4;
      // pick armor by relative side
      let armor = 0;
      if (relative === 0) armor = target.armorFront ?? 0;
      else if (relative === 2) armor = target.armorRear ?? 0;
      else armor = target.armorSide ?? 0; // left/right
      // compute actual damage (attack - armor)
      const raw = b.damage ?? 50;
      const actualDamage = Math.max(0, raw - armor);
      // apply damage
      target.hp = Math.max(0, (target.hp ?? 0) - actualDamage);
      // console.log(`Hit ${target === enemy ? "enemy" : "player"} on ${["front","right","rear","left"][relative]} raw=${raw} armor=${armor} dmg=${actualDamage}`);
      // death check
      if (target.hp <= 0) {
        target.isDestroyed = true;
        target.explosionStartedAt = performance.now(); 
        gameOver = true;
        winner = b.owner === "player" ? "player" : "enemy";
        stopEngine(); // freeze frame
      }
      // bullet consumed
      return false;
    }
    // keep bullet if no collision
    return true;
  });
  // if all bullets gone and nobody is locked, unlock actors
  if (bullets.length === 0) {
    tank.locked = false;
    enemy.locked = false;
  }
}


/* ---------- actions ---------- */
function move(actor, step) {
  if (gameOver) return false;
  const vec = DIR_VECTORS[actor.dir];
  const nc = actor.c + vec.x * step;
  const nr = actor.r + vec.y * step;
  if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return false;
  if (isBlocked(nc, nr)) return false; // blocked by obstacle
  actor.c = nc;
  actor.r = nr;
  return true;
}

function rotate(actor, delta) {
  if (gameOver) return false;
  actor.dir = (actor.dir + delta + 4) % 4;
  return true;
}

function shoot(actor) {
  if (gameOver) return false;
  if (actor.locked) return false;
  actor.locked = true;
  bullets.push(createBulletFromActor(actor));
  return true;
}

/* ---------- performAction ---------- */
export function performAction(actor, action) {
  if (!actor || gameOver) return false;
  switch (action) {
    case "moveF":
      return move(actor, 1);
    case "moveB":
      return move(actor, -1);
    case "rotateL":
      return rotate(actor, -1);
    case "rotateR":
      return rotate(actor, 1);
    case "shoot":
      return shoot(actor);
    default:
      return false;
  }
}

/* ---------- malfunction-aware wrapper ---------- */
function tryPerformAction(actor, action) {
  if (!actor || gameOver) return false;
  const prob = actor.malfunctionProb ?? 0;
  if (Math.random() < prob) {
    malfunctionMessage = (actor === tank ? "味方" : "敵") + "戦車故障！";
    malfunctionTimer = 90; // frames
    // If the actor is player, consume player's action count here
    if (actor === tank) {
      playerActionsLeft--;
      if (playerActionsLeft <= 0) {
        playerActionsLeft = tank.actionsPerTurn ?? DEFAULT_ACTIONS_PER_TURN;
        // start enemy turn asynchronously
        beginEnemyTurn();
      }
    }
    // for enemy, the caller (runEnemyTurn) will count this as one action attempt
    return false;
  }
  return performAction(actor, action);
}

/* ---------- input ---------- */
export function handleInput(key) {
  if (!ctx || gameOver) return;
  if (currentTurn !== "player") return;
  if (tank.locked) return;

  const k = String(key);
  let acted = false;

  if (k === "w" || k === "W" || k === "ArrowUp") acted = tryPerformAction(tank, "moveF");
  else if (k === "s" || k === "S" || k === "ArrowDown") acted = tryPerformAction(tank, "moveB");
  else if (k === "a" || k === "A" || k === "ArrowLeft") acted = tryPerformAction(tank, "rotateL");
  else if (k === "d" || k === "D" || k === "ArrowRight") acted = tryPerformAction(tank, "rotateR");
  else if (k === "Enter" || k === " ") acted = tryPerformAction(tank, "shoot");

  if (acted) {
    // successful action consumes player's AP
    playerActionsLeft--;
    if (playerActionsLeft <= 0) {
      playerActionsLeft = tank.actionsPerTurn ?? DEFAULT_ACTIONS_PER_TURN;
      // start enemy turn async
      beginEnemyTurn();
    }
  }
}

/* ---------- enemy turn orchestration ---------- */
async function beginEnemyTurn() {
  if (gameOver) return;
  currentTurn = "enemy";
  try {
    await runEnemyTurn(enemy, getState, tryPerformAction, {
      delay: 300,
      actionsCount: enemy.actionsPerTurn ?? DEFAULT_ACTIONS_PER_TURN,
      bulletRange: enemy.range ?? BULLET_RANGE_CELLS,
    });
  } catch (e) {
    console.error("enemy turn failed:", e);
  } finally {
    currentTurn = "player";
    // reset player's action points based on template
    playerActionsLeft = tank.actionsPerTurn ?? DEFAULT_ACTIONS_PER_TURN;
    // unlock if no bullets
    if (bullets.length === 0) {
      tank.locked = false;
      enemy.locked = false;
    }
  }
}

/* ---------- drawing ---------- */
function drawTankGeneric(actor) {
    // まず破壊済みなら爆発画像を描く（セル中央に小さめに描画）
  if (actor.isDestroyed) {
    // cellCenter を使ってタイル位置を取得（既存コードに合わせる）
    const { px, py, tile } = cellCenter(ctx, actor.c, actor.r);

    // explosion をセル内に少し小さく収めたいならサイズを調整
    const scale = 0.9; // 好きな倍率に変更可（0.0〜1.0）
    const size = tile * scale;
    const offsetX = px - tile / 2 + (tile - size) / 2;
    const offsetY = py - tile / 2 + (tile - size) / 2;

    if (explosionImg.complete && explosionImg.naturalWidth) {
      ctx.drawImage(explosionImg, offsetX, offsetY, size, size);
    } else {
      // 画像が無ければフォールバックで赤い円を描く（分かりやすい）
      ctx.fillStyle = "orange";
      ctx.beginPath();
      ctx.arc(px, py, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    return; // 以降の通常戦車描画は行わない
  }
  const { px, py, tile } = cellCenter(ctx, actor.c, actor.r);
  const size = tile * 0.6;
  // try sprite draw first
  const spriteId = actor.spriteId ?? null;
  const img = spriteId ? spriteCache[spriteId] : null;
    // 画像は「↑向き」前提。dir に合わせ回転して中央に描画。
    const drawW = tile * 1.5; // 画像表示サイズ（調整可）
    const drawH = drawW;      // 画像の縦横比を保つ
    // direction -> radians (0 = up)
    let ang = 0;
    if (actor.dir === 0) ang = 0;
    else if (actor.dir === 1) ang = Math.PI / 2;
    else if (actor.dir === 2) ang = Math.PI;
    else if (actor.dir === 3) ang = -Math.PI / 2;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ang);
    // draw centered
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  // HP bar (共通)
  const barW = tile * 0.8;
  const barH = Math.max(4, tile * 0.08);
  const hpRatio = Math.max(0, actor.hp) / 100;
  ctx.fillStyle = "#000000BB";
  ctx.fillRect(px - barW / 2, py - tile / 2 - barH - 4, barW, barH + 2);
  ctx.fillStyle = actor === tank ? "#2EA3F2" : "#E03A2D";
  ctx.fillRect(px - barW / 2 + 1, py - tile / 2 - barH - 3, (barW - 2) * hpRatio, barH);
}


/* ---------- main loop ---------- */
function loop() {
  if (!ctx) return;
  updateBullets();
  drawGrid(ctx);
  drawBullets();
  drawObstacles(ctx, cell_size);
  drawTankGeneric(tank, "#2EA3F2"); // player
  drawTankGeneric(enemy, "#E03A2D"); // enemy
  // malfunction message
  //故障時のメッセージ
  if (malfunctionTimer > 0 && malfunctionMessage) {
    ctx.save();
    ctx.font = "40px 'Press Start 2P', monospace";
    ctx.fillStyle = "rgba(255, 50, 50, 0.9)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(malfunctionMessage, ctx.canvas.width / 2, ctx.canvas.height / 2);
    ctx.restore();
    malfunctionTimer--;
  }
  if (!gameOver) rafId = requestAnimationFrame(loop);
}

/* ---------- engine controls ---------- */
export function initEngine(canvasContext) {
  if (!canvasContext || !canvasContext.canvas) throw new Error("Canvas 2D context required");
  ctx = canvasContext;
  loadBulletImage();
  // tank and enemy initial positions should be avoided when generating obstacles
  generateObstacles(20, COLS, ROWS, [tank, enemy]);
  if (!rafId) rafId = requestAnimationFrame(loop);
}

export function stopEngine() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

/* ---------- state accessor ---------- */
export function getState() {
  // produce a small map grid (1 = obstacle, 0 = free)
  const map = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push(isBlocked(c, r) ? 1 : 0);
    }
    map.push(row);
  }

  return {
    currentTurn,
    playerActionsLeft,
    tank: { ...tank },
    enemy: { ...enemy },
    bullets: bullets.map((b) => ({ x: b.x, y: b.y, traveled: b.traveled })),
    gameOver,
    winner,
    map,
  };
}




