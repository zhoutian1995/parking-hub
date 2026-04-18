# 用户认证模块 测试计划

## 测试范围
- 微信登录流程（开发模式模拟）
- JWT 签发和验证
- GET /api/me 获取用户信息
- PUT /api/me 更新用户信息
- auth 中间件鉴权

## 测试用例

| 编号 | 测试项 | 输入 | 预期结果 | 实际结果 | 状态 |
|------|--------|------|----------|----------|------|
| AUTH-001 | 微信登录（开发模式） | GET /api/wechat/login | 返回 {url: null, dev: true} | | |
| AUTH-002 | GET /api/me 无 token | 不带 Authorization header | 401 {error: "未登录"} | | |
| AUTH-003 | GET /api/me 有效 token | 有效 JWT | 200 返回用户信息（含 unit, preferred_zone） | | |
| AUTH-004 | GET /api/me 过期 token | 已过期的 JWT | 401 {error: "Token 无效或已过期"} | | |
| AUTH-005 | PUT /api/me 更新信息 | {nickname, building, unit, preferred_zone} | 200 {message: "更新成功"} | | |
| AUTH-006 | PUT /api/me 空昵称 | {nickname: ""} | 400 {error: "昵称不能为空"} | | |
| AUTH-007 | PUT /api/me 无效区域 | {preferred_zone: "Z"} | 400 {error: "区域不存在"} | | |
| AUTH-008 | PUT /api/me 无 token | 不带 Authorization | 401 {error: "未登录"} | | |

## 接口测试

```bash
# 先启动服务
cd /Users/wille/parking-hub && node backend/server.js &

# 测试 1：微信登录（开发模式）
curl -s http://localhost:3000/api/wechat/login | jq

# 测试 2：无 token 访问 /me
curl -s http://localhost:3000/api/me | jq

# 测试 3：更新用户信息（需要先拿到有效 token）
curl -s -X PUT http://localhost:3000/api/me \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"张三","building":"20幢","unit":"2单元","preferred_zone":"G"}' | jq

# 测试 4：空昵称
curl -s -X PUT http://localhost:3000/api/me \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"nickname":""}' | jq
```

## 边界/异常测试

| 编号 | 测试项 | 输入 | 预期结果 |
|------|--------|------|----------|
| AUTH-E01 | 伪造 JWT | 随机字符串作为 token | 401 |
| AUTH-E02 | 超长昵称 | 500 字符的 nickname | 应拒绝或截断 |
| AUTH-E03 | SQL 注入 | building: "'; DROP TABLE users;--" | 参数化查询阻止 |

## 验收标准
- [ ] 微信登录流程可走通（开发模式）
- [ ] JWT 正常签发和验证
- [ ] GET /api/me 返回完整用户信息
- [ ] PUT /api/me 可更新楼栋/单元/区域
- [ ] auth 中间件统一处理未登录情况
- [ ] 无 token 访问受保护接口返回 401

## 测试结果记录
| 日期 | 测试人 | 通过率 | 备注 |
|------|--------|--------|------|
| | | | |
