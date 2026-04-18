# 用户认证模块 详细设计

## 接口定义

### 1. GET /api/wechat/login
- **功能**：生成微信 OAuth 授权 URL
- **请求**：无
- **响应**：
  ```json
  // 微信已配置
  { "url": "https://open.weixin.qq.com/..." }
  // 微信未配置（开发模式）
  { "url": null, "dev": true, "message": "微信未配置，使用开发模式" }
  ```

### 2. GET /api/wechat/callback
- **功能**：微信授权回调，签发 JWT
- **请求参数**：`?code=xxx`（微信返回的授权码）
- **处理逻辑**：
  1. 用 code 调微信 API 换 access_token
  2. 用 access_token 获取用户信息（openid, nickname, avatar）
  3. 查询 users 表 WHERE openid = ?
     - 不存在 → INSERT 新用户
     - 已存在 → UPDATE nickname/avatar
  4. 签发 JWT（payload: {id, openid, is_admin}）
  5. 302 重定向到 `/?token=<jwt>`
- **异常处理**：
  - code 无效 → 重定向 `/?error=no_code`
  - 微信 API 报错 → 重定向 `/?error=auth_failed`

### 3. GET /api/me
- **功能**：获取当前用户信息
- **认证**：需要 JWT
- **响应**：
  ```json
  {
    "id": 1,
    "nickname": "张三",
    "avatar": "https://...",
    "phone": "13800138000",
    "building": "20幢",
    "unit": "2单元",
    "preferred_zone": "B2-G",
    "verified": 1,
    "is_admin": 0,
    "credit": 100
  }
  ```
- **SQL**：`SELECT id, nickname, avatar, phone, building, unit, preferred_zone, verified, is_admin, credit FROM users WHERE id = ?`

### 4. PUT /api/me
- **功能**：更新用户信息
- **认证**：需要 JWT
- **请求体**：
  ```json
  {
    "nickname": "张三",
    "building": "20幢",
    "unit": "2单元",
    "preferred_zone": "B2-G"
  }
  ```
- **处理逻辑**：
  1. 校验必填字段：nickname 不能为空
  2. 校验 building 是否在 buildings 表中存在
  3. 校验 preferred_zone 是否在 zones 表中存在
  4. UPDATE users SET ... WHERE id = ?
- **响应**：`{ "message": "更新成功" }`
- **异常处理**：
  - nickname 为空 → 400 { error: "昵称不能为空" }
  - building 不存在 → 400 { error: "楼栋不存在" }
  - zone 不存在 → 400 { error: "区域不存在" }

### 5. POST /api/me/verify
- **功能**：提交认证凭证
- **认证**：需要 JWT
- **请求体**：`{ "image": "/uploads/xxx.jpg" }`
- **处理逻辑**：
  1. 校验 image 不为空
  2. INSERT INTO verifications (user_id, image_path, status) VALUES (?, ?, 'pending')
- **响应**：`{ "id": 1, "message": "已提交，等待管理员审核" }`

## 中间件：auth.js
```javascript
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: '未登录' });
  const token = header.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token 无效或已过期' });
  }
}
```

## JWT 配置
- Secret：从 config.jwt.secret 读取
- 过期时间：7 天（config.jwt.expiresIn = '7d'）
- Payload：{ id, openid, is_admin }
