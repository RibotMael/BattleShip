// battleship-api/api/create-game
router.post('/create-game', (req, res) => {
  const { hostId, mode, langue, isPrivate, total } = req.body;

  const game = {
    id: uuid(), // ou nanoid
    hostId,
    players: [hostId],
    mode,
    langue,
    isPrivate,
    totalPlayers: total || 2,
    status: 'waiting'
  };

  games.push(game); // liste en mémoire pour commencer
  res.json({ success: true, gameId: game.id });
});
