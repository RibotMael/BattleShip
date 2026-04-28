<!--AuthForm.vue-->

<template>
  <div class="auth-overlay">
    <div class="auth-card">
      <div class="auth-header">
        <div class="logo-icon">
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
            <path d="M4 20 L16 8 L28 20 L24 20 L24 26 L8 26 L8 20 Z" fill="#1DE9C0" opacity="0.9" />
            <rect x="12" y="20" width="8" height="6" fill="#0d8c70" />
            <circle cx="16" cy="13" r="2" fill="#0B2E3A" />
          </svg>
        </div>
        <div>
          <h1 class="auth-title">BattleShip Arena</h1>
          <p class="auth-subtitle">
            {{ isLogin ? "Connexion à votre compte" : "Créer un compte" }}
          </p>
        </div>
      </div>

      <div class="tab-row">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: isLogin }"
          @click="
            isLogin = true;
            errorMsg = '';
          "
        >
          {{ i18nStore.t("auth_login_tab") }}
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: !isLogin }"
          @click="
            isLogin = false;
            errorMsg = '';
          "
        >
          {{ i18nStore.t("auth_register_tab") }}
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form-body">
        <div class="field-group">
          <label class="field-label">{{ i18nStore.t("auth_email") }}</label>
          <div class="input-wrapper">
            <svg class="input-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect
                x="1"
                y="3"
                width="14"
                height="10"
                rx="2"
                stroke="currentColor"
                stroke-width="1.3"
              />
              <path d="M1 5 L8 9.5 L15 5" stroke="currentColor" stroke-width="1.3" />
            </svg>
            <input
              v-model="email"
              type="email"
              placeholder="votre@email.com"
              required
              class="field-input"
            />
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">{{ i18nStore.t("auth_password") }}</label>
          <div class="input-wrapper">
            <svg class="input-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect
                x="3"
                y="7"
                width="10"
                height="7"
                rx="1.5"
                stroke="currentColor"
                stroke-width="1.3"
              />
              <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.3" />
              <circle cx="8" cy="10.5" r="1" fill="currentColor" />
            </svg>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              required
              class="field-input"
            />
            <button type="button" class="toggle-vis" @click="showPassword = !showPassword">
              <svg v-if="!showPassword" width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z"
                  stroke="currentColor"
                  stroke-width="1.3"
                />
                <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3" />
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 2l12 12M4.2 4.3C2.8 5.3 1.7 6.8 1 8c1.3 2.6 4 5 7 5 1.2 0 2.4-.4 3.4-1M7 3.1c.3 0 .7-.1 1-.1 3 0 5.7 2.4 7 5-.5 1-1.2 2-2.1 2.8"
                  stroke="currentColor"
                  stroke-width="1.3"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <template v-if="!isLogin">
          <div class="field-group">
            <label class="field-label">{{ i18nStore.t("auth_confirm_password") }}</label>
            <div class="input-wrapper">
              <svg class="input-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect
                  x="3"
                  y="7"
                  width="10"
                  height="7"
                  rx="1.5"
                  stroke="currentColor"
                  stroke-width="1.3"
                />
                <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.3" />
                <circle cx="8" cy="10.5" r="1" fill="currentColor" />
              </svg>
              <input
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="••••••••"
                required
                class="field-input"
              />
              <button
                type="button"
                class="toggle-vis"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <svg
                  v-if="!showConfirmPassword"
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z"
                    stroke="currentColor"
                    stroke-width="1.3"
                  />
                  <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3" />
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 2l12 12M4.2 4.3C2.8 5.3 1.7 6.8 1 8c1.3 2.6 4 5 7 5 1.2 0 2.4-.4 3.4-1M7 3.1c.3 0 .7-.1 1-.1 3 0 5.7 2.4 7 5-.5 1-1.2 2-2.1 2.8"
                    stroke="currentColor"
                    stroke-width="1.3"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div class="field-row">
            <div class="field-group">
              <label class="field-label">{{ i18nStore.t("auth_pseudo") }}</label>
              <div class="input-wrapper">
                <svg class="input-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="5.5" r="3" stroke="currentColor" stroke-width="1.3" />
                  <path
                    d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"
                    stroke="currentColor"
                    stroke-width="1.3"
                    stroke-linecap="round"
                  />
                </svg>
                <input
                  v-model="pseudo"
                  type="text"
                  placeholder="Capitaine..."
                  required
                  class="field-input"
                  @blur="checkPseudo"
                />
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">{{ i18nStore.t("auth_birthday") }}</label>
              <div class="input-wrapper">
                <svg class="input-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="2"
                    y="3"
                    width="12"
                    height="11"
                    rx="1.5"
                    stroke="currentColor"
                    stroke-width="1.3"
                  />
                  <path
                    d="M2 7h12M5 1v4M11 1v4"
                    stroke="currentColor"
                    stroke-width="1.3"
                    stroke-linecap="round"
                  />
                </svg>
                <input
                  v-model="birthDay"
                  type="date"
                  required
                  class="field-input"
                  @blur="validateBirthDay"
                />
              </div>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">{{ i18nStore.t("auth_avatar") }}</label>
            <div class="avatar-row">
              <div class="avatar-grid">
                <div
                  v-for="av in avatars"
                  :key="av.ID_Avatar"
                  class="avatar-tile"
                  :class="{ selected: avatar === av.ID_Avatar }"
                  @click="selectAvatar(av.ID_Avatar)"
                >
                  <img
                    :src="'data:' + av.mime_type + ';base64,' + av.Avatar"
                    :alt="'Avatar ' + av.ID_Avatar"
                  />
                  <span v-if="avatar === av.ID_Avatar" class="avatar-check">✓</span>
                </div>
              </div>
              <img
                v-if="avatar"
                :src="'data:' + selectedMime + ';base64,' + selectedBase64"
                class="avatar-preview"
                alt="Aperçu"
              />
            </div>
          </div>

          <div class="legal-row">
            <input
              id="legal"
              type="checkbox"
              v-model="legalAccepted"
              required
              class="legal-checkbox"
            />
            <label for="legal" class="legal-label">
              {{ i18nStore.t("auth_terms") }}
              <a href="#" @click.prevent="showLegal" class="legal-link">CGU</a>
              {{ i18nStore.t("auth_terms_suffix") }}
            </label>
          </div>
        </template>

        <p v-if="errorMsg" class="error-msg">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style="flex-shrink: 0">
            <circle cx="7" cy="7" r="6" stroke="#f0837b" stroke-width="1.2" />
            <path d="M7 4v3M7 9.5v.5" stroke="#f0837b" stroke-width="1.3" stroke-linecap="round" />
          </svg>
          {{ errorMsg }}
        </p>

        <button type="submit" class="submit-btn">
          {{ isLogin ? i18nStore.t("auth_submit_login") : i18nStore.t("auth_submit_register") }}
        </button>

        <p class="toggle-link" @click="toggleForm">
          {{
            isLogin ? i18nStore.t("auth_toggle_to_register") : i18nStore.t("auth_toggle_to_login")
          }}
        </p>
      </form>
    </div>
  </div>
</template>

<script>
import api from "@/api/api.js";
import socket, { registerOnline } from "@/services/socket";
import { i18nStore } from "@/stores/i18n";

export default {
  data() {
    return {
      isLogin: true,
      email: "",
      password: "",
      confirmPassword: "",
      pseudo: "",
      birthDay: "",
      avatars: [],
      avatar: null,
      selectedBase64: "",
      selectedMime: "",
      errorMsg: "",
      legalAccepted: false,
      showPassword: false,
      showConfirmPassword: false,
      i18nStore,
    };
  },

  methods: {
    showLegal() {
      alert(
        `Conditions Générales d'Utilisation :\n\n- Aucun bot ni logiciel de triche n'est autorisé.\n- Le respect des autres joueurs est obligatoire.\n- Les comptes multiples sont interdits.\n- Vos statistiques (pseudo, victoires, avatar) sont publiques.`,
      );
    },

    toggleForm() {
      this.isLogin = !this.isLogin;
      this.errorMsg = "";
    },

    validateBirthDay() {
      const birth = new Date(this.birthDay);
      const today = new Date();
      if (isNaN(birth.getTime()) || birth > today) {
        this.errorMsg = "Date de naissance invalide.";
      } else {
        this.errorMsg = "";
      }
    },

    async fetchAvatars() {
      try {
        const res = await api.get("/avatars");
        this.avatars = res.data.avatars;
      } catch (e) {
        // Mode silencieux
      }
    },

    selectAvatar(id) {
      this.avatar = id;
      const sel = this.avatars.find((a) => a.ID_Avatar === id);
      if (sel) {
        this.selectedBase64 = sel.Avatar;
        this.selectedMime = sel.mime_type;
      }
    },

    async checkPseudo() {
      if (!this.pseudo.trim()) return;
      try {
        const res = await api.post("/check-pseudo", { pseudo: this.pseudo });
        if (!res.data.available) {
          this.errorMsg = "Ce pseudo est déjà pris.";
        } else {
          this.errorMsg = "";
        }
      } catch (err) {
        // Mode silencieux
      }
    },

    async handleSubmit() {
      this.errorMsg = "";

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email)) {
        this.errorMsg = "Adresse email invalide.";
        return;
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
      if (!this.isLogin && !passwordRegex.test(this.password)) {
        this.errorMsg = "Mot de passe trop faible (8 car., Maj, Min, Chiffre, Spécial).";
        return;
      }

      if (!this.isLogin && this.password !== this.confirmPassword) {
        this.errorMsg = "Les mots de passe ne correspondent pas.";
        return;
      }

      const formData = {
        email: this.email || null,
        password: this.password || null,
        pseudo: this.pseudo || null,
        birthDay: this.birthDay || null,
        avatar: this.avatar || 1,
      };

      const endpoint = this.isLogin ? "/login" : "/register";

      try {
        const response = await api.post(endpoint, formData);
        const data = response.data;

        if (data.success) {
          if (this.isLogin) {
            this.$emit("login-success", data.user);
            localStorage.setItem("userId", data.user.id);
            registerOnline(data.user.id);
            this.$router.push("/");
          } else {
            this.isLogin = true;
            this.resetFields();
          }
        } else {
          this.errorMsg = data.message || "Une erreur est survenue.";
        }
      } catch (error) {
        this.errorMsg = error.response?.data?.message || "Erreur de communication avec le serveur.";
      }
    },

    resetFields() {
      this.email = "";
      this.password = "";
      this.confirmPassword = "";
      this.pseudo = "";
      this.birthDay = "";
      this.avatar = null;
    },
  },

  mounted() {
    this.fetchAvatars();
  },
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500&display=swap");

/* ── Overlay : position fixe, fond transparent → image du parent visible ── */
.auth-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
}

/* ── Card : hauteur max = viewport, défilement interne ── */
.auth-card {
  width: 100%;
  max-width: 400px;
  max-height: calc(100dvh - 1.5rem);
  flex-direction: column;
  background: rgba(6, 18, 26, 0.84);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  border: 1px solid rgba(29, 233, 192, 0.2);
  border-radius: 14px;
  box-shadow:
    0 0 0 1px rgba(29, 233, 192, 0.06),
    0 20px 60px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}

/* ── Header (non scrollable) ── */
.auth-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 1rem 1.25rem 0.6rem;
  flex-shrink: 0;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: rgba(29, 233, 192, 0.1);
  border: 1px solid rgba(29, 233, 192, 0.22);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.auth-title {
  font-family: "Rajdhani", sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: #dff2ee;
  margin: 0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.auth-subtitle {
  font-family: "Inter", sans-serif;
  font-size: 0.72rem;
  color: #3d8a7e;
  margin: 1px 0 0;
}

/* ── Tabs (non scrollable) ── */
.tab-row {
  display: flex;
  margin: 0 1.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 7px;
  padding: 3px;
  border: 1px solid rgba(29, 233, 192, 0.1);
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  padding: 0.38rem;
  background: transparent;
  border: none;
  border-radius: 5px;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #3d6e68;
  cursor: pointer;
  transition: all 0.18s;
}

.tab-btn.active {
  background: rgba(29, 233, 192, 0.14);
  color: #1de9c0;
  box-shadow: inset 0 0 0 1px rgba(29, 233, 192, 0.2);
}

.tab-btn:hover:not(.active) {
  color: #7ab8b0;
}

/* ── Corps du formulaire : défile si nécessaire ── */
.auth-form-body {
  padding: 0 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1 1 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(29, 233, 192, 0.2) transparent;
}

.auth-form-body::-webkit-scrollbar {
  width: 3px;
}
.auth-form-body::-webkit-scrollbar-track {
  background: transparent;
}
.auth-form-body::-webkit-scrollbar-thumb {
  background: rgba(29, 233, 192, 0.2);
  border-radius: 2px;
}

/* ── Champs ── */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.field-label {
  font-family: "Rajdhani", sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #2e6b62;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 9px;
  color: #2a5e57;
  pointer-events: none;
}

.field-input {
  width: 100%;
  padding: 0.46rem 0.65rem 0.46rem 1.9rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(29, 233, 192, 0.13);
  border-radius: 7px;
  font-family: "Inter", sans-serif;
  /* 16px empêche le zoom auto sur iOS */
  font-size: 16px;
  color: #b8ddd6;
  transition:
    border-color 0.18s,
    background 0.18s;
  box-sizing: border-box;
  outline: none;
}

.field-input::placeholder {
  color: #25524c;
}
.field-input:focus {
  border-color: rgba(29, 233, 192, 0.42);
  background: rgba(29, 233, 192, 0.05);
}

input[type="date"].field-input::-webkit-calendar-picker-indicator {
  filter: invert(60%) sepia(30%) saturate(400%) hue-rotate(130deg);
  cursor: pointer;
  opacity: 0.55;
}

.toggle-vis {
  position: absolute;
  right: 7px;
  background: none;
  border: none;
  padding: 3px;
  cursor: pointer;
  color: #2a5e57;
  display: flex;
  align-items: center;
  width: auto;
  transition: color 0.15s;
}
.toggle-vis:hover {
  color: #1de9c0;
  background: none;
}

/* ── Avatars ── */
.avatar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.avatar-tile {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid rgba(29, 233, 192, 0.14);
  cursor: pointer;
  overflow: hidden;
  transition:
    border-color 0.18s,
    transform 0.15s;
  flex-shrink: 0;
}

.avatar-tile:hover {
  border-color: rgba(29, 233, 192, 0.5);
  transform: scale(1.07);
}

.avatar-tile.selected {
  border-color: #1de9c0;
  box-shadow: 0 0 8px rgba(29, 233, 192, 0.3);
}

.avatar-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-check {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(29, 233, 192, 0.35);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
}

.avatar-preview {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #1de9c0;
  box-shadow: 0 0 10px rgba(29, 233, 192, 0.22);
  flex-shrink: 0;
}

/* ── CGU ── */
.legal-row {
  display: flex;
  align-items: flex-start;
  gap: 7px;
}

.legal-checkbox {
  width: 14px;
  height: 14px;
  margin-top: 2px;
  accent-color: #1de9c0;
  cursor: pointer;
  flex-shrink: 0;
}

.legal-label {
  font-family: "Inter", sans-serif;
  font-size: 0.72rem;
  color: #3d6e68;
  line-height: 1.45;
}

.legal-link {
  color: #1de9c0;
  text-decoration: none;
}
.legal-link:hover {
  text-decoration: underline;
}

/* ── Erreur ── */
.error-msg {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: "Inter", sans-serif;
  font-size: 0.72rem;
  color: #f0837b;
  background: rgba(240, 131, 123, 0.08);
  border: 1px solid rgba(240, 131, 123, 0.18);
  border-radius: 6px;
  padding: 0.42rem 0.65rem;
  margin: 0;
}

/* ── Bouton ── */
.submit-btn {
  width: 100%;
  padding: 0.6rem;
  background: linear-gradient(135deg, #1de9c0 0%, #0fa888 100%);
  color: #041a14;
  border: none;
  border-radius: 7px;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    opacity 0.18s,
    transform 0.12s;
  margin-top: 0.1rem;
  flex-shrink: 0;
}

.submit-btn:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}
.submit-btn:active {
  transform: translateY(0);
}

/* ── Lien bascule ── */
.toggle-link {
  text-align: center;
  font-family: "Inter", sans-serif;
  font-size: 0.72rem;
  color: #2a5e57;
  cursor: pointer;
  margin: 0;
  transition: color 0.15s;
}
.toggle-link:hover {
  color: #1de9c0;
}

/* ── Ajustements petits écrans ── */
@media (max-width: 380px) {
  .auth-header {
    padding: 0.75rem 1rem 0.5rem;
  }
  .tab-row {
    margin: 0 1rem 0.4rem;
  }
  .auth-form-body {
    padding: 0 1rem 1rem;
    gap: 0.45rem;
  }
  .avatar-tile {
    width: 40px;
    height: 40px;
  }
  .avatar-preview {
    width: 42px;
    height: 42px;
  }
}
</style>
