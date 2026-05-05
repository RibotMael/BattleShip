import jwt from 'jsonwebtoken';

/**
 * Middleware d'authentification JWT.
 * Vérifie le token Bearer dans le header Authorization.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token manquant ou mal formé.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, pseudo }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expiré.' });
    }
    return res.status(401).json({ success: false, message: 'Token invalide.' });
  }
}

/**
 * Middleware de vérification que l'utilisateur agit sur ses propres ressources.
 * Paramètre de route attendu : :id
 */
export function requireSelf(req, res, next) {
  const paramId = parseInt(req.params.id, 10);
  if (req.user.id !== paramId) {
    return res.status(403).json({ success: false, message: 'Accès interdit.' });
  }
  next();
}