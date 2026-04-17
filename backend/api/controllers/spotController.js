const { getDb } = require('../../database/init');

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

// 发布车位共享
exports.shareSpot = (req, res) => {
  const db = getDb();
  const { spot_code, price_hour, price_cap } = req.body;
  if (!spot_code) return res.status(400).json({ error: '请输入车位编号' });
  const spot = db.prepare('SELECT * FROM spots WHERE spot_code = ?').get(spot_code);
  if (!spot) return res.status(404).json({ error: `车位 ${spot_code} 不存在` });
  if (spot.owner_id && spot.owner_id !== req.user.id) {
    return res.status(400).json({ error: '该车位已被其他邻居认领' });
  }
  db.prepare(
    `UPDATE spots SET owner_id = ?, status = 'available', price_hour = ?, price_cap = ? WHERE spot_code = ?`
  ).run(req.user.id, price_hour || 4, price_cap || 20, spot_code);
  res.json({ message: '车位已发布共享' });
};

// 取消共享
exports.unshareSpot = (req, res) => {
  const db = getDb();
  const spot = db.prepare('SELECT * FROM spots WHERE id = ? AND owner_id = ?').get(req.params.id, req.user.id);
  if (!spot) return res.status(404).json({ error: '车位不存在或不属于你' });
  db.prepare("UPDATE spots SET status = 'idle' WHERE id = ?").run(spot.id);
  res.json({ message: '已取消共享' });
};
