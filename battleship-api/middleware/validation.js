/**
 * Valide les champs d'inscription.
 */
export function validateRegister(req, res, next) {
  const { email, password, pseudo, birthDay, avatar } = req.body;

  if (!email || !password || !pseudo || !birthDay || !avatar) {
    return res.status(400).json({ success: false, message: 'Tous les champs sont requis.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Format email invalide.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 8 caractères.' });
  }
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins une majuscule.' });
  }
  if (!/[0-9]/.test(password)) {
    return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins un chiffre.' });
  }

  if (pseudo.length < 3 || pseudo.length > 20) {
    return res.status(400).json({ success: false, message: 'Le pseudo doit faire entre 3 et 20 caractères.' });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(pseudo)) {
    return res.status(400).json({ success: false, message: 'Le pseudo ne peut contenir que des lettres, chiffres, _ et -.' });
  }

  const birth = new Date(birthDay);
  if (isNaN(birth.getTime())) {
    return res.status(400).json({ success: false, message: 'Date de naissance invalide.' });
  }
  const age = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (age < 13) {
    return res.status(400).json({ success: false, message: 'Vous devez avoir au moins 13 ans.' });
  }

  next();
}

/**
 * Valide les champs de connexion.
 */
export function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email et mot de passe requis.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Format email invalide.' });
  }

  if (typeof password !== 'string' || password.length > 128) {
    return res.status(400).json({ success: false, message: 'Mot de passe invalide.' });
  }

  next();
}