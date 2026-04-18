# 数据库模块 架构设计

## 技术选型

### 选择 SQLite (better-sqlite3)
- **理由**：单文件数据库、零配置、Node.js 同步 API、适合 <10,000 用户
- **不选 MySQL/PostgreSQL**：MVP 阶段杀鸡用牛刀，需要额外部署
- **不选 MongoDB**：数据结构明确固定，关系型更合适

### better-sqlite3 vs node-sqlite3
- better-sqlite3：同步 API，性能更好，代码更简洁
- node-sqlite3：异步回调，高并发场景更好
- **选择 better-sqlite3**：MVP 阶段并发低，同步 API 开发效率高

## 数据流

```
应用启动
  ↓
init.js → 检查 parking.db 是否存在
  ↓
不存在 → 创建 + 建表
存在   → 跳过
  ↓
导出 getDb() 方法
  ↓
各 Controller 调用 getDb() 执行 SQL
```

## 依赖关系

```
database/init.js  （底层，无依赖）
       ↑
  authController.js   (读写 users 表)
  spotController.js   (读写 spots 表)
  borrowController.js (读写 borrows 表)
  buildingController  (读写 buildings/zones 表)
  adminController.js  (读写多表)
```

## 模块间接口

| 调用方 | 调用方式 | 说明 |
|--------|----------|------|
| 所有 Controller | `const { getDb } = require('../../database/init')` | 获取数据库实例 |
| 迁移脚本 | 直接 require init.js | 执行表结构变更 |

## 安全考虑

- SQL 注入防护：全部使用参数化查询（`?` 占位符），不拼接 SQL
- 数据库文件权限：仅应用可读写，目录权限 700
- 无远程访问：SQLite 文件本地，不暴露网络端口

## 扩展性

如果用户量超过 10,000 或需要多实例部署：
- 迁移到 PostgreSQL（SQL 语法差异小）
- better-sqlite3 的 API 可以平滑迁移到 pg
- 但 MVP 阶段不考虑
