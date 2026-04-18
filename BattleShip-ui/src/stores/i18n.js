import { reactive, computed } from "vue";
import { settingsStore } from "./settings";

const translations = {
  fr: {
    // Auth
    auth_login_tab: "Connexion",
    auth_register_tab: "Inscription",
    auth_email: "Email",
    auth_password: "Mot de passe",
    auth_confirm_password: "Confirmer le mot de passe",
    auth_pseudo: "Pseudo",
    auth_birthday: "Naissance",
    auth_avatar: "Avatar",
    auth_terms: "J'accepte les",
    auth_terms_link: "CGU",
    auth_terms_suffix: "de BattleShip Arena.",
    auth_submit_login: "Se connecter",
    auth_submit_register: "S'inscrire",
    auth_toggle_to_register: "Pas encore de compte ? Inscris-toi",
    auth_toggle_to_login: "Déjà inscrit ? Connecte-toi",
    auth_pseudo_placeholder: "Capitaine...",

    // Menu
    menu_friends: "Amis",
    menu_deploy: "DÉPLOYER LA FLOTTE",
    menu_rules: "ARCHIVES (RÈGLES)",
    menu_create: "CRÉER UNE SALLE",
    menu_join: "REJOINDRE",
    menu_back: "RETOUR",
    menu_profile: "Mon Profil",
    menu_settings: "Paramètres",
    menu_logout: "Déconnexion",
    menu_level: "NIV.",

    // Settings
    settings_title: "CONFIGURATION SYSTÈME",
    settings_audio: "MODULE AUDIO",
    settings_music: "VOLUME MUSIQUE D'AMBIANCE",
    settings_effects: "EFFETS SONORES DE COMBAT",
    settings_visuals: "PARAMÈTRES VISUELS",
    settings_quality: "QUALITÉ DES RENDUS",
    settings_quality_low: "BASSE (PERFORMANCE)",
    settings_quality_med: "OPTIMISÉE",
    settings_quality_high: "HAUTE RÉSOLUTION",
    settings_heartbeat: "EFFET D'IMMERSION (HEARTBEAT)",
    settings_system: "SYSTÈME ET LANGUE",
    settings_language: "LANGUE D'INTERFACE",
    settings_back_game: "RETOUR PARTIE",
    settings_back_home: "RETOUR BASE",

    // GameBoard
    game_sector: "SECTEUR D'ENGAGEMENT",
    game_params: "PARAMÈTRES",
    game_abandon: "ABANDONNER LA MISSION",
    game_my_fleet: "MA FLOTTE",
    game_our_fleet: "NOTRE FLOTTE",
    game_reveal: "RÉVÉLER",
    game_hide: "MASQUER",
    game_fleet_hidden: "FLOTTE MASQUÉE",
    game_target: "CIBLE :",
    game_opponent: "ADVERSAIRE",
    game_targeted: "◀ CIBLÉ",
    game_eliminated: "UNITÉ ÉLIMINÉE - TRANSMISSION SPECTATEUR ACTIVÉE",
    game_return_hq: "RETOUR AU QG",
    game_credits: "CRÉDITS",
    game_xp: "EXPÉRIENCE",
    game_level_reached: "NIVEAU {n} ATTEINT !",
    game_level_bonus: "BONUS MONTÉE DE NIVEAU :",
  },
  en: {
    // Auth
    auth_login_tab: "Login",
    auth_register_tab: "Register",
    auth_email: "Email",
    auth_password: "Password",
    auth_confirm_password: "Confirm password",
    auth_pseudo: "Username",
    auth_birthday: "Birthday",
    auth_avatar: "Avatar",
    auth_terms: "I accept the",
    auth_terms_link: "ToS",
    auth_terms_suffix: "of BattleShip Arena.",
    auth_submit_login: "Log in",
    auth_submit_register: "Sign up",
    auth_toggle_to_register: "No account yet? Sign up",
    auth_toggle_to_login: "Already registered? Log in",
    auth_pseudo_placeholder: "Captain...",

    // Menu
    menu_friends: "Friends",
    menu_deploy: "DEPLOY FLEET",
    menu_rules: "ARCHIVES (RULES)",
    menu_create: "CREATE ROOM",
    menu_join: "JOIN",
    menu_back: "BACK",
    menu_profile: "My Profile",
    menu_settings: "Settings",
    menu_logout: "Logout",
    menu_level: "LVL.",

    // Settings
    settings_title: "SYSTEM CONFIGURATION",
    settings_audio: "AUDIO MODULE",
    settings_music: "AMBIENT MUSIC VOLUME",
    settings_effects: "COMBAT SOUND EFFECTS",
    settings_visuals: "VISUAL SETTINGS",
    settings_quality: "RENDER QUALITY",
    settings_quality_low: "LOW (PERFORMANCE)",
    settings_quality_med: "OPTIMIZED",
    settings_quality_high: "HIGH RESOLUTION",
    settings_heartbeat: "IMMERSION EFFECT (HEARTBEAT)",
    settings_system: "SYSTEM & LANGUAGE",
    settings_language: "INTERFACE LANGUAGE",
    settings_back_game: "BACK TO GAME",
    settings_back_home: "BACK TO BASE",

    // GameBoard
    game_sector: "ENGAGEMENT SECTOR",
    game_params: "SETTINGS",
    game_abandon: "ABANDON MISSION",
    game_my_fleet: "MY FLEET",
    game_our_fleet: "OUR FLEET",
    game_reveal: "REVEAL",
    game_hide: "HIDE",
    game_fleet_hidden: "FLEET HIDDEN",
    game_target: "TARGET:",
    game_opponent: "OPPONENT",
    game_targeted: "◀ TARGETED",
    game_eliminated: "UNIT ELIMINATED - SPECTATOR FEED ACTIVATED",
    game_return_hq: "RETURN TO HQ",
    game_credits: "CREDITS",
    game_xp: "EXPERIENCE",
    game_level_reached: "LEVEL {n} REACHED!",
    game_level_bonus: "LEVEL UP BONUS:",
  },
};

export const i18nStore = reactive({
  get lang() {
    return settingsStore.language || "fr";
  },
  t(key, vars = {}) {
    const dict = translations[this.lang] || translations.fr;
    let str = dict[key] ?? translations.fr[key] ?? key;
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(`{${k}}`, v);
    });
    return str;
  },
});