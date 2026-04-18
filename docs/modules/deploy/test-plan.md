# 部署模块 测试计划

## 测试范围
- 部署流程正确性
- Nginx 配置验证
- PM2 进程管理
- SSL 证书有效性
- API 可达性

## 测试用例

| 编号 | 测试项 | 操作 | 预期结果 | 实际结果 | 状态 |
|------|--------|------|----------|----------|------|
| DEP-001 | HTTPS 访问 | curl https://parking.willeai.cn | 200 返回前端 HTML | | |
| DEP-002 | API 可达 | curl https://parking.willeai.cn/api/spots/stats | 200 返回 JSON | | |
| DEP-003 | PM2 在线 | pm2 list | parking-hub 状态 online | | |
| DEP-004 | SSL 证书 | openssl s_client -connect parking.willeai.cn:443 | 证书有效 | | |
| DEP-005 | 部署后验证 | git push 后等 1 分钟 | 服务正常，pm2 uptime 更新 | | |
| DEP-006 | 回滚测试 | git checkout 上一版本 + pm2 restart | 服务降级到上一版本 | | |
| DEP-007 | 数据库备份 | cp parking.db /tmp/backup.db | 备份文件存在且可用 | | |

## 接口测试

```bash
# 线上 API 验证
curl -s https://parking.willeai.cn/api/spots/stats | jq
curl -s https://parking.willeai.cn/api/zones | jq
curl -s https://parking.willeai.cn/api/buildings | jq

# PM2 状态
ssh root@47.100.247.237 "pm2 list"

# Nginx 配置测试
ssh root@47.100.247.237 "nginx -t"
```

## 验收标准
- [ ] https://parking.willeai.cn 可访问
- [ ] /api/* 接口正常返回
- [ ] PM2 进程 online
- [ ] SSL 证书有效
- [ ] 部署后服务自动恢复

## 测试结果记录
| 日期 | 测试人 | 通过率 | 备注 |
|------|--------|--------|------|
| | | | |