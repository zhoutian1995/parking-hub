# 数据库模块 测试计划

## 测试范围
- 数据库初始化和建表
- 表结构完整性
- 初始数据导入
- getDb() 连接可用性

## 测试用例

| 编号 | 测试项 | 输入 | 预期结果 | 实际结果 | 状态 |
|------|--------|------|----------|----------|------|
| DB-001 | 首次初始化 | 删除 db 文件，启动应用 | 自动创建 parking.db，6 张表存在 | | |
| DB-002 | 重复初始化 | db 已存在，启动应用 | 不报错，表结构不变 | | |
| DB-003 | users 表结构 | PRAGMA table_info(users) | 包含 id/openid/phone/nickname/avatar/building/unit/preferred_zone/credit/is_admin/verified/created_at | | |
| DB-004 | spots 表结构 | PRAGMA table_info(spots) | 包含 id/zone/spot_code/owner_id/status/price_hour/price_cap/notes/contract_image/created_at | | |
| DB-005 | borrows 表结构 | PRAGMA table_info(borrows) | 包含 id/spot_id/owner_id/borrower_id/borrower_plate/start_time/end_time/status/price_hour/total_price | | |
| DB-006 | buildings 表 | PRAGMA table_info(buildings) | 包含 id/name/units/sort_order | | |
| DB-007 | zones 表 | PRAGMA table_info(zones) | 包含 id/code/label/floor/sort_order | | |
| DB-008 | verifications 表 | PRAGMA table_info(verifications) | 包含 id/user_id/image_path/status/created_at | | |
| DB-009 | zones 初始数据 | SELECT COUNT(*) FROM zones | 返回 7 | | |
| DB-010 | spots 初始数据 | SELECT COUNT(*) FROM spots | 返回 2325 | | |
| DB-011 | getDb() 连接 | const { getDb } = require('./init'); getDb() | 返回有效的 Database 对象 | | |

## 接口测试

```bash
# 测试数据库初始化（在项目根目录执行）
node -e "
const { getDb } = require('./backend/database/init');
const db = getDb();
console.log('users:', db.prepare('SELECT COUNT(*) as c FROM users').get().c);
console.log('spots:', db.prepare('SELECT COUNT(*) as c FROM spots').get().c);
console.log('zones:', db.prepare('SELECT COUNT(*) as c FROM zones').get().c);
console.log('buildings:', db.prepare('SELECT COUNT(*) as c FROM buildings').get().c);
console.log('borrows:', db.prepare('SELECT COUNT(*) as c FROM borrows').get().c);
"
```

预期输出：
```
users: 0
spots: 2325
zones: 7
buildings: 0
borrows: 0
```

## 边界/异常测试

| 编号 | 测试项 | 输入 | 预期结果 |
|------|--------|------|----------|
| DB-E01 | 数据库文件被删除 | 运行中删除 db 文件 | 下次操作报错或自动重建 |
| DB-E02 | 磁盘空间不足 | （模拟）建表失败 | 抛出明确错误信息 |
| DB-E03 | 重复导入 spots | 两次执行 init-spots.sql | INSERT OR IGNORE，不报错 |

## 验收标准
- [ ] 所有表结构符合详细设计文档
- [ ] zones 表有 7 条记录
- [ ] spots 表有 2,325 条记录
- [ ] getDb() 可正常获取连接
- [ ] 所有字段类型和约束正确

## 测试结果记录
| 日期 | 测试人 | 通过率 | 备注 |
|------|--------|--------|------|
| | | | |
