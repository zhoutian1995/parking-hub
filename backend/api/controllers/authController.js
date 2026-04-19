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

// 微信授权 URL
exports.wechatAuth = (req, res) => {
  const config = require('../../config');
  if (!config.wechat.appId) return res.status(500).json({ error: '微信配置未设置' });
  const redirectUri = encodeURIComponent(req.query.redirect_uri || 'https://' + config.domain + '/api/auth/wechat/callback');
  const url = 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=' + config.wechat.appId + '&redirect_uri=' + redirectUri + '&response_type=code&scope=snsapi_userinfo&state=parking#wechat_redirect';
  res.redirect(url);
};

// 微信授权回调
exports.wechatCallback = async (req, res) => {
  const config = require('../../config');
  const jwt = require('jsonwebtoken');
  const { code } = req.query;
  if (!code) return res.redirect('/?error=no_code');
  try {
    const tokenUrl = 'https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + config.wechat.appId + '&secret=' + config.wechat.secret + '&code=' + code + '&grant_type=authorization_code';
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
    if (tokenData.errcode) return res.redirect('/?error=wechat_auth_failed');
    const openid = tokenData.openid;
    let nickname = '';
    try {
      const infoUrl = 'https://api.weixin.qq.com/sns/userinfo?access_token=' + tokenData.access_token + '&openid=' + openid + '&lang=zh_CN';
      const infoRes = await fetch(infoUrl);
      const info = await infoRes.json();
      if (!info.errcode) nickname = info.nickname || '';
    } catch(e) {}
    const db = require('../../database/init').getDb();
    let user = db.prepare('SELECT * FROM users WHERE openid = ?').get(openid);
    if (!user) {
      const r = db.prepare('INSERT INTO users (openid, nickname) VALUES (?, ?)').run(openid, nickname || '邻居');
      user = { id: r.lastInsertRowid, openid, nickname, is_admin: 0 };
    } else if (nickname && nickname !== user.nickname) {
      db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname, user.id);
    }
    const token = jwt.sign({ id: user.id, openid: user.openid, is_admin: user.is_admin || 0 }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    res.redirect('/?token=' + token);
  } catch (e) { res.redirect('/?error=server_error'); }
};

// 测试面板 - 获取账号列表
exports.testAccounts = (req, res) => {
  const db = require('../../database/init').getDb();
  const users = db.prepare("SELECT id, phone, nickname FROM users WHERE phone != '' ORDER BY id LIMIT 20").all();
  res.json(users);
};

// 测试面板 - 快速登录
exports.testLogin = (req, res) => {
  const jwt = require('jsonwebtoken');
  const config = require('../../config');
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: '需要手机号' });
  const db = require('../../database/init').getDb();
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  const token = jwt.sign({ id: user.id, openid: user.openid, is_admin: user.is_admin || 0 }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  res.json({ token, user: { id: user.id, phone: user.phone, nickname: user.nickname } });
};
