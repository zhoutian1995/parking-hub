# 部署模块 概要设计

## 目标
管理 ParkingHub 的部署、运维和持续交付流程。

## 范围
### 包含
- GitHub Actions CI/CD（自动部署）
- Nginx 配置（反向代理 + 静态文件）
- PM2 进程管理
- 数据库迁移执行
- SSL 证书管理

### 不包含
- 容器化（Docker）— MVP 不需要
- 负载均衡 — 单机部署
- 监控告警 — 后续考虑

## 服务器信息
- 阿里云 ECS：47.100.247.237
- 系统：Alibaba Cloud Linux 3
- 域名：parking.willeai.cn
- 项目路径：/home/admin/project/parking-hub

## 核心流程
1. 本地开发 → git push
2. GitHub Actions 触发 → SSH 到服务器 → git pull → npm install → pm2 restart
3. Nginx 反向代理 /api/* → Node.js (PM2)
4. Nginx 直接提供前端静态文件