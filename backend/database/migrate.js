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

  // 导入楼栋数据（示例，后续用户补充）
  const buildingCount = db.prepare("SELECT COUNT(*) as c FROM buildings").get().c;
  if (buildingCount === 0) {
    console.log('Inserting building data...');
    const insertBuilding = db.prepare("INSERT INTO buildings (name, units, sort_order) VALUES (?, ?, ?)");
    const insertMany = db.transaction((buildings) => {
      for (const b of buildings) insertBuilding.run(b.name, b.units, b.sort);
    });
    // 示例数据：单单元楼 + 双单元楼
    insertMany([
      { name: '1幢', units: '1单元', sort: 1 },
      { name: '2幢', units: '1单元', sort: 2 },
      { name: '3幢', units: '1单元', sort: 3 },
      { name: '5幢', units: '1单元', sort: 5 },
      { name: '6幢', units: '1单元', sort: 6 },
      { name: '7幢', units: '1单元', sort: 7 },
      { name: '8幢', units: '1单元', sort: 8 },
      { name: '9幢', units: '1单元', sort: 9 },
      { name: '10幢', units: '1单元,2单元', sort: 10 },
      { name: '11幢', units: '1单元,2单元', sort: 11 },
      { name: '12幢', units: '1单元,2单元', sort: 12 },
      { name: '13幢', units: '1单元,2单元', sort: 13 },
      { name: '15幢', units: '1单元,2单元', sort: 15 },
      { name: '16幢', units: '1单元,2单元', sort: 16 },
      { name: '17幢', units: '1单元,2单元', sort: 17 },
      { name: '18幢', units: '1单元,2单元', sort: 18 },
      { name: '19幢', units: '1单元,2单元', sort: 19 },
      { name: '20幢', units: '1单元,2单元', sort: 20 },
      { name: '21幢', units: '1单元,2单元', sort: 21 },
      { name: '22幢', units: '1单元,2单元', sort: 22 },
      { name: '23幢', units: '1单元,2单元', sort: 23 },
      { name: '25幢', units: '1单元,2单元', sort: 25 },
      { name: '26幢', units: '1单元,2单元', sort: 26 },
      { name: '27幢', units: '1单元,2单元', sort: 27 },
      { name: '28幢', units: '1单元,2单元', sort: 28 },
      { name: '29幢', units: '1单元,2单元', sort: 29 },
      { name: '30幢', units: '1单元,2单元', sort: 30 },
    ]);
    migrated = true;
    console.log('✅ buildings 表：27 幢楼数据已导入（示例，请核实后补充）');
  }

  if (!migrated) {
    console.log('✅ 数据库已是最新，无需迁移');
  } else {
    console.log('🎉 迁移完成！');
  }

  // 打印当前表结构
  console.log('\n📊 当前数据库状态：');
  const count = (table) => db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
  console.log(`  users: ${count('users')} 条`);
  console.log(`  spots: ${count('spots')} 条`);
  console.log(`  borrows: ${count('borrows')} 条`);
  console.log(`  buildings: ${count('buildings')} 条`);
  console.log(`  zones: ${count('zones')} 条`);
}

migrate();
