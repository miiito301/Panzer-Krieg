<template>
  <div class="game-page pixel" style="height:100vh; display:flex; flex-direction:column;">
    <!-- 上部：味方 & 敵の情報カード（水平レイアウト、画像は中央寄り） -->
    <div class="top-info" style="padding:8px; display:flex; gap:3px;  justify-content:center;">
      <!-- プレイヤーカード（画像を内側＝右に寄せる） -->
      <div class="tank-card player-card" :class="{ selected: !!playerTank }">
        <div class="card-inner">
          <div class="info">
            <div class="tank-name">{{ playerTank?.name ?? "なし" }}</div>
            <div class="specs">
              <div class="spec"><div class="label">ATK</div><div class="val">{{ playerTank?.attack ?? "-" }}</div></div>
              <div class="spec"><div class="label">RNG</div><div class="val">{{ playerTank?.range ?? "-" }}</div></div>
              <div class="spec"><div class="label">HP</div><div class="val">{{ playerHP ?? "-" }}</div></div>
            </div>
            <div class="armor-row">
              <div class="armor">F: {{ playerTank?.armorFront ?? "-" }}</div>
              <div class="armor">S: {{ playerTank?.armorSide ?? "-" }}</div>
              <div class="armor">R: {{ playerTank?.armorRear ?? "-" }}</div>
            </div>
          </div>

          <div class="img-wrap retro">
            <img v-if="playerTank" :src="getFrontSpriteSrc(playerTank)" :alt="playerTank.name" />
            <div v-else class="img-fallback">NO IMG</div>
          </div>
        </div>
      </div>

      <!-- 中央のスペース（キャンバス中央に視線を向けるための余白） -->
      <div style="flex:1; display:flex; align-items:center; justify-content:center;">
        <div style="width:12px;"></div>
      </div>

      <!-- 敵カード（画像を内側＝左に寄せる） -->
      <div class="tank-card enemy-card" :class="{ 'enemy-selected': !!enemyTank }">
        <div class="card-inner">
          <div class="img-wrap retro">
            <img v-if="enemyTank" :src="getFrontSpriteSrc(enemyTank)" :alt="enemyTank.name" />
            <div v-else class="img-fallback">NO IMG</div>
          </div>

          <div class="info">
            <div class="tank-name enemy">{{ enemyTank?.name ?? "なし" }}</div>
            <div class="specs">
              <div class="spec"><div class="label">ATK</div><div class="val">{{ enemyTank?.attack ?? "-" }}</div></div>
              <div class="spec"><div class="label">RNG</div><div class="val">{{ enemyTank?.range ?? "-" }}</div></div>
              <div class="spec"><div class="label">HP</div><div class="val">{{ enemyHP ?? "-" }}</div></div>
            </div>
            <div class="armor-row">
              <div class="armor">F: {{ enemyTank?.armorFront ?? "-" }}</div>
              <div class="armor">S: {{ enemyTank?.armorSide ?? "-" }}</div>
              <div class="armor">R: {{ enemyTank?.armorRear ?? "-" }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ステージ（キャンバス） -->
    <div class="stage" style="flex:1; display:flex; align-items:center; justify-content:center; background:#0b100b; position:relative;;">
      <canvas ref="canvas" id="gameCanvas" :width="canvasW" :height="canvasH"
        class="game-canvas"></canvas>

      <div v-if="gameOver" class="overlay">
        Game Set — Winner: {{ winner }}
      </div>
    </div>

    <!-- HUD 下部 -->
    <div class="hud" style="padding:12px; background:transparent; display:flex; gap:12px; align-items:flex-start; justify-content:space-between;">
      <div class="hud-left">
        <div class="hud-panel">
          <div class="hud-row"><span class="label">Actions</span><span class="val">{{ actionsLeft }}</span></div>
          <div class="hud-row"><span class="label">Player HP</span><span class="val">{{ playerHP }}</span></div>
        </div>
      </div>

      <div class="hud-center" style="flex:1; display:flex; align-items:center; justify-content:center;">
        <div class="status-panel">ターン: <strong>{{ currentTurn }}</strong></div>
      </div>

      <div class="hud-right">
        <div class="hud-panel">
          <div class="hud-row"><span class="label">Enemy HP</span><span class="val">{{ enemyHP }}</span></div>
          <div class="hud-row"><span class="label">Winner</span><span class="val">{{ winner ?? "-" }}</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import { getSelection } from "../game/selectionStore.js";
import { setTankTemplates, initEngine, handleInput, stopEngine, initCanvas, getState } from "../game/engine.js";

const canvas = ref(null);
const actionsLeft = ref(0);
const playerHP = ref(100);
const enemyHP = ref(100);
const gameOver = ref(false);
const winner = ref(null);
const playerTank = ref(null);
const enemyTank = ref(null);
const currentTurn = ref(0);

let hudTimer = null;
let keyHandler = null;
let ctx = null;
const canvasW = 960; // 必要に応じて調整
const canvasH = 640;

/**
 * 戦車正面スプライトの取得
 * - t が null/undefined の場合は空文字を返す（v-ifで分岐済）
 * - t.imgUrl があればそれを優先
 * - bundler 対応で import.meta.url を使って絶対URLを作る（Vite等）
 */
function getFrontSpriteSrc(t) {
  if (!t) return "";
  if (t.imgUrl) return t.imgUrl;
  const id = t.id ?? t.name ?? "unknown";
  try {
    return new URL(`../assets/tank_front/${id}_front.png`, import.meta.url).href;
  } catch (e) {
    // フォールバック（静的 public 配置の場合）
    return `/assets/tank_front/${id}_front.png`;
  }
}

function refreshHUD() {
  const s = getState();
  actionsLeft.value = s.playerActionsLeft ?? actionsLeft.value;
  playerHP.value = s.tank?.hp ?? playerHP.value;
  enemyHP.value = s.enemy?.hp ?? enemyHP.value;
  gameOver.value = s.gameOver ?? gameOver.value;
  winner.value = s.winner ?? winner.value;
  currentTurn.value = s.currentTurn ?? currentTurn.value;
}

onMounted(() => {
  ctx = canvas.value.getContext("2d");
  initCanvas(canvas.value);

  const sel = getSelection();
  if (sel && sel.player && sel.enemy) {
    setTankTemplates(sel.player, sel.enemy);
    playerTank.value = sel.player;
    enemyTank.value = sel.enemy;
  }

  initEngine(ctx);

  refreshHUD();
  hudTimer = setInterval(refreshHUD, 100);

  keyHandler = (e) => handleInput(e.key);
  window.addEventListener("keydown", keyHandler);
});

onBeforeUnmount(() => {
  if (hudTimer) clearInterval(hudTimer);
  if (keyHandler) window.removeEventListener("keydown", keyHandler);
  stopEngine();
});
</script>

<style scoped>
.game-page.pixel {
  --c-bg-1: #0b100b;
  --c-bg-2: #0f1810;
  --c-panel: #101914;
  --c-border: #334433;
  --c-accent: #8bbf5a;
  --c-accent-2: #6e8b3d;
  --c-danger: #b84a3a;
  --c-text: #e8f0e3;
  --c-muted: #9fb49a;
  padding: 10px;
  background:
    repeating-linear-gradient(
      0deg,
      rgba(0,0,0,0.12) 0px,
      rgba(0,0,0,0.12) 2px,
      rgba(255,255,255,0.01) 2px,
      rgba(255,255,255,0.01) 4px
    ),
    linear-gradient(180deg, var(--c-bg-1), var(--c-bg-2));
  color: var(--c-text);
  font-family: "Press Start 2P", monospace;
  box-sizing: border-box;
}
/* Import pixel font */
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
/* tank card */
.tank-card {
  width: 360px;
  min-height: 140px;
  background: linear-gradient(180deg, var(--c-panel), #0c1410);
  border: 3px solid var(--c-border);
  border-radius: 6px;
  padding: 8px;
  box-sizing: border-box;
  transition: transform 140ms linear, border-color 140ms linear;
  display:flex;
  align-items:center;
  justify-content:center;
}
.tank-card.selected { transform: translateY(-6px); border-color: var(--c-accent); box-shadow: 0 8px 0 rgba(0,0,0,0.5); }
.enemy-card.enemy-selected { border-color: var(--c-danger) !important; box-shadow: 0 8px 0 rgba(0,0,0,0.5); }

/* inner: 横並びにする */
.card-inner {
  display:flex;
  flex-direction:row;
  align-items:center;
  gap:12px;
  width:100%;
  box-sizing:border-box;
}

/* info 列 */
.info { flex:1; display:flex; flex-direction:column; gap:6px; justify-content:center; }

/* image wrap: retro pixel frame */
.img-wrap.retro {
  width: 140px;
  height: 100px;
  display:flex;
  align-items:center;
  justify-content:center;
  margin:0 6px;
  background:
    repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0 1px, transparent 1px 6px),
    linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.02));
  padding:6px;
  box-sizing:border-box;
  border-radius:4px;
}
/* プレイヤーは画像を右寄せ（中央寄り）、敵は左寄せに見えるようオーダー調整 */
.player-card .img-wrap { order: 2; margin-left: 18px; }
.player-card .info { order: 1; text-align:left; }
.enemy-card .img-wrap { order: 1; margin-right: 18px; }
.enemy-card .info { order: 2; text-align:right; }

.img-wrap img {
  image-rendering: pixelated;
  width:150px;
  height:auto;
  border: 2px solid #08120f;
  background: #08110c;
  display:block;
}
.img-fallback {
  width:120px;
  height:76px;
  display:flex;
  align-items:center;
  justify-content:center;
  color:var(--c-muted);
  background:#08110c;
  border:2px solid #08120f;
}

/* name */
.tank-name {
  font-weight:900;
  font-size:20px;
  color: var(--c-accent);
  text-shadow: 0 1px 0 #000;
}

/* specs */
.specs {
  display:flex;
  gap:10px;
  justify-content:flex-start;
  width:100%;
}
.spec { text-align:left; }
.label { font-size:14px; color:var(--c-muted); display:block; }
.val { font-weight:900; color:var(--c-text); font-size:14px; }

/* armor row */
.armor-row {
  display:flex;
  margin-top:6px;
  font-size:14px;
  color:#dfeede;
}
.armor { font-weight:800; padding:4px 6px; background:rgba(0,0,0,0.06); border-radius:4px; }

/* stage / canvas */
.stage {
  border-radius:6px;
  box-sizing:border-box;
}
.game-canvas {
  border: 3px solid rgba(50,50,50,0.6);
  background: linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.05));
  max-width: 100%;
  height: auto;
  image-rendering: pixelated;
  box-shadow: 0 8px 0 rgba(0,0,0,0.6);
}

/* overlay */
.overlay {
  position:absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  color:#fff;
  font-size:40px;
  background:rgba(0,0,0,0.7);
  padding:12px 18px;
  border-radius:8px;
  border:2px solid rgba(255,255,255,0.02);
}

/* HUD */
.hud-panel {
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.03));
  border:2px solid rgba(255,255,255,0.02);
  padding:10px;
  border-radius:6px;
  min-width:140px;
}
.hud-row {
  display:flex;
  justify-content:space-between;
  gap:8px;
  font-size:20px;
}
.status-panel {
  padding:8px 12px;
  border-radius:6px;
  background:linear-gradient(180deg, rgba(0,0,0,0.06), rgba(255,255,255,0.01));
  border:2px solid rgba(255,255,255,0.02);
  color:var(--c-muted);
  font-size:20px;
}

/* small helpers */
button.primary {
  background: linear-gradient(180deg,var(--c-accent), #e8f7d9);
  color:#08120f;
  padding:8px 14px;
  font-weight:900;
  border-radius:2px;
  border: 2px solid var(--c-border);
  cursor:pointer;
  font-size:12px;
}

</style>






