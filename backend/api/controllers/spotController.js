const { getDb } = require('../../database/init');

// 附近可借车位（按常用区域排序）
exports.nearby = (req, res) => {
  const db = getDb();
  const limit = parseInt(req.query.limit) || 5;

  // 获取用户的常用区域
  const user = db.prepare('SELECT preferred_zone FROM users WHERE id = ?').get(req.user.id);
  const zone = user ? user.preferred_zone : '';

  let spots;
  if (zone) {
    // 同区域优先
    spots = db.prepare(`
      SELECT s.*, u.nickname as owner_name, u.building as owner_building, u.unit as owner_unit
      FROM spots s LEFT JOIN users u ON s.owner_id = u.id
      WHERE s.status = 'available' AND s.owner_id != ?
        AND NOT EXISTS (SELECT 1 FROM borrows b WHERE b.spot_id = s.id AND b.status IN ('pending','active'))
      ORDER BY
        CASE WHEN s.zone = ? THEN 0 ELSE 1 END,
        s.price_hour ASC
      LIMIT ?
    `).all(req.user.id, zone, limit);
  } else {
    // 未设置常用区域，返回所有可用车位
    spots = db.prepare(`
      SELECT s.*, u.nickname as owner_name, u.building as owner_building, u.unit as owner_unit
      FROM spots s LEFT JOIN users u ON s.owner_id = u.id
      WHERE s.status = 'available' AND s.owner_id != ?
        AND NOT EXISTS (SELECT 1 FROM borrows b WHERE b.spot_id = s.id AND b.status IN ('pending','active'))
      ORDER BY s.price_hour ASC
      LIMIT ?
    `).all(req.user.id, limit);
  }

  res.json(spots);
};

// 公开统计：动态按区域返回车位数量
exports.stats = (req, res) => {
  const db = getDb();
  // 从 zones 表动态获取所有区域
  const zones = db.prepare('SELECT code FROM zones ORDER BY sort_order').all().map(z => z.code);
  const result = { all: { total: 0, available: 0, occupied: 0 } };

  zones.forEach(z => {
    const total = db.prepare('SELECT COUNT(*) as c FROM spots WHERE zone = ?').get(z).c;
    const available = db.prepare("SELECT COUNT(*) as c FROM spots WHERE zone = ? AND status = 'available'").get(z).c;
    const occupied = db.prepare("SELECT COUNT(*) as c FROM spots WHERE zone = ? AND status = 'occupied'").get(z).c;
    result[z] = { total, available, occupied };
    result.all.total += total;
    result.all.available += available;
    result.all.occupied += occupied;
  });

  res.json(result);
};

// 搜索车位
exports.search = (req, res) => {
  const db = getDb();
  const q = (req.query.q || '').trim().toUpperCase();
  if (!q || q.length < 2) return res.json([]);
  const spots = db.prepare(
    `SELECT s.*, u.nickname as owner_name 
     FROM spots s LEFT JOIN users u ON s.owner_id = u.id 
     WHERE s.spot_code LIKE ? ORDER BY s.spot_code LIMIT 20`
  ).all(`%${q}%`);
  res.json(spots);
};

// 列出车位（公开）
exports.listSpots = (req, res) => {
  const db = getDb();
  const { zone, status } = req.query;
  let sql = `SELECT s.*, u.nickname as owner_name 
             FROM spots s LEFT JOIN users u ON s.owner_id = u.id WHERE 1=1`;
  const params = [];
  if (zone) { sql += ' AND s.zone = ?'; params.push(zone); }
  if (status) { sql += ' AND s.status = ?'; params.push(status); }
  sql += ' ORDER BY s.spot_code';
  const spots = db.prepare(sql).all(...params);
  res.json(spots);
};

// 单个车位详情
exports.getSpot = (req, res) => {
  const db = getDb();
  const spot = db.prepare(
    `SELECT s.*, u.nickname as owner_name, u.phone as owner_phone
     FROM spots s LEFT JOIN users u ON s.owner_id = u.id WHERE s.id = ?`
  ).get(req.params.id);
  if (!spot) return res.status(404).json({ error: '车位不存在' });
  res.json(spot);
};

// 我的车位
exports.mySpots = (req, res) => {
  const db = getDb();
  const spots = db.prepare(
    `SELECT * FROM spots WHERE owner_id = ? ORDER BY spot_code`
  ).all(req.user.id);
  res.json(spots);
};

// 绑定车位（提交合同验证）
exports.bindSpot = (req, res) => {
  const db = getDb();
  const { spot_code, contract_image } = req.body;
  if (!spot_code) return res.status(400).json({ error: '请输入车位编号' });

  // 检查是否已有2个车位
  const mySpots = db.prepare('SELECT COUNT(*) as c FROM spots WHERE owner_id = ?').get(req.user.id).c;
  if (mySpots >= 2) return res.status(400).json({ error: '每个手机号最多绑定 2 个车位' });

  // 检查车位是否存在
  const spot = db.prepare('SELECT * FROM spots WHERE spot_code = ?').get(spot_code.toUpperCase());
  if (!spot) return res.status(404).json({ error: `车位 ${spot_code} 不存在` });
  if (spot.owner_id) return res.status(400).json({ error: '该车位已被其他邻居绑定' });

  // MVP: 直接绑定，不做 AI 验证（后续加）
  // TODO: 调用 AI 视觉模型验证合同中的车位编号
  db.prepare("UPDATE spots SET owner_id = ?, status = 'available' WHERE id = ?").run(req.user.id, spot.id);

  res.json({ message: '车位绑定成功', spot_code: spot.spot_code });
};

// 发布车位共享（按 ID）
exports.shareSpotById = (req, res) => {
  const db = getDb();
  const spot = db.prepare('SELECT * FROM spots WHERE id = ? AND owner_id = ?').get(req.params.id, req.user.id);
  if (!spot) return res.status(404).json({ error: '车位不存在或不属于你' });
  const { price_hour, price_cap, notes, qr_alipay, qr_wechat } = req.body;
  if (!qr_alipay && !qr_wechat) return res.status(400).json({ error: '请至少上传一个收款码' });
  db.prepare("UPDATE spots SET status = 'available', price_hour = ?, price_cap = ?, notes = ?, qr_alipay = ?, qr_wechat = ? WHERE id = ?")
    .run(price_hour || 4, price_cap || 20, notes || '', qr_alipay || '', qr_wechat || '', spot.id);
  res.json({ message: '已发布共享' });
};

// 取消共享（按 ID）
exports.unshareSpotById = (req, res) => {
  const db = getDb();
  const spot = db.prepare('SELECT * FROM spots WHERE id = ? AND owner_id = ?').get(req.params.id, req.user.id);
  if (!spot) return res.status(404).json({ error: '车位不存在或不属于你' });
  db.prepare("UPDATE spots SET status = 'idle' WHERE id = ?").run(spot.id);
  res.json({ message: '已取消共享' });
};

// 原有的按 code 发布（保留兼容）
exports.shareSpot = (req, res) => {
  const db = getDb();
  const { spot_code, price_hour, price_cap } = req.body;
  if (!spot_code) return res.status(400).json({ error: '请输入车位编号' });
  const spot = db.prepare('SELECT * FROM spots WHERE spot_code = ?').get(spot_code.toUpperCase());
  if (!spot) return res.status(404).json({ error: `车位 ${spot_code} 不存在` });
  if (spot.owner_id && spot.owner_id !== req.user.id) {
    return res.status(400).json({ error: '该车位已被其他邻居认领' });
  }
  // 检查车位数量限制
  if (!spot.owner_id) {
    const mySpots = db.prepare('SELECT COUNT(*) as c FROM spots WHERE owner_id = ?').get(req.user.id).c;
    if (mySpots >= 2) return res.status(400).json({ error: '每个手机号最多绑定 2 个车位' });
  }
  db.prepare(
    `UPDATE spots SET owner_id = ?, status = 'available', price_hour = ?, price_cap = ? WHERE spot_code = ?`
  ).run(req.user.id, price_hour || 4, price_cap || 20, spot_code.toUpperCase());
  res.json({ message: '车位已发布共享' });
};

// 取消共享（按 code）
exports.unshareSpot = (req, res) => {
  const db = getDb();
  const spot = db.prepare('SELECT * FROM spots WHERE id = ? AND owner_id = ?').get(req.params.id, req.user.id);
  if (!spot) return res.status(404).json({ error: '车位不存在或不属于你' });
  db.prepare("UPDATE spots SET status = 'idle' WHERE id = ?").run(spot.id);
  res.json({ message: '已取消共享' });
};
