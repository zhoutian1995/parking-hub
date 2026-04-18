# 用户认证模块 架构设计

## 技术选型

### 微信 OAuth + JWT
- **为什么选微信 OAuth**：江南之星业主都用微信，无需额外注册流程
- **为什么选 JWT**：无状态认证，不需要服务端 session 存储
- **Token 过期 7 天**：平衡安全性和用户体验（频繁登录体验差）

### 不选手机号+密码
- 密码管理复杂（找回、加密、泄露风险）
- 微信授权更简单，用户不需要记密码

## 数据流

```
用户点击登录
  ↓
前端 GET /api/wechat/login → 返回微信授权 URL
  ↓
用户微信授权 → 微信回调 /api/wechat/callback?code=xxx
  ↓
后端用 code 换 access_token → 获取 openid + nickname
  ↓
查 users 表 WHERE openid = ?
  ├── 存在 → UPDATE nickname/avatar
  └── 不存在 → INSERT 新用户
  ↓
签发 JWT (id, openid, is_admin) → 7天有效
  ↓
前端保存 token 到 localStorage
  ↓
后续请求 Header: Authorization: Bearer <token>
  ↓
auth 中间件验证 JWT → req.user = {id, openid, is_admin}
  ↓
Controller 处理业务
```

## 依赖关系

```
middleware/auth.js  （被所有需要登录的接口引用）
       ↑
authController.js   (登录回调)
spotController.js   (需要 req.user.id)
borrowController.js (需要 req.user.id)
userController.js   (需要 req.user.id)
```

## 模块间接口

| 调用方 | 调用方式 | 说明 |
|--------|----------|------|
| 所有需要登录的路由 | `router.get('/xxx', auth, controller.xxx)` | auth 中间件注入 req.user |
| 前端 | `localStorage.getItem('ph_token')` | 获取存储的 JWT |

## 安全考虑

- JWT Secret 从环境变量读取，不硬编码
- Token 过期后前端自动清除并跳转登录
- 不返回 openid 给前端（只在 JWT payload 中）
- auth 中间件统一处理 401，不分散在各 Controller

## 扩展性

如果后续需要手机号登录：
- 新增 POST /api/auth/phone 接口
- JWT payload 不变（只有 id + is_admin）
- 微信登录和手机号登录可以共存（同一个用户记录）
