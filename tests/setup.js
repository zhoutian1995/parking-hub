const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 测试用内存数据库
let testDb;

function getTestDb() {
  if (!testDb) {
    testDb = new Database(':memory:');
    testDb.pragma('journal_mode = WAL');
    testDb.pragma('foreign_keys = ON');
    initSchema(testDb);
    seedData(testDb);
  }
  return testDb;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      nickname TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      openid TEXT DEFAULT '',
      building TEXT DEFAULT '',
      unit TEXT DEFAULT '',
      preferred_zone TEXT DEFAULT '',
      qr_alipay TEXT DEFAULT '',
      qr_wechat TEXT DEFAULT '',
      wechat_id TEXT DEFAULT '',
      wechat_qr TEXT DEFAULT '',
      contact_phone TEXT DEFAULT '',
      role TEXT DEFAULT 'user',
      credit_score INTEGER DEFAULT 100,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS spots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spot_code TEXT UNIQUE NOT NULL,
      zone TEXT NOT NULL,
      owner_id INTEGER,
      status TEXT DEFAULT 'idle',
      price_hour REAL DEFAULT 4,
      price_cap REAL DEFAULT 20,
      notes TEXT DEFAULT '',
      qr_alipay TEXT DEFAULT '',
      qr_wechat TEXT DEFAULT '',
      contract_image TEXT DEFAULT '',
      available_from TEXT DEFAULT '',
      available_until TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS borrows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spot_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      borrower_id INTEGER NOT NULL,
      borrower_plate TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      price_hour REAL NOT NULL,
      total_price REAL DEFAULT 0,
      start_time TEXT,
      end_time TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (spot_id) REFERENCES spots(id),
      FOREIGN KEY (owner_id) REFERENCES users(id),
      FOREIGN KEY (borrower_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS buildings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      units TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      floor INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
  `);
}

function seedData(db) {
  // 测试用户
  db.prepare("INSERT OR IGNORE INTO users (phone, nickname, building, unit, preferred_zone, qr_alipay, role) VALUES (?, ?, ?, ?, ?, ?, ?)").run('13800000001', '测试用户A', '1幢', '1单元', 'A', 'test_alipay_a', 'user');
  db.prepare("INSERT OR IGNORE INTO users (phone, nickname, building, unit, preferred_zone, qr_alipay, role) VALUES (?, ?, ?, ?, ?, ?, ?)").run('13800000002', '测试用户B', '2幢', '2单元', 'B', 'test_alipay_b', 'user');
  db.prepare("INSERT OR IGNORE INTO users (phone, nickname, building, unit, preferred_zone, qr_alipay, role) VALUES (?, ?, ?, ?, ?, ?, ?)").run('13800000003', '管理员', '1幢', '1单元', 'A', 'test_alipay_admin', 'admin');

  // 测试区域
  const zones = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  zones.forEach((z, i) => {
    db.prepare("INSERT OR IGNORE INTO zones (code, label, floor, sort_order) VALUES (?, ?, ?, ?)").run(z, `地下${z}区`, i < 6 ? 1 : 2, i + 1);
  });

  // 测试车位
  db.prepare("INSERT OR IGNORE INTO spots (spot_code, zone, owner_id, status, price_hour, price_cap, available_from, available_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run('A001', 'A', 1, 'available', 5, 25, '2026-01-01T00:00', '2026-12-31T23:59');
  db.prepare("INSERT OR IGNORE INTO spots (spot_code, zone, owner_id, status, price_hour, price_cap) VALUES (?, ?, ?, ?, ?, ?)").run('A002', 'A', 1, 'idle', 4, 20);
  db.prepare("INSERT OR IGNORE INTO spots (spot_code, zone, owner_id, status, price_hour, price_cap) VALUES (?, ?, ?, ?, ?, ?)").run('B001', 'B', 2, 'available', 3, 15);
  db.prepare("INSERT OR IGNORE INTO spots (spot_code, zone, status) VALUES (?, ?, ?)").run('B002', 'B', 'idle');
}

function resetTestDb() {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
}

module.exports = { getTestDb, resetTestDb };
