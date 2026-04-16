// api/avatar.js
import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/avatars', async (req, res) => {
  try {
    const [rows] = await query(
      'SELECT ID_Avatar, Avatar, mime_type, Name FROM avatar ORDER BY ID_Avatar ASC'
    );

    // avatar stocké en BLOB, puis le transforme en base64
    const avatars = rows.map(av => ({
      ID_Avatar: av.ID_Avatar,
      Name: av.Name,
      mime_type: av.mime_type,
      Avatar: Buffer.isBuffer(av.Avatar) ? av.Avatar.toString('base64') : av.Avatar
    }));

    res.json({ avatars });
  } catch (err) {
    res.status(500).json({ message: 'Erreur récupération avatars' });
  }
});

export default router;
