export function xpForNextLevel(level) {
  return Math.floor(100 * Math.pow(1.02, level));
}

export function computeLevel(totalXp) {
  let level = 0;
  let used = 0;
  if (totalXp <= 0) return { level: 0, xpIntoLevel: 0, xpNeededForNext: 100 };

  while (true) {
    const needed = xpForNextLevel(level);
    if (used + needed > totalXp) {
      return { level, xpIntoLevel: totalXp - used, xpNeededForNext: needed };
    }
    used += needed;
    level++;
    
    if (level > 1000) {
      return { level: 1000, xpIntoLevel: 0, xpNeededForNext: xpForNextLevel(1000) };
    }
  }
}