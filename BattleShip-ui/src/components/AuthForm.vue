<!--AuthForm.vue-->

<template>
  <div class="auth-form">
    <h2>{{ isLogin ? "Connexion" : "Inscription" }}</h2>

    <form @submit.prevent="handleSubmit">
      <input v-model="email" type="email" placeholder="Email" required />
      <div class="password-wrapper">
        <input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Mot de passe"
          required
        />
        <span class="toggle-visibility" @click="showPassword = !showPassword">
          {{ showPassword ? '🙈' : '👁️' }}
        </span>
      </div>

      <template v-if="!isLogin">
        <div class="password-wrapper">
          <input
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            placeholder="Confirmer mot de passe"
            required
          />
          <span class="toggle-visibility" @click="showConfirmPassword = !showConfirmPassword">
            {{ showConfirmPassword ? '🙈' : '👁️' }}
          </span>
        </div>
        <input v-model="pseudo" type="text" placeholder="Pseudo" required @blur="checkPseudo" />
        <input v-model="birthDay" type="date" required @blur="validateBirthDay" />

        <h3>Avatar</h3>
        <input type="file" @change="onFileChange" accept="image/*" />
        <img 
          :src="avatar ? 'data:image/jpeg;base64,' + avatar + '?t=' + refreshKey : defaultAvatar" 
          class="avatar-preview" 
        />

        <div class="legal-consent">
          <input id="legal" type="checkbox" v-model="legalAccepted" required />
          <label for="legal">
            J'accepte les
            <a href="#" @click.prevent="showLegal">Conditions Générales d'Utilisation</a>
            du jeu BattleShip Arena.
          </label>
        </div>
      </template>

      <button type="submit">
        {{ isLogin ? "Se connecter" : "S'inscrire" }}
      </button>

      <p @click="toggleForm" style="cursor: pointer; color: blue; text-decoration: underline;">
        {{ isLogin ? "Pas encore de compte ? Inscris-toi" : "Déjà inscrit ? Connecte-toi" }}
      </p>

      <p v-if="errorMsg" style="color: red; font-size: 0.8rem;">{{ errorMsg }}</p>
    </form>
  </div>
</template>

<script>
import axios from "axios";
import defaultAvatarImage from '@/assets/images/ppHomme.png';

export default {
  data() {
    return {
      isLogin: true,
      email: "",
      password: "",
      confirmPassword: "",
      pseudo: "",
      birthDay: "",
      avatar: null,
      defaultAvatar: defaultAvatarImage,
      errorMsg: "",
      legalAccepted: false,
      showPassword: false,
      showConfirmPassword: false,
      refreshKey: Date.now(),
    };
  },
  methods: {
    showLegal() {
      alert(`Conditions Générales d'Utilisation :\n\n- Aucun bot ni logiciel de triche n'est autorisé.\n- Le respect des autres joueurs est obligatoire.\n- Les comptes multiples sont interdits.\n- Vos statistiques (pseudo, victoires, avatar) sont publiques.`);
    },

    toggleForm() {
      this.isLogin = !this.isLogin;
      this.errorMsg = "";
    },

    onFileChange(event) {
      const file = event.target.files[0];
      event.target.value = null; // important pour pouvoir réuploader la même image
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.avatar = reader.result.split(',')[1];
        this.refreshKey = Date.now(); // force le rafraîchissement de l’image
      };
      reader.readAsDataURL(file);
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

    async checkPseudo() {
      if (!this.pseudo.trim()) return;
      try {
        const res = await axios.post("http://localhost:3000/api/check-pseudo", { pseudo: this.pseudo });
        if (!res.data.available) {
          this.errorMsg = "Ce pseudo est déjà pris.";
        } else {
          this.errorMsg = "";
        }
      } catch (err) {
        console.error("Erreur vérification pseudo:", err);
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
        this.errorMsg = "Mot de passe trop faible.";
        return;
      }

      if (!this.isLogin && this.password !== this.confirmPassword) {
        this.errorMsg = "Les mots de passe ne correspondent pas.";
        return;
      }

      if (!this.isLogin) {
        const birth = new Date(this.birthDay);
        const today = new Date();
        if (isNaN(birth.getTime()) || birth > today) {
          this.errorMsg = "Date de naissance invalide.";
          return;
        }
      }

       let avatarToSend = this.avatar;

      if (!this.avatar && !this.isLogin) {
        // convertir l'image par défaut en base64
        try {
          avatarToSend = await this.getBase64FromUrl(defaultAvatarImage);
        } catch (e) {
          console.error("Erreur lors du chargement de l'avatar par défaut", e);
        }
      }


      const formData = {
        email: this.email,
        password: this.password,
        pseudo: this.pseudo,
        birthDay: this.birthDay,
        avatar: avatarToSend,
      };

      const url = this.isLogin
        ? "http://localhost:3000/api/login"
        : "http://localhost:3000/api/register";

      try {
        const response = await axios.post(url, formData);
        const data = response.data;

        if (data.success) {
          if (this.isLogin) {
            this.$emit("login-success", data.user);
          } else {
            alert("Inscription réussie !");
            this.toggleForm();
          }
        } else {
          this.errorMsg = data.message || "Une erreur est survenue.";
        }
      } catch (error) {
        if (error.response && error.response.data && error.response.data.message) {
          this.errorMsg = error.response.data.message;
        } else {
          this.errorMsg = "Erreur de communication avec le serveur.";
        }
      }
      
    },
    async getBase64FromUrl(url) {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]); // base64 only
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    },

  },
};
</script>

<style>
.auth-form {
  position: fixed;
  color: black;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.689);
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

input[type="text"],
input[type="email"],
input[type="password"],
input[type="date"],
input[type="file"] {
  display: block;
  width: 100%;
  margin-bottom: 0.5rem;
  padding: 0.25rem;
  font-size: 1rem;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 0.7rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
}

button:hover {
  background: #2980b9;
}

.legal-consent {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin: 1rem 0;
  font-size: 0.9rem;
}

.legal-consent input[type="checkbox"] {
  margin-top: 0.3rem;
  transform: scale(1.2);
  cursor: pointer;
}

.legal-consent a {
  color: #3498db;
  text-decoration: underline;
  cursor: pointer;
}

.cropper-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.cropper-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 0 20px rgba(0,0,0,0.3);
}

.cropper-content img {
  max-width: 100%;
  max-height: 400px;
  display: block;
}


.cropper-buttons {
  display: flex;
  gap: 1rem;
  width: 100%;
}

.cropper-buttons button {
  flex: 1;
  padding: 0.7rem;
  font-size: 1rem;
  font-weight: bold;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.cropper-buttons .cancel {
  background: #e74c3c;
  color: white;
}

.cropper-buttons .cancel:hover {
  background: #c0392b;
}

.cropper-buttons button:not(.cancel) {
  background: #2ecc71;
  color: white;
}

.avatar-preview {
  margin-top: 1rem;
  object-fit: cover;
  border-radius: 50%;
  width: 100px;
  height: 100px;
  max-width: 100%;
  max-height: 150px;
  display: block;
  margin-left: auto;
  margin-right: auto;
}


.password-wrapper {
  position: relative;
  width: 100%;
  margin-bottom: 0.5rem;
}

.password-wrapper input {
  width: 100%;
  padding-right: 2rem; /* espace à droite pour l'icône */
}

.toggle-visibility {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  font-size: 1.2rem;
  user-select: none;
  color: #555;
}



</style>
