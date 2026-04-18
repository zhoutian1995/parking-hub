# 用户数据模型

## 用户信息字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | INTEGER | 自增 | 主键 |
| openid | TEXT | ✅ | 微信 openid（唯一标识） |
| phone | TEXT | ✅ | 手机号 |
| nickname | TEXT | ✅ | 昵称 |
| avatar | TEXT | - | 头像 URL |
| building | TEXT | ✅ | 楼栋（如"20幢"） |
| unit | TEXT | ✅ | 单元（如"2单元"，单单元楼可为空） |
| preferred_zone | TEXT | ✅ | 常用停车区域（如"G"） |
| credit | INTEGER | 默认100 | 信用分 |
| is_admin | INTEGER | 默认0 | 是否管理员 |
| created_at | TEXT | 自动 | 注册时间 |

## 楼栋-单元列表（手动维护）

这个表由管理员手动录入，前端注册时下拉选择。

```
楼栋单元表 (buildings)
┌───────┬──────────────┐
│ 楼栋   │ 单元列表      │
├───────┼──────────────┤
│ 1幢   │ 1单元         │
│ 2幢   │ 1单元         │
│ ...   │ ...          │
│ 20幢  │ 1单元, 2单元   │
│ ...   │ ...          │
│ 30幢  │ 1单元, 2单元   │
└───────┴──────────────┘
```

**数据库表结构：**

```sql
CREATE TABLE buildings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,           -- "20幢"
  units TEXT NOT NULL,          -- "1单元,2单元" (逗号分隔)
  sort_order INTEGER DEFAULT 0  -- 排序
);
```

## 停车区域列表

| 区域 | 楼层 | 编号范围 | 数量 | 说明 |
|------|------|----------|------|------|
| A | B1 | A001~A378 | 378 | 地下一层 A 区 |
| B | B1 | B001~B416 | 416 | 地下一层 B 区 |
| C | B1 | C001~C475 | 475 | 地下一层 C 区 |
| D | B1 | D001~D283 | 283 | 地下一层 D 区 |
| E | B1 | E001~E355 | 355 | 地下一层 E 区 |
| F | B1 | F001~F118 | 118 | 地下一层 F 区 |
| G | B2 | G001~G300 | 300 | 地下二层 G 区 |

**数据库表结构：**

```sql
CREATE TABLE zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,    -- "A"
  label TEXT NOT NULL,          -- "地下一层A区"
  floor INTEGER NOT NULL,       -- 1 或 2
  sort_order INTEGER DEFAULT 0
);
```

> 注：`preferred_zone` 字段（users 表）对应用户选择的"常用停车区域"，值为区域代码如 "A"、"G"。

## 车位表（改造）

```sql
CREATE TABLE spots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone TEXT NOT NULL,              -- "B1" 或 "B2"
  spot_code TEXT UNIQUE NOT NULL,  -- "A001"
  owner_id INTEGER,
  status TEXT DEFAULT 'idle',      -- idle / available / occupied
  price_hour REAL DEFAULT 4.0,
  price_cap REAL DEFAULT 20.0,
  notes TEXT DEFAULT '',
  contract_image TEXT DEFAULT '',  -- 合同照片（可选）
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

## 借用记录表（不变）

```sql
CREATE TABLE borrows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spot_id INTEGER NOT NULL,
  owner_id INTEGER NOT NULL,
  borrower_id INTEGER NOT NULL,
  borrower_plate TEXT DEFAULT '',
  start_time TEXT DEFAULT (datetime('now','localtime')),
  end_time TEXT,
  status TEXT DEFAULT 'pending',   -- pending / active / done / disputed
  price_hour REAL,
  total_price REAL,
  FOREIGN KEY (spot_id) REFERENCES spots(id),
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (borrower_id) REFERENCES users(id)
);
```

## 与现有模型的差异

| 字段 | 旧模型 | 新模型 | 改动原因 |
|------|--------|--------|----------|
| building | 有 | 有 | 保留 |
| room | 有 | **删除** | 不需要房号，保护隐私 |
| unit | 无 | **新增** | 支持多单元楼栋 |
| preferred_zone | 无 | **新增** | 用户自选常用区域，用于排序 |
| contract_image | 无 | **新增** | 合同照片可选 |
| buildings 表 | 无 | **新增** | 手动维护楼栋-单元列表 |
| zones 表 | 无 | **新增** | 停车区域列表 |

---

*下一步：看 [05-tech-spec.md](./05-tech-spec.md) 技术方案*
