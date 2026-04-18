<template>
  <div class="shop-bg">
    <!-- Particules décoratives -->
    <div class="particles">
      <span v-for="i in 18" :key="i" class="particle" :style="particleStyle(i)"></span>
    </div>

    <div class="shop-wrapper">
      <!-- Header -->
      <header class="shop-header">
        <button class="btn-back" @click="$router.back()">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M19 12H5M5 12L12 19M5 12L12 5" />
          </svg>
          Retour
        </button>

        <div class="header-center">
          <h1 class="shop-title">
            <span class="title-icon">◈</span>
            ARSENAL DES SKINS
            <span class="title-icon">◈</span>
          </h1>
          <p class="shop-subtitle">Personnalisez votre flotte</p>
        </div>

        <div class="gold-display">
          <span class="gold-icon">🪙</span>
          <span class="gold-amount">{{ userGold }}</span>
        </div>
      </header>

      <!-- Tabs catégories -->
      <div class="category-tabs">
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="cat-tab"
          :class="{ active: activeCategory === cat.id }"
          @click="activeCategory = cat.id"
        >
          <span class="cat-icon">{{ cat.icon }}</span>
          {{ cat.label }}
          <span class="cat-count">{{ countByCategory(cat.id) }}</span>
        </button>
      </div>

      <!-- Loader -->
      <div v-if="loading" class="loading-state">
        <div class="sonar-ring"></div>
        <p>Chargement de l'arsenal…</p>
      </div>

      <!-- Grille des items -->
      <div v-else class="items-grid">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="item-card"
          :class="{
            owned: isOwned(item.id),
            equipped: isEquipped(item.slug),
            'can-afford': !isOwned(item.id) && userGold >= item.price,
            'cant-afford': !isOwned(item.id) && userGold < item.price,
          }"
        >
          <!-- Prévisualisation visuelle du thème -->
          <div class="item-preview" :style="buildPreview(item)">
            <div class="preview-grid">
              <div
                v-for="n in 9"
                :key="n"
                class="preview-cell"
                :class="{
                  hit: [2, 5, 7].includes(n),
                  miss: [4, 8].includes(n),
                  ship: [1, 3, 6].includes(n),
                }"
                :style="previewCellStyle(item, n)"
              ></div>
            </div>
            <div class="preview-ship-bar" :style="{ background: getVar(item, '--brass') }"></div>
            <div class="preview-label">{{ item.name }}</div>

            <!-- Badge statut -->
            <div v-if="isEquipped(item.slug)" class="status-badge equipped-badge">✓ ÉQUIPÉ</div>
            <div v-else-if="isOwned(item.id)" class="status-badge owned-badge">POSSÉDÉ</div>
            <div v-else-if="item.price === 0" class="status-badge free-badge">GRATUIT</div>
          </div>

          <!-- Infos -->
          <div class="item-body">
            <h3 class="item-name">{{ item.name }}</h3>
            <p class="item-desc">{{ item.description }}</p>

            <!-- Palette de couleurs -->
            <div class="color-palette" v-if="item.css_vars">
              <span
                v-for="(color, varName) in parsedVars(item)"
                :key="varName"
                class="color-dot"
                :style="{ background: color }"
                :title="varName + ': ' + color"
              ></span>
            </div>

            <!-- Actions -->
            <div class="item-actions">
              <template v-if="isEquipped(item.slug)">
                <button class="btn-equipped" disabled><span>◈</span> Thème actif</button>
              </template>
              <template v-else-if="isOwned(item.id)">
                <button class="btn-equip" @click="equipItem(item)">Équiper</button>
              </template>
              <template v-else>
                <button
                  class="btn-buy"
                  :class="{ disabled: userGold < item.price }"
                  :disabled="userGold < item.price || buyingId === item.id"
                  @click="buyItem(item)"
                >
                  <span v-if="buyingId === item.id" class="spinner">⟳</span>
                  <template v-else>
                    <span class="buy-icon">🪙</span>
                    {{ item.price === 0 ? "Gratuit" : item.price + " or" }}
                  </template>
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Toast notification -->
      <transition name="toast">
        <div v-if="toast.visible" class="toast" :class="toast.type">
          {{ toast.message }}
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost/api";

export default {
  name: "ShopView",
  data() {
    return {
      items: [],
      ownedIds: [],
      loading: true,
      activeCategory: "theme",
      buyingId: null,
      equippingSlug: null,
      toast: { visible: false, message: "", type: "success" },
      categories: [
        { id: "theme", label: "Thèmes", icon: "🎨" },
        { id: "avatar", label: "Avatars", icon: "🧑‍✈️" },
        { id: "title", label: "Titres", icon: "🏅" },
      ],
    };
  },
  computed: {
    user() {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    },
    userGold() {
      return this.user?.gold ?? 0;
    },
    activeTheme() {
      return this.user?.active_theme ?? "default";
    },
    filteredItems() {
      return this.items.filter((i) => i.category === this.activeCategory);
    },
  },
  async created() {
    await this.loadItems();
  },
  methods: {
    /* ── Data fetching ── */
    async loadItems() {
      this.loading = true;
      try {
        const [shopRes, purchasedRes] = await Promise.all([
          fetch(`${API_BASE}/shop/items.php`),
          fetch(`${API_BASE}/shop/purchased.php?user_id=${this.user?.id}`),
        ]);
        this.items = await shopRes.json();
        const purchased = await purchasedRes.json();
        this.ownedIds = purchased.map((p) => p.item_id ?? p.id);
      } catch {
        // Fallback : données statiques issues de la BDD pour le développement
        this.items = [
          {
            id: 1,
            slug: "default",
            name: "Classique",
            description: "Le theme naval par defaut. Gratuit.",
            category: "theme",
            price: 0,
            css_vars:
              '{"--ocean-deep":"#071520","--ocean-mid":"#0d2137","--brass":"#c8933e","--brass-light":"#eac040","--accent":"#5eead4"}',
            preview_color: "#0d2137",
            sort_order: 1,
          },
          {
            id: 2,
            slug: "crimson",
            name: "Amiral Rouge",
            description: "Tons rouges et or — pour les commandants aguerris.",
            category: "theme",
            price: 200,
            css_vars:
              '{"--ocean-deep":"#1a0a0a","--ocean-mid":"#2d1111","--brass":"#d4443c","--brass-light":"#ff6b5e","--accent":"#ff9a8b"}',
            preview_color: "#2d1111",
            sort_order: 2,
          },
          {
            id: 3,
            slug: "arctic",
            name: "Arctique",
            description: "Bleu glace et blanc — guerre dans le grand nord.",
            category: "theme",
            price: 200,
            css_vars:
              '{"--ocean-deep":"#0a1a2e","--ocean-mid":"#122a44","--brass":"#6fb4d4","--brass-light":"#a0d8ef","--accent":"#d0f0ff"}',
            preview_color: "#122a44",
            sort_order: 3,
          },
          {
            id: 4,
            slug: "abyss",
            name: "Abysses",
            description: "Violet profond — terreur des profondeurs.",
            category: "theme",
            price: 350,
            css_vars:
              '{"--ocean-deep":"#0d0818","--ocean-mid":"#1a1030","--brass":"#9b59b6","--brass-light":"#c084e0","--accent":"#e0b0ff"}',
            preview_color: "#1a1030",
            sort_order: 4,
          },
          {
            id: 5,
            slug: "phantom",
            name: "Fantôme",
            description: "Gris spectral et vert pale — flotte invisible.",
            category: "theme",
            price: 350,
            css_vars:
              '{"--ocean-deep":"#0e0e0e","--ocean-mid":"#1a1a1a","--brass":"#7a7a7a","--brass-light":"#a0a0a0","--accent":"#b0ffb0"}',
            preview_color: "#1a1a1a",
            sort_order: 5,
          },
          {
            id: 6,
            slug: "gold",
            name: "Or Massif",
            description: "Or et noir — pour les plus riches capitaines.",
            category: "theme",
            price: 500,
            css_vars:
              '{"--ocean-deep":"#0f0a00","--ocean-mid":"#1a1400","--brass":"#ffd700","--brass-light":"#ffe44d","--accent":"#fff8b0"}',
            preview_color: "#1a1400",
            sort_order: 6,
          },
        ];
        // Pour le dev, on considère que le joueur possède l'item 1
        this.ownedIds = [1];
      } finally {
        this.loading = false;
      }
    },

    /* ── Helpers visuels ── */
    parsedVars(item) {
      try {
        return JSON.parse(item.css_vars || "{}");
      } catch {
        return {};
      }
    },
    getVar(item, name) {
      const vars = this.parsedVars(item);
      return vars[name] || item.preview_color || "#0d2137";
    },
    buildPreview(item) {
      const vars = this.parsedVars(item);
      return {
        background: `linear-gradient(135deg, ${vars["--ocean-deep"] || "#071520"} 0%, ${vars["--ocean-mid"] || "#0d2137"} 100%)`,
        borderColor: vars["--brass"] || "#c8933e",
      };
    },
    previewCellStyle(item, n) {
      const vars = this.parsedVars(item);
      const hit = [2, 5, 7].includes(n);
      const miss = [4, 8].includes(n);
      const ship = [1, 3, 6].includes(n);
      if (hit)
        return {
          background: vars["--brass"] || "#c8933e",
          boxShadow: `0 0 6px ${vars["--brass"] || "#c8933e"}`,
        };
      if (miss)
        return {
          background: "transparent",
          borderColor: vars["--accent"] || "#5eead4",
          opacity: 0.5,
        };
      if (ship)
        return {
          background: vars["--accent"] + "33" || "#5eead433",
          borderColor: vars["--accent"] || "#5eead4",
        };
      return { background: "transparent", borderColor: vars["--ocean-mid"] || "#0d2137" };
    },
    particleStyle(i) {
      const x = (i * 37 + 13) % 97;
      const y = (i * 53 + 7) % 89;
      const s = 0.3 + (i % 4) * 0.2;
      const d = 3 + (i % 6);
      return {
        left: x + "%",
        top: y + "%",
        width: s + "rem",
        height: s + "rem",
        animationDuration: d + "s",
        animationDelay: -(i * 0.4) + "s",
      };
    },

    /* ── Logic ── */
    isOwned(itemId) {
      return this.ownedIds.includes(itemId);
    },
    isEquipped(slug) {
      return this.activeTheme === slug;
    },
    countByCategory(cat) {
      return this.items.filter((i) => i.category === cat).length;
    },

    async buyItem(item) {
      if (this.userGold < item.price || this.buyingId) return;
      this.buyingId = item.id;
      try {
        const res = await fetch(`${API_BASE}/shop/buy.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: this.user.id, item_id: item.id }),
        });
        const data = await res.json();
        if (data.success) {
          // Mettre à jour le localStorage
          const updatedUser = { ...this.user, gold: data.new_gold ?? this.user.gold - item.price };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          this.ownedIds.push(item.id);
          this.showToast(`🪙 "${item.name}" acheté !`, "success");
        } else {
          this.showToast(data.message || "Achat impossible.", "error");
        }
      } catch {
        // Mode dev sans backend
        const updatedUser = { ...this.user, gold: this.user.gold - item.price };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        this.ownedIds.push(item.id);
        this.showToast(`🪙 "${item.name}" acheté !`, "success");
      } finally {
        this.buyingId = null;
      }
    },

    async equipItem(item) {
      try {
        await fetch(`${API_BASE}/shop/equip.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: this.user.id, slug: item.slug }),
        });
      } catch {
        // Pas de backend en dev, on continue quand même
      }
      const updatedUser = { ...this.user, active_theme: item.slug };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      // Applique les CSS vars globalement
      const vars = this.parsedVars(item);
      Object.entries(vars).forEach(([k, v]) => {
        document.documentElement.style.setProperty(k, v);
      });
      this.showToast(`✓ Thème "${item.name}" équipé !`, "success");
      // Force re-render du computed
      this.$forceUpdate();
    },

    showToast(message, type = "success") {
      this.toast = { visible: true, message, type };
      setTimeout(() => {
        this.toast.visible = false;
      }, 3000);
    },
  },
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Exo+2:wght@400;500;700;800&display=swap");

/* ── FOND ── */
.shop-bg {
  min-height: 100vh;
  background: radial-gradient(ellipse at 20% 20%, #0a1628 0%, #040d18 50%, #020810 100%);
  font-family: "Exo 2", sans-serif;
  color: #d0e8e0;
  position: relative;
  overflow: hidden;
}

/* Particules flottantes */
.particles {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(29, 233, 192, 0.3) 0%, transparent 70%);
  animation: drift linear infinite;
}
@keyframes drift {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 0.5;
  }
  100% {
    transform: translateY(-80vh) scale(0.5);
    opacity: 0;
  }
}

/* ── WRAPPER ── */
.shop-wrapper {
  position: relative;
  z-index: 1;
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

/* ── HEADER ── */
.shop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2.5rem;
  gap: 1rem;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(29, 233, 192, 0.05);
  border: 1px solid rgba(29, 233, 192, 0.2);
  color: #1de9c0;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  letter-spacing: 0.08em;
  transition: all 0.2s;
  flex-shrink: 0;
}
.btn-back:hover {
  background: rgba(29, 233, 192, 0.15);
  box-shadow: 0 0 14px rgba(29, 233, 192, 0.2);
}

.header-center {
  text-align: center;
}

.shop-title {
  font-family: "Rajdhani", sans-serif;
  font-size: clamp(1.4rem, 3vw, 2.2rem);
  font-weight: 700;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #e0f5f0;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
}
.title-icon {
  color: #1de9c0;
  font-size: 1rem;
  opacity: 0.7;
}
.shop-subtitle {
  font-size: 0.8rem;
  color: #4a9e8e;
  letter-spacing: 0.2em;
  margin: 4px 0 0;
  text-transform: uppercase;
}

.gold-display {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 0.5rem 1.2rem;
  border-radius: 30px;
  flex-shrink: 0;
}
.gold-icon {
  font-size: 1.2rem;
}
.gold-amount {
  font-family: "Rajdhani", sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  color: #f59e0b;
}

/* ── CATEGORY TABS ── */
.category-tabs {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.cat-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #7ba89e;
  padding: 0.6rem 1.4rem;
  border-radius: 30px;
  font-family: "Rajdhani", sans-serif;
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.2s;
}
.cat-tab .cat-count {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 7px;
  border-radius: 10px;
}
.cat-tab.active {
  background: rgba(29, 233, 192, 0.1);
  border-color: rgba(29, 233, 192, 0.4);
  color: #1de9c0;
}
.cat-tab.active .cat-count {
  background: rgba(29, 233, 192, 0.2);
}
.cat-tab:hover:not(.active) {
  border-color: rgba(255, 255, 255, 0.15);
  color: #b0d8d0;
}

/* ── GRILLE ── */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

/* ── CARTE ITEM ── */
.item-card {
  background: rgba(8, 20, 36, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  overflow: hidden;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s;
  display: flex;
  flex-direction: column;
}
.item-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}
.item-card.equipped {
  border-color: rgba(29, 233, 192, 0.5);
  box-shadow: 0 0 25px rgba(29, 233, 192, 0.12);
}
.item-card.owned {
  border-color: rgba(255, 255, 255, 0.14);
}
.item-card.can-afford:hover {
  border-color: rgba(245, 158, 11, 0.35);
}
.item-card.cant-afford {
  opacity: 0.65;
}

/* ── PREVIEW ── */
.item-preview {
  position: relative;
  height: 160px;
  border-bottom: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 16px;
}

/* Mini-grille de jeu */
.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 36px);
  grid-template-rows: repeat(3, 36px);
  gap: 4px;
  z-index: 2;
}
.preview-cell {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  transition: all 0.2s;
}

/* Barre décorative (bateau) */
.preview-ship-bar {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: 110px;
  height: 6px;
  border-radius: 3px;
  opacity: 0.6;
}

/* Nom flottant */
.preview-label {
  position: absolute;
  top: 12px;
  left: 14px;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
}

/* Badges */
.status-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 3px 10px;
  border-radius: 20px;
}
.equipped-badge {
  background: rgba(29, 233, 192, 0.2);
  color: #1de9c0;
  border: 1px solid rgba(29, 233, 192, 0.4);
}
.owned-badge {
  background: rgba(255, 255, 255, 0.07);
  color: #8abcb0;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.free-badge {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

/* ── CORPS CARTE ── */
.item-body {
  padding: 1.1rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.item-name {
  font-family: "Rajdhani", sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e0f2ee;
  margin: 0;
}

.item-desc {
  font-size: 0.82rem;
  color: #6a9e92;
  line-height: 1.5;
  margin: 0;
  flex: 1;
}

/* Palette de couleurs */
.color-palette {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}
.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: help;
  transition: transform 0.15s;
}
.color-dot:hover {
  transform: scale(1.4);
}

/* ── BOUTONS ACTION ── */
.item-actions {
  margin-top: 0.75rem;
}

.btn-buy,
.btn-equip,
.btn-equipped {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  font-family: "Rajdhani", sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.25s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-buy {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.08) 100%);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #f59e0b;
}
.btn-buy:hover:not(.disabled) {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.15) 100%);
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.2);
  transform: scale(1.02);
}
.btn-buy.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.btn-equip {
  background: linear-gradient(135deg, rgba(29, 233, 192, 0.12) 0%, rgba(29, 233, 192, 0.06) 100%);
  border: 1px solid rgba(29, 233, 192, 0.35);
  color: #1de9c0;
}
.btn-equip:hover {
  background: linear-gradient(135deg, rgba(29, 233, 192, 0.25) 0%, rgba(29, 233, 192, 0.12) 100%);
  box-shadow: 0 0 20px rgba(29, 233, 192, 0.2);
  transform: scale(1.02);
}

.btn-equipped {
  background: rgba(29, 233, 192, 0.07);
  border: 1px solid rgba(29, 233, 192, 0.2);
  color: #1de9c0;
  opacity: 0.8;
  cursor: default;
}

.spinner {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── LOADING ── */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 0;
  gap: 1.5rem;
  color: #4a9e8e;
  font-family: "Rajdhani", sans-serif;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
.sonar-ring {
  width: 60px;
  height: 60px;
  border: 2px solid rgba(29, 233, 192, 0.3);
  border-top-color: #1de9c0;
  border-radius: 50%;
  animation: spin 1.2s linear infinite;
}

/* ── TOAST ── */
.toast {
  position: fixed;
  bottom: 2.5rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.9rem 2rem;
  border-radius: 30px;
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: 0.08em;
  z-index: 9999;
  pointer-events: none;
  white-space: nowrap;
}
.toast.success {
  background: rgba(29, 233, 192, 0.15);
  border: 1px solid rgba(29, 233, 192, 0.4);
  color: #1de9c0;
  box-shadow: 0 8px 30px rgba(29, 233, 192, 0.15);
}
.toast.error {
  background: rgba(248, 113, 113, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.4);
  color: #f87171;
  box-shadow: 0 8px 30px rgba(248, 113, 113, 0.15);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px) scale(0.9);
}

/* ── RESPONSIVE ── */
@media (max-width: 640px) {
  .shop-header {
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
  }
  .header-center {
    order: -1;
    width: 100%;
  }
  .items-grid {
    grid-template-columns: 1fr;
  }
}
</style>
