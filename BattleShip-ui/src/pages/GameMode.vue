<template>
  <div class="background game-mode-page">
    <div class="config-card">
      <header class="card-header">
        <div class="decoration-line"></div>
        <h1 class="title">PARAMÈTRES DE MISSION</h1>
      </header>

      <div class="card-body">
        <div class="form-group">
          <label>
            <span class="label-icon">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path
                  d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                />
              </svg>
            </span>
            LANGUE DE COMMUNICATION
          </label>
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
            <span class="lock-icon">
              <svg
                v-if="isPrivate"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <svg
                v-else
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            </span>
          </label>
        </div>

        <transition name="fade-slide" mode="out-in">
          <div v-if="!isPrivate" class="form-group" key="public">
            <label>
              <span class="label-icon">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
                  <path d="M13 19l6-6 2 2-6 6-2-2z" />
                  <path d="M2 21l3.5-3.5" />
                  <path d="M16 4l2-2 2 2-2 2-2-2z" />
                </svg>
              </span>
              MODE DE BATAILLE
            </label>
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
            <label>
              <span class="label-icon">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              EFFECTIF TOTAL (PAIR)
            </label>
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

const router = useRouter();

const language = ref("fr");
const mode = ref("1v1");
const isPrivate = ref(false);
const totalPlayers = ref(2);
const showLang = ref(false);
const showMode = ref(false);
const loading = ref(false);
const user = ref(null);

onMounted(() => {
  user.value = JSON.parse(localStorage.getItem("user"));
});

const canStart = computed(() => {
  if (mode.value === "battle-royale") return !!user.value;
  if (isPrivate.value)
    return !!user.value && totalPlayers.value >= 2 && totalPlayers.value % 2 === 0;
  return !!user.value;
});

const selectLang = (val) => {
  language.value = val;
  showLang.value = false;
};

const selectMode = (val) => {
  mode.value = val;
  showMode.value = false;
};

const formatMode = (m) => (m === "battle-royale" ? "BATTLE ROYALE" : m.replace("v", " VS "));

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
      //alert(data.message || "Erreur lors de la création de la partie.");
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
  } finally {
    loading.value = false;
  }
};

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
/*  1. IMPORT & CONFIGURATION GLOBALE  */
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap");

.background {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: radial-gradient(circle at center, #0a1921 0%, #030a10 100%);
  font-family: "Rajdhani", sans-serif;
  color: #dff2ee;
}

.label-icon {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  margin-right: 6px;
}

.lock-icon {
  display: flex;
  align-items: center;
  margin-left: auto;
}

/*  2. CARTE DE CONFIGURATION (CARD)  */
.config-card {
  width: 100%;
  max-width: 380px;
  padding: 2rem;
  background: rgba(6, 18, 26, 0.9);
  border: 1px solid rgba(29, 233, 192, 0.2);
  border-radius: 12px;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
}

.title {
  margin-bottom: 2rem;
  color: #1de9c0;
  font-size: 1.3rem;
  text-align: center;
  letter-spacing: 3px;
}

/*  3. FORMULAIRE & LABELS  */
.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 8px;
  color: rgba(29, 233, 192, 0.6);
  font-size: 0.75rem;
  letter-spacing: 1px;
}

/*  4. CUSTOM DROPDOWN  */
.custom-dropdown {
  position: relative;
  cursor: pointer;
}

.dropdown-selected {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(29, 233, 192, 0.2);
  border-radius: 6px;
  transition: all 0.3s;
}

.dropdown-selected.open,
.dropdown-selected:hover {
  background: rgba(29, 233, 192, 0.05);
  border-color: #1de9c0;
}

.arrow {
  width: 0;
  height: 0;
  border-right: 5px solid transparent;
  border-left: 5px solid transparent;
  border-top: 5px solid #1de9c0;
  transition: transform 0.3s;
}

.open .arrow {
  transform: rotate(180deg);
}

.dropdown-options {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  left: 0;
  z-index: 100;
  background: #0d1a21;
  border: 1px solid #1de9c0;
  border-radius: 6px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.option {
  padding: 12px 15px;
  transition: background 0.2s;
}

.option:hover {
  background: #1de9c0;
  color: #030a10;
}

/*  5. INPUTS (NOMBRE) & BADGES  */
.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

input[type="number"] {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(29, 233, 192, 0.2);
  border-radius: 6px;
  color: white;
  outline: none;
}

.input-badge {
  position: absolute;
  right: 10px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
}

.input-badge.success {
  background: rgba(29, 233, 192, 0.1);
  color: #1de9c0;
}

.input-badge.error {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
}

/*  6. CHECKBOX PERSONNALISÉE  */
.checkbox-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(29, 233, 192, 0.2);
  border-radius: 8px;
  cursor: pointer;
}

.checkbox-card.active {
  border-color: #1de9c0;
  border-style: solid;
}

.checkbox-card input {
  display: none;
}

.check-box {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 20px;
  height: 20px;
  background: transparent;
  border: 1px solid #1de9c0;
  border-radius: 4px;
  color: #030a10;
}

input:checked + .check-box {
  background: #1de9c0;
}

/*  7. BOUTONS  */
.btn-cyber {
  width: 100%;
  margin-top: 1rem;
  padding: 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s;
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
  margin-top: 10px;
  background: transparent;
  color: #2e6b62;
}

.btn-back:hover {
  color: #f87171;
}

/*  8. TRANSITIONS & ANIMATIONS  */
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
