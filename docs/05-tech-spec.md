# 技术方案

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端 | HTML + Tailwind CSS + Vanilla JS | 移动端优先，不依赖框架 |
| 后端 | Node.js + Express | 现有架构 |
| 数据库 | SQLite (better-sqlite3) | 轻量，适合小规模 |
| 认证 | JWT + 手机号登录 | 现有架构 |
| 部署 | 阿里云 + PM2 + Nginx | 现有架构 |
| 域名 | parking.willeai.cn | 已配置 |

## API 改动清单

### 新增接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/spots/nearby` | 根据用户常用区域返回可借车位 |
| GET | `/api/buildings` | 获取楼栋-单元列表 |
| GET | `/api/zones` | 获取停车区域列表 |
| PUT | `/api/me` | 更新用户信息（楼栋、区域等） |

### 改动接口

| 方法 | 路径 | 改动 |
|------|------|------|
| POST | `/api/auth/login` | 首次登录时引导填写楼栋+区域 |
| POST | `/api/spots/bind` | 合同照片改为可选 |
| GET | `/api/me` | 返回 building、unit、preferred_zone |

### 删除/保留

| 方法 | 路径 | 决定 |
|------|------|------|
| POST | `/api/me/verify` | 保留但简化（合同照片可选） |
| GET | `/api/wechat/*` | 保留 |
| GET | `/api/spots/stats` | 保留（管理员用） |

## 数据库迁移

### users 表改动
```sql
-- 新增字段
ALTER TABLE users ADD COLUMN unit TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN preferred_zone TEXT DEFAULT '';

-- 删除字段（SQLite 不支持 DROP COLUMN，需要重建表）
-- 方案：新建表 → 迁移数据 → 删除旧表 → 重命名
```

### 新建表
```sql
CREATE TABLE buildings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  units TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  floor INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0
);
```

### spots 表改动
```sql
ALTER TABLE spots ADD COLUMN contract_image TEXT DEFAULT '';
```

## 前端改动清单

| 页面 | 改动 |
|------|------|
| 登录页 | 不变（手机号 + 验证码） |
| 完善信息页 | **重做**：昵称 + 楼栋下拉 + 单元下拉 + 区域选择 |
| 首页 | **重做**：附近可借车位 + 我的车位 + 最近借用 |
| 发布共享页 | **重做**：简化为设置时段和价格 |
| 车位详情页 | **重做**：显示业主楼栋信息、申请借用 |
| 区域卡片页 | **删除**（不再需要） |
| 管理后台 | **保留**，增加楼栋管理功能 |

## 前端目录结构

```
frontend/
├── index.html          # 主入口（单页应用）
├── js/
│   ├── app.js          # 主逻辑
│   ├── api.js          # API 封装
│   ├── auth.js         # 登录认证
│   ├── pages/
│   │   ├── login.js    # 登录页
│   │   ├── profile.js  # 完善信息页
│   │   ├── home.js     # 首页
│   │   ├── publish.js  # 发布共享
│   │   ├── detail.js   # 车位详情
│   │   └── records.js  # 借用记录
│   └── utils.js        # 工具函数
└── css/
    └── style.css       # 自定义样式
```

## 部署流程

```bash
# 1. 本地改完代码
git add -A && git commit -m "xxx"
git push

# 2. 服务器拉取
ssh root@47.100.247.237
cd /home/admin/project/parking-hub
git pull

# 3. 重启服务
pm2 restart parking-hub

# 4. 验证
curl https://parking.willeai.cn/api/health
```

## 开发顺序

1. **数据库迁移**：改 users 表、新建 buildings/zones 表、预填数据
2. **后端 API**：新增 4 个接口、改动 2 个接口
3. **前端页面**：重做首页、完善信息页、发布页
4. **测试验证**：自测每个功能、打分
5. **部署上线**：push → pull → restart

---

*下一步：看 [06-mvp-checklist.md](./06-mvp-checklist.md) MVP 功能清单*
