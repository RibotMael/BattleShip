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

let lastCheckTime = 0;
let lastCheckResult = true; 
const CHECK_CACHE_MS = 30_000;

async function isAccountValid(userId, token) {
  const now = Date.now();
  if (now - lastCheckTime < CHECK_CACHE_MS) {
    return lastCheckResult;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/check-user/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    lastCheckTime = Date.now();
    lastCheckResult = res.ok; 
    return lastCheckResult;
  } catch {
    // Erreur réseau 
    return true;
  }
}

function getSession() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'null' || raw === 'undefined') return null;
    const user = JSON.parse(raw);
    if (!user?.id) return null;
    const token = localStorage.getItem('token');
    return { user, token };
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  Object.keys(localStorage)
    .filter((k) => k.startsWith('reward_claimed_'))
    .forEach((k) => localStorage.removeItem(k));
  lastCheckTime = 0;
  lastCheckResult = true;
}

const routes = [
  { path: '/', component: Home },
  { path: '/rules', component: Rules },
  {
    path: '/profile',
    component: Profile,
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    component: Settings,
    meta: { requiresAuth: true },
  },
  {
    path: '/gamemode',
    name: 'GameMode',
    component: GameMode,
    meta: { requiresAuth: true },
  },
  {
    path: '/waiting-room/:gameId',
    name: 'WaitingRoom',
    component: WaitingRoom,
    props: true,
    meta: { requiresAuth: true },
  },
  {
    path: '/join/:gameId',
    name: 'JoinRoom',
    component: WaitingRoom,
    props: true,
    meta: { requiresAuth: true },
  },
  {
    path: '/place-ships/:gameId',
    name: 'PlaceShips',
    component: PlaceShips,
    props: true,
    meta: { requiresAuth: true },
  },
  {
    path: '/game/:gameId',
    name: 'GameBoard',
    component: GameBoard,
    props: true,
    meta: { requiresAuth: true },
  },
  {
    path: '/join',
    name: 'JoinGame',
    component: () => import('../pages/JoinGame.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/shop',
    name: 'Shop',
    component: () => import('../pages/Shopview.vue'),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  if (to.path === '/') return next();
  if (!to.meta.requiresAuth) return next();
  const session = getSession();
  if (!session) return next('/');
  const { user, token } = session;
  const valid = await isAccountValid(user.id, token);
  if (!valid) {
    clearSession();
    return next('/');
  }

  next();
});

export default router;