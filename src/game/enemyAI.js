// src/game/enemyAI.js
const ACTIONS = ["moveF", "moveB", "rotateL", "rotateR", "shoot"];

/**
 * runEnemyTurn(enemy, performAction, opts)
 * performAction(actor, action) がそのまま呼べる前提
 */

export async function runEnemyTurn(enemy, getState, performAction, opts = {}) {
  const delay = opts.delay ?? 500;
  const actionsCount = opts.actionsCount ?? 4;
  const bulletRange = opts.bulletRange ?? 5;

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // helper: check if player is directly in front (same row/col + correct facing)
  function isPlayerInFront(enemy, player) {
    const dx = player.c - enemy.c;
    const dy = player.r - enemy.r;
    if (enemy.dir === 0 && dx === 0 && dy < 0) return { inFront: true, dist: Math.abs(dy) };
    if (enemy.dir === 1 && dy === 0 && dx > 0) return { inFront: true, dist: Math.abs(dx) };
    if (enemy.dir === 2 && dx === 0 && dy > 0) return { inFront: true, dist: Math.abs(dy) };
    if (enemy.dir === 3 && dy === 0 && dx < 0) return { inFront: true, dist: Math.abs(dx) };
    return { inFront: false, dist: Infinity };
  }

  function sameRowOrCol(enemy, player) {
    return enemy.c === player.c || enemy.r === player.r;
  }

  // LoS: true if path is clear (no obstacle between a and b along straight line)
  function hasLineOfSight(map, a, b) {
    if (a.c === b.c) {
      const step = a.r < b.r ? 1 : -1;
      for (let r = a.r + step; r !== b.r; r += step) {
        if (map[r][a.c] === 1) return false; // 1 = obstacle
      }
      return true;
    } else if (a.r === b.r) {
      const step = a.c < b.c ? 1 : -1;
      for (let c = a.c + step; c !== b.c; c += step) {
        if (map[a.r][c] === 1) return false;
      }
      return true;
    }
    return false; // not aligned, no LoS
  }

  function desiredDirToFace(enemy, player) {
    const dx = player.c - enemy.c;
    const dy = player.r - enemy.r;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx > 0 ? 1 : 3;
    } else {
      return dy > 0 ? 2 : 0;
    }
  }

  function shortestRotationDir(cur, desired) {
    if (cur === desired) return 0;
    const diff = (desired - cur + 4) % 4;
    if (diff === 1) return 1;
    if (diff === 3) return -1;
    return Math.random() < 0.5 ? 1 : -1;
  }

  for (let i = 0; i < actionsCount; i++) {
    const st = getState();
    if (st.gameOver) break;
    const player = st.tank;
    const map = st.map; // 2D配列: 1=障害物, 0=通行可能

    const front = isPlayerInFront(enemy, player);

    // === 優先度1: プレイヤーが正面にいる ===
    if (front.inFront) {
      if (front.dist <= bulletRange && hasLineOfSight(map, enemy, player)) {
        await Promise.resolve(performAction(enemy, "shoot"));
        await sleep(delay);
        if (enemy.locked) break;
        continue;
      } else {
        // in front but out of range or blocked -> try to move closer
        const acted = await Promise.resolve(performAction(enemy, "moveF"));
        await sleep(delay);
        if (enemy.locked) break;
          if (!acted) {
            // moveF が障害物で失敗したとき
            if (Math.random() < 0.5) {
              // 50% → 後退 + ランダム旋回
              await Promise.resolve(performAction(enemy, "moveB"));
              await sleep(delay);
              const rot = Math.random() < 0.5 ? "rotateL" : "rotateR";
              await Promise.resolve(performAction(enemy, rot));
              await sleep(delay);
            } else {
              // 残り50% → ランダム旋回 + 前進
              const rot = Math.random() < 0.5 ? "rotateL" : "rotateR";
              await Promise.resolve(performAction(enemy, rot));
              await sleep(delay);
              await Promise.resolve(performAction(enemy, "moveF"));
              await sleep(delay);
            }
          }
        continue;
      }
    }

    // === 優先度2: 同じ列か行にいるとき ===
    if (sameRowOrCol(enemy, player) && hasLineOfSight(map, enemy, player)) {
      const desired = desiredDirToFace(enemy, player);
      const rotDir = shortestRotationDir(enemy.dir, desired);
      if (rotDir === -1) {
        await Promise.resolve(performAction(enemy, "rotateL"));
        await sleep(delay);
      } else if (rotDir === 1) {
        await Promise.resolve(performAction(enemy, "rotateR"));
        await sleep(delay);
      } else {
        await Promise.resolve(performAction(enemy, "moveF"));
        await sleep(delay);
      }
      continue;
    }

    // === 優先度3: その他のケース ===
    const desired = desiredDirToFace(enemy, player);
    const rotDir = shortestRotationDir(enemy.dir, desired);

    if (rotDir === -1) {
      await Promise.resolve(performAction(enemy, "rotateL"));
      await sleep(delay);
    } else if (rotDir === 1) {
      await Promise.resolve(performAction(enemy, "rotateR"));
      await sleep(delay);
    } else {
      const acted = await Promise.resolve(performAction(enemy, "moveF"));
      await sleep(delay);

      if (!acted) {
        // 共通の回避行動
        if (Math.random() < 0.5) {
          // 50%の確率で後退
          await Promise.resolve(performAction(enemy, "moveB"));
          await sleep(delay);
        }
        // ランダム旋回
        const rot = Math.random() < 0.5 ? "rotateL" : "rotateR";
        await Promise.resolve(performAction(enemy, rot));
        await sleep(delay);

        // 旋回後に前進を試みる
        await Promise.resolve(performAction(enemy, "moveF"));
        await sleep(delay);
      }
    }
  }
}

