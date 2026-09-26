const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim()) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production.');
  }
  return 'ecopulse-development-secret-change-me';
}

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      name: user.name
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication token required.' }
    });
  }

  try {
    req.user = jwt.verify(token, getJwtSecret());
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired session token.' }
    });
  }
}

module.exports = { generateToken, authenticateToken };
