const { getDb } = require('../../database/init');
const { sendError, sendSuccess, asyncHandler } = require('../../utils/errors');

// 申请借用（预付制）
exports.create = asyncHandler(async (req, res) => {
  const { spot_id, plate } = req.body;
  const db = getDb();

  // 1. 车牌号必填
  if (!plate || !plate.trim()) {
    return sendError(res, 'INVALID_INPUT', '请填写车牌号');
  }

  // 2. 车位必须可用
  const spot = db.prepare("SELECT * FROM spots WHERE id = ? AND status = 'available'").get(spot_id);
  if (!spot) return sendError(res, 'SPOT_NOT_AVAILABLE', '车位当前不可用（可能已被借用或已下架）');

  // 3. 不能借自己的车位
  if (spot.owner_id === req.user.id) return sendError(res, 'BORROW_SELF_SPOT');

  // 4. 检查是否已申请过（同一用户+同一车位）
  const myExisting = db.prepare(
    "SELECT id, status FROM borrows WHERE spot_id = ? AND borrower_id = ? AND status IN ('pending','active')"
  ).get(spot_id, req.user.id);
  if (myExisting) {
    const msg = myExisting.status === 'pending' ? '你已申请过该车位，等待车主确认中' : '你正在使用该车位';
    return sendError(res, 'ALREADY_APPLIED', msg);
  }

  // 5. 检查车位是否被其他人占用
  const otherActive = db.prepare(
    "SELECT id FROM borrows WHERE spot_id = ? AND status IN ('pending','active')"
  ).get(spot_id);
  if (otherActive) return sendError(res, 'BORROW_UNAVAILABLE', '该车位已被其他人申请');

  // 6. 创建借用记录
  const result = db.prepare(
    `INSERT INTO borrows (spot_id, owner_id, borrower_id, borrower_plate, status, price_hour)
     VALUES (?, ?, ?, ?, 'pending', ?)`
  ).run(spot_id, spot.owner_id, req.user.id, plate.trim(), spot.price_hour);

  sendSuccess(res, {
    id: result.lastInsertRowid,
    notice: '车主确认后，请按页面提示完成付款并通知管家'
  }, '申请成功！已通知车位主人，请等待确认');
});

// 车主确认
exports.accept = (req, res) => {
  const db = getDb();
  const borrow = db.prepare("SELECT * FROM borrows WHERE id = ? AND status = 'pending' AND owner_id = ?").get(req.params.id, req.user.id);
  if (!borrow) return res.status(400).json({ error: '借用请求不存在或已处理', code: 'NOT_FOUND' });

  db.prepare("UPDATE borrows SET status = 'active', start_time = datetime('now','localtime') WHERE id = ?").run(borrow.id);
  db.prepare("UPDATE spots SET status = 'occupied' WHERE id = ?").run(borrow.spot_id);

  // 返回完整借用信息，供前端展示通知管家文案
  const borrower = db.prepare("SELECT * FROM users WHERE id = ?").get(borrow.borrower_id);
  const spot = db.prepare("SELECT * FROM spots WHERE id = ?").get(borrow.spot_id);

  res.json({
    message: '已确认借用！系统已通知借用车主',
    code: 'ACCEPTED',
    borrow: {
      id: borrow.id,
      spot_code: spot.spot_code,
      borrower_name: borrower.nickname,
      borrower_plate: borrow.borrower_plate,
      price_hour: borrow.price_hour
    }
  });
};

// 完成借用
exports.done = (req, res) => {
  const db = getDb();
  const borrow = db.prepare(`
    SELECT b.*, s.price_cap 
    FROM borrows b JOIN spots s ON b.spot_id = s.id
    WHERE b.id = ? AND b.status = 'active' AND b.owner_id = ?
  `).get(req.params.id, req.user.id);
  if (!borrow) return res.status(400).json({ error: '借用记录不存在', code: 'NOT_FOUND' });

  const startTime = new Date(borrow.start_time);
  const hours = Math.max(1, Math.ceil((Date.now() - startTime.getTime()) / 3600000));
  const cap = borrow.price_cap || 20;
  const total = Math.min(hours * borrow.price_hour, cap);

  db.prepare("UPDATE borrows SET status = 'done', end_time = datetime('now','localtime'), total_price = ? WHERE id = ?").run(total, borrow.id);
  db.prepare("UPDATE spots SET status = 'available' WHERE id = ?").run(borrow.spot_id);

  res.json({ message: '借用结束', total_price: total, hours: hours, code: 'DONE' });
};

// 我的借用记录
exports.mine = (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    `SELECT b.*, s.spot_code, s.zone,
     o.nickname as owner_name, o.building as owner_building, o.unit as owner_unit,
     o.phone as owner_phone,
     r.nickname as borrower_name, r.building as borrower_building, r.unit as borrower_unit
     FROM borrows b
     JOIN spots s ON b.spot_id = s.id
     JOIN users o ON b.owner_id = o.id
     JOIN users r ON b.borrower_id = r.id
     WHERE b.owner_id = ? OR b.borrower_id = ?
     ORDER BY b.start_time DESC`
  ).all(req.user.id, req.user.id);
  res.json(rows);
};
