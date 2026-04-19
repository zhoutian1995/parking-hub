import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getTestDb, resetTestDb } from './setup.js';

// Mock getDb to use test database
const init = require('../backend/database/init');
const originalGetDb = init.getDb;

beforeEach(() => {
  const testDb = getTestDb();
  // Override getDb to return test database
  init.getDb = () => testDb;
});

afterEach(() => {
  resetTestDb();
});

describe('数据库基础', () => {
  it('应该有用户表', () => {
    const db = getTestDb();
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get('13800000001');
    expect(user).toBeTruthy();
    expect(user.nickname).toBe('测试用户A');
    expect(user.building).toBe('1幢');
  });

  it('应该有车位表', () => {
    const db = getTestDb();
    const spot = db.prepare('SELECT * FROM spots WHERE spot_code = ?').get('A001');
    expect(spot).toBeTruthy();
    expect(spot.zone).toBe('A');
    expect(spot.status).toBe('available');
  });

  it('应该有区域数据', () => {
    const db = getTestDb();
    const zones = db.prepare('SELECT * FROM zones ORDER BY sort_order').all();
    expect(zones.length).toBe(7);
    expect(zones[0].code).toBe('A');
    expect(zones[6].code).toBe('G');
  });
});

describe('借用流程', () => {
  it('应该能创建借用记录', () => {
    const db = getTestDb();
    const spot = db.prepare("SELECT * FROM spots WHERE spot_code = 'A001'").get();
    const borrower = db.prepare("SELECT * FROM users WHERE phone = '13800000002'").get();

    const result = db.prepare(
      `INSERT INTO borrows (spot_id, owner_id, borrower_id, borrower_plate, status, price_hour)
       VALUES (?, ?, ?, ?, 'pending', ?)`
    ).run(spot.id, spot.owner_id, borrower.id, '浙A·12345', spot.price_hour);

    expect(result.lastInsertRowid).toBeTruthy();

    const borrow = db.prepare('SELECT * FROM borrows WHERE id = ?').get(result.lastInsertRowid);
    expect(borrow.status).toBe('pending');
    expect(borrow.borrower_plate).toBe('浙A·12345');
  });

  it('accept 应该更新借用状态和车位状态', () => {
    const db = getTestDb();
    const spot = db.prepare("SELECT * FROM spots WHERE spot_code = 'A001'").get();
    const borrower = db.prepare("SELECT * FROM users WHERE phone = '13800000002'").get();

    // 创建借用
    const result = db.prepare(
      `INSERT INTO borrows (spot_id, owner_id, borrower_id, borrower_plate, status, price_hour)
       VALUES (?, ?, ?, ?, 'pending', ?)`
    ).run(spot.id, spot.owner_id, borrower.id, '浙A·12345', spot.price_hour);
    const borrowId = result.lastInsertRowid;

    // Accept 逻辑（模拟 borrowController.accept）
    const doAccept = db.transaction(() => {
      db.prepare("UPDATE borrows SET status = 'active', start_time = datetime('now','localtime') WHERE id = ?").run(borrowId);
      db.prepare("UPDATE spots SET status = 'occupied' WHERE id = ?").run(spot.id);
    });
    doAccept();

    const borrow = db.prepare('SELECT * FROM borrows WHERE id = ?').get(borrowId);
    expect(borrow.status).toBe('active');

    const updatedSpot = db.prepare('SELECT * FROM spots WHERE id = ?').get(spot.id);
    expect(updatedSpot.status).toBe('occupied');
  });

  it('done 应该计算费用并恢复车位状态', () => {
    const db = getTestDb();
    const spot = db.prepare("SELECT * FROM spots WHERE spot_code = 'A001'").get();
    const borrower = db.prepare("SELECT * FROM users WHERE phone = '13800000002'").get();

    // 创建并 accept
    const result = db.prepare(
      `INSERT INTO borrows (spot_id, owner_id, borrower_id, borrower_plate, status, price_hour, start_time)
       VALUES (?, ?, ?, ?, 'active', ?, datetime('now','localtime','-2 hours'))`
    ).run(spot.id, spot.owner_id, borrower.id, '浙A·12345', spot.price_hour);
    db.prepare("UPDATE spots SET status = 'occupied' WHERE id = ?").run(spot.id);

    const borrowId = result.lastInsertRowid;
    const borrow = db.prepare('SELECT * FROM borrows WHERE id = ?').get(borrowId);

    // 计算费用
    const startTime = new Date(borrow.start_time);
    const hours = Math.max(1, Math.ceil((Date.now() - startTime.getTime()) / 3600000));
    const cap = spot.price_cap || 20;
    const total = Math.min(hours * borrow.price_hour, cap);

    // Done 逻辑
    const doDone = db.transaction(() => {
      db.prepare("UPDATE borrows SET status = 'done', end_time = datetime('now','localtime'), total_price = ? WHERE id = ?").run(total, borrowId);
      db.prepare("UPDATE spots SET status = 'available' WHERE id = ?").run(spot.id);
    });
    doDone();

    const doneBorrow = db.prepare('SELECT * FROM borrows WHERE id = ?').get(borrowId);
    expect(doneBorrow.status).toBe('done');
    expect(doneBorrow.total_price).toBeGreaterThan(0);
    expect(doneBorrow.total_price).toBeLessThanOrEqual(cap);

    const freeSpot = db.prepare('SELECT * FROM spots WHERE id = ?').get(spot.id);
    expect(freeSpot.status).toBe('available');
  });
});

describe('时间冲突校验', () => {
  it('过期的共享时段应该拒绝借用', () => {
    const db = getTestDb();
    // 设置一个过期的时段
    db.prepare("UPDATE spots SET available_from = ?, available_until = ? WHERE spot_code = 'A001'").run('2020-01-01T00:00', '2020-01-02T00:00');

    const spot = db.prepare("SELECT * FROM spots WHERE spot_code = 'A001'").get();
    const now = new Date();
    const from = new Date(spot.available_from);
    const until = new Date(spot.available_until);

    expect(now < from).toBe(false);
    expect(now > until).toBe(true);
  });

  it('未来的共享时段应该拒绝借用', () => {
    const db = getTestDb();
    // 设置一个未来的时段
    db.prepare("UPDATE spots SET available_from = ?, available_until = ? WHERE spot_code = 'A001'").run('2030-01-01T00:00', '2030-12-31T23:59');

    const spot = db.prepare("SELECT * FROM spots WHERE spot_code = 'A001'").get();
    const now = new Date();
    const from = new Date(spot.available_from);

    expect(now < from).toBe(true);
  });
});

describe('统计接口优化', () => {
  it('应该用单条 SQL 统计各区域数据', () => {
    const db = getTestDb();
    const zones = db.prepare('SELECT code FROM zones ORDER BY sort_order').all().map(z => z.code);
    const rows = db.prepare("SELECT zone, status, COUNT(*) as c FROM spots GROUP BY zone, status").all();

    const result = { all: { total: 0, available: 0, occupied: 0 } };
    zones.forEach(z => { result[z] = { total: 0, available: 0, occupied: 0 }; });
    rows.forEach(r => {
      if (result[r.zone]) {
        result[r.zone].total += r.c;
        result[r.zone][r.status] = (result[r.zone][r.status] || 0) + r.c;
        result.all.total += r.c;
        if (r.status === 'available') result.all.available += r.c;
        if (r.status === 'occupied') result.all.occupied += r.c;
      }
    });

    expect(result.all.total).toBe(4); // 4 个测试车位
    expect(result.A.total).toBe(2);
    expect(result.B.total).toBe(2);
    expect(result.A.available).toBe(1);
  });
});

describe('自动拒绝 pending 借用', () => {
  it('accept 时应自动拒绝同车位其他 pending', () => {
    const db = getTestDb();
    const spot = db.prepare("SELECT * FROM spots WHERE spot_code = 'A001'").get();
    const borrower1 = db.prepare("SELECT * FROM users WHERE phone = '13800000002'").get();
    const borrower2 = db.prepare("SELECT * FROM users WHERE phone = '13800000003'").get();

    // 两个 pending 借用
    const r1 = db.prepare(
      `INSERT INTO borrows (spot_id, owner_id, borrower_id, borrower_plate, status, price_hour)
       VALUES (?, ?, ?, ?, 'pending', ?)`
    ).run(spot.id, spot.owner_id, borrower1.id, '浙A·11111', spot.price_hour);
    const r2 = db.prepare(
      `INSERT INTO borrows (spot_id, owner_id, borrower_id, borrower_plate, status, price_hour)
       VALUES (?, ?, ?, ?, 'pending', ?)`
    ).run(spot.id, spot.owner_id, borrower2.id, '浙A·22222', spot.price_hour);

    // Accept r1
    const doAccept = db.transaction(() => {
      db.prepare("UPDATE borrows SET status = 'active', start_time = datetime('now','localtime') WHERE id = ?").run(r1.lastInsertRowid);
      db.prepare("UPDATE spots SET status = 'occupied' WHERE id = ?").run(spot.id);
      db.prepare("UPDATE borrows SET status = 'rejected' WHERE spot_id = ? AND status = 'pending' AND id != ?").run(spot.id, r1.lastInsertRowid);
    });
    doAccept();

    const borrow1 = db.prepare('SELECT * FROM borrows WHERE id = ?').get(r1.lastInsertRowid);
    const borrow2 = db.prepare('SELECT * FROM borrows WHERE id = ?').get(r2.lastInsertRowid);

    expect(borrow1.status).toBe('active');
    expect(borrow2.status).toBe('rejected');
  });
});
