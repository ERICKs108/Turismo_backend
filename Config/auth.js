const jwt = require('jsonwebtoken');
const AppError = require('./errors');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new AppError('JWT_SECRET debe configurarse con al menos 32 caracteres.', 503);
  }
  return secret;
}

function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return next(new AppError('Se requiere un token Bearer válido.', 401));
  }

  try {
    req.auth = jwt.verify(match[1], getSecret(), { issuer: 'turismo-backend' });
    return next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError('El token es inválido o ha expirado.', 401));
  }
}

function requireRole(role) {
  return function roleGuard(req, res, next) {
    if (!req.auth || req.auth.role !== role) {
      return next(new AppError('No tienes autorización para realizar esta operación.', 403));
    }
    return next();
  };
}

module.exports = { getSecret, requireAuth, requireRole };
