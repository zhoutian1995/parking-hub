const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config');

let db;

function getDb() {
  if (!db) {
    const dbDir = path.dirname(path.resolve(config.dbPath));
    fs.mkdirSync(dbDir, { recursive: true });
    db = new Database(path.resolve(config.dbPath));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDatabase() {
  const db = getDb();

  db.exec(`
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openid TEXT UNIQUE NOT NULL,
      nickname TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      building TEXT DEFAULT '',
      unit TEXT DEFAULT '',
      preferred_zone TEXT DEFAULT '',
      verified INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0,
      credit INTEGER DEFAULT 100,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      verified_at TEXT
    );

    -- 车位表
    CREATE TABLE IF NOT EXISTS spots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone TEXT NOT NULL,
      spot_code TEXT UNIQUE NOT NULL,
      owner_id INTEGER,
      status TEXT DEFAULT 'idle',
      price_hour REAL DEFAULT 4.0,
      price_cap REAL DEFAULT 20.0,
      notes TEXT DEFAULT '',
      contract_image TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    -- 借用记录
    CREATE TABLE IF NOT EXISTS borrows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spot_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      borrower_id INTEGER NOT NULL,
      borrower_plate TEXT DEFAULT '',
      start_time TEXT DEFAULT (datetime('now','localtime')),
      end_time TEXT,
      status TEXT DEFAULT 'pending',
      price_hour REAL,
      total_price REAL,
      FOREIGN KEY (spot_id) REFERENCES spots(id),
      FOREIGN KEY (owner_id) REFERENCES users(id),
      FOREIGN KEY (borrower_id) REFERENCES users(id)
    );

    -- 楼栋表
    CREATE TABLE IF NOT EXISTS buildings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      units TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    -- 区域表
    CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      floor INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    -- 信用记录
    CREATE TABLE IF NOT EXISTS credit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      delta INTEGER NOT NULL,
      reason TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 待审核凭证
    CREATE TABLE IF NOT EXISTS verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reviewed_by INTEGER,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      reviewed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_spots_zone ON spots(zone);
    CREATE INDEX IF NOT EXISTS idx_spots_status ON spots(status);
    CREATE INDEX IF NOT EXISTS idx_borrows_status ON borrows(status);
    CREATE INDEX IF NOT EXISTS idx_users_openid ON users(openid);
  `);

  // 初始化 zones 数据（如果为空）
  const zoneCount = db.prepare('SELECT COUNT(*) as c FROM zones').get().c;
  if (zoneCount === 0) {
    const insertZone = db.prepare('INSERT INTO zones (code, label, floor, sort_order) VALUES (?, ?, ?, ?)');
    const insertZones = db.transaction(() => {
      insertZone.run('A', '地下一层A区', 1, 1);
      insertZone.run('B', '地下一层B区', 1, 2);
      insertZone.run('C', '地下一层C区', 1, 3);
      insertZone.run('D', '地下一层D区', 1, 4);
      insertZone.run('E', '地下一层E区', 1, 5);
      insertZone.run('F', '地下一层F区', 1, 6);
      insertZone.run('G', '地下二层G区', 2, 7);
    });
    insertZones();
    console.log('✅ 7 个区域数据已初始化');
  }

  console.log('✅ Database initialized');
  return db;
}

module.exports = { getDb, initDatabase };
