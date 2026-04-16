<template>
  <div class="popup-overlay" @click.self="$emit('close')">
    <div class="popup-content">
      <!-- Header -->
      <header class="popup-header">
        <div class="header-left">
          <div class="header-icon">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="7" cy="6" r="3" stroke="#1de9c0" stroke-width="1.4" />
              <path
                d="M1 17c0-3.3 2.7-6 6-6"
                stroke="#1de9c0"
                stroke-width="1.4"
                stroke-linecap="round"
              />
              <circle cx="14" cy="6" r="3" stroke="#1de9c0" stroke-width="1.4" opacity=".5" />
              <path
                d="M19 17c0-3.3-2.7-6-6-6"
                stroke="#1de9c0"
                stroke-width="1.4"
                stroke-linecap="round"
                opacity=".5"
              />
            </svg>
          </div>
          <div>
            <h2 class="popup-title">Mes amis</h2>
            <p class="popup-sub">
              {{ friends.length }} contact{{ friends.length !== 1 ? "s" : "" }}
            </p>
          </div>
        </div>
        <button class="header-close" @click="$emit('close')">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1l12 12M13 1L1 13"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </header>

      <!-- Barre de recherche / ajout -->
      <div class="search-bar">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.3" />
          <path d="M11 11l3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
        </svg>
        <input
          v-model="identifier"
          placeholder="Rechercher un pseudo..."
          @keyup.enter="addFriend"
          class="search-input"
        />
        <button @click="addFriend" class="add-btn" title="Ajouter">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1v12M1 7h12"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <!-- Zone scrollable -->
      <div class="scroll-area">
        <!-- Invitations de partie -->
        <div class="section" v-if="invitations.length">
          <div class="section-label">
            <span class="label-dot dot-amber"></span>
            Invitations de partie
            <span class="badge badge-amber">{{ invitations.length }}</span>
          </div>
          <div class="card-list">
            <div v-for="inv in invitations" :key="inv.ID" class="friend-card invite-card">
              <div class="friend-left">
                <div class="avatar-wrap">
                  <img :src="inv.Avatar || defaultAvatar" alt="Avatar" class="avatar-img" />
                </div>
                <div class="friend-info">
                  <span class="friend-pseudo">{{ inv.senderPseudo || "Joueur" }}</span>
                  <span class="friend-sub amber">t'invite à jouer !</span>
                </div>
              </div>
              <div class="friend-right">
                <button class="icon-btn accept" @click="acceptInvitation(inv)" title="Accepter">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M1 6l3.5 3.5L11 2"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
                <button class="icon-btn refuse" @click="refuseInvitation(inv)" title="Refuser">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M1 1l10 10M11 1L1 11"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Demandes reçues -->
        <div class="section" v-if="requests.length">
          <div class="section-label">
            <span class="label-dot dot-blue"></span>
            Demandes reçues
            <span class="badge badge-blue">{{ requests.length }}</span>
          </div>
          <div class="card-list">
            <div v-for="r in requests" :key="r.ID_Users" class="friend-card request-card">
              <div class="friend-left">
                <div class="avatar-wrap">
                  <img :src="r.avatarUrl || defaultAvatar" alt="Avatar" class="avatar-img" />
                </div>
                <span class="friend-pseudo">{{ r.Pseudo }}</span>
              </div>
              <div class="friend-right">
                <button class="icon-btn accept" @click="acceptRequest(r.ID_Users)">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M1 6l3.5 3.5L11 2"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
                <button class="icon-btn refuse" @click="removeFriend(r.ID_Users)">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M1 1l10 10M11 1L1 11"
                      stroke="currentColor"
                      stroke-width="1.7"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Liste d'amis -->
        <div class="section">
          <div class="section-label">
            <span class="label-dot dot-teal"></span>
            Liste d'amis
            <span class="badge badge-teal">{{ friends.length }}</span>
          </div>
          <div class="card-list" v-if="friends.length">
            <div v-for="f in friends" :key="f.ID_Users" class="friend-card">
              <div class="friend-left">
                <div class="avatar-wrap">
                  <img :src="f.avatarUrl || defaultAvatar" alt="Avatar" class="avatar-img" />
                  <span class="status-dot" :class="f.isOnline ? 'online' : 'offline'"></span>
                </div>
                <div class="friend-info">
                  <div class="pseudo-row">
                    <span class="friend-pseudo" :class="{ muted: !f.isOnline }">{{
                      f.Pseudo
                    }}</span>
                    <span class="level-badge">LVL {{ f.niveau || 0 }}</span>
                  </div>
                  <span class="friend-sub" :class="f.isOnline ? 'teal' : 'muted-sub'">
                    {{ f.isOnline ? "En ligne" : "Hors ligne" }}
                  </span>
                </div>
              </div>
              <div class="friend-right">
                <button class="remove-btn" @click="removeFriend(f.ID_Users)">Retirer</button>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" opacity=".3">
              <circle cx="12" cy="10" r="5" stroke="#1de9c0" stroke-width="1.5" />
              <path
                d="M3 28c0-5 4-9 9-9"
                stroke="#1de9c0"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                d="M22 18l6 6M28 18l-6 6"
                stroke="#1de9c0"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            <p>Aucun ami pour l'instant</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { invitationStore, removeInvitation } from "@/eventBus";
import api from "@/api/api.js";
import defaultAvatar from "@/assets/images/ppHomme.png";

export default {
  props: ["userId"],
  data() {
    return {
      friends: [],
      requests: [],
      identifier: "",
      defaultAvatar,
      refreshInterval: null,
    };
  },
  computed: {
    invitations() {
      return invitationStore.invitations.map((inv) => ({
        ...inv,
        avatarUrl: inv.senderAvatar ? `data:image/jpeg;base64,${inv.senderAvatar}` : defaultAvatar,
      }));
    },
  },
  mounted() {
    this.fetchAll();
    this.refreshInterval = setInterval(this.fetchAll, 3000);
  },
  beforeUnmount() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  },
  methods: {
    async fetchAll() {
      await Promise.all([this.fetchFriends(), this.fetchRequests(), this.fetchInvitations()]);
    },

    async fetchFriends() {
      try {
        const res = await api.get(`/friends/list/${this.userId}`);
        const data = res.data.friends || res.data || [];
        this.friends = (data || []).map((f) => ({
          ID_Users: f.ID_Users ?? f.id,
          Pseudo: f.Pseudo ?? f.pseudo,
          isOnline: f.isOnline ?? false,
          niveau: f.niveau ?? 0,
          avatarUrl: f.Avatar ? `data:${f.mime_type};base64,${f.Avatar}` : defaultAvatar,
        }));
      } catch (err) {
        // Mode silencieux
      }
    },

    async fetchRequests() {
      try {
        const res = await api.get(`/friends/requests/${this.userId}`);
        const data = res.data;
        this.requests = (data || []).map((r) => ({
          ID_Users: r.ID_Users,
          Pseudo: r.Pseudo,
          isOnline: r.isOnline ?? false,
          avatarUrl: r.Avatar ? `data:${r.mime_type};base64,${r.Avatar}` : defaultAvatar,
        }));
      } catch (err) {
        // Mode silencieux
      }
    },

    async fetchInvitations() {
      try {
        const res = await api.get(`/invitation/${this.userId}`);
        invitationStore.invitations = Array.isArray(res.data.invitations)
          ? res.data.invitations
          : [];
      } catch (err) {
        invitationStore.invitations = [];
      }
    },

    async addFriend() {
      if (!this.identifier.trim()) return alert("Pseudo requis");
      try {
        await api.post("/friends/add", {
          userId: this.userId,
          identifier: this.identifier,
        });
        this.identifier = "";
        this.fetchFriends();
      } catch (err) {
        alert("Utilisateur introuvable ou déjà ajouté.");
      }
    },

    async acceptInvitation(inv) {
      try {
        const inviteId = inv.ID;
        const gameId = inv.id_game;
        const res = await api.post("/invitation/respond", {
          userId: this.userId,
          inviteId,
          accept: true,
        });
        if (res.data.success) {
          removeInvitation(inviteId);
          this.$router.push(`/waiting-room/${gameId}`);
          this.$emit("close");
        }
      } catch (err) {
        alert("Impossible de rejoindre la partie.");
      }
    },

    async refuseInvitation(inv) {
      try {
        await api.post("/invitation/respond", {
          userId: this.userId,
          inviteId: inv.ID,
          gameId: inv.id_game,
          senderId: inv.sender_id,
          accept: false,
        });
        removeInvitation(inv.ID);
      } catch (err) {
        // Mode silencieux
      }
    },

    async acceptRequest(friendId) {
      try {
        await api.post("/friends/accept", { userId: this.userId, friendId });
        this.fetchFriends();
        this.fetchRequests();
      } catch (err) {
        // Mode silencieux
      }
    },

    async removeFriend(friendId) {
      if (!confirm("Voulez-vous vraiment supprimer cet ami ?")) return;
      try {
        await api.post("/friends/remove", { userId: this.userId, friendId });
        this.fetchFriends();
        this.fetchRequests();
      } catch (err) {
        // Mode silencieux
      }
    },
  },
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500&display=swap");

/* ── Overlay ── */
.popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(3, 10, 16, 0.78);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

/* ── Panel ── */
.popup-content {
  width: 100%;
  max-width: 420px;
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
  overflow: hidden;
  color: #c0ddd8;
  font-family: "Inter", sans-serif;
}

/* ── Header ── */
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.8rem;
  border-bottom: 1px solid rgba(29, 233, 192, 0.08);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  width: 36px;
  height: 36px;
  background: rgba(29, 233, 192, 0.08);
  border: 1px solid rgba(29, 233, 192, 0.2);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.popup-title {
  font-family: "Rajdhani", sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: #dff2ee;
  margin: 0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.popup-sub {
  font-size: 0.7rem;
  color: #2e7a70;
  margin: 1px 0 0;
}

.header-close {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(29, 233, 192, 0.1);
  border-radius: 7px;
  width: 30px;
  height: 30px;
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

.header-close:hover {
  color: #1de9c0;
  background: rgba(29, 233, 192, 0.1);
}

/* ── Barre de recherche ── */
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0.75rem 1.25rem 0;
  padding: 0.45rem 0.65rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(29, 233, 192, 0.13);
  border-radius: 9px;
  flex-shrink: 0;
  transition: border-color 0.18s;
}

.search-bar:focus-within {
  border-color: rgba(29, 233, 192, 0.38);
  background: rgba(29, 233, 192, 0.04);
}

.search-icon {
  color: #2a5e57;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: "Inter", sans-serif;
  font-size: 0.83rem;
  color: #a8cdc7;
  padding: 0;
}

.search-input::placeholder {
  color: #1e4e49;
}

.add-btn {
  width: 28px;
  height: 28px;
  background: rgba(29, 233, 192, 0.15);
  border: 1px solid rgba(29, 233, 192, 0.25);
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #1de9c0;
  flex-shrink: 0;
  transition:
    background 0.15s,
    transform 0.12s;
  padding: 0;
}

.add-btn:hover {
  background: rgba(29, 233, 192, 0.25);
  transform: scale(1.07);
}

/* ── Zone scrollable ── */
.scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 0.85rem 1.25rem 1.25rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(29, 233, 192, 0.15) transparent;
}

.scroll-area::-webkit-scrollbar {
  width: 3px;
}
.scroll-area::-webkit-scrollbar-track {
  background: transparent;
}
.scroll-area::-webkit-scrollbar-thumb {
  background: rgba(29, 233, 192, 0.15);
  border-radius: 2px;
}

/* ── Sections ── */
.section {
  margin-bottom: 1.25rem;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #2e6b62;
  margin-bottom: 8px;
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
.dot-amber {
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.5);
}
.dot-blue {
  background: #60a5fa;
  box-shadow: 0 0 6px rgba(96, 165, 250, 0.5);
}

.badge {
  margin-left: auto;
  font-family: "Inter", sans-serif;
  font-size: 0.65rem;
  font-weight: 500;
  padding: 1px 7px;
  border-radius: 20px;
  letter-spacing: 0;
}

.badge-teal {
  background: rgba(29, 233, 192, 0.1);
  color: #1de9c0;
  border: 1px solid rgba(29, 233, 192, 0.2);
}
.badge-amber {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);
}
.badge-blue {
  background: rgba(96, 165, 250, 0.1);
  color: #60a5fa;
  border: 1px solid rgba(96, 165, 250, 0.2);
}

/* ── Cartes d'ami ── */
.card-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.friend-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 11px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(29, 233, 192, 0.07);
  border-radius: 10px;
  transition:
    background 0.18s,
    border-color 0.18s,
    transform 0.15s;
}

.friend-card:hover {
  background: rgba(29, 233, 192, 0.05);
  border-color: rgba(29, 233, 192, 0.15);
  transform: translateX(3px);
}

.invite-card {
  border-left: 2px solid #f59e0b;
  background: rgba(245, 158, 11, 0.04);
}

.request-card {
  border-left: 2px solid #60a5fa;
  background: rgba(96, 165, 250, 0.04);
}

/* ── Avatar ── */
.friend-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.avatar-img {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  object-fit: cover;
  border: 1px solid rgba(29, 233, 192, 0.15);
  background: rgba(255, 255, 255, 0.04);
  display: block;
}

.status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid rgba(6, 18, 26, 0.94);
}

.status-dot.online {
  background: #1de9c0;
  box-shadow: 0 0 6px rgba(29, 233, 192, 0.6);
}
.status-dot.offline {
  background: #2d5a54;
}

/* ── Textes ami ── */
.friend-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.friend-pseudo {
  font-size: 0.85rem;
  font-weight: 500;
  color: #c0ddd8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.friend-pseudo.muted {
  color: #2e6560;
}

.pseudo-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.level-badge {
  font-family: "Rajdhani", sans-serif;
  font-size: 0.6rem;
  font-weight: 700;
  background: rgba(29, 233, 192, 0.1);
  color: #1de9c0;
  border: 1px solid rgba(29, 233, 192, 0.3);
  padding: 1px 4px;
  border-radius: 4px;
  text-transform: uppercase;
  line-height: 1;
}

.friend-pseudo.muted + .level-badge {
  opacity: 0.5;
  filter: grayscale(1);
}

.friend-sub {
  font-size: 0.7rem;
}

.friend-sub.teal {
  color: #1de9c0;
}
.friend-sub.amber {
  color: #f59e0b;
}
.friend-sub.muted-sub {
  color: #1e4e49;
}

/* ── Actions ── */
.friend-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  color: white;
  transition:
    opacity 0.18s,
    transform 0.12s;
  padding: 0;
}

.icon-btn.accept {
  background: rgba(29, 233, 192, 0.2);
  color: #1de9c0;
  border: 1px solid rgba(29, 233, 192, 0.25);
}
.icon-btn.refuse {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.icon-btn:hover {
  opacity: 0.8;
  transform: scale(1.08);
}

.remove-btn {
  background: none;
  border: none;
  font-family: "Inter", sans-serif;
  font-size: 0.7rem;
  color: #1e4e49;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 5px;
  transition:
    color 0.15s,
    background 0.15s;
}

.remove-btn:hover {
  color: #f87171;
  background: rgba(239, 68, 68, 0.08);
}

/* ── État vide ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 1.5rem 0;
  color: #1e4e49;
  font-size: 0.78rem;
}

.empty-state p {
  margin: 0;
}

/* ── Mobile ── */
@media (max-width: 380px) {
  .popup-overlay {
    padding: 0.5rem;
  }
  .popup-header {
    padding: 0.85rem 1rem 0.7rem;
  }
  .search-bar {
    margin: 0.6rem 1rem 0;
  }
  .scroll-area {
    padding: 0.7rem 1rem 1rem;
  }
}
</style>
