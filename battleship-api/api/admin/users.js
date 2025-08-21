import { Router } from 'express';
const router = Router();
import { query } from '../../db.js';

router.delete('/users/:id', (req, res) => {
  console.log('DELETE admin/users/:id appelé, ID:', req.params.id);

  const userId = req.params.id;
  query('DELETE FROM users WHERE ID_Users = ?', [userId], (err, result) => {
    if (err) {
      console.error("Erreur suppression :", err.message);
      return res.status(500).send("Erreur lors de la suppression : " + err.message);
    }
    if (result.affectedRows === 0) {
      return res.status(404).send("Utilisateur non trouvé");
    }
    res.sendStatus(204);
  });
});

export default router;
