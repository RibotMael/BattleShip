//router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Home from '../pages/Home.vue';
import Rules from '../pages/Rules.vue';
import Profile from '../pages/Profile.vue';
import GameMode from '../pages/GameMode.vue';
import WaitingRoom from '../pages/WaitingRoom.vue';
import PlaceShips from '../pages/PlaceShips.vue';
import GameBoard from '../pages/GameBoard.vue';
import Settings from '../pages/Settings.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/rules', component: Rules },
  { path: '/profile', component: Profile },
  { path: '/settings', component: Settings },
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
  },
  {
    path: '/game/:gameId',
    name: 'GameBoard',
    component: GameBoard,
    props: true
  },
  {
    path: "/join",
    name: "JoinGame",
    component: () => import("../pages/JoinGame.vue")
  },
  { 
    path: '/shop', 
    name: "Shop",
    component: () => import('../pages/Shopview.vue') 
}

];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;