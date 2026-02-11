// utils/gameRules.js

export function normalizeLanguage(versionName = "French") {
  const raw = versionName.toLowerCase();
  if (raw.startsWith("fr")) return "fr";
  if (raw.startsWith("bel")) return "be";
  return "fr";
}

export function computeTotalPlayers(game, teamSize = null) {
  // Battle Royale
  if (game.id_game_type === 1) return null;

  // Solo
  if (game.id_game_type === 3) return 2;

  // Team
  if (teamSize) return teamSize * 2;

  return 2;
}

export function computeMinPlayers(game, teamSize = null) {
  if (game.id_game_type === 1) return 2; // Battle Royale
  if (game.id_game_type === 3) return 2;
  if (teamSize) return teamSize * 2;
  return 2;
}
