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
      room TEXT DEFAULT '',
      verified INTEGER DEFAULT 0,        -- 0=未认证 1=已认证
      is_admin INTEGER DEFAULT 0,
      credit INTEGER DEFAULT 100,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      verified_at TEXT
    );

    -- 车位表
    CREATE TABLE IF NOT EXISTS spots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone TEXT NOT NULL,                  -- E / F / G
      spot_code TEXT UNIQUE NOT NULL,      -- E-001
      owner_id INTEGER,
      status TEXT DEFAULT 'idle',          -- idle / available / occupied
      price_hour REAL DEFAULT 4.0,
      price_cap REAL DEFAULT 20.0,
      notes TEXT DEFAULT '',
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
      status TEXT DEFAULT 'pending',       -- pending / active / done / disputed
      price_hour REAL,
      total_price REAL,
      FOREIGN KEY (spot_id) REFERENCES spots(id),
      FOREIGN KEY (owner_id) REFERENCES users(id),
      FOREIGN KEY (borrower_id) REFERENCES users(id)
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
      status TEXT DEFAULT 'pending',       -- pending / approved / rejected
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

  console.log('✅ Database initialized');
  return db;
}

module.exports = { getDb, initDatabase };
