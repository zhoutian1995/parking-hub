const jwt = require('jsonwebtoken');
const { getDb } = require('../database/init');
const config = require('../config');

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录' });
  }
  try {
    const decoded = jwt.verify(auth.split(' ')[1], config.jwt.secret);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
}

function adminMiddleware(req, res, next) {
  const db = getDb();
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

module.exports = { authMiddleware, adminMiddleware };
