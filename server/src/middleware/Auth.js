const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'eastminster-alumni-secret-changeme';

// JWT Authentication 
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Missing or invalid Authorization header. Format: Bearer <token>',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.users.find(u => u.id === payload.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Token valid but user not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token',
    });
  }
}

// API Key Authentication 
function authenticateKey(requiredScopes = []) {
  return (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (!key) {
      return res.status(401).json({ success: false, message: 'Missing X-API-Key header' });
    }

    const apiKey = db.apiKeys.find(k => k.key === key);
    if (!apiKey) {
      return res.status(401).json({ success: false, message: 'Invalid API key' });
    }
    if (!apiKey.active) {
      return res.status(403).json({ success: false, message: 'API key has been revoked' });
    }

    // Scope check
    if (requiredScopes.length > 0) {
      const hasAll = requiredScopes.every(s => apiKey.scopes.includes(s));
      if (!hasAll) {
        return res.status(403).json({
          success: false,
          message: `Insufficient scope. Required: ${requiredScopes.join(', ')}`,
        });
      }
    }

    // Log usage
    const { id: genId } = require('../db');
    apiKey.lastUsedAt = new Date().toISOString();
    db.apiUsageLogs.push({
      id:         genId(),
      apiKeyId:   apiKey.id,
      endpoint:   req.path,
      method:     req.method,
      timestamp:  new Date().toISOString(),
      statusCode: null, // filled by response hook in routes if needed
    });

    req.apiKey = apiKey;
    next();
  };
}

// Admin Guard 
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

module.exports = { authenticate, authenticateKey, requireAdmin, JWT_SECRET };