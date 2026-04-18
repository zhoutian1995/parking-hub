# 用户认证模块 概要设计

## 目标
处理用户身份认证和信息管理，包括微信登录、手机号绑定、用户信息维护。

## 范围
### 包含
- 微信 OAuth 授权登录
- JWT Token 签发和验证
- 获取当前用户信息（GET /api/me）
- 更新用户信息（PUT /api/me）
- 提交认证凭证（POST /api/me/verify）

### 不包含
- 手机号短信验证码（MVP 阶段暂不做）
- 用户注册（首次微信登录自动注册）
- 密码管理（无密码体系，依赖微信）

## 输入
- 微信 OAuth code → 换取用户信息
- 前端传 JWT Token → 验证身份
- 前端传用户信息（nickname/building/unit/preferred_zone）

## 输出
- JWT Token（登录成功后返回）
- 用户信息 JSON（GET /api/me）

## 依赖模块
### 依赖谁
- database 模块（读写 users 表）

### 被谁依赖
- spot 模块（需要 req.user.id 查询车位）
- borrow 模块（需要 req.user.id 查询借用记录）
- 所有需要登录的接口（通过 auth 中间件）

## 核心流程
### 登录流程
1. 前端调用 /api/wechat/login → 获取微信授权 URL
2. 用户微信授权 → 微信回调 /api/wechat/callback
3. 后端用 code 换 access_token → 获取用户信息
4. 查询 users 表：有则更新，无则新建
5. 签发 JWT Token → 前端保存

### 鉴权流程
1. 前端请求带 Authorization: Bearer <token>
2. auth 中间件验证 JWT → 解析出 user.id
3. 将 user 信息挂到 req.user → 传给后续 handler
