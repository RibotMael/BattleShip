<!-- App.vue -->
<template>
  <div id="app">
    <router-view />
  </div>

  <audio id="background-music" autoplay loop>
    <source src="@/assets/audio/SongBattleShip.mp3" type="audio/mp3" />
  </audio>

  <!-- ── POPUP COMPTE SUPPRIMÉ ── -->
  <transition name="fade-overlay">
    <div v-if="accountDeleted" class="deleted-overlay">
      <div class="deleted-popup">
        <div class="deleted-glow-line"></div>
        <span class="deleted-icon">
          <svg
            width="52"
            height="52"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" stroke-width="3" />
          </svg>
        </span>
        <h2 class="deleted-title">COMPTE SUPPRIMÉ</h2>
        <p class="deleted-msg">Votre compte a été supprimé. Vous allez être déconnecté.</p>
        <button class="deleted-btn" @click="handleAccountDeleted">RETOUR À L'ACCUEIL</button>
      </div>
    </div>
  </transition>
</template>

<script>
import { settingsStore } from "@/stores/settings";
import socket, { registerOnline } from "@/services/socket";
import { useShopStore } from "@/stores/shopStore";
import { userBus } from "@/eventBus.js";

const API_BASE_URL = import.meta.env.VITE_API_URL;

// ── Constantes ─────────────────────────────────────────────────────────────────
// Le polling HTTP est un dernier recours si le socket est déconnecté.
// On le laisse à 60s pour ne pas surcharger le serveur.
const FALLBACK_POLL_INTERVAL_MS = 60_000;

export default {
  setup() {
    const shopStore = useShopStore();
    return { settingsStore, shopStore };
  },

  data() {
    return {
      accountDeleted: false,
      fallbackInterval: null, // polling uniquement si socket déconnecté
    };
  },

  async created() {
    const user = this.getUser();
    if (user?.id) {
      await this.shopStore.fetchShop(user.id);
    } else {
      this.shopStore.applyThemeToDOM();
    }
  },

  mounted() {
    // ── Socket ──────────────────────────────────────────────────────────────
    socket.on("connect", () => {
      const user = this.getUser();
      if (user?.id) {
        registerOnline(user.id);
        socket.emit("join-user-room", { userId: user.id });
      }
      // Socket connecté → on stoppe le fallback polling
      this.stopFallbackPoll();
    });

    socket.on("disconnect", () => {
      // Socket perdu → on démarre le polling de secours
      this.startFallbackPoll();
    });

    if (socket.connected) {
      const user = this.getUser();
      if (user?.id) {
        registerOnline(user.id);
        socket.emit("join-user-room", { userId: user.id });
      }
    } else {
      // Pas encore connecté au démarrage → fallback actif jusqu'à connexion socket
      this.startFallbackPoll();
    }

    // Notification compte supprimé via socket (chemin principal)
    socket.on("account-deleted", () => {
      if (!this.accountDeleted) {
        this.accountDeleted = true;
        this.stopFallbackPoll();
      }
    });

    // ── Audio ───────────────────────────────────────────────────────────────
    const audio = document.getElementById("background-music");
    audio.volume = settingsStore.musicVolume / 100;

    this.$watch(
      () => settingsStore.musicVolume,
      (newVal) => {
        audio.volume = newVal / 100;
      },
    );

    const playMusic = () => {
      audio.play().catch((err) => console.warn("Autoplay bloqué :", err));
      document.removeEventListener("click", playMusic);
    };
    document.addEventListener("click", playMusic);
  },

  beforeUnmount() {
    socket.off("connect");
    socket.off("disconnect");
    socket.off("account-deleted");
    this.stopFallbackPoll();
  },

  methods: {
    getUser() {
      try {
        const raw = localStorage.getItem("user");
        if (!raw || raw === "null" || raw === "undefined") return null;
        const user = JSON.parse(raw);
        return user?.id ? user : null;
      } catch {
        return null;
      }
    },

    getToken() {
      return localStorage.getItem("token") || null;
    },

    // ── Fallback polling (uniquement si socket hors ligne) ──────────────────
    startFallbackPoll() {
      this.stopFallbackPoll();
      const user = this.getUser();
      if (!user || this.accountDeleted) return;

      this.fallbackInterval = setInterval(() => this.checkAccount(), FALLBACK_POLL_INTERVAL_MS);
    },

    stopFallbackPoll() {
      if (this.fallbackInterval) {
        clearInterval(this.fallbackInterval);
        this.fallbackInterval = null;
      }
    },

    async checkAccount() {
      const user = this.getUser();
      const token = this.getToken();
      if (!user || this.accountDeleted) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/check-user/${user.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.status === 401 || res.status === 404) {
          this.accountDeleted = true;
          this.stopFallbackPoll();
        }
      } catch {
        // Erreur réseau temporaire : on ne déconnecte pas
      }
    },

    handleAccountDeleted() {
      this.accountDeleted = false;
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      Object.keys(localStorage)
        .filter((k) => k.startsWith("reward_claimed_"))
        .forEach((k) => localStorage.removeItem(k));
      userBus.userUpdated = !userBus.userUpdated;
      this.$router.replace("/");
    },
  },
};
</script>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
}

.background {
  background-image: url("@/assets/Bataille_Navale_Assets-main/Background/Accueil.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.game-menu {
  width: 100%;
  height: 100%;
  color: white;
  padding: 1rem;
  box-sizing: border-box;
}

.top-bar {
  top: 0;
  padding: 1rem;
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.avatar {
  width: 75px;
  height: 75px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
}

.pseudo {
  font-weight: bold;
  font-size: 2rem;
  color: black;
}

.logout {
  margin-left: 1rem;
  background: #002f4b;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
}

.logout:hover {
  background: #07486e;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.menu-logo {
  width: 200%;
  max-width: 90vw;
  margin-bottom: 2rem;
}

.play-button,
.rules-button {
  padding: 1rem 2rem;
  font-size: 1.2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  width: 200px;
  transition: background 0.3s;
}

.play-button {
  background-color: #002f4b;
  color: white;
}

.play-button:hover {
  background-color: #07486e;
}

.rules-button {
  background-color: #2980b9;
  color: white;
}

.rules-button:hover {
  background-color: #216f9d;
}

/* ── POPUP COMPTE SUPPRIMÉ ── */
.deleted-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 8, 13, 0.92);
  backdrop-filter: blur(10px);
}

.deleted-popup {
  position: relative;
  width: 90%;
  max-width: 420px;
  padding: 40px 30px;
  background: linear-gradient(160deg, rgba(13, 33, 55, 0.98), rgba(6, 22, 33, 0.99));
  border: 1px solid rgba(248, 113, 113, 0.4);
  border-radius: 4px;
  text-align: center;
  box-shadow:
    0 0 60px rgba(248, 113, 113, 0.15),
    0 0 100px rgba(0, 0, 0, 0.8);
  font-family: "Rajdhani", sans-serif;
  color: #dff2ee;
}

.deleted-glow-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: #f87171;
  box-shadow: 0 0 15px #f87171;
}

.deleted-icon {
  display: block;
  margin-bottom: 16px;
  color: #f87171;
}

.deleted-title {
  margin: 0 0 12px;
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: 4px;
  color: #f87171;
  text-shadow: 0 0 15px rgba(248, 113, 113, 0.4);
}

.deleted-msg {
  margin: 0 0 28px;
  color: rgba(223, 242, 238, 0.7);
  font-size: 1rem;
  line-height: 1.6;
  letter-spacing: 1px;
}

.deleted-btn {
  width: 100%;
  padding: 14px;
  background: rgba(248, 113, 113, 0.15);
  border: 1px solid #f87171;
  border-radius: 2px;
  color: #f87171;
  font-family: "Rajdhani", sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 3px;
  cursor: pointer;
  transition: all 0.3s;
}

.deleted-btn:hover {
  background: #f87171;
  color: #02080d;
  box-shadow: 0 0 20px rgba(248, 113, 113, 0.4);
}

.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.3s ease;
}
.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
}
</style>
