const jwt = require('jsonwebtoken');
const { getDb } = require('../../database/init');
const config = require('../../config');

// 手机号登录/注册
exports.phoneLogin = (req, res) => {
  const { phone, nickname } = req.body;
  if (!phone || !/^1\d{10}$/.test(phone)) {
    return res.status(400).json({ error: '请输入正确的11位手机号' });
  }
  if (!nickname || nickname.trim().length === 0) {
    return res.status(400).json({ error: '请输入昵称' });
  }

  const db = getDb();
  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);

  if (user) {
    // 已存在，更新昵称并登录
    if (nickname.trim() !== user.nickname) {
      db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname.trim(), user.id);
    }
  } else {
    // 新用户，自动注册
    const result = db.prepare(
      'INSERT INTO users (openid, phone, nickname) VALUES (?, ?, ?)'
    ).run('phone_' + phone, phone, nickname.trim());
    user = { id: result.lastInsertRowid, phone, nickname: nickname.trim(), is_admin: 0 };
  }

  const token = jwt.sign(
    { id: user.id, phone: user.phone, is_admin: user.is_admin || 0 },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  res.json({ token, user: { id: user.id, phone: user.phone, nickname: user.nickname || nickname.trim() } });
};
