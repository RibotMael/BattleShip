<template>
  <div class="shop-bg">
    <div class="particles">
      <span v-for="i in 18" :key="i" class="particle" :style="particleStyle(i)"></span>
    </div>

    <div class="shop-wrapper">
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
            <span class="title-icon">◈</span>ARSENAL DES SKINS<span class="title-icon">◈</span>
          </h1>
          <p class="shop-subtitle">Personnalisez votre flotte</p>
        </div>
        <div class="gold-display">
          <span class="gold-icon">🪙</span>
          <span class="gold-amount">{{ shopStore.gold }}</span>
        </div>
      </header>

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

      <div v-if="shopStore.loading" class="loading-state">
        <div class="sonar-ring"></div>
        <p>Chargement de l'arsenal…</p>
      </div>

      <div v-else class="items-grid">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="item-card"
          :class="{
            owned: isOwned(item),
            equipped: isEquipped(item),
            'can-afford': !isOwned(item) && shopStore.gold >= item.price,
            'cant-afford': !isOwned(item) && shopStore.gold < item.price,
          }"
          :style="cardGlowStyle(item)"
        >
          <div class="item-preview" :style="buildPreview(item)">
            <template v-if="item.category === 'avatar'">
              <div class="preview-avatar-ring" :style="ringStyle(item)">
                <img
                  :src="skinImgSrc(item)"
                  :alt="item.name"
                  class="avatar-portrait"
                  @error="onImgError($event)"
                />
                <span class="skin-fallback">🧑‍✈️</span>
              </div>
              <div class="preview-rarity" :style="{ color: rarityColor(item.price) }">
                {{ rarityLabel(item.price) }}
              </div>
            </template>

            <template v-else-if="item.category === 'bateau'">
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
                  :style="bateauCellStyle(item, n)"
                ></div>
              </div>
              <div
                class="preview-ship-bar"
                :style="{ background: bateauVar(item, '--brass') }"
              ></div>
              <div class="preview-grid-label" :style="{ color: bateauVar(item, '--accent') }">
                FLOTTE
              </div>
            </template>

            <template v-else-if="item.category === 'fond'">
              <img
                :src="skinImgSrc(item)"
                :alt="item.name"
                class="fond-preview-img"
                @error="onImgError($event)"
              />
              <div class="fond-overlay"></div>
              <span class="skin-fallback fond-fallback">🌊</span>
            </template>

            <div class="preview-label">{{ item.name }}</div>
            <div v-if="isEquipped(item)" class="status-badge equipped-badge">✓ ACTIF</div>
            <div v-else-if="isOwned(item)" class="status-badge owned-badge">POSSÉDÉ</div>
            <div v-else-if="item.price === 0" class="status-badge free-badge">GRATUIT</div>
          </div>

          <div class="item-body">
            <h3 class="item-name">{{ item.name }}</h3>

            <div v-if="item.category === 'bateau'" class="color-palette">
              <span
                v-for="(col, vname) in bateauVars(item)"
                :key="vname"
                class="color-dot"
                :style="{ background: col }"
                :title="vname + ': ' + col"
              ></span>
            </div>
            <div v-else class="rarity-row" :style="{ color: rarityColor(item.price) }">
              {{ rarityLabel(item.price) }}
            </div>

            <div class="item-actions">
              <template v-if="isEquipped(item)">
                <button class="btn-equipped" disabled><span>◈</span> Actif</button>
              </template>
              <template v-else-if="isOwned(item)">
                <button class="btn-equip" @click="equipItem(item)">Activer</button>
              </template>
              <template v-else>
                <button
                  class="btn-buy"
                  :class="{ disabled: shopStore.gold < item.price }"
                  :disabled="shopStore.gold < item.price || buyingId === item.id"
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

        <div v-if="filteredItems.length === 0" class="empty-state">{{ emptyLabel }}</div>
      </div>

      <transition name="toast">
        <div v-if="toast.visible" class="toast" :class="toast.type">{{ toast.message }}</div>
      </transition>
    </div>
  </div>
</template>

<script>
import.meta.glob("../assets/Bataille_Navale_Assets-main/Avatar/*.png", { eager: true });
import.meta.glob("../assets/Bataille_Navale_Assets-main/Background/*.png", { eager: true });
import { useShopStore } from "@/stores/shopStore.js";
import { userBus } from "@/eventBus.js";

const backgroundImgs = Object.fromEntries(
  Object.entries(
    import.meta.glob("../assets/Bataille_Navale_Assets-main/Background/*.png", { eager: true }),
  ).map(([path, mod]) => [path.split("/").pop(), mod.default]),
);

/* -- Résolution des images avec Vite Glob -- */
const avatarImgs = Object.fromEntries(
  Object.entries(
    import.meta.glob("../assets/Bataille_Navale_Assets-main/Avatar/*.png", { eager: true }),
  ).map(([path, mod]) => [path.split("/").pop(), mod.default]),
);

const fondImgs = Object.fromEntries(
  Object.entries(
    import.meta.glob("../assets/Bataille_Navale_Assets-main/Background/*.png", { eager: true }),
  ).map(([path, mod]) => [path.split("/").pop(), mod.default]),
);

const RARITY = [
  { min: 5000, label: "◈ LÉGENDAIRE", color: "#a78bfa" },
  { min: 3000, label: "◈ ÉPIQUE", color: "#f0abfc" },
  { min: 700, label: "◈ RARE", color: "#60a5fa" },
  { min: 0, label: "◈ COMMUN", color: "#6ee7b7" },
];

const BATEAU_VARS = {
  Cosmique: {
    "--ocean-deep": "#0d0118",
    "--ocean-mid": "#1a0530",
    "--brass": "#a78bfa",
    "--brass-light": "#c4b5fd",
    "--accent": "#7c3aed",
  },
  Cyberpunk: {
    "--ocean-deep": "#0a0014",
    "--ocean-mid": "#140025",
    "--brass": "#f0abfc",
    "--brass-light": "#e879f9",
    "--accent": "#06b6d4",
  },
  Enfer: {
    "--ocean-deep": "#180500",
    "--ocean-mid": "#2d0a00",
    "--brass": "#f97316",
    "--brass-light": "#fb923c",
    "--accent": "#dc2626",
  },
  Abyssal: {
    "--ocean-deep": "#020a0f",
    "--ocean-mid": "#051520",
    "--brass": "#6ee7b7",
    "--brass-light": "#a7f3d0",
    "--accent": "#38bdf8",
  },
  "Fleur Spirituel": {
    "--ocean-deep": "#0f0814",
    "--ocean-mid": "#1a1028",
    "--brass": "#f9a8d4",
    "--brass-light": "#fbcfe8",
    "--accent": "#86efac",
  },
};

const HARDCODED_BATEAU_ITEMS = [
  { id: "bateau_cosmique", name: "Cosmique", category: "bateau", price: 0, theme: "Cosmique" },
  { id: "bateau_cyberpunk", name: "Cyberpunk", category: "bateau", price: 0, theme: "Cyberpunk" },
  { id: "bateau_enfer", name: "Enfer", category: "bateau", price: 0, theme: "Enfer" },
  { id: "bateau_abyssal", name: "Abyssal", category: "bateau", price: 0, theme: "Abyssal" },
  {
    id: "bateau_fleur",
    name: "Fleur Spirituel",
    category: "bateau",
    price: 0,
    theme: "Fleur Spirituel",
  },
];

const DEFAULT_BATEAU_VARS = {
  "--ocean-deep": "#071520",
  "--ocean-mid": "#0d2137",
  "--brass": "#c8933e",
  "--brass-light": "#eac040",
  "--accent": "#5eead4",
};

export default {
  name: "ShopView",
  setup() {
    const shopStore = useShopStore();
    return { shopStore };
  },

  data() {
    return {
      activeCategory: "avatar",
      buyingId: null,
      toast: { visible: false, message: "", type: "success" },
      categories: [
        { id: "avatar", label: "Avatars", icon: "🧑‍✈️" },
        { id: "bateau", label: "Bateaux", icon: "🚢" },
        { id: "fond", label: "Fonds d'écran", icon: "🌊" },
      ],
    };
  },

  computed: {
    user() {
      try {
        return JSON.parse(localStorage.getItem("user")) || null;
      } catch {
        return null;
      }
    },
    filteredItems() {
      let items = this.shopStore.items
        .filter((i) => i.category === this.activeCategory)
        .slice()
        .sort((a, b) => b.price - a.price);

      if (this.activeCategory === "avatar") {
        items.unshift({ id: 0, name: "Base", category: "avatar", price: 0, theme: "Base" });
      }
      if (this.activeCategory === "bateau") {
        items = [...HARDCODED_BATEAU_ITEMS];
        items.unshift({ id: 0, name: "Base", category: "bateau", price: 0, theme: "Base" });
      }
      if (this.activeCategory === "fond") {
        items.unshift({ id: 0, name: "Base", category: "fond", price: 0, folder_name: "" });
      }

      return items;
    },
    emptyLabel() {
      return (
        {
          avatar: "Aucun avatar disponible.",
          bateau: "Aucun bateau disponible.",
          fond: "Aucun fond d'écran disponible.",
        }[this.activeCategory] ?? ""
      );
    },
  },

  async created() {
    const userId = this.user?.id || this.user?.ID_Users;
    if (userId) {
      await this.shopStore.fetchShop(userId);
    }
  },

  methods: {
    skinImgSrc(item) {
      const avatarId = this.user?.avatarId || 1;

      if (item.category === "avatar") {
        const prefix = item.id === 0 ? "" : (item.image_prefix || "").toLowerCase();
        if (!prefix) return avatarImgs[`${avatarId}.png`] || "";
        return avatarImgs[`${avatarId}${prefix}.png`] || "";
      }

      if (item.category === "fond") {
        if (item.id === 0) return backgroundImgs["Accueil.png"] || "";
        // image_prefix correspond exactement au suffixe du fichier
        const suffix = (item.image_prefix || "").toLowerCase();
        return backgroundImgs[`Accueil${suffix}.png`] || "";
      }

      return "";
    },

    onImgError(e) {
      e.target.style.display = "none";
      const fb = e.target.nextElementSibling;
      if (fb) fb.style.display = "flex";
    },

    bateauVars(item) {
      return BATEAU_VARS[item.theme] || BATEAU_VARS[item.name] || {};
    },
    bateauVar(item, name) {
      const v = BATEAU_VARS[item.theme] || BATEAU_VARS[item.name] || {};
      return v[name] || "#c8933e";
    },

    bateauCellStyle(item, n) {
      const v = BATEAU_VARS[item.name] || {};
      const brass = v["--brass"] || "#c8933e";
      const accent = v["--accent"] || "#5eead4";
      const mid = v["--ocean-mid"] || "#0d2137";
      if ([2, 5, 7].includes(n)) return { background: brass, boxShadow: `0 0 8px ${brass}` };
      if ([4, 8].includes(n))
        return { background: "transparent", borderColor: accent, opacity: 0.5 };
      if ([1, 3, 6].includes(n)) return { background: accent + "33", borderColor: accent };
      return { background: "transparent", borderColor: mid };
    },

    buildPreview(item) {
      if (item.id === 0) {
        return {
          background: "radial-gradient(circle, #1e293b, #020617)",
          borderColor: "#64748b",
        };
      }
      if (item.category === "bateau") {
        const v = BATEAU_VARS[item.name] || {};
        return {
          background: `linear-gradient(135deg, ${v["--ocean-deep"] || "#071520"} 0%, ${v["--ocean-mid"] || "#0d2137"} 100%)`,
          borderColor: v["--brass"] || "#c8933e",
        };
      }
      if (item.category === "fond") return { background: "#040d18", borderColor: "#1de9c033" };
      const color = this.rarityColor(item.price);
      return {
        background: `radial-gradient(ellipse at 50% 80%, ${color}18 0%, #040d18 70%)`,
        borderColor: color,
      };
    },

    ringStyle(item) {
      const color = this.rarityColor(item.price);
      return { borderColor: color, boxShadow: `0 0 18px ${color}55` };
    },

    cardGlowStyle(item) {
      if (this.activeCategory === "bateau") return {};
      const color = this.rarityColor(item.price);
      return { "--card-glow": color };
    },

    rarityColor(price) {
      return (RARITY.find((r) => price >= r.min) ?? RARITY.at(-1)).color;
    },
    rarityLabel(price) {
      return (RARITY.find((r) => price >= r.min) ?? RARITY.at(-1)).label;
    },

    particleStyle(i) {
      return {
        left: ((i * 37 + 13) % 97) + "%",
        top: ((i * 53 + 7) % 89) + "%",
        width: 0.3 + (i % 4) * 0.2 + "rem",
        height: 0.3 + (i % 4) * 0.2 + "rem",
        animationDuration: 3 + (i % 6) + "s",
        animationDelay: -(i * 0.4) + "s",
      };
    },

    isOwned(item) {
      if (item.price === 0) return true;
      if (typeof item.id === "string") return true; // hardcoded bateau toujours possédés
      return this.shopStore.ownedIds?.includes(item.id) ?? false;
    },

    isEquipped(item) {
      if (item.category === "bateau") {
        const active = localStorage.getItem("activeBateauTheme") || "";
        if (item.id === 0) return active === "";
        return active === item.theme;
      }
      if (item.id === 0) return !this.shopStore.activeIds?.[item.category];
      return this.shopStore.activeIds?.[item.category] === item.id;
    },

    countByCategory(cat) {
      if (cat === "bateau") return HARDCODED_BATEAU_ITEMS.length;
      return this.shopStore.items.filter((i) => i.category === cat).length;
    },

    async buyItem(item) {
      if (this.shopStore.gold < item.price || this.buyingId) return;
      const userId = this.user?.id || this.user?.ID_Users;
      if (!userId) return this.showToast("Utilisateur non connecté.", "error");

      this.buyingId = item.id;
      const result = await this.shopStore.buyItem(userId, item);

      if (result.success) {
        const updatedUser = { ...this.user, Gold: result.newGold, gold: result.newGold };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        if (userBus) userBus.userUpdated = !userBus.userUpdated;
        this.showToast(`🪙 "${item.name}" acheté !`, "success");
      } else {
        this.showToast(result.message || "Achat impossible.", "error");
      }
      this.buyingId = null;
    },

    async equipItem(item) {
      const userId = this.user?.id || this.user?.ID_Users;
      if (!userId) return;

      // ── Bateau : 100% local, pas d'API ──
      if (item.category === "bateau") {
        const theme = item.id === 0 ? "" : item.theme || "";
        localStorage.setItem("activeBateauTheme", theme);

        const vars = theme && BATEAU_VARS[theme] ? BATEAU_VARS[theme] : DEFAULT_BATEAU_VARS;
        Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
        if (userBus) userBus.userUpdated = !userBus.userUpdated;
        this.showToast(`✓ "${item.name}" activé !`, "success");
        return;
      }

      // ── Autres catégories : API ──
      const success = await this.shopStore.equipItem(userId, item);
      if (success) {
        if (item.category === "avatar") {
          const stored = JSON.parse(localStorage.getItem("user")) || {};
          const prefix = item.id === 0 ? "" : (item.image_prefix || "").toLowerCase();
          stored.activeAvatarPrefix = prefix;
          localStorage.setItem("user", JSON.stringify(stored));
        }
        if (item.category === "fond") {
          const stored = JSON.parse(localStorage.getItem("user")) || {};
          stored.activeFondFolder = item.id === 0 ? "" : (item.image_prefix || "").toLowerCase();
          localStorage.setItem("user", JSON.stringify(stored));
        }
        if (userBus) userBus.userUpdated = !userBus.userUpdated;
        this.showToast(`✓ "${item.name}" activé !`, "success");
      } else {
        this.showToast("Erreur lors de l'activation.", "error");
      }
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

.item-card {
  --card-glow: rgba(255, 255, 255, 0);
  background: rgba(8, 20, 36, 0.85);
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
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.5),
    0 0 15px var(--card-glow);
}

.shop-bg {
  min-height: 100vh;
  background: radial-gradient(ellipse at 20% 20%, #0a1628 0%, #040d18 50%, #020810 100%);
  font-family: "Exo 2", sans-serif;
  color: #d0e8e0;
  position: relative;
  overflow: hidden;
}
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

/* ── TABS ── */
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
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 1.5rem;
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
  height: 170px;
  border-bottom: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 16px;
}
.preview-label {
  position: absolute;
  top: 12px;
  left: 14px;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}
.preview-avatar-ring {
  width: 104px;
  height: 104px;
  border-radius: 50%;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  z-index: 2;
  transition: box-shadow 0.3s;
  background: rgba(255, 255, 255, 0.03);
}
.avatar-portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}
.skin-fallback {
  font-size: 2.6rem;
  line-height: 1;
  display: none;
  align-items: center;
  justify-content: center;
}

/* ── BATEAU ── */
.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 38px);
  grid-template-rows: repeat(3, 38px);
  gap: 4px;
  z-index: 2;
}
.preview-cell {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  transition: all 0.2s;
}
.preview-ship-bar {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: 118px;
  height: 5px;
  border-radius: 3px;
  opacity: 0.65;
}
.preview-grid-label {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-family: "Rajdhani", sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  white-space: nowrap;
}

/* ── FOND ── */
.fond-preview-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
  display: block;
}
.fond-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: linear-gradient(to top, rgba(4, 13, 24, 0.7) 0%, transparent 60%);
}
.fond-fallback {
  font-size: 3rem;
  z-index: 3;
  display: none;
  align-items: center;
  justify-content: center;
}
.preview-rarity {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-family: "Rajdhani", sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  white-space: nowrap;
  text-transform: uppercase;
  z-index: 3;
}

/* ── STATUS BADGE ── */
.status-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
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

/* ── CORPS ── */
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
.rarity-row {
  font-family: "Rajdhani", sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.color-palette {
  display: flex;
  gap: 6px;
  margin-top: 2px;
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

/* ── ACTIONS ── */
.item-actions {
  margin-top: auto;
  padding-top: 0.75rem;
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

/* ── LOADING & EMPTY ── */
.loading-state,
.empty-state {
  grid-column: 1/-1;
  text-align: center;
  padding: 5rem 0;
  gap: 1.5rem;
  color: #4a9e8e;
  font-family: "Rajdhani", sans-serif;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.empty-state {
  opacity: 0.6;
  padding: 4rem 0;
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
