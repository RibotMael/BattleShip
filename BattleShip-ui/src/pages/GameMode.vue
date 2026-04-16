<template>
  <div class="background game-mode-page">
    <div class="config-card">
      <header class="card-header">
        <div class="decoration-line"></div>
        <h1 class="title">PARAMÈTRES DE MISSION</h1>
      </header>

      <div class="card-body">
        <div class="form-group">
          <label><span class="label-icon">🌍</span> LANGUE DE COMMUNICATION</label>
          <div class="custom-dropdown" v-click-outside="() => (showLang = false)">
            <div
              class="dropdown-selected"
              @click="showLang = !showLang"
              :class="{ open: showLang }"
            >
              {{ language === "fr" ? "FRANÇAIS" : "BELGE" }}
              <span class="arrow"></span>
            </div>
            <transition name="dropdown">
              <div v-if="showLang" class="dropdown-options">
                <div class="option" @click="selectLang('fr')">FRANÇAIS</div>
                <div class="option" @click="selectLang('be')">BELGE</div>
              </div>
            </transition>
          </div>
        </div>

        <div class="form-group">
          <label class="checkbox-card" :class="{ active: isPrivate }">
            <input type="checkbox" v-model="isPrivate" />
            <div class="check-box">
              <span v-if="isPrivate">✓</span>
            </div>
            <span class="label-text">PARTIE PRIVÉE</span>
            <span class="lock-icon">{{ isPrivate ? "🔒" : "🔓" }}</span>
          </label>
        </div>

        <transition name="fade-slide" mode="out-in">
          <div v-if="!isPrivate" class="form-group" key="public">
            <label><span class="label-icon">⚔️</span> MODE DE BATAILLE</label>
            <div class="custom-dropdown" v-click-outside="() => (showMode = false)">
              <div
                class="dropdown-selected"
                @click="showMode = !showMode"
                :class="{ open: showMode }"
              >
                {{ formatMode(mode) }}
                <span class="arrow"></span>
              </div>
              <transition name="dropdown">
                <div v-if="showMode" class="dropdown-options">
                  <div
                    v-for="m in ['1v1', '2v2', '3v3', '4v4', 'battle-royale']"
                    :key="m"
                    class="option"
                    @click="selectMode(m)"
                  >
                    {{ formatMode(m) }}
                  </div>
                </div>
              </transition>
            </div>
          </div>

          <div v-else class="form-group" key="private">
            <label><span class="label-icon">👥</span> EFFECTIF TOTAL (PAIR)</label>
            <div class="input-container">
              <input type="number" v-model.number="totalPlayers" min="2" max="20" step="2" />
              <div class="input-badge" :class="totalPlayers % 2 !== 0 ? 'error' : 'success'">
                {{
                  totalPlayers % 2 !== 0
                    ? "IMPÉRATIF"
                    : `${totalPlayers / 2} VS ${totalPlayers / 2}`
                }}
              </div>
            </div>
          </div>
        </transition>

        <footer class="actions">
          <button class="btn-cyber btn-primary" @click="startGame" :disabled="!canStart || loading">
            <span class="btn-text">{{ loading ? "INITIALISATION..." : "LANCER L'ASSAUT" }}</span>
          </button>
          <button class="btn-back" @click="$router.push('/')">ANNULER</button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import api from "@/api/api.js";

// --- INITIALISATION ---
const router = useRouter();

// --- ÉTAT DU COMPOSANT (Anciennement data) ---
const language = ref("fr");
const mode = ref("1v1");
const isPrivate = ref(false);
const totalPlayers = ref(2); // J'ai gardé le "2" de ton second script
const showLang = ref(false);
const showMode = ref(false);
const loading = ref(false);
const user = ref(null);

// --- CYCLE DE VIE (Anciennement mounted) ---
onMounted(() => {
  user.value = JSON.parse(localStorage.getItem("user"));
});

// --- VARIABLES CALCULÉES (Anciennement computed) ---
const canStart = computed(() => {
  if (mode.value === "battle-royale") return !!user.value;
  if (isPrivate.value)
    return !!user.value && totalPlayers.value >= 2 && totalPlayers.value % 2 === 0;
  return !!user.value;
});

// --- MÉTHODES D'INTERFACE ---
const selectLang = (val) => {
  language.value = val;
  showLang.value = false;
};

const selectMode = (val) => {
  mode.value = val;
  showMode.value = false;
};

const formatMode = (m) => (m === "battle-royale" ? "BATTLE ROYALE" : m.replace("v", " VS "));

// --- LOGIQUE API ET MÉTIER (Anciennement methods) ---
const getTeamModeFromSelection = (gameType) => {
  switch (gameType) {
    case "1v1":
      return 1;
    case "2v2":
      return 2;
    case "3v3":
      return 3;
    case "4v4":
      return 4;
    case "battle-royale":
      return null;
    default:
      throw new Error(`Mode inconnu : ${gameType}`);
  }
};

const startGame = async () => {
  if (!user.value?.id) {
    alert("⚠️ Utilisateur non connecté !");
    return;
  }

  loading.value = true;

  try {
    // Déterminer id_team_mode
    const teamModeId = isPrivate.value
      ? Math.floor(totalPlayers.value / 2)
      : getTeamModeFromSelection(mode.value);

    // Calcul du totalPlayers
    let calcTotalPlayers;
    if (mode.value === "battle-royale") {
      calcTotalPlayers = 2;
    } else if (isPrivate.value) {
      calcTotalPlayers = totalPlayers.value;
    } else {
      calcTotalPlayers = teamModeId * 2;
    }

    const payload = {
      hostId: Number(user.value.id),
      id_game_mode: isPrivate.value ? 2 : 1,
      id_game_type: mode.value === "battle-royale" ? 1 : 2,
      id_team_mode: teamModeId,
      id_version: language.value === "fr" ? 1 : 2,
      totalPlayers: calcTotalPlayers,
    };

    const response = await api.post("/games/create", payload);
    const data = response.data;

    if (!data.success) {
      alert(data.message || "Erreur lors de la création de la partie.");
      return;
    }

    const normalizedGame = {
      ID_Game: data.game.ID_Game || data.game.id_game || data.game.id,
      ID_Creator: data.game.ID_Creator || data.game.id_creator || data.game.creatorId,
      TotalPlayers: data.game.TotalPlayers || calcTotalPlayers,
      Status: data.game.Status || "preparation",
    };

    localStorage.setItem("currentGame", JSON.stringify(normalizedGame));
    localStorage.setItem("currentLanguage", language.value);

    router.push({
      name: "WaitingRoom",
      params: { gameId: normalizedGame.ID_Game },
    });
  } catch (err) {
    const errorMsg = err.response?.data?.message || "Impossible de contacter le serveur.";
    alert(errorMsg);
  } finally {
    loading.value = false;
  }
};

// --- DIRECTIVE PERSONNALISÉE ---
const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value();
      }
    };
    document.addEventListener("click", el.clickOutsideEvent);
  },
  unmounted(el) {
    document.removeEventListener("click", el.clickOutsideEvent);
  },
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap");

.background {
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at center, #0a1921 0%, #030a10 100%);
  font-family: "Rajdhani", sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #dff2ee;
}

.config-card {
  width: 100%;
  max-width: 380px;
  background: rgba(6, 18, 26, 0.9);
  border: 1px solid rgba(29, 233, 192, 0.2);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
}

.title {
  font-size: 1.3rem;
  text-align: center;
  color: #1de9c0;
  letter-spacing: 3px;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  font-size: 0.75rem;
  color: rgba(29, 233, 192, 0.6);
  margin-bottom: 8px;
  letter-spacing: 1px;
}

/* --- CUSTOM DROPDOWN --- */
.custom-dropdown {
  position: relative;
  cursor: pointer;
}

.dropdown-selected {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(29, 233, 192, 0.2);
  padding: 12px 15px;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s;
}

.dropdown-selected.open,
.dropdown-selected:hover {
  border-color: #1de9c0;
  background: rgba(29, 233, 192, 0.05);
}

.arrow {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #1de9c0;
  transition: transform 0.3s;
}
.open .arrow {
  transform: rotate(180deg);
}

.dropdown-options {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  right: 0;
  background: #0d1a21;
  border: 1px solid #1de9c0;
  border-radius: 6px;
  z-index: 100;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.option {
  padding: 12px 15px;
  transition: background 0.2s;
}
.option:hover {
  background: #1de9c0;
  color: #030a10;
}

/* --- INPUTS & CHECKBOX --- */
.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

input[type="number"] {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(29, 233, 192, 0.2);
  padding: 12px;
  border-radius: 6px;
  color: white;
  outline: none;
}

.input-badge {
  position: absolute;
  right: 10px;
  font-size: 0.7rem;
  padding: 4px 8px;
  border-radius: 4px;
}
.input-badge.success {
  background: rgba(29, 233, 192, 0.1);
  color: #1de9c0;
}
.input-badge.error {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
}

.checkbox-card {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(255, 255, 255, 0.02);
  padding: 15px;
  border-radius: 8px;
  border: 1px dashed rgba(29, 233, 192, 0.2);
  cursor: pointer;
}
.checkbox-card.active {
  border-style: solid;
  border-color: #1de9c0;
}
.checkbox-card input {
  display: none;
}

.check-box {
  width: 20px;
  height: 20px;
  border: 1px solid #1de9c0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #030a10;
  background: transparent;
}
input:checked + .check-box {
  background: #1de9c0;
}

/* --- BUTTONS --- */
.btn-cyber {
  width: 100%;
  padding: 1rem;
  border-radius: 6px;
  border: none;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 1rem;
}

.btn-primary {
  background: #1de9c0;
  color: #030a10;
}
.btn-primary:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(29, 233, 192, 0.4);
  transform: translateY(-2px);
}

.btn-back {
  background: transparent;
  color: #2e6b62;
  margin-top: 10px;
}
.btn-back:hover {
  color: #f87171;
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
