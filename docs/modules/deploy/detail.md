# 部署模块 详细设计

## GitHub Actions 配置

```yaml
# .github/workflows/deploy.yml
name: Deploy to Server
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: 47.100.247.237
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /home/admin/project/parking-hub
            git pull
            npm install --production
            node backend/database/migrate.js
            pm2 restart parking-hub
```

## Nginx 配置

```nginx
server {
    listen 443 ssl;
    server_name parking.willeai.cn;

    # 前端静态文件
    location / {
        root /home/admin/project/parking-hub/frontend;
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    ssl_certificate /etc/letsencrypt/live/willeai.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/willeai.cn/privkey.pem;
}
```

## PM2 配置

```json
// ecosystem.config.json
{
  "apps": [{
    "name": "parking-hub",
    "script": "backend/server.js",
    "cwd": "/home/admin/project/parking-hub",
    "env": {
      "NODE_ENV": "production",
      "PORT": 3000
    }
  }]
}
```

## 手动部署步骤

```bash
# SSH 到服务器
ssh root@47.100.247.237

# 拉取代码
cd /home/admin/project/parking-hub
git pull

# 安装依赖
npm install --production

# 数据库迁移（如有）
node backend/database/migrate.js

# 重启服务
pm2 restart parking-hub

# 验证
curl https://parking.willeai.cn/api/health
curl https://parking.willeai.cn/api/spots/stats
```

## 数据库迁移脚本

```javascript
// backend/database/migrate.js
const { getDb } = require('./init');
const db = getDb();

// 检查是否需要迁移
const hasUnit = db.prepare("SELECT COUNT(*) as c FROM pragma_table_info('users') WHERE name='unit'").get().c;
if (!hasUnit) {
  console.log('Adding unit field to users...');
  db.prepare("ALTER TABLE users ADD COLUMN unit TEXT DEFAULT ''").run();
  db.prepare("ALTER TABLE users ADD COLUMN preferred_zone TEXT DEFAULT ''").run();
  console.log('Migration done!');
}
```

## SSL 证书续期

```bash
# certbot 自动续期（已配置 crontab）
certbot renew --quiet
# 续期后重载 nginx
nginx -s reload
```