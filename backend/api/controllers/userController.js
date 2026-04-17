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
  const user = db.prepare('SELECT id, nickname, avatar, phone, building, room, verified, is_admin, credit FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
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
