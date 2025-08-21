// battleship-api/api/join-game
router.post('/join-game', async (req, res) => {
  const { gameId, playerId } = req.body;
  const game = games.find(g => g.id === gameId && g.status === 'waiting');
  

if (alreadyJoined.length > 0) {
  return res.json({ success: true, message: 'Joueur déjà dans la partie' });
}


  if (!game) return res.status(404).json({ success: false, message: "Partie non trouvée" });

  if (game.players.length >= game.totalPlayers) {
    return res.status(400).json({ success: false, message: "Partie déjà pleine" });
  }

  game.players.push(playerId);

  // Démarrage si assez de joueurs
  if (game.players.length === game.totalPlayers) {
    game.status = 'ready';
  }

  res.json({ success: true, game });

  // Vérifier si le joueur est déjà dans la partie
    const [alreadyJoined] = await db.query(
    'SELECT * FROM game_players WHERE Game_ID = ? AND Player_ID = ?',
    [gameId, playerId]
    );
  
});
