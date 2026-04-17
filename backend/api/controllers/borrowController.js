const { getDb } = require('../../database/init');

// 申请借用
exports.create = (req, res) => {
  const { spot_id, plate } = req.body;
  const db = getDb();
  const spot = db.prepare("SELECT * FROM spots WHERE id = ? AND status = 'available'").get(spot_id);
  if (!spot) return res.status(400).json({ error: '车位不可用' });
  if (spot.owner_id === req.user.id) return res.status(400).json({ error: '不能借自己的车位' });

  const active = db.prepare("SELECT id FROM borrows WHERE spot_id = ? AND status IN ('pending','active')").get(spot_id);
  if (active) return res.status(400).json({ error: '车位已被申请' });

  const result = db.prepare(
    `INSERT INTO borrows (spot_id, owner_id, borrower_id, borrower_plate, status, price_hour)
     VALUES (?, ?, ?, ?, 'pending', ?)`
  ).run(spot_id, spot.owner_id, req.user.id, plate || '', spot.price_hour);

  res.json({ id: result.lastInsertRowid, message: '申请成功，等待车位主人确认' });
};

// 车主确认
exports.accept = (req, res) => {
  const db = getDb();
  const borrow = db.prepare("SELECT * FROM borrows WHERE id = ? AND status = 'pending' AND owner_id = ?").get(req.params.id, req.user.id);
  if (!borrow) return res.status(400).json({ error: '借用请求不存在' });

  db.prepare("UPDATE borrows SET status = 'active' WHERE id = ?").run(borrow.id);
  db.prepare("UPDATE spots SET status = 'occupied' WHERE id = ?").run(borrow.spot_id);

  res.json({ message: '已确认' });
};

// 完成借用
exports.done = (req, res) => {
  const db = getDb();
  const borrow = db.prepare("SELECT * FROM borrows WHERE id = ? AND status = 'active' AND owner_id = ?").get(req.params.id, req.user.id);
  if (!borrow) return res.status(400).json({ error: '借用记录不存在' });

  const startTime = new Date(borrow.start_time);
  const hours = Math.max(1, Math.ceil((Date.now() - startTime.getTime()) / 3600000));
  const total = Math.min(hours * borrow.price_hour, 20); // 封顶20

  db.prepare("UPDATE borrows SET status = 'done', end_time = datetime('now','localtime'), total_price = ? WHERE id = ?").run(total, borrow.id);
  db.prepare("UPDATE spots SET status = 'available' WHERE id = ?").run(borrow.spot_id);

  res.json({ message: '完成', total_price: total });
};

// 我的借用记录
exports.mine = (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    `SELECT b.*, s.spot_code, s.zone,
     o.nickname as owner_name, r.nickname as borrower_name
     FROM borrows b
     JOIN spots s ON b.spot_id = s.id
     JOIN users o ON b.owner_id = o.id
     JOIN users r ON b.borrower_id = r.id
     WHERE b.owner_id = ? OR b.borrower_id = ?
     ORDER BY b.start_time DESC`
  ).all(req.user.id, req.user.id);
  res.json(rows);
};
