# 数据库模块 详细设计

## 数据结构

### users 表
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INTEGER | 自增 | - | 主键 |
| openid | TEXT | 是 | - | 微信 openid（UNIQUE） |
| phone | TEXT | 是 | '' | 手机号 |
| nickname | TEXT | 是 | '' | 昵称 |
| avatar | TEXT | 否 | '' | 头像 URL |
| building | TEXT | 否 | '' | 楼栋（如"20幢"） |
| unit | TEXT | 否 | '' | 单元（如"2单元"） |
| preferred_zone | TEXT | 否 | '' | 常用停车区域（如"G"） |
| credit | INTEGER | 否 | 100 | 信用分 |
| is_admin | INTEGER | 否 | 0 | 是否管理员（0/1） |
| verified | INTEGER | 否 | 0 | 是否已认证（0/1） |
| created_at | TEXT | 否 | datetime('now','localtime') | 注册时间 |

### spots 表
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INTEGER | 自增 | - | 主键 |
| zone | TEXT | 是 | - | 楼层（"B1" 或 "B2"） |
| spot_code | TEXT | 是 | - | 车位编号（UNIQUE，如"A001"） |
| owner_id | INTEGER | 否 | NULL | 车主用户 ID（FK→users） |
| status | TEXT | 否 | 'idle' | idle/available/occupied |
| price_hour | REAL | 否 | 4.0 | 小时价格 |
| price_cap | REAL | 否 | 20.0 | 封顶价格 |
| notes | TEXT | 否 | '' | 备注 |
| contract_image | TEXT | 否 | '' | 合同照片路径（可选） |
| created_at | TEXT | 否 | datetime('now','localtime') | 创建时间 |

### borrows 表
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INTEGER | 自增 | - | 主键 |
| spot_id | INTEGER | 是 | - | 车位 ID（FK→spots） |
| owner_id | INTEGER | 是 | - | 车主用户 ID（FK→users） |
| borrower_id | INTEGER | 是 | - | 借用方用户 ID（FK→users） |
| borrower_plate | TEXT | 否 | '' | 借用方车牌号 |
| start_time | TEXT | 否 | datetime('now','localtime') | 借用开始时间 |
| end_time | TEXT | 否 | NULL | 借用结束时间 |
| status | TEXT | 否 | 'pending' | pending/active/done/disputed |
| price_hour | REAL | 否 | NULL | 借用时的小时价 |
| total_price | REAL | 否 | NULL | 总费用 |

### buildings 表（新建）
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INTEGER | 自增 | - | 主键 |
| name | TEXT | 是 | - | 楼栋名（如"20幢"） |
| units | TEXT | 是 | - | 单元列表（逗号分隔，如"1单元,2单元"） |
| sort_order | INTEGER | 否 | 0 | 排序 |

### zones 表（新建）
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INTEGER | 自增 | - | 主键 |
| code | TEXT | 是 | - | 区域代码（UNIQUE，如"A"） |
| label | TEXT | 是 | - | 显示名（如"地下一层A区"） |
| floor | INTEGER | 是 | - | 楼层（1 或 2） |
| sort_order | INTEGER | 否 | 0 | 排序 |

### verifications 表（保留，不变）
| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INTEGER | 自增 | - | 主键 |
| user_id | INTEGER | 是 | - | 用户 ID |
| image_path | TEXT | 是 | - | 凭证图片路径 |
| status | TEXT | 否 | 'pending' | pending/approved/rejected |
| created_at | TEXT | 否 | datetime('now','localtime') | 提交时间 |

## 初始数据

### zones 表初始数据
```sql
INSERT INTO zones (code, label, floor, sort_order) VALUES
  ('A', '地下一层A区', 1, 1),
  ('B', '地下一层B区', 1, 2),
  ('C', '地下一层C区', 1, 3),
  ('D', '地下一层D区', 1, 4),
  ('E', '地下一层E区', 1, 5),
  ('F', '地下一层F区', 1, 6),
  ('G', '地下二层G区', 2, 7);
```

### spots 表初始数据
使用 `scripts/init-spots.sql` 导入 2,325 条车位记录：
- B1: A001~A378, B001~B416, C001~C475, D001~D283, E001~E355, F001~F118
- B2: G001~G300

### buildings 表初始数据
待用户提供楼栋列表后导入。MVP 阶段可先手动插入几条。

## 迁移策略

由于 SQLite 不支持 ALTER TABLE DROP COLUMN，users 表改字段需要重建：

```sql
-- 1. 新建表
CREATE TABLE users_new (...新结构...);
-- 2. 复制数据
INSERT INTO users_new SELECT ... FROM users;
-- 3. 删除旧表
DROP TABLE users;
-- 4. 重命名
ALTER TABLE users_new RENAME TO users;
```

## getDb() 接口
```javascript
// 返回 better-sqlite3 Database 实例
const { getDb } = require('./database/init');
const db = getDb();
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
```
