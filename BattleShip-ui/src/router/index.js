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

const API_BASE_URL = import.meta.env.VITE_API_URL;

const routes = [
  { path: '/', component: Home },
  { path: '/rules', component: Rules },
  { path: '/profile', component: Profile },
  { path: '/settings', component: Settings },
  { path: '/gamemode', name: 'GameMode', component: GameMode },
  { path: '/waiting-room/:gameId', name: 'WaitingRoom', component: WaitingRoom, props: true },
  { path: '/join/:gameId', name: 'JoinRoom', component: WaitingRoom, props: true },
  { path: '/place-ships/:gameId', name: 'PlaceShips', component: PlaceShips, props: true },
  { path: '/game/:gameId', name: 'GameBoard', component: GameBoard, props: true },
  { path: '/join', name: 'JoinGame', component: () => import('../pages/JoinGame.vue') },
  { path: '/shop', name: 'Shop', component: () => import('../pages/Shopview.vue') },
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  // Pas de vérification sur la page d'accueil (formulaire de login)
  if (to.path === '/') return next();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id || user.ID_Users;

  // Pas connecté → laisse passer (Home gère l'affichage du formulaire)
  if (!userId) return next();

  try {
    const res = await fetch(`${API_BASE_URL}/api/check-user/${userId}`);
    if (res.status === 401 || res.status === 404) {
      // Compte supprimé → nettoie et redirige vers l'accueil
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      Object.keys(localStorage)
        .filter((k) => k.startsWith('reward_claimed_'))
        .forEach((k) => localStorage.removeItem(k));
      return next('/');
    }
  } catch (_) {
    // Erreur réseau temporaire : laisse passer
  }

  next();
});

export default router;