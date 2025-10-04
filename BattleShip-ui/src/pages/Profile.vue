<!-- Profile.vue -->
<template>
  <div class="profile-container">
    <h1>👤 Mon Profil</h1>

    <div class="profile-form">
      <!-- Aperçu -->
      <label>Avatar</label>
      <div class="avatar-preview">
        <img :src="avatarPreviewUrl" alt="Avatar actuel" />
      </div>

      <!-- Sélection des avatars depuis la BDD -->
      <div class="avatar-selection">
        <div 
          v-for="av in avatars" 
          :key="av.ID_Avatar" 
          class="avatar-option" 
          :class="{ selected: avatar === av.ID_Avatar }"
          @click="selectAvatar(av.ID_Avatar)"
        >
          <img :src="'data:' + av.mime_type + ';base64,' + av.Avatar" />
        </div>
      </div>

      <label>Pseudo</label>
      <input v-model="pseudo" type="text" />

      <button @click="saveProfile">💾 Enregistrer</button>
      <button @click="deleteAccount" class="delete-button">🗑️ Supprimer le compte</button>
      <button @click="$router.push('/')" class="back-button">Retour au menu</button>
    </div>
  </div>
</template>

<script>
import { userBus } from '@/eventBus.js';

import axios from "axios";
import defaultAvatar from '@/assets/images/ppHomme.png';

export default {
  data() {
    return {
      pseudo: '',
      userId: null,
      avatars: [],       // tous les avatars dispo
      avatar: null,      // ID sélectionné
      avatarPreviewUrl: defaultAvatar,
      selectedBase64: '',
      selectedMime: ''
    };
  },
  mounted() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      this.userId = user.id;
      this.pseudo = user.pseudo;
      this.avatar = user.avatarId || null; // on garde l'ID en mémoire
      this.avatarPreviewUrl = user.avatar || defaultAvatar;
    }
    this.fetchAvatars();
  },
  methods: {
    async fetchAvatars() {
      try {
        const res = await axios.get("http://localhost:3000/api/avatars");
        this.avatars = res.data.avatars;

        // si l'user a déjà un avatar enregistré → mettre le preview à jour
        if (this.avatar) {
          const sel = this.avatars.find(a => a.ID_Avatar === this.avatar);
          if (sel) {
            this.selectedBase64 = sel.Avatar;
            this.selectedMime = sel.mime_type;
            this.avatarPreviewUrl = `data:${sel.mime_type};base64,${sel.Avatar}`;
          }
        }
      } catch (e) {
        console.error("Erreur récupération avatars :", e);
      }
    },

    selectAvatar(id) {
      this.avatar = id;
      const sel = this.avatars.find(a => a.ID_Avatar === id);
      if (sel) {
        this.selectedBase64 = sel.Avatar;
        this.selectedMime = sel.mime_type;
        this.avatarPreviewUrl = `data:${sel.mime_type};base64,${sel.Avatar}`;
      }
    },

    async saveProfile() {
      if (!this.userId) return;

      // Préparer le payload
      let payload = { pseudo: this.pseudo };

      // Si un avatar est sélectionné
      if (this.avatar) {
        payload.avatar = this.avatar; // ID de l'avatar
      }

      try {
        const response = await fetch(`http://localhost:3000/api/users/${this.userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("Erreur API :", errText);
          return alert("Erreur lors de la mise à jour du profil.");
        }

        const updatedUser = await response.json();

        // 🔹 Utiliser directement l'avatar envoyé par le back (base64 ou URL)
        const avatarUrl = updatedUser.avatar || defaultAvatar;

        // Mettre à jour localStorage
        localStorage.setItem('user', JSON.stringify({
          id: updatedUser.id,
          pseudo: updatedUser.pseudo,
          avatarId: updatedUser.avatarId, // ID pour garder la sélection
          avatar: avatarUrl
        }));

        // Mettre à jour le preview
        this.avatarPreviewUrl = avatarUrl;
        this.pseudo = updatedUser.pseudo;

        // 🔹 Notifier les autres composants (Home.vue)
        userBus.userUpdated = !userBus.userUpdated;

        alert("Profil mis à jour !");
      } catch (error) {
        console.error("Erreur API :", error);
        alert("Erreur inattendue lors de la mise à jour du profil.");
      }
    },

    async deleteAccount() {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return;
      if (!confirm("Êtes-vous sûr de vouloir supprimer votre compte ?")) return;

      try {
        const response = await fetch(`http://localhost:3000/api/users/${user.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("Erreur serveur :", errText);
          return alert("Erreur lors de la suppression du compte.");
        }

        localStorage.removeItem('user');
        eventBus.userUpdated = !eventBus.userUpdated;

        alert("Votre compte a été supprimé.");
        this.$router.push('/');
      } catch (error) {
        console.error("Erreur lors de la suppression :", error);
        alert("Erreur inattendue lors de la suppression.");
      }
    }
  }
};
</script>

<style scoped>
.profile-container {
  background: linear-gradient(to bottom, #002f4b, #005f8e);
  color: white;
  min-height: 100vh;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.profile-form {
  background: white;
  color: black;
  padding: 1rem;
  border-radius: 8px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

.profile-form label {
  font-weight: bold;
  margin-top: 0.5rem;
  display: block;
}

.avatar-preview img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 0.5rem;
}

.avatar-selection {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.avatar-option {
  border: 2px solid transparent;
  border-radius: 50%;
  padding: 2px;
  cursor: pointer;
  width: 60px;
  height: 60px;
}

.avatar-option.selected {
  border-color: #3498db;
}

.avatar-option img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.profile-form button {
  margin-bottom: 0.5rem;
  background-color: #2980b9;
  color: white;
  padding: 0.5rem 0.8rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.9rem;
  cursor: pointer;
}

.profile-form button:hover { background-color: #216f9d; }

.delete-button { background-color: #e74c3c; }
.delete-button:hover { background-color: #c0392b; }
</style>
