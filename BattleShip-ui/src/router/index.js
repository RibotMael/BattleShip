import { createRouter, createWebHistory } from 'vue-router';
import Home from '../pages/Home.vue';
import Rules from '../pages/Rules.vue';
import Profile from '../pages/Profile.vue';
import GameMode from '../pages/GameMode.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/rules', component: Rules },
  { path: '/profile', component: Profile },
  {
    path: '/gamemode',
    name: 'GameMode',
    component: GameMode
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
