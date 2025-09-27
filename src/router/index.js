// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import TankSelect from "../components/TankSelect.vue";
import GameCanvas from "../components/GameCanvas.vue";

const routes = [
  { path: "/", name: "TankSelect", component: TankSelect },
  { path: "/game", name: "GameCanvas", component: GameCanvas },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
