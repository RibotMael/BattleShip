import { defineStore } from "pinia";

const API_BASE_URL = import.meta.env.VITE_API_URL;

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}`
    : null;
}

export const useShopStore = defineStore("shop", {
  state: () => ({
    items: [],
    ownedIds: [],
    activeThemeSlug: "default",
    gold: 0,
    loading: false,
  }),

  actions: {
    async fetchShop(userId) {
      this.loading = true;
      try {
        const res = await fetch(`${API_BASE_URL}/api/shop/${userId}`);
        const data = await res.json();
        if (data.success) {
          this.items = data.items;
          this.ownedIds = data.ownedItemIds;
          this.activeThemeSlug = data.activeTheme || "default";
          this.gold = data.gold;
          this.applyThemeToDOM();
        }
      } catch (err) {
        console.error("Erreur chargement shop:", err);
        // Fallback : appliquer le thème stocké en localStorage
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user.active_theme) {
          this.activeThemeSlug = user.active_theme;
        }
        this.applyThemeToDOM();
      } finally {
        this.loading = false;
      }
    },

    async buyItem(userId, item) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/shop/buy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, itemId: item.id }),
        });
        const data = await res.json();
        if (data.success) {
          this.ownedIds.push(item.id);
          this.gold = data.newGold;
          return { success: true, newGold: data.newGold };
        }
        return { success: false, message: data.message };
      } catch {
        return { success: false, message: "Erreur réseau" };
      }
    },

    async equipItem(userId, slug) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/shop/equip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, slug }),
        });
        const data = await res.json();
        if (data.success) {
          this.activeThemeSlug = slug;
          this.applyThemeToDOM();
          return true;
        }
      } catch (err) {
        console.error(err);
      }
      return false;
    },

    applyThemeToDOM() {
      // Thèmes hardcodés comme fallback si le store n'a pas encore chargé les items
      const FALLBACK_THEMES = {
        default:  { "--ocean-deep": "#071520", "--ocean-mid": "#0d2137", "--brass": "#c8933e", "--brass-light": "#eac040", "--accent": "#5eead4" },
        crimson:  { "--ocean-deep": "#1a0a0a", "--ocean-mid": "#2d1111", "--brass": "#d4443c", "--brass-light": "#ff6b5e", "--accent": "#ff9a8b" },
        arctic:   { "--ocean-deep": "#0a1a2e", "--ocean-mid": "#122a44", "--brass": "#6fb4d4", "--brass-light": "#a0d8ef", "--accent": "#d0f0ff" },
        abyss:    { "--ocean-deep": "#0d0818", "--ocean-mid": "#1a1030", "--brass": "#9b59b6", "--brass-light": "#c084e0", "--accent": "#e0b0ff" },
        phantom:  { "--ocean-deep": "#0e0e0e", "--ocean-mid": "#1a1a1a", "--brass": "#7a7a7a", "--brass-light": "#a0a0a0", "--accent": "#b0ffb0" },
        gold:     { "--ocean-deep": "#0f0a00", "--ocean-mid": "#1a1400", "--brass": "#ffd700", "--brass-light": "#ffe44d", "--accent": "#fff8b0" },
      };

      const theme = this.items.find((i) => i.slug === this.activeThemeSlug);
      let vars = null;

      if (theme?.css_vars) {
        try { vars = JSON.parse(theme.css_vars); } catch { /* ignore */ }
      }

      if (!vars) vars = FALLBACK_THEMES[this.activeThemeSlug] || FALLBACK_THEMES.default;

      const root = document.documentElement;

      for (const [key, value] of Object.entries(vars)) {
        root.style.setProperty(key, value); 
        const rgb = hexToRgb(value);
        if (rgb) root.style.setProperty(`${key}-rgb`, rgb);
      }
    },
  },
});