# 部署模块 架构设计

## 技术选型
- **GitHub Actions**：免费、简单、与 GitHub 集成
- **PM2**：进程管理、自动重启、日志
- **Nginx**：反向代理、静态文件、SSL
- **SQLite**：单文件数据库，备份简单

## 架构图

```
用户浏览器
  ↓ HTTPS
Nginx (443)
  ├── / → 前端静态文件 (frontend/)
  └── /api/* → proxy → Node.js (PM2, port 3000)
                          ↓
                     SQLite (parking.db)
```

## 数据备份

```bash
# 手动备份（定期执行）
cp /home/admin/project/parking-hub/database/parking.db /tmp/parking-backup-$(date +%Y%m%d).db

# 或用 SQLite 的备份命令（在线备份，不需要停服）
sqlite3 /home/admin/project/parking-hub/database/parking.db ".backup '/tmp/parking-backup.db'"
```

## 回滚方案

```bash
# 回滚到上一个版本
cd /home/admin/project/parking-hub
git log --oneline -5
git checkout <previous-commit>
pm2 restart parking-hub
```