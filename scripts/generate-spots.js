#!/usr/bin/env node
/**
 * 生成车位数据插入 SQL
 * 江南之星地下车库：B1(A~F) + B2(G) = 2,327 个车位
 */

const areas = [
  { zone: 'B1', code: 'A', start: 1, end: 378 },
  { zone: 'B1', code: 'B', start: 1, end: 416 },
  { zone: 'B1', code: 'C', start: 1, end: 475 },
  { zone: 'B1', code: 'D', start: 1, end: 283 },
  { zone: 'B1', code: 'E', start: 1, end: 355 },
  { zone: 'B1', code: 'F', start: 1, end: 118 },
  { zone: 'B2', code: 'G', start: 1, end: 300 },
];

let sql = '-- 江南之星车位数据\n';
sql += '-- 总计 2,327 个车位\n\n';

// 先确保表存在
sql += `CREATE TABLE IF NOT EXISTS spots (
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
);\n\n`;

sql += 'BEGIN TRANSACTION;\n\n';

let total = 0;
for (const area of areas) {
  sql += `-- ${area.zone} ${area.code}区 (${area.start}~${area.end}, ${area.end - area.start + 1}个)\n`;
  for (let i = area.start; i <= area.end; i++) {
    const spotCode = `${area.code}${String(i).padStart(3, '0')}`;
    sql += `INSERT OR IGNORE INTO spots (zone, spot_code) VALUES ('${area.zone}', '${spotCode}');\n`;
    total++;
  }
  sql += '\n';
}

sql += 'COMMIT;\n';
sql += `\n-- 共 ${total} 条记录\n`;

const fs = require('fs');
fs.writeFileSync('/Users/wille/parking-hub/scripts/init-spots.sql', sql);
console.log(`✅ 生成完成：${total} 条 SQL`);
