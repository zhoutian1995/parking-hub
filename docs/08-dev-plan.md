# 代码开发计划

## 现有代码概况

```
backend/
├── server.js          # Express 入口
├── database/init.js   # SQLite 初始化（users/spots/borrows/verifications）
├── config/index.js    # 配置
├── middleware/auth.js  # JWT 认证中间件
├── api/
│   ├── routes.js      # 路由注册
│   └── controllers/
│       ├── authController.js     # 微信登录、获取用户
│       ├── spotController.js     # 车位 CRUD
│       ├── borrowController.js   # 借用流程
│       ├── userController.js     # 认证提交
│       └── adminController.js    # 管理后台
frontend/
├── index.html         # 单页应用
└── js/app.js          # 前端逻辑
```

## 要改什么（对比新需求 vs 现有代码）

| 需求 | 现状 | 改动量 |
|------|------|--------|
| users 表加 unit + preferred_zone 字段 | 只有 building + room | 小改 |
| 新建 buildings 表（楼栋-单元） | 不存在 | 新增 |
| 新建 zones 表（停车区域） | 不存在 | 新增 |
| 注册时填楼栋+单元+常用区域 | 只有楼栋+房号 | 中改 |
| 首页显示"附近可借车位" | 按区域显示卡片 | 中改 |
| GET /api/spots/nearby | 不存在 | 新增 |
| GET /api/buildings | 不存在 | 新增 |
| GET /api/zones | 不存在 | 新增 |
| PUT /api/me 更新用户信息 | 不存在 | 新增 |
| 一键通知管家 | 不存在 | 纯前端 |
| 去掉区域卡片页面 | 有 | 删代码 |
| 合同照片可选 | 现在必填 | 小改 |
| stats 接口区域列表 | 写死 E/F/G | 改成 A~G |

---

## 开发步骤（共 6 步）

### Step 1：数据库迁移（后端）

**改 `database/init.js`：**

1. users 表新增 `unit TEXT DEFAULT ''` 和 `preferred_zone TEXT DEFAULT ''`
2. spots 表新增 `contract_image TEXT DEFAULT ''`
3. 新建 buildings 表
4. 新建 zones 表
5. 新建迁移脚本，初始化 zones 数据（7 个区域）
6. 新建迁移脚本，导入 spots 数据（2,325 条）

**产出：** 数据库结构更新 + 初始数据导入

---

### Step 2：后端 API 新增/改动（后端）

**新增 4 个接口：**

| 方法 | 路径 | 功能 | 所在文件 |
|------|------|------|----------|
| GET | /api/buildings | 返回楼栋-单元列表 | 新建 buildingController.js |
| GET | /api/zones | 返回停车区域列表 | 新建或复用 spotController |
| GET | /api/spots/nearby | 根据用户 preferred_zone 返回附近可借车位 | spotController.js |
| PUT | /api/me | 更新用户信息（nickname/building/unit/zone） | userController.js |

**改动 2 个接口：**

| 方法 | 路径 | 改动 |
|------|------|------|
| GET | /api/me | 返回字段加 unit + preferred_zone |
| POST | /api/spots/bind | 合同照片改为可选 |
| stats | /api/spots/stats | 区域列表从 E/F/G 改成 A~G |

**改动 `routes.js`：** 注册新路由

**产出：** 4 个新 API + 3 个改动 API

---

### Step 3：前端 - 完善信息页（前端）

**新建 `frontend/js/pages/profile.js`：**

- 首次登录后跳转此页
- 昵称输入
- 楼栋下拉（调 /api/buildings）
- 单元下拉（根据选中的楼栋动态变化）
- 常用区域选择（调 /api/zones，显示 A~G）
- 提交后跳转首页

**产出：** 完善信息页面

---

### Step 4：前端 - 首页重做（前端）

**改写 `frontend/index.html` + `frontend/js/app.js`：**

新首页三块内容：
1. **附近可借车位**（调 /api/spots/nearby，最多显示 5 个）
   - 显示：车位号、价格、区域
   - 同区域标 ⭐ 同区域
   - 点击进入详情
2. **我的车位**（已有，微调）
   - 显示车位号、状态
   - 空闲时显示"发布共享"按钮
3. **最近借用**（已有，微调）

删除区域卡片页面（zone-stats 区域）

**产出：** 新首页

---

### Step 5：前端 - 发布共享 + 一键通知管家（前端）

**改发布共享页面：**
- 简化为：选车位 → 设置开始时间 → 设置结束时间 → 设置价格 → 确认发布

**新增"一键通知管家"按钮（借用确认后显示）：**
- 在借用详情/确认页面
- 自动生成文案：
  ```
  您好，我是{building}{unit}的业主{nickname}。
  我的车位 {spot_code} 已借给邻居使用。
  停车时间：{start_time} ~ {end_time}
  车牌号：{plate}
  麻烦知悉，谢谢！
  ```
- 点击复制到剪贴板

**产出：** 发布页面简化 + 通知管家功能

---

### Step 6：部署上线（运维）

```bash
# 本地
git add -A && git commit -m "feat: v2 重构（楼栋+区域+附近车位+通知管家）"
git push

# 服务器
ssh root@47.100.247.237
cd /home/admin/project/parking-hub
git pull
# 运行数据库迁移
node backend/database/migrate.js
pm2 restart parking-hub
```

**产出：** 线上可用

---

## 执行顺序

```
Step 1（DB） → Step 2（API） → Step 3（前端信息页） → Step 4（前端首页） → Step 5（前端发布+管家） → Step 6（部署）
```

每步完成后自测通过再进下一步。

## 估算工时

| 步骤 | 工时 |
|------|------|
| Step 1 数据库 | 30 分钟 |
| Step 2 后端 API | 1 小时 |
| Step 3 完善信息页 | 40 分钟 |
| Step 4 首页重做 | 1 小时 |
| Step 5 发布+管家 | 40 分钟 |
| Step 6 部署 | 15 分钟 |
| **合计** | **约 4 小时** |

---

*所有步骤完成后，文档中标注 ✅ 状态*
