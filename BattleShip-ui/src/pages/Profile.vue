<template>
  <div class="background profile-page">
    <div class="profile-card">
      <header class="profile-header">
        <button @click="$router.push('/')" class="btn-icon-back" title="Retour au menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <h1 class="profile-title">MON PROFIL</h1>
        <div class="spacer"></div>
      </header>

      <div class="profile-content">
        <div class="avatar-section">
          <div class="avatar-main-wrap">
            <img :src="avatarPreviewUrl" alt="Aperçu" class="main-img" />
          </div>
          <p class="section-label">
            <span class="label-dot dot-teal"></span>
            Choisir un avatar
          </p>
          <div class="avatar-grid-container">
            <div class="avatar-grid">
              <div
                v-for="av in avatars"
                :key="av.ID_Avatar"
                class="avatar-option"
                :class="{ selected: avatar === av.ID_Avatar }"
                @click="selectAvatar(av.ID_Avatar)"
              >
                <img :src="avatarThumbSrc(av)" />
              </div>
            </div>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-pill gold-pill">
            <span class="stat-pill-icon">🪙</span>
            <div class="stat-info">
              <span class="stat-pill-label">Or accumulé</span>
              <span class="stat-pill-value">{{ currentGold }}</span>
            </div>
          </div>
          <div class="stat-pill level-pill">
            <span class="stat-pill-icon">⚓</span>
            <div class="stat-info">
              <span class="stat-pill-label">Niveau actuel</span>
              <span class="stat-pill-value">{{ levelInfo.level }}</span>
            </div>
          </div>
        </div>

        <div class="xp-block">
          <div class="xp-block-header">
            <span class="xp-label">
              <span class="label-dot dot-purple"></span>
              Statistiques de Match
            </span>
            <span class="xp-numbers winrate-text">{{ winPercentage }}% de Victoire</span>
          </div>
          <div class="stats-row" style="margin-top: 0.5rem">
            <div class="stat-pill game-pill">
              <span class="stat-pill-icon">🎮</span>
              <div class="stat-info">
                <span class="stat-pill-label">Jouées</span>
                <span class="stat-pill-value">{{ gamesPlayed }}</span>
              </div>
            </div>
            <div class="stat-pill win-pill">
              <span class="stat-pill-icon">🏆</span>
              <div class="stat-info">
                <span class="stat-pill-label">Victoires</span>
                <span class="stat-pill-value">{{ wins }}</span>
              </div>
            </div>
            <div class="stat-pill defeat-pill">
              <span class="stat-pill-icon">💀</span>
              <div class="stat-info">
                <span class="stat-pill-label">Défaites</span>
                <span class="stat-pill-value">{{ defeats }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="xp-block">
          <div class="xp-block-header">
            <span class="xp-label">
              <span class="label-dot dot-blue"></span>
              Expérience
            </span>
            <span class="xp-numbers">{{ levelInfo.xpInto }} / {{ levelInfo.needed }} XP</span>
          </div>
          <div class="xp-track">
            <div class="xp-fill" :style="{ width: xpPercent + '%' }"></div>
          </div>
          <div class="xp-next-level">
            <span>Niv. {{ levelInfo.level }}</span>
            <span class="xp-remaining">
              {{ levelInfo.needed - levelInfo.xpInto }} XP restants
            </span>
            <span>Niv. {{ levelInfo.level + 1 }}</span>
          </div>
        </div>

        <div class="info-section">
          <div class="input-group">
            <label>NOM DE CODE (PSEUDO)</label>
            <div class="input-wrapper">
              <input
                v-model="pseudo"
                type="text"
                placeholder="Entrez votre pseudo..."
                maxlength="15"
              />
            </div>
          </div>

          <div class="action-buttons">
            <button @click="saveProfile" class="btn btn-save">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-right: 8px">
                <path
                  d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M17 21V13H7V21M7 3V8H15"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              ENREGISTRER
            </button>
            <div class="danger-zone">
              <button @click="deleteAccount" class="btn-delete">
                Supprimer mon compte définitivement
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { userBus } from "@/eventBus.js";
import api from "@/api/api.js";

const defaultAvatar =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAAHklEQVR42u3PAQ0AAAwCoNm/9HI4gAAAAAAAAAAAOBwG4cAAfNmS7sAAAAASUVORK5CYII=";

const avatarImgs = Object.fromEntries(
  Object.entries(
    import.meta.glob("../assets/Bataille_Navale_Assets-main/Avatar/*.png", { eager: true }),
  ).map(([path, mod]) => [path.split("/").pop(), mod.default]),
);

export default {
  data() {
    return {
      pseudo: "",
      userId: null,
      avatars: [],
      avatar: null,
      avatarPreviewUrl: defaultAvatar,
      activePrefix: "",
      currentGold: 0,
      currentXp: 0,
      currentLevel: 0,
      wins: 0,
      defeats: 0,
      gamesPlayed: 0,
    };
  },
  computed: {
    levelInfo() {
      let xp = this.currentXp;
      let level = 0;
      let used = 0;
      while (true) {
        const needed = Math.floor(100 * Math.pow(1.02, level));
        if (used + needed > xp) {
          return { level, xpInto: xp - used, needed };
        }
        used += needed;
        level++;
      }
    },
    xpPercent() {
      const { xpInto, needed } = this.levelInfo;
      if (!needed) return 0;
      return Math.min(100, Math.floor((xpInto / needed) * 100));
    },
    // Calcul du pourcentage de victoire
    winPercentage() {
      if (this.gamesPlayed === 0) return 0;
      return Math.round((this.wins / this.gamesPlayed) * 100);
    },
  },
  mounted() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      this.userId = user.id;
      this.pseudo = user.pseudo;
      this.avatar = user.avatarId || null;
      this.avatarPreviewUrl = user.avatar || defaultAvatar;
      this.currentGold = user.gold ?? 0;
      this.currentXp = user.xp ?? 0;
      this.currentLevel = user.level ?? 0;
      this.wins = user.wins ?? 0;
      this.defeats = user.defeats ?? 0;
      this.gamesPlayed = user.gamesPlayed ?? 0;
      const prefix = user.activeAvatarPrefix || "";
      const avatarId = user.avatarId || 1;
      this.activePrefix = prefix;
      if (prefix) {
        this.avatarPreviewUrl =
          avatarImgs[`${avatarId}${prefix}.png`] || user.avatar || defaultAvatar;
      } else {
        this.avatarPreviewUrl = user.avatar || defaultAvatar;
      }
    }
    this.fetchAvatars();
    if (this.userId) this.fetchUserStats();
  },
  methods: {
    async fetchAvatars() {
      try {
        const res = await api.get("/avatars");
        this.avatars = res.data.avatars;
        // N'écraser l'aperçu QUE si aucun skin de shop n'est actif
        const prefix = (JSON.parse(localStorage.getItem("user")) || {}).activeAvatarPrefix ?? "";
        if (!prefix && this.avatar) {
          this.updatePreview(this.avatar);
        }
      } catch (e) {
        // silencieux
      }
    },

    async fetchUserStats() {
      try {
        const res = await api.get(`/users/${this.userId}/stats`);
        if (res.data?.success) {
          this.currentGold = res.data.gold ?? this.currentGold;
          this.currentXp = res.data.xp ?? this.currentXp;
          this.currentLevel = res.data.level ?? this.currentLevel;

          // Récupération des stats du ratio depuis l'API (à adapter selon les noms de clés de ton backend)
          this.wins = res.data.win ?? this.wins;
          this.defeats = res.data.defeat ?? this.defeats;
          this.gamesPlayed = res.data.game_played ?? this.gamesPlayed;

          const stored = JSON.parse(localStorage.getItem("user")) || {};
          stored.gold = this.currentGold;
          stored.xp = this.currentXp;
          stored.level = this.currentLevel;
          stored.wins = this.wins;
          stored.defeats = this.defeats;
          stored.gamesPlayed = this.gamesPlayed;
          localStorage.setItem("user", JSON.stringify(stored));
        }
      } catch (e) {
        // Silencieux
      }
    },

    avatarThumbSrc(av) {
      if (this.activePrefix) {
        return (
          avatarImgs[`${av.ID_Avatar}${this.activePrefix}.png`] ||
          `data:${av.mime_type};base64,${av.Avatar}`
        );
      }
      return `data:${av.mime_type};base64,${av.Avatar}`;
    },

    selectAvatar(id) {
      this.avatar = id;
      // On garde le prefix actif, on ne le réinitialise plus
      const stored = JSON.parse(localStorage.getItem("user")) || {};
      stored.avatarId = id;
      localStorage.setItem("user", JSON.stringify(stored));

      if (this.activePrefix) {
        this.avatarPreviewUrl = avatarImgs[`${id}${this.activePrefix}.png`] || defaultAvatar;
      } else {
        this.updatePreview(id);
      }
    },

    updatePreview(id) {
      const sel = this.avatars.find((a) => a.ID_Avatar === id);
      if (sel) this.avatarPreviewUrl = `data:${sel.mime_type};base64,${sel.Avatar}`;
    },

    async saveProfile() {
      if (!this.userId) return;
      try {
        const res = await api.put(`/users/${this.userId}`, {
          pseudo: this.pseudo,
          avatar: this.avatar,
        });
        const updatedUser = res.data;

        this.pseudo = updatedUser.pseudo;
        this.currentGold = updatedUser.gold ?? this.currentGold;
        this.currentXp = updatedUser.xp ?? this.currentXp;
        this.currentLevel = updatedUser.level ?? this.currentLevel;

        const stored = JSON.parse(localStorage.getItem("user")) || {};
        const activePrefix = stored.activeAvatarPrefix ?? "";

        const newStored = {
          ...stored,
          id: updatedUser.id,
          pseudo: updatedUser.pseudo,
          avatarId: updatedUser.avatarId ?? this.avatar,
          avatar: updatedUser.avatar,
          gold: this.currentGold,
          xp: this.currentXp,
          level: this.currentLevel,
          activeAvatarPrefix: activePrefix,
        };
        localStorage.setItem("user", JSON.stringify(newStored));

        // Recalcule l'aperçu en tenant compte du skin actif
        const avatarId = updatedUser.avatarId ?? this.avatar ?? 1;
        if (activePrefix) {
          this.avatarPreviewUrl =
            avatarImgs[`${avatarId}${activePrefix}.png`] || updatedUser.avatar || defaultAvatar;
        } else {
          this.avatarPreviewUrl = updatedUser.avatar || defaultAvatar;
        }

        userBus.userUpdated = !userBus.userUpdated;
        //alert("Profil mis à jour !");
      } catch (err) {
        // Mode silencieux
      }
    },

    async deleteAccount() {
      if (!confirm("⚠️ Cette action est irréversible. Supprimer votre compte ?")) return;
      try {
        await api.delete(`/users/${this.userId}`);
        localStorage.removeItem("user");
        userBus.userUpdated = !userBus.userUpdated;
        //alert("Compte supprimé avec succès.");
        this.$router.push("/");
      } catch (err) {
        // Mode silencieux
      }
    },
  },
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&display=swap");

/* ── Overlay & Background ── */
.profile-page {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-image:
    linear-gradient(rgba(3, 10, 16, 0.78), rgba(3, 10, 16, 0.85)),
    url("@/assets/images/BackGroundAccueil.png");
  background-size: cover;
  background-position: center;
  z-index: 1000;
  padding: 1rem;
}

/* ── Panel Principal ── */
.profile-card {
  width: 100%;
  max-width: 440px;
  max-height: calc(100dvh - 2rem);
  display: flex;
  flex-direction: column;
  background: rgba(6, 18, 26, 0.94);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(29, 233, 192, 0.18);
  border-radius: 14px;
  box-shadow:
    0 0 0 1px rgba(29, 233, 192, 0.05),
    0 24px 60px rgba(0, 0, 0, 0.6);
  overflow-y: auto;
  color: #c0ddd8;
  font-family: "Inter", sans-serif;
  scrollbar-width: thin;
  scrollbar-color: rgba(29, 233, 192, 0.15) transparent;
}

.profile-card::-webkit-scrollbar {
  width: 3px;
}
.profile-card::-webkit-scrollbar-track {
  background: transparent;
}
.profile-card::-webkit-scrollbar-thumb {
  background: rgba(29, 233, 192, 0.15);
  border-radius: 2px;
}

/* ── Header ── */
.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.25rem 1rem;
  border-bottom: 1px solid rgba(29, 233, 192, 0.08);
  flex-shrink: 0;
}

.profile-title {
  font-family: "Rajdhani", sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: #dff2ee;
  margin: 0;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.btn-icon-back {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(29, 233, 192, 0.1);
  border-radius: 7px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #3d7a70;
  transition:
    color 0.15s,
    background 0.15s;
  padding: 0;
}

.btn-icon-back:hover {
  color: #1de9c0;
  background: rgba(29, 233, 192, 0.1);
}

.spacer {
  width: 32px;
}

/* ── Contenu ── */
.profile-content {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Labels & Dots ── */
.section-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #2e6b62;
  margin: 0;
}

.label-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-teal {
  background: #1de9c0;
  box-shadow: 0 0 6px rgba(29, 233, 192, 0.5);
}
.dot-blue {
  background: #60a5fa;
  box-shadow: 0 0 6px rgba(96, 165, 250, 0.5);
}
.dot-purple {
  background: #c084fc;
  box-shadow: 0 0 6px rgba(192, 132, 252, 0.5);
}

/* ── Avatar ── */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.avatar-main-wrap {
  position: relative;
  padding: 4px;
  background: rgba(29, 233, 192, 0.05);
  border: 1px solid rgba(29, 233, 192, 0.2);
  border-radius: 50%;
}

.main-img {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.avatar-grid-container {
  width: 100%;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(29, 233, 192, 0.07);
  padding: 10px;
  border-radius: 10px;
}

.avatar-grid {
  display: flex;
  overflow-x: auto;
  gap: 10px;
  padding-bottom: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(29, 233, 192, 0.15) transparent;
}

.avatar-grid::-webkit-scrollbar {
  height: 3px;
}
.avatar-grid::-webkit-scrollbar-track {
  background: transparent;
}
.avatar-grid::-webkit-scrollbar-thumb {
  background: rgba(29, 233, 192, 0.15);
  border-radius: 2px;
}

.avatar-option {
  flex: 0 0 44px;
  height: 44px;
  border-radius: 9px;
  cursor: pointer;
  overflow: hidden;
  border: 2px solid transparent;
  background: rgba(255, 255, 255, 0.04);
  transition:
    transform 0.18s,
    border-color 0.18s,
    box-shadow 0.18s;
}

.avatar-option.selected {
  border-color: #1de9c0;
  box-shadow: 0 0 12px rgba(29, 233, 192, 0.3);
  transform: translateY(-2px);
}

.avatar-option img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ── STATS PILLS ── */
.stats-row {
  display: flex;
  gap: 10px;
}

.stat-pill {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
}

/* Couleurs spécifiques aux Pills */
.gold-pill {
  border: 1px solid rgba(245, 158, 11, 0.2);
  background: rgba(245, 158, 11, 0.04);
}
.level-pill {
  border: 1px solid rgba(29, 233, 192, 0.2);
  background: rgba(29, 233, 192, 0.04);
}
.game-pill {
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(148, 163, 184, 0.04);
}
.win-pill {
  border: 1px solid rgba(74, 222, 128, 0.2);
  background: rgba(74, 222, 128, 0.04);
}
.defeat-pill {
  border: 1px solid rgba(248, 113, 113, 0.2);
  background: rgba(248, 113, 113, 0.04);
}

.stat-pill-icon {
  font-size: 1.4rem;
  line-height: 1;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-pill-label {
  font-family: "Rajdhani", sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #2e6b62;
}
.gold-pill .stat-pill-label {
  color: rgba(245, 158, 11, 0.7);
}
.game-pill .stat-pill-label {
  color: rgba(148, 163, 184, 0.7);
}
.win-pill .stat-pill-label {
  color: rgba(74, 222, 128, 0.7);
}
.defeat-pill .stat-pill-label {
  color: rgba(248, 113, 113, 0.7);
}

.stat-pill-value {
  font-family: "Inter", sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.1;
  color: #dff2ee;
}
.gold-pill .stat-pill-value {
  color: #f59e0b;
}
.level-pill .stat-pill-value {
  color: #1de9c0;
}
.win-pill .stat-pill-value {
  color: #4ade80;
}
.defeat-pill .stat-pill-value {
  color: #f87171;
}

/* ── BARRE XP / CONTAINERS BLOCKS ── */
.xp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(29, 233, 192, 0.07);
  border-radius: 10px;
}

.xp-block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.xp-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #2e6b62;
}

.xp-numbers {
  font-size: 0.75rem;
  font-weight: 500;
  color: #60a5fa;
}
.winrate-text {
  color: #c084fc;
}

.xp-track {
  width: 100%;
  height: 6px;
  background: rgba(96, 165, 250, 0.1);
  border-radius: 6px;
  overflow: hidden;
}

.xp-fill {
  height: 100%;
  background: #60a5fa;
  border-radius: 6px;
  box-shadow: 0 0 8px rgba(96, 165, 250, 0.5);
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.xp-next-level {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  color: #2e6b62;
  font-weight: 500;
}

.xp-remaining {
  color: #1e4e49;
}

/* ── INFO SECTION (Inputs & Boutons) ── */
.info-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.input-group label {
  display: block;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #2e6b62;
  margin-bottom: 6px;
}

.input-wrapper {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(29, 233, 192, 0.13);
  border-radius: 9px;
  padding: 0.65rem 0.85rem;
  transition:
    border-color 0.18s,
    background 0.18s;
}

.input-wrapper:focus-within {
  border-color: rgba(29, 233, 192, 0.38);
  background: rgba(29, 233, 192, 0.04);
}

input[type="text"] {
  width: 100%;
  background: none;
  border: none;
  outline: none;
  font-family: "Inter", sans-serif;
  font-size: 0.9rem;
  color: #dff2ee;
  text-align: center;
}

input[type="text"]::placeholder {
  color: #1e4e49;
}

/* Actions */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn {
  width: 100%;
  padding: 0.8rem;
  border-radius: 9px;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  transition:
    transform 0.15s,
    background 0.18s;
}

.btn-save {
  background: rgba(29, 233, 192, 0.15);
  color: #1de9c0;
  border: 1px solid rgba(29, 233, 192, 0.25);
}

.btn-save:hover {
  background: rgba(29, 233, 192, 0.25);
  transform: translateY(-2px);
}

.danger-zone {
  text-align: center;
}

.btn-delete {
  background: none;
  border: none;
  font-family: "Inter", sans-serif;
  font-size: 0.75rem;
  color: #f87171;
  opacity: 0.8;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition:
    background 0.15s,
    opacity 0.15s;
}

.btn-delete:hover {
  opacity: 1;
  background: rgba(239, 68, 68, 0.08);
}
</style>
