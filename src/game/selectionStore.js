// src/game/selectionStore.js
/*
セレクション情報を簡単に渡すためのモジュール（sessionStorage ベース）。Router を使わずに安全にページ間で共有できる。
*/
const KEY = "tank_selection_v1";

export function setSelection({ player, enemy }) {
  const v = { player, enemy };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(v));
  } catch (e) {
    console.warn("selectionStore set failed", e);
  }
}

export function getSelection() {
  try {
    const s = sessionStorage.getItem(KEY);
    if (!s) return null;
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

export function clearSelection() {
  try { sessionStorage.removeItem(KEY); } catch(e){}
}
