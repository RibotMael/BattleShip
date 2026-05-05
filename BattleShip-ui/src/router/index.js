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

// ── Cache de validité du compte ───────────────────────────────────────────────
// On ne re-vérifie pas le compte si la dernière vérification date de moins de 30s.
// Cela évite un appel HTTP bloquant à chaque navigation.
let lastCheckTime = 0;
let lastCheckResult = true; // optimiste par défaut
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
    lastCheckResult = res.ok; // true si 200, false si 401/404
    return lastCheckResult;
  } catch {
    // Erreur réseau : on laisse passer (serveur temporairement indisponible)
    return true;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  // Nettoie les clés de récompenses
  Object.keys(localStorage)
    .filter((k) => k.startsWith('reward_claimed_'))
    .forEach((k) => localStorage.removeItem(k));
  // Réinitialise le cache
  lastCheckTime = 0;
  lastCheckResult = true;
}

// ── Routes ────────────────────────────────────────────────────────────────────
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

// ── Guard de navigation ───────────────────────────────────────────────────────
router.beforeEach(async (to, from, next) => {
  // Page d'accueil : toujours accessible
  if (to.path === '/') return next();

  // Route sans protection
  if (!to.meta.requiresAuth) return next();

  const session = getSession();

  // Pas connecté → redirige vers l'accueil
  if (!session) return next('/');

  const { user, token } = session;

  // Vérifie la validité du compte (avec cache 30s)
  const valid = await isAccountValid(user.id, token);
  if (!valid) {
    clearSession();
    return next('/');
  }

  next();
});

export default router;