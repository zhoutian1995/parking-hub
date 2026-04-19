# ParkingHub 代码审查报告

**审查日期**：2026-04-19（v2 修正版）
**审查范围**：全量代码（后端、前端、部署、数据库）
**审查角色**：架构师 + 产品经理视角
**修正说明**：初版 17 个问题经代码验证后，修正了 5 处不准确表述，删除 2 个错误项

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
| P2 | 借用流程缺少拒绝功能 | 中等 | 车主无法拒绝借用申请（无 `/borrows/:id/reject` 路由）。管理员拒绝验证申请的接口存在，但属于不同场景 |
| P3 | 时间冲突未校验 | 中等 | 发布时设置了开始/结束时间，但借用时不检查是否在空闲时段内 |
| P4 | 取消借用申请缺失 | 中等 | 借用方提交申请后无法取消（pending 状态无法主动取消） |
| P5 | 计费逻辑硬编码封顶 20 元 | 中等 | `borrowController.js:81` 写死了 `Math.min(..., 20)`，应使用 `borrow.price_cap` |
| P6 | 借用方无法结束借用 | 中等 | `done` 接口只检查 `owner_id`，借用方无权主动结束 |
| P7 | 测试面板暴露在生产 | **严重** | `/test/accounts` 和 `/test/login` 无环境判断，任何人可查看用户列表并免密登录 |
| P8 | 没有在线支付闭环 | 设计 | 收款靠收款码截图 + 自觉转账，无确认机制 |

---

## 三、架构视角

### 做得好的

- **SQLite + WAL** 模式适合小规模 MVP，部署简单
- **错误码体系**（errors.js）设计规范，语义清晰
- **asyncHandler** 统一异步错误处理，减少 try-catch 样板代码
- **JWT 认证** + authMiddleware/adminMiddleware 分层清晰
- **数据库迁移**已有 migrate.js 基础设施

### 架构问题

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| A1 | 前端 app.js 700+ 行单文件 | 中等 | 技术方案设计了 `js/pages/` 目录但未实施，所有逻辑堆在一个文件 |
| A2 | API 函数定义了两次 | 中等 | `guide.js` 和 `app.js` 都定义了 `api()`，后者覆盖前者，guide.js 中的实际是死代码 |
| A3 | 微信回调路由重复 | 中等 | authController 和 userController 各有一套微信登录/回调（routes.js:17-18 和 25-26），功能重叠 |
| A4 | 数据库列缺失 | 中等 | `adminController.js:9` 查询 `u.room` 但 users 表无此列 |
| A5 | db 实例是模块级单例 | 低 | 进程生命周期内只有一个连接，对 SQLite 没问题但不可测试 |

---

## 四、安全审查

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| S1 | JWT secret 默认值 | 中等 | `config/index.js` 有 `\|\| 'dev-secret'` 回退值。代码模式危险，**但当前生产 .env 已配置真实值**，实际未使用默认值。建议启动时检测并拒绝默认值 |
| S2 | 测试接口无保护 | **严重** | `/test/accounts` 泄露所有用户手机号 + 昵称，`/test/login` 可免密码登录任意用户 |
| S3 | CORS 开发环境放行所有来源 | 中等 | 开发模式下 `return cb(null, true)` 放行所有 origin |
| S4 | rate-limit 依赖未使用 | 中等 | `package.json` 有 `express-rate-limit` 但代码里没有使用 |
| S5 | 部署脚本使用 curl + unzip | 中等 | `deploy.yml` 用 `curl + unzip` 而非 `git pull`，存在供应链中间人攻击风险 |
| S6 | 微信 secret 可能在 URL 中暴露 | 低 | `wechatCallback` 拼接的 URL 含 secret，如果被日志记录会泄露 |

---

## 五、代码质量审查

| # | 问题 | 说明 |
|---|------|------|
| C1 | 前端 HTML 内联所有页面模板 | `index.html` 375 行，所有页面模板都在一个 HTML 里 |
| C2 | 全局变量污染 | `app.js` 用全局变量（currentUser、token、currentSpots），前端没有模块化 |
| C3 | `handleProfileQR` 函数未定义 | HTML `onchange="handleProfileQR(this)"` 引用了不存在的函数，`app.js` 定义的是 `previewProfileQR`，**收款码上传直接报错** |
| C4 | 发布车位接口缺少收款码字段 | **发布功能实际会失败**。前端 `handlePublish` 只传 `price_hour、price_cap、notes`，但后端 `share` 接口要求 `qr_alipay` 或 `qr_wechat`，缺少则返回 400。用户在个人资料设置了收款码，但发布时未传递到后端 |
| C5 | doneBorrow 返回字段不一致 | 后端返回 `{ message, total_price, hours, code }` 但前端两处 api() 的返回值处理方式不同 |
| C6 | 无单元测试 | devDependencies 只有 nodemon，没有任何测试框架 |

---

## 六、最需立即修复的 TOP 5

| 优先级 | 问题 | 文件 | 修复建议 |
|--------|------|------|----------|
| **P0** | 测试接口加环境保护 | `backend/api/routes.js` | `/test/*` 路由加 `config.env === 'development'` 判断，生产环境返回 404 |
| **P0** | 函数名不匹配导致收款码上传失效 | `frontend/index.html:197` | `handleProfileQR` 改为 `previewProfileQR`（与 app.js 一致） |
| **P0** | 发布车位会 400 失败 | `frontend/js/app.js:369` | handlePublish 需要从 currentUser 传入收款码数据到 `/spots/:id/share` |
| **P1** | 计费硬编码 20 元 | `backend/api/controllers/borrowController.js:81` | 用 `borrow.price_cap` 替代硬编码的 20 |
| **P1** | JWT_SECRET 启动检测 | `backend/config/index.js` | 生产环境启动时检测是否使用了默认值 `'dev-secret'`，是则拒绝启动 |

---

## 七、建议改进路线图

### 短期（1 周内）

1. 修复 TOP 5 问题（C3、C4、S2、P5、S1）
2. 移除重复的微信路由（保留 authController 的版本）
3. 给 `adminController` 的 `u.room` 查询修复列名

### 中期（MVP 迭代）

1. 前端拆分 app.js 到 `js/pages/` 目录
2. 增加借用拒绝和取消功能
3. 增加借用时间冲突校验
4. 添加 rate-limit 中间件
5. 引入轻量测试框架（如 vitest）

### 长期（用户量增长后）

1. 完善数据库迁移机制
2. 在线支付闭环
3. 消息通知（微信模板消息 / 短信）
4. SVG 车位地图可视化

---

*文档更新时间：2026-04-19（v2 修正版）*
