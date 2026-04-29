import { defineStore } from 'pinia';
import api from '@/api/api.js'; 

const BATEAU_VARS = {
  Cosmique:        { "--ocean-deep": "#0d0118", "--ocean-mid": "#1a0530", "--brass": "#a78bfa", "--brass-light": "#c4b5fd", "--accent": "#7c3aed" },
  Cyberpunk:       { "--ocean-deep": "#0a0014", "--ocean-mid": "#140025", "--brass": "#f0abfc", "--brass-light": "#e879f9", "--accent": "#06b6d4" },
  Enfer:           { "--ocean-deep": "#180500", "--ocean-mid": "#2d0a00", "--brass": "#f97316", "--brass-light": "#fb923c", "--accent": "#dc2626" },
  Abyssal:         { "--ocean-deep": "#020a0f", "--ocean-mid": "#051520", "--brass": "#6ee7b7", "--brass-light": "#a7f3d0", "--accent": "#38bdf8" },
  "Fleur Spirituel": { "--ocean-deep": "#0f0814", "--ocean-mid": "#1a1028", "--brass": "#f9a8d4", "--brass-light": "#fbcfe8", "--accent": "#86efac" },
};

const DEFAULT_BATEAU_VARS = {
  "--ocean-deep": "#071520", "--ocean-mid": "#0d2137",
  "--brass": "#c8933e", "--brass-light": "#eac040", "--accent": "#5eead4",
};

export const useShopStore = defineStore('shop', {
  state: () => ({
    items: [],
    ownedIds: [],
    activeIds: {
      avatar: null,
      bateau: null,
      fond: null
    },
    gold: 0,
    loading: false
  }),

  actions: {
    async fetchShop(userId) {
    this.loading = true;

    try {
      const res = await api.get(`/shop/${userId}`);

      if (res.data.success) {
        this.items = (res.data.items || []).map((i) => ({
          id: i.id,
          name: i.name || i.nom || "Skin",
          category: (i.category || i.type || "").toLowerCase(),
          price: Number(i.price) || 0,
          image_prefix: i.image_prefix || i.prefix || i.image || "",
          folder_name: i.folder_name || i.image || i.background || "",
          theme: i.theme || i.name || ""
        }));

        this.ownedIds = res.data.ownedIds || [];

        this.activeIds = res.data.activeIds || {
          avatar: null,
          bateau: null,
          fond: null
        };

        this.gold = Number(res.data.gold) || 0;
      }
    } catch (error) {
      // 
    } finally {
      this.loading = false;
    }

    },

    async buyItem(userId, item) {
      try {
        const res = await api.post('/shop/buy', { userId, skinId: item.id });
        if (res.data.success) {
          this.ownedIds.push(item.id);
          this.gold = res.data.newGold;
          return { success: true, newGold: this.gold };
        }
        return { success: false, message: res.data.message };
      } catch (error) {
        return { success: false, message: error.response?.data?.message || "Erreur" };
      }
    },

    async equipItem(userId, item) {
      try {
        const res = await api.post('/shop/equip', { 
          userId, 
          skinId: item.id, 
          category: item.category 
        });
        if (res.data.success) {
          this.activeIds[item.category] = item.id;

          if (item.category === 'avatar') {
            const stored = JSON.parse(localStorage.getItem('user')) || {};
            stored.activeAvatarPrefix = item.id === 0 ? '' : (item.image_prefix || '');
            localStorage.setItem('user', JSON.stringify(stored));
          }

          if (item.category === 'fond') {
            const stored = JSON.parse(localStorage.getItem('user')) || {};
            stored.activeFondFolder = item.id === 0 ? '' : (item.folder_name || '');
            localStorage.setItem('user', JSON.stringify(stored));
          }

          return true;
        }
        return false;
      } catch (error) {
        console.error("Erreur équipement:", error);
        return false;
      }
    },
    applyThemeToDOM() {
      const activeTheme = localStorage.getItem('activeBateauTheme') || '';
      const vars = activeTheme && BATEAU_VARS[activeTheme]
        ? BATEAU_VARS[activeTheme]
        : DEFAULT_BATEAU_VARS;

      Object.entries(vars).forEach(([k, v]) =>
        document.documentElement.style.setProperty(k, v)
      );

      const activeFondId = this.activeIds?.fond;
      const activeFond = activeFondId
        ? this.items.find(i => i.id === activeFondId && i.category === 'fond')
        : null;

      const stored = JSON.parse(localStorage.getItem('user')) || {};
      stored.activeFondFolder = activeFond
        ? (activeFond.image_prefix || '').toLowerCase()
        : (stored.activeFondFolder || '');
      localStorage.setItem('user', JSON.stringify(stored));
    },
  }
});