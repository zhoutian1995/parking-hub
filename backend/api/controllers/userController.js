const jwt = require('jsonwebtoken');
const { getDb } = require('../../database/init');
const config = require('../../config');

// 微信授权登录 - 生成授权URL
exports.wechatLogin = (req, res) => {
  if (!config.wechat.appId) {
    return res.json({ url: null, dev: true, message: '微信未配置，使用开发模式' });
  }
  const redirectUri = encodeURIComponent(`https://${config.domain}/api/wechat/callback`);
  const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${config.wechat.appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=parking#wechat_redirect`;
  res.json({ url });
};

// 微信回调
exports.wechatCallback = async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/?error=no_code');

  try {
    // 换取 access_token
    const tokenRes = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${config.wechat.appId}&secret=${config.wechat.secret}&code=${code}&grant_type=authorization_code`);
    const tokenData = await tokenRes.json();
    if (tokenData.errcode) throw new Error(tokenData.errmsg);

    // 获取用户信息
    const userRes = await fetch(`https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}&lang=zh_CN`);
    const userData = await userRes.json();

    const db = getDb();
    let user = db.prepare('SELECT * FROM users WHERE openid = ?').get(tokenData.openid);

    if (!user) {
      const info = userData.nickname ? userData : { nickname: '', headimgurl: '' };
      const result = db.prepare(
        'INSERT INTO users (openid, nickname, avatar) VALUES (?, ?, ?)'
      ).run(tokenData.openid, info.nickname || '', info.headimgurl || '');
      user = { id: result.lastInsertRowid, openid: tokenData.openid, nickname: info.nickname, is_admin: 0, verified: 0 };
    } else {
      if (userData.nickname) {
        db.prepare('UPDATE users SET nickname = ?, avatar = ? WHERE id = ?').run(userData.nickname, userData.headimgurl || '', user.id);
      }
    }

    const token = jwt.sign(
      { id: user.id, openid: user.openid, is_admin: user.is_admin },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.redirect(`/?token=${token}`);
  } catch (err) {
    console.error('WeChat callback error:', err);
    res.redirect('/?error=auth_failed');
  }
};

// 获取当前用户
exports.getMe = (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, nickname, avatar, phone, building, unit, preferred_zone, verified, is_admin, credit FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
};

// 更新用户信息
exports.updateMe = (req, res) => {
  const db = getDb();
  const { nickname, building, unit, preferred_zone } = req.body;

  // 校验昵称
  if (nickname !== undefined && !nickname.trim()) {
    return res.status(400).json({ error: '昵称不能为空' });
  }

  // 校验楼栋（如果提供了）
  if (building) {
    const b = db.prepare('SELECT id FROM buildings WHERE name = ?').get(building);
    if (!b) return res.status(400).json({ error: '楼栋不存在' });
  }

  // 校验区域（如果提供了）
  if (preferred_zone) {
    const z = db.prepare('SELECT id FROM zones WHERE code = ?').get(preferred_zone);
    if (!z) return res.status(400).json({ error: '区域不存在' });
  }

  // 动态构建更新
  const updates = [];
  const params = [];
  if (nickname !== undefined) { updates.push('nickname = ?'); params.push(nickname.trim()); }
  if (building !== undefined) { updates.push('building = ?'); params.push(building); }
  if (unit !== undefined) { updates.push('unit = ?'); params.push(unit); }
  if (preferred_zone !== undefined) { updates.push('preferred_zone = ?'); params.push(preferred_zone); }

  if (updates.length === 0) return res.status(400).json({ error: '没有要更新的字段' });

  params.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  res.json({ message: '更新成功' });
};

// 提交认证凭证
exports.submitVerify = (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: '请上传凭证照片' });

  const db = getDb();
  // 保存到 verifications 表
  const result = db.prepare(
    'INSERT INTO verifications (user_id, image_path, status) VALUES (?, ?, ?)'
  ).run(req.user.id, image, 'pending');

  res.json({ id: result.lastInsertRowid, message: '已提交，等待管理员审核' });
};

// 获取楼栋列表
exports.getBuildings = (req, res) => {
  const db = getDb();
  const buildings = db.prepare('SELECT id, name, units FROM buildings ORDER BY sort_order').all();
  res.json(buildings);
};

// 获取区域列表
exports.getZones = (req, res) => {
  const db = getDb();
  const zones = db.prepare('SELECT id, code, label, floor FROM zones ORDER BY sort_order').all();
  res.json(zones);
};
