export function xpForNextLevel(level) {
  return Math.floor(100 * Math.pow(1.02, level));
}

export function computeLevel(totalXp) {
  let level = 0;
  let used = 0;
  // Sécurité au cas où totalXp est négatif ou nul
  if (totalXp <= 0) return { level: 0, xpIntoLevel: 0, xpNeededForNext: 100 };

  while (true) {
    const needed = xpForNextLevel(level);
    if (used + needed > totalXp) {
      return { level, xpIntoLevel: totalXp - used, xpNeededForNext: needed };
    }
    used += needed;
    level++;
    
    // Sécurité ultime pour éviter une boucle infinie si bug
    if (level > 1000) break; 
  }
}