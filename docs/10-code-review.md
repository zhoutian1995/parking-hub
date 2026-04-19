# ParkingHub 代码审查报告

**审查日期**：2026-04-19（v3 — 第二轮审查）
**审查范围**：全量代码（后端、前端、部署、数据库）
**审查角色**：架构师 + 产品经理视角
**修正说明**：v2 修正 5 处不准确表述 + 删除 2 个错误项；v3 新增第二轮审查发现

---

## 一、项目概况

| 维度 | 详情 |
|------|------|
| 定位 | 小区内部车位共享平台（江南之星） |
| 技术栈 | Node.js + Express + SQLite (better-sqlite3) + Vanilla JS + Tailwind CSS |
| 架构 | 单页应用，前后端同仓，SPA fallback |
| 部署 | 阿里云 + PM2 + Nginx，GitHub Actions 自动部署 |
| MVP 完成度 | 核心功能基本完成，19/20 项已实现 |

---

## 二、产品视角

### 做得好的

- **产品定位清晰**：封闭小区场景，信任感天然形成
- **30 秒原则**贯穿设计，操作流程简洁
- **新用户引导**（guide.js）设计贴心，降低首次使用门槛
- **空状态处理**完善，各场景都有引导文案和操作按钮
- **通知管家文案生成**解决了实际物业沟通痛点

### 产品问题

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| P1 | 没有手机验证码校验 | 设计 | 任何人知道手机号就能登录。当前小区内部 50 人场景可接受，用户量增长后需补 |
| P2 | 借用流程缺少拒绝功能 | 中等 | 车主无法拒绝借用申请（无 `/borrows/:id/reject` 路由） |
| P3 | 时间冲突未校验 | 中等 | 发布时设置了开始/结束时间，但借用时不检查是否在空闲时段内 |
| P4 | 取消借用申请缺失 | 中等 | 借用方提交申请后无法取消（pending 状态无法主动取消） |
| ~~P5~~ | ~~计费逻辑硬编码封顶 20 元~~ | ✅ 已修复 | 第二轮确认：已 JOIN spots 取 price_cap（borrowController.js:77-87） |
| P6 | 借用方无法结束借用 | 中等 | `done` 接口只检查 `owner_id`，借用方无权主动结束 |
| P7 | 测试面板暴露在生产 | 设计 | 内部项目保留，方便手动和自动化测试 |
| P8 | 没有在线支付闭环 | 设计 | 收款靠收款码截图 + 自觉转账，无确认机制 |

---

## 三、架构视角

### 做得好的

- **SQLite + WAL** 模式适合小规模 MVP，部署简单
- **错误码体系**（errors.js）设计规范，语义清晰
- **asyncHandler** 统一异步错误处理，减少 try-catch 样板代码
- **JWT 认证** + authMiddleware/optionalAuth/adminMiddleware 分层清晰
- **数据库迁移**已有 migrate.js 基础设施，支持增量迁移

### 架构问题

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| A1 | 前端 app.js 490 行单文件 | 中等 | 技术方案设计了 `js/pages/` 目录但未实施，所有逻辑堆在一个文件 |
| A2 | API 函数定义了两次 | 中等 | `guide.js` 和 `app.js` 都定义了 `api()`，后者覆盖前者，guide.js 中的是死代码 |
| A3 | 微信回调路由重复 | 低 | authController 和 userController 各有一套微信登录/回调（routes.js:24-25 和 32-33），功能重叠 |
| A4 | adminController 查询不存在的列 | 低 | `adminController.js:9` 查询 `u.room` 但 users 表无此列，会导致审核列表接口报错 |
| A5 | db 实例是模块级单例 | 低 | 进程生命周期内只有一个连接，对 SQLite 没问题但不可测试 |
| **A6** | **sendSuccess 与 res.json 响应格式不一致** | **严重** | 见下方「第二轮新发现」 |

---

## 四、安全审查

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| ~~S1~~ | ~~JWT secret 默认值~~ | ✅ 已修复 | 生产启动时检测默认值，使用则拒绝启动（server.js:10-13） |
| S2 | 测试接口无保护 | 设计 | 内部项目保留测试面板，方便手动和自动化测试 |
| S3 | CORS 开发环境放行所有来源 | 中等 | 开发模式下 `return cb(null, true)` 放行所有 origin |
| S4 | rate-limit 依赖未使用 | 中等 | `package.json` 有 `express-rate-limit` 但代码里没有使用 |
| S5 | 部署脚本使用 curl + unzip | 中等 | `deploy.yml` 用 `curl + unzip` 而非 `git pull`，存在供应链中间人攻击风险 |
| S6 | 微信 secret 可能在 URL 中暴露 | 低 | `wechatCallback` 拼接的 URL 含 secret，如果被日志记录会泄露 |
| **S7** | **前端 XSS 风险** | **中等** | 见下方「第二轮新发现」 |

---

## 五、代码质量审查

| # | 问题 | 说明 |
|---|------|------|
| C1 | 前端 HTML 内联所有页面模板 | `index.html` 400 行，所有页面模板都在一个 HTML 里 |
| C2 | 全局变量污染 | `app.js` 用全局变量（currentUser、token、currentSpots），前端没有模块化 |
| ~~C3~~ | ~~handleProfileQR 函数未定义~~ | ✅ 已修复：已改为 `previewProfileQR`（index.html:197） |
| ~~C4~~ | ~~发布车位缺少收款码字段~~ | ✅ 已修复：handlePublish 已从 currentUser 传入收款码（app.js:371-372） |
| C5 | doneBorrow 返回字段不一致 | 后端返回 `{ message, total_price, hours, code }` 但前端两处 api() 的返回值处理方式不同 |
| C6 | 无单元测试 | devDependencies 只有 nodemon，没有任何测试框架 |

---

## 六、第二轮审查新发现（v3 新增）

### N1. [严重] sendSuccess 与 res.json 响应格式不一致，导致附近车位始终为空

后端 `sendSuccess()` 把数据包装成 `{ success: true, data: ... }`，但前端 `api()` 直接返回 `res.json()`，没有解包。

**受影响的接口：**

| 接口 | 后端返回 | 前端期望 | 后果 |
|------|----------|----------|------|
| `GET /spots/nearby` | `{ success: true, data: [...] }` | 数组 | `spots.length` 为 undefined → **始终显示空状态** |
| `POST /borrows` | `{ success: true, data: { id, notice }, message: '...' }` | `{ notice }` | toast 显示 undefined |
| `POST /spots/bind` | `{ success: true, data: { spot_code }, message: '...' }` | 原始对象 | 影响较小（只用了 toast） |

其余接口（mySpots、mine、accept、done 等）都用 `res.json()` 直接返回，没有这个问题。

**修复建议**：最简单的改法是让前端 `api()` 返回 `data.data || data`（guide.js 里已有这个逻辑但被 app.js 的同名函数覆盖了）。

### N2. [中等] 借用操作非事务，存在数据不一致风险

`borrowController.js` 的 `accept`（54-55 行）和 `done`（89-90 行）都执行了两条 UPDATE 但未用事务。如果进程在两条语句之间崩溃：

- **accept**：borrows 状态改了但 spots 还是 available → 其他人还能借
- **done**：borrows 状态改了但 spots 还是 occupied → 车位永远卡住

**修复建议**：用 `db.transaction()` 包裹两条 UPDATE。

### N3. [中等] accept 后其他 pending 借用未自动拒绝

车主确认一个借用后，同一车位其他 pending 状态的借用记录不会被拒绝。它们会一直挂着，借用方看不到状态变化。

**修复建议**：accept 时增加 `UPDATE borrows SET status = 'rejected' WHERE spot_id = ? AND status = 'pending' AND id != ?`。

### N4. [中等] 前端 XSS 风险

`app.js` 多处用 `innerHTML` 拼接用户数据（昵称、备注、楼栋等），无 HTML 转义：

- `app.js:252` — `s.owner_name` 直接拼入 HTML
- `app.js:278` — `spot.notes` 直接拼入 HTML
- `app.js:101` — `u.nickname` 拼入测试面板按钮

如果用户昵称设为 `<img onerror="alert(1)" src=x>`，会执行脚本。当前小区封闭场景风险低，但公开部署后需修复。

**修复建议**：加一个 `escapeHtml()` 工具函数，innerHTML 拼接用户数据时调用。

### N5. [低] stats 接口 N+1 查询

`spotController.js:48-56` 对每个 zone 执行 3 次查询，共 21 次查询。可以合并为一条 SQL：

```sql
SELECT zone, status, COUNT(*) as c FROM spots GROUP BY zone, status
```

---

## 七、修复优先级汇总

### 第一轮 TOP 5（已修复）

| 优先级 | 问题 | 状态 |
|--------|------|------|
| P0 | 测试接口加环境保护 | ✅ devOnly 守卫 |
| P0 | handleProfileQR 函数名不匹配 | ✅ 已改为 previewProfileQR |
| P0 | 发布车位传收款码 | ✅ 从 currentUser 传入 |
| P1 | 计费硬编码 20 元 | ✅ JOIN spots 取 price_cap |
| P1 | JWT_SECRET 启动检测 | ✅ 生产环境检查 |

### 第二轮 TOP 5

| 优先级 | 问题 | 文件 | 修复建议 | 状态 |
|--------|------|------|----------|------|
| **P0** | sendSuccess 响应格式不一致 | `frontend/js/app.js:486` | 后端统一用 res.json() 返回 | ✅ 已修复 |
| **P1** | 借用操作非事务 | `backend/api/controllers/borrowController.js` | 用 `db.transaction()` 包裹 | ✅ 已修复 |
| **P1** | XSS 风险 | `frontend/js/app.js` 多处 | 加 `escapeHtml()` 工具函数 | ✅ 已修复 |
| **P2** | accept 后 pending 未清理 | `backend/api/controllers/borrowController.js:54` | 确认时自动拒绝同车位其他 pending 借用 | ✅ 已修复 |
| **P2** | adminController u.room | `backend/api/controllers/adminController.js:9` | 删除 `u.room` 引用 | ✅ 已修复 |

---

## 八、建议改进路线图

### 短期（1 周内）

1. 修复第二轮 TOP 5（N1-N5）
2. 移除重复的微信路由（保留 authController 的版本）
3. 移除 guide.js 中的死代码 api() 函数

### 中期（MVP 迭代）

1. 前端拆分 app.js 到 `js/pages/` 目录
2. 增加借用拒绝和取消功能
3. 增加借用时间冲突校验
4. 添加 rate-limit 中间件
5. 引入轻量测试框架（如 vitest）

### 长期（用户量增长后）

1. 在线支付闭环
2. 消息通知（微信模板消息 / 短信）
3. SVG 车位地图可视化

---

*文档更新时间：2026-04-19（v3 — 第二轮审查）*
