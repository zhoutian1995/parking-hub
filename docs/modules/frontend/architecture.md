# 前端模块 架构设计

## 技术选型
- **Vanilla JS**：不需要 React/Vue（MVP 复杂度低）
- **Tailwind CDN**：不构建，直接用 CDN
- **单文件 app.js**：所有逻辑集中，便于维护
- **hash 路由**：不依赖 history API，兼容性好

## 数据流
```
用户操作 → JS 事件处理
  ↓
调用 api() 函数
  ↓
fetch 请求后端
  ↓
收到 JSON → 更新页面 DOM
```

## 依赖关系
```
index.html
  ├── Tailwind CDN
  └── js/app.js
        ├── localStorage (token)
        └── /api/* (后端接口)
```

## 部署方式
- 静态文件 → Nginx 直接提供
- /api/* → Nginx 反向代理到 Node.js (PM2)
- 不需要 Node.js 处理前端

## 安全考虑
- token 存 localStorage（XSS 风险可接受，MVP 阶段）
- 所有敏感操作通过后端 API 验证
- 前端不做权限判断（后端统一拦截）