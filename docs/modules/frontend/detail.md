# 前端模块 详细设计

## 文件结构
```
frontend/
├── index.html          # 主入口 + SPA 壳
└── js/
    └── app.js          # 所有逻辑（单文件）
```

## 页面路由（hash）
- `#/login` → 登录页
- `#/profile` → 完善信息页
- `#/home` → 首页（默认）
- `#/publish` → 发布共享
- `#/spot/:id` → 车位详情
- `#/records` → 借用记录

## 核心函数

### API 封装
```javascript
async function api(method, path, body = null) {
  const opts = { method, headers: {'Content-Type': 'application/json'} };
  const token = localStorage.getItem('ph_token');
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  if (res.status === 401) { logout(); return; }
  return res.json();
}
```

### 页面切换
```javascript
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById('page-' + page).classList.remove('hidden');
}
```

### 一键通知管家
```javascript
function generateNotifyText(borrow) {
  return `您好，我是${currentUser.building}${currentUser.unit}的业主${currentUser.nickname}。
我的车位 ${borrow.spot_code} 已借给邻居使用。
停车时间：${borrow.start_time} ~ ${borrow.end_time}
车牌号：${borrow.plate}
麻烦知悉，谢谢！`;
}

function copyNotifyText(borrow) {
  navigator.clipboard.writeText(generateNotifyText(borrow));
  alert('已复制，发给管家吧！');
}
```

## 状态管理
```javascript
let token = localStorage.getItem('ph_token');
let currentUser = null;  // 登录后加载
let nearbySpots = [];    // 附近车位缓存
let mySpots = [];        // 我的车位缓存
```

## 响应式布局
- max-w-md (448px) 居中，适合手机
- Tailwind 响应式类：sm/md/lg
- 底部导航栏固定