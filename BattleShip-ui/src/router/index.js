//router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Home from '../pages/Home.vue';
import Rules from '../pages/Rules.vue';
import Profile from '../pages/Profile.vue';
import GameMode from '../pages/GameMode.vue';
import WaitingRoom from '../pages/WaitingRoom.vue';
import PlaceShips from '../pages/PlaceShips.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/rules', component: Rules },
  { path: '/profile', component: Profile },
  {
    path: '/gamemode',
    name: 'GameMode',
    component: GameMode
  },
  { path: '/waiting-room/:gameId', name: 'WaitingRoom', component: WaitingRoom, props: true },
  { path: '/join/:gameId', name: 'JoinRoom', component: WaitingRoom, props: true },
  {
    path: '/place-ships/:gameId',
    name: 'PlaceShips',
    component: PlaceShips,
    props: true
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;