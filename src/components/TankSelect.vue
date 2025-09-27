<template>
  <div class="select-page pixel">
    <h1 class="page-title">PANZER KRIEG</h1>

    <!-- PLAYER -->
    <section class="selector-block">
      <div class="section-header">
        <h2>PLAYER</h2>
      </div>

      <div
        class="carousel auto"
        ref="playerScroll"
        @mouseenter="pauseAutoScroll('player')"
        @mouseleave="resumeAutoScroll('player')"
      >
        <div
          v-for="(t, idx) in tanks"
          :key="'p-'+t.id"
          :data-id="t.id"
          :class="['card', selectedPlayer && selectedPlayer.id === t.id ? 'selected' : '']"
          @click="selectPlayer(t)"
        >
          <div class="card-inner">
            <div class="tank-name">{{ t.name }}</div>
            <div class="img-wrap retro">
              <img :src="getFrontSpriteSrc(t)" :alt="t.name" />
            </div>
            <div class="specs">
              <div class="stat"><span class="label">ATK:</span><span class="val">{{ t.attack }}</span></div>
              <div class="stat"><span class="label">RNG:</span><span class="val">{{ t.range }}</span></div>
              <div class="stat"><span class="label">AP:</span><span class="val">{{ t.actionsPerTurn }}</span></div>
            </div>
            <div class="armor-row">
              <div class="armor">F:<strong>{{ t.armorFront }}</strong></div>
              <div class="armor">S:<strong>{{ t.armorSide }}</strong></div>
              <div class="armor">R:<strong>{{ t.armorRear }}</strong></div>
            </div>
            <div class="malf">Malfunction: <strong>{{ (t.malfunctionProb*100).toFixed(0) }}%</strong></div>
          </div>
        </div>
      </div>
    </section>

    <hr class="divider" />

    <!-- ENEMY -->
    <section class="selector-block">
      <div class="section-header">
        <h2>ENEMY (NPC)</h2>
      </div>

      <div
        class="carousel auto"
        ref="enemyScroll"
        @mouseenter="pauseAutoScroll('enemy')"
        @mouseleave="resumeAutoScroll('enemy')"
      >
        <div
          v-for="(t, idx) in tanks"
          :key="'e-'+t.id"
          :data-id="t.id"
          :class="['card', selectedEnemy && selectedEnemy.id === t.id ? 'selected enemy-selected' : '']"
          @click="selectEnemy(t)"
        >
          <div class="card-inner">
            <div class="tank-name">{{ t.name }}</div>
            <div class="img-wrap retro">
              <img :src="getFrontSpriteSrc(t)" :alt="t.name" />
            </div>
            <div class="specs">
              <div class="stat"><span class="label">ATK:</span><span class="val">{{ t.attack }}</span></div>
              <div class="stat"><span class="label">RNG:</span><span class="val">{{ t.range }}</span></div>
              <div class="stat"><span class="label">AP:</span><span class="val">{{ t.actionsPerTurn }}</span></div>
            </div>
            <div class="armor-row">
              <div class="armor">F:<strong>{{ t.armorFront }}</strong></div>
              <div class="armor">S:<strong>{{ t.armorSide }}</strong></div>
              <div class="armor">R:<strong>{{ t.armorRear }}</strong></div>
            </div>
            <div class="malf">Malfunction: <strong>{{ (t.malfunctionProb*100).toFixed(0) }}%</strong></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ACTIONS -->
    <div class="actions">
      <button class="muted" :disabled="!selectedPlayer" @click="randomizeEnemy">RANDOMIZE ENEMY</button>
      <button class="primary" :disabled="!selectedPlayer" @click="startGame">START BATTLE</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRouter } from "vue-router";
import { TANKS } from "../game/tankDefs.js";
import { setSelection } from "../game/selectionStore.js";

const router = useRouter();
const tanks = TANKS;

const selectedPlayer = ref(null);
const selectedEnemy = ref(null);

const playerScroll = ref(null);
const enemyScroll = ref(null);

// Auto-scroll state
let rafIdPlayer = null;
let rafIdEnemy = null;
const autoState = {
  player: { running: true, speed: 60 }, // px/sec (a bit faster for retro snappy feel)
  enemy: { running: true, speed: 40 }
};

function getFrontSpriteSrc(t) {
  try {
    return new URL(`../assets/tank_front/${t.id}_front.png`, import.meta.url).href;
  } catch (e) {
    return `/assets/tank_front/${t.id}_front.png`;
  }
}

function selectPlayer(t) {
  selectedPlayer.value = t;
  selectedEnemy.value = null;
  centerCard(playerScroll.value, t.id);
}

function selectEnemy(t) {
  selectedEnemy.value = t;
  centerCard(enemyScroll.value, t.id);
}

function randomizeEnemy() {
  const pool = tanks.filter(x => !selectedPlayer.value || x.id !== selectedPlayer.value.id);
  const pick = pool[Math.floor(Math.random()*pool.length)];
  selectedEnemy.value = pick;
  nextTick(() => centerCard(enemyScroll.value, pick.id));
}

function startGame() {
  if (!selectedPlayer.value) return;
  if (!selectedEnemy.value) randomizeEnemy();
  setSelection({ player: selectedPlayer.value, enemy: selectedEnemy.value });
  router.push({ path: "/game" });
}

/* ========== Auto scroll implementation ========== */
function stepAutoScroll(container, state, timestamp, lastTsRef) {
  if (!container) return;
  if (!state.running) {
    lastTsRef.value = timestamp;
    if (container === playerScroll.value) rafIdPlayer = requestAnimationFrame((t) => stepAutoScroll(container, state, t, lastTsRef));
    else rafIdEnemy = requestAnimationFrame((t) => stepAutoScroll(container, state, t, lastTsRef));
    return;
  }
  if (!lastTsRef.value) lastTsRef.value = timestamp;
  const dt = (timestamp - lastTsRef.value) / 1000;
  lastTsRef.value = timestamp;
  const delta = state.speed * dt;
  container.scrollLeft += delta;
  if (container.scrollLeft >= container.scrollWidth - container.clientWidth - 1) {
    container.scrollLeft = 0;
  }
  if (container === playerScroll.value) rafIdPlayer = requestAnimationFrame((t) => stepAutoScroll(container, state, t, lastTsRef));
  else rafIdEnemy = requestAnimationFrame((t) => stepAutoScroll(container, state, t, lastTsRef));
}

const lastTsPlayer = ref(null);
const lastTsEnemy = ref(null);

function startAuto() {
  if (playerScroll.value && !rafIdPlayer) rafIdPlayer = requestAnimationFrame((t) => stepAutoScroll(playerScroll.value, autoState.player, t, lastTsPlayer));
  if (enemyScroll.value && !rafIdEnemy) rafIdEnemy = requestAnimationFrame((t) => stepAutoScroll(enemyScroll.value, autoState.enemy, t, lastTsEnemy));
}
function stopAuto() {
  if (rafIdPlayer) cancelAnimationFrame(rafIdPlayer);
  if (rafIdEnemy) cancelAnimationFrame(rafIdEnemy);
  rafIdPlayer = rafIdEnemy = null;
  lastTsPlayer.value = null;
  lastTsEnemy.value = null;
}

function pauseAutoScroll(which) {
  autoState[which].running = false;
}
function resumeAutoScroll(which) {
  autoState[which].running = true;
}

/* center clicked card smoothly */
function centerCard(container, id) {
  if (!container) return;
  const node = container.querySelector(`[data-id="${id}"]`);
  if (!node) return;
  const rect = node.getBoundingClientRect();
  const parentRect = container.getBoundingClientRect();
  const offset = rect.left - parentRect.left - (parentRect.width / 2) + (rect.width / 2);
  container.scrollBy({ left: offset, behavior: "smooth" });
}

onMounted(() => {
  nextTick(() => startAuto());
});
onBeforeUnmount(() => {
  stopAuto();
});
</script>

<style scoped>
.select-page.pixel {
  --c-bg-1: #0b100b;    /* 背景ベース（濃い） */
  --c-bg-2: #0f1810;    /* 背景アクセント */
  --c-panel: #101914;   /* パネル色 */
  --c-border: #334433;  /* パネルボーダー（カモ） */
  --c-accent: #8bbf5a;  /* 明るいカモ／アクセント */
  --c-accent-2: #6e8b3d; /* 暗めのカモ */
  --c-danger: #b84a3a;  /* 敵アクセント */
  --c-text: #e8f0e3;    /* 文字 */
  --c-muted: #9fb49a;   /* 補助文字 */

  padding: 28px;
  background:
    repeating-linear-gradient(
      0deg,
      rgba(0,0,0,0.15) 0px,
      rgba(0,0,0,0.15) 2px,
      rgba(255,255,255,0.01) 2px,
      rgba(255,255,255,0.01) 4px
    ),
    linear-gradient(180deg, var(--c-bg-1), var(--c-bg-2));
  color: var(--c-text);
  min-height: 100vh;
  font-family: "Press Start 2P", monospace;
  letter-spacing: 1px;
  box-sizing: border-box;
}

/* Import pixel font */
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

/* titles */
.page-title {
  margin: 0 0 18px;
  font-size: 50px;
  color: var(--c-danger);
  text-shadow: 0 2px 0 #b20e0e;
  position: relative;
  z-index: 1;
}

/* selector */
.selector-block { margin-bottom: 18px; overflow: visible; }
.section-header { margin-bottom: 6px; }
.section-header h2 {
  margin: 0;
  color: var(--c-accent-2);
  font-size: 16px;
}

/* carousel: 上余白を確保してカード拡大で隠れないように */
.carousel {
  display:flex;
  gap:14px;
  overflow-x:auto;
  overflow-y: visible;
  padding:28px 8px 14px 8px;   /* 上に余裕を作る */
  scroll-snap-type: x mandatory;
  border: 4px solid var(--c-border);
  background: linear-gradient(90deg, rgba(0,0,0,0.12), rgba(10,10,10,0.06));
  box-shadow: 0 6px 0 rgba(0,0,0,0.6);
  border-radius: 2px;
}
.carousel::-webkit-scrollbar { height:0; width:0; }
.carousel { scrollbar-width: none; -ms-overflow-style: none; }

/* card 基本 */
.card {
  scroll-snap-align: center;
  flex: 0 0 340px;
  width:340px;
  height: 420px;
  background: linear-gradient(180deg, var(--c-panel), #0c1410);
  border: 3px solid var(--c-border);
  border-radius: 2px;
  cursor: pointer;
  transition: transform 140ms linear, border-color 140ms linear;
  position: relative;
  padding:12px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:flex-start;
  z-index: 1;
  transform-origin: center bottom; /* 下基準で拡大するので見切れにくい */
}

/* 選択時: 前面化 */
.card.selected {
  transform: translateY(-10px) scale(1.01);
  border-color: var(--c-accent);
  z-index: 200;
  box-shadow: 0 12px 0 rgba(0,0,0,0.6);
}
.enemy-selected {
  border-color: var(--c-danger) !important;
  z-index: 200;
}

/* inner */
.card-inner { width:100%; text-align:center; }

/* image: pixelated */
.img-wrap.retro {
  width:100%;
  height:200px;
  display:flex;
  align-items:center;
  justify-content:center;
  margin-bottom:12px;
  background:
    repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0 1px, transparent 1px 6px),
    linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.02));
  padding:8px;
  box-sizing:border-box;
}
.img-wrap img {
  image-rendering: pixelated;
  width:180px;
  height:auto;
  border: 2px solid #08120f;
  background: #08110c;
  display:block;
}

/* name */
.tank-name {
  font-weight:900;
  font-size:22px;
  margin-bottom:8px;
  color: var(--c-accent);
  text-shadow: 0 1px 0 #000;
}

/* specs */
.specs {
  display:flex;
  justify-content:space-around;
  gap:6px;
  margin-top:6px;
}
.label { font-size:13px; color:var(--c-muted); }
.val { font-weight:900; color:var(--c-text); font-size:20px; }

/* armor */
.armor-row {
  display:flex;
  justify-content:space-around;
  gap:6px;
  margin-top:12px;
  font-size:16px;
  color: #dfeede;
}
.armor { font-weight:800; }

/* malfunction */
.malf { margin-top:10px; font-size:14px; color:#ffd6d6; font-weight:800; }

/* divider */
.divider { margin:16px 0; border:0; height:2px; background:linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)); }

/* actions */
.actions { margin-top:18px; display:flex; justify-content:center; gap:18px; }
button.primary {
  background: linear-gradient(180deg,var(--c-accent), #e8f7d9);
  color:#08120f;
  padding:12px 26px;
  font-weight:900;
  border-radius:2px;
  border: 3px solid var(--c-border);
  cursor:pointer;
  box-shadow: 0 10px 0 rgba(0,0,0,0.6);
  font-size:15px;
}
button.muted {
  background:#0b1112;
  border: 3px solid var(--c-border);
  color:var(--c-muted);
  padding:10px 18px;
  font-size:14px;
}
button:disabled { opacity:0.45; cursor:default; }
</style>



