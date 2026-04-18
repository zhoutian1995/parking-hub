/**
 * 数据库迁移脚本
 * 从 v1 升级到 v2：
 * - users 表加 unit、preferred_zone 字段
 * - spots 表加 contract_image 字段
 * - 新建 buildings 表
 * - 新建 zones 表 + 导入 A~G 初始数据
 */

const { getDb } = require('./init');

function migrate() {
  const db = getDb();
  let migrated = false;

  // 检查 users 表是否有 unit 字段
  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);

  if (!userCols.includes('unit')) {
    console.log('Adding unit + preferred_zone to users...');
    db.prepare("ALTER TABLE users ADD COLUMN unit TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE users ADD COLUMN preferred_zone TEXT DEFAULT ''").run();
    migrated = true;
    console.log('✅ users 表更新完成');
  }

  // 检查 spots 表是否有 contract_image 字段
  const spotCols = db.prepare("PRAGMA table_info(spots)").all().map(c => c.name);

  if (!spotCols.includes('contract_image')) {
    console.log('Adding contract_image to spots...');
    db.prepare("ALTER TABLE spots ADD COLUMN contract_image TEXT DEFAULT ''").run();
    migrated = true;
    console.log('✅ spots 表更新完成');
  }

  // 检查 buildings 表是否存在
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);

  if (!tables.includes('buildings')) {
    console.log('Creating buildings table...');
    db.prepare(`
      CREATE TABLE buildings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        units TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      )
    `).run();
    migrated = true;
    console.log('✅ buildings 表创建完成');
  }

  // 检查 zones 表是否存在
  if (!tables.includes('zones')) {
    console.log('Creating zones table...');
    db.prepare(`
      CREATE TABLE zones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        floor INTEGER NOT NULL,
        sort_order INTEGER DEFAULT 0
      )
    `).run();

    console.log('Inserting zone data...');
    const insertZone = db.prepare("INSERT INTO zones (code, label, floor, sort_order) VALUES (?, ?, ?, ?)");
    const insertMany = db.transaction((zones) => {
      for (const z of zones) insertZone.run(z.code, z.label, z.floor, z.sort);
    });
    insertMany([
      { code: 'A', label: '地下一层A区', floor: 1, sort: 1 },
      { code: 'B', label: '地下一层B区', floor: 1, sort: 2 },
      { code: 'C', label: '地下一层C区', floor: 1, sort: 3 },
      { code: 'D', label: '地下一层D区', floor: 1, sort: 4 },
      { code: 'E', label: '地下一层E区', floor: 1, sort: 5 },
      { code: 'F', label: '地下一层F区', floor: 1, sort: 6 },
      { code: 'G', label: '地下二层G区', floor: 2, sort: 7 },
    ]);

    migrated = true;
    console.log('✅ zones 表创建完成，7 个区域已导入');
  }

  // 导入楼栋数据
  const buildingCount = db.prepare("SELECT COUNT(*) as c FROM buildings").get().c;
  if (buildingCount === 0) {
    console.log('⚠️  buildings 表为空，请提供楼栋数据后导入');
    console.log('   提示：用 INSERT INTO buildings (name, units, sort_order) VALUES (...) 手动添加');
  }

  if (!migrated) {
    console.log('✅ 数据库已是最新，无需迁移');
  } else {
    console.log('🎉 迁移完成！');
  }

  // 打印当前表结构
  console.log('\n📊 当前数据库状态：');
  const countTables = ['users', 'spots', 'borrows', 'buildings', 'zones'];
  for (const table of countTables) {
    try {
      const c = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
      console.log(`  ${table}: ${c} 条`);
    } catch { console.log(`  ${table}: (不存在)`); }
  }
}

migrate();
