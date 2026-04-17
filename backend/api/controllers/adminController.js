const { getDb } = require('../../database/init');
const fs = require('fs');
const path = require('path');

// 待审核列表
exports.listVerifications = (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    `SELECT v.*, u.nickname, u.phone, u.building, u.room
     FROM verifications v JOIN users u ON v.user_id = u.id
     WHERE v.status = 'pending' ORDER BY v.created_at`
  ).all();
  res.json(rows);
};

// 通过
exports.approve = (req, res) => {
  const db = getDb();
  const ver = db.prepare('SELECT * FROM verifications WHERE id = ?').get(req.params.id);
  if (!ver) return res.status(404).json({ error: '记录不存在' });

  db.prepare("UPDATE verifications SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now','localtime') WHERE id = ?").run(req.user.id, ver.id);
  db.prepare("UPDATE users SET verified = 1, verified_at = datetime('now','localtime') WHERE id = ?").run(ver.user_id);

  // 删除凭证图片（隐私保护）
  try { fs.unlinkSync(path.resolve(ver.image_path)); } catch {}

  res.json({ message: '已通过' });
};

// 拒绝
exports.reject = (req, res) => {
  const db = getDb();
  const ver = db.prepare('SELECT * FROM verifications WHERE id = ?').get(req.params.id);
  if (!ver) return res.status(404).json({ error: '记录不存在' });

  db.prepare("UPDATE verifications SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now','localtime') WHERE id = ?").run(req.user.id, ver.id);

  // 删除凭证图片
  try { fs.unlinkSync(path.resolve(ver.image_path)); } catch {}

  res.json({ message: '已拒绝' });
};

// 初始化车位数据
exports.initSpots = (req, res) => {
  const db = getDb();
  const zones = [
    { zone: 'E', count: 370 },
    { zone: 'F', count: 118 },
    { zone: 'G', count: 295 },
  ];
  let total = 0;
  const insert = db.prepare('INSERT OR IGNORE INTO spots (zone, spot_code) VALUES (?, ?)');
  const insertMany = db.transaction((items) => {
    for (const item of items) insert.run(item.zone, item.spot_code);
  });

  const items = [];
  for (const z of zones) {
    for (let i = 1; i <= z.count; i++) {
      items.push({ zone: z.zone, spot_code: `${z.zone}-${String(i).padStart(3, '0')}` });
    }
  }
  insertMany(items);
  total = items.length;

  res.json({ message: `已初始化 ${total} 个车位` });
};

// 统计
exports.stats = (req, res) => {
  const db = getDb();
  const spots = db.prepare('SELECT COUNT(*) as total FROM spots').get().total;
  const available = db.prepare("SELECT COUNT(*) as total FROM spots WHERE status = 'available'").get().total;
  const occupied = db.prepare("SELECT COUNT(*) as total FROM spots WHERE status = 'occupied'").get().total;
  const users = db.prepare('SELECT COUNT(*) as total FROM users').get().total;
  const verified = db.prepare('SELECT COUNT(*) as total FROM users WHERE verified = 1').get().total;
  const pending = db.prepare("SELECT COUNT(*) as total FROM verifications WHERE status = 'pending'").get().total;
  res.json({ spots, available, occupied, users, verified, pending });
};
