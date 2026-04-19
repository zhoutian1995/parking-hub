# 新用户引导 + 空状态优化 - 详细设计

## 1. 新用户引导流程

### 1.1 引导触发条件

```javascript
// 检查是否需要显示引导
function shouldShowGuide() {
  return !localStorage.getItem('ph_has_seen_guide') && currentUser;
}
```

### 1.2 引导步骤

| 步骤 | 触发时机 | 高亮元素 | 提示文案 |
|------|----------|----------|----------|
| 1 | 登录后 | 无（全屏遮罩） | "欢迎加入 ParkingHub！3步开始使用你的车位" |
| 2 | 点击"下一步" | `#profile-building` | "先选择你的楼栋" |
| 3 | 进入首页 | `button[onclick*="bindSpot"]` | "绑定你的车位" |
| 4 | 绑定完成 | `button[onclick*="navigate('publish')"]` | "发布后邻居就能借用" |

### 1.3 引导UI结构

```html
<div id="guide-overlay" class="fixed inset-0 z-[300] hidden">
  <!-- 半透明遮罩 -->
  <div class="absolute inset-0 bg-black/50"></div>
  
  <!-- 高亮区域（动态定位） -->
  <div id="guide-highlight" class="absolute rounded-xl border-2 border-white shadow-lg"></div>
  
  <!-- 提示卡片 -->
  <div id="guide-card" class="absolute bg-white rounded-2xl p-5 shadow-xl max-w-xs">
    <p id="guide-text" class="text-sm text-neutral-700 mb-4"></p>
    <div class="flex justify-between items-center">
      <button onclick="skipGuide()" class="text-xs text-neutral-400">跳过</button>
      <button onclick="nextGuideStep()" class="px-4 py-2 bg-neutral-900 text-white text-sm rounded-lg">下一步</button>
    </div>
    <div id="guide-dots" class="flex justify-center gap-1.5 mt-3"></div>
  </div>
</div>
```

### 1.4 引导逻辑

```javascript
const guideSteps = [
  {
    text: '欢迎加入 ParkingHub！\n3步开始使用你的车位',
    highlight: null, // 无高亮
    position: 'center'
  },
  {
    text: '先选择你的楼栋\n让邻居知道你在哪一幢',
    highlight: '#profile-building',
    position: 'bottom'
  },
  {
    text: '绑定你的车位\n输入车位号即可绑定',
    highlight: '#bind-spot-btn',
    position: 'top'
  },
  {
    text: '发布后邻居就能借用\n设置空闲时段和价格',
    highlight: '#publish-nav-btn',
    position: 'top'
  }
];

let currentGuideStep = 0;

function startGuide() {
  if (!shouldShowGuide()) return;
  currentGuideStep = 0;
  showGuideStep();
}

function showGuideStep() {
  const step = guideSteps[currentGuideStep];
  const overlay = document.getElementById('guide-overlay');
  const highlight = document.getElementById('guide-highlight');
  const card = document.getElementById('guide-card');
  const text = document.getElementById('guide-text');
  
  overlay.classList.remove('hidden');
  text.textContent = step.text;
  
  // 定位高亮区域
  if (step.highlight) {
    const el = document.querySelector(step.highlight);
    if (el) {
      const rect = el.getBoundingClientRect();
      highlight.style.top = `${rect.top - 8}px`;
      highlight.style.left = `${rect.left - 8}px`;
      highlight.style.width = `${rect.width + 16}px`;
      highlight.style.height = `${rect.height + 16}px`;
      highlight.classList.remove('hidden');
    }
  } else {
    highlight.classList.add('hidden');
  }
  
  // 定位提示卡片
  // ... 省略定位逻辑
  
  // 更新步骤指示器
  updateGuideDots();
}

function nextGuideStep() {
  currentGuideStep++;
  if (currentGuideStep >= guideSteps.length) {
    finishGuide();
  } else {
    showGuideStep();
  }
}

function skipGuide() {
  finishGuide();
}

function finishGuide() {
  localStorage.setItem('ph_has_seen_guide', 'true');
  document.getElementById('guide-overlay').classList.add('hidden');
}
```

## 2. 空状态组件

### 2.1 统一空状态组件

```javascript
function renderEmptyState({ icon, title, description, action }) {
  return `
    <div class="flex flex-col items-center justify-center py-8 px-4">
      <div class="text-4xl mb-3">${icon}</div>
      <h3 class="text-sm font-medium text-neutral-700 mb-1">${title}</h3>
      <p class="text-xs text-neutral-400 text-center mb-4">${description}</p>
      ${action ? `<button onclick="${action.onclick}" class="px-4 py-2 bg-neutral-900 text-white text-xs rounded-lg">${action.text}</button>` : ''}
    </div>
  `;
}
```

### 2.2 各场景空状态

**未绑定车位**：
```javascript
renderEmptyState({
  icon: '🅿️',
  title: '还没有绑定车位',
  description: '绑定车位后可以发布共享，让邻居借用',
  action: {
    text: '绑定车位',
    onclick: 'showVerifyModal()'
  }
})
```

**无附近车位**：
```javascript
renderEmptyState({
  icon: '🔍',
  title: '附近暂无可借车位',
  description: '当前没有邻居发布共享，试试发布你的车位？',
  action: {
    text: '发布车位',
    onclick: "navigate('publish')"
  }
})
```

**搜索无结果**：
```javascript
renderEmptyState({
  icon: '😕',
  title: `未找到"${query}"`,
  description: '检查车位号是否正确，如 A050、G106',
  action: null
})
```

## 3. 错误处理

### 3.1 统一错误处理函数

```javascript
function handleError(error, context = '') {
  console.error(`[Error] ${context}:`, error);
  
  // 网络错误
  if (error.message === 'Failed to fetch') {
    toast('网络连接失败，请检查网络后重试', 'error');
    return;
  }
  
  // 服务器错误
  if (error.status >= 500) {
    toast('服务器开小差了，请稍后再试', 'error');
    return;
  }
  
  // 业务错误
  if (error.code) {
    const messages = {
      'SPOT_ALREADY_BOUND': '该车位已被绑定',
      'BORROW_SELF_SPOT': '不能借用自己发布的车位',
      'BORROW_UNAVAILABLE': '该车位已被其他人借用',
      'INVALID_SPOT_CODE': '车位号格式不正确，如 A050'
    };
    toast(messages[error.code] || error.message, 'error');
    return;
  }
  
  // 默认错误
  toast(error.message || '操作失败，请重试', 'error');
}
```

### 3.2 API 调用封装

```javascript
async function api(method, path, body = null) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);
    
    const res = await fetch(API + path, opts);
    const data = await res.json();
    
    if (!res.ok) {
      const error = new Error(data.message || '请求失败');
      error.status = res.status;
      error.code = data.code;
      throw error;
    }
    
    return data;
  } catch (error) {
    handleError(error, `${method} ${path}`);
    throw error;
  }
}
```

## 4. 后端错误码

### 4.1 新增错误码

| 错误码 | HTTP状态码 | 说明 |
|--------|------------|------|
| `INVALID_SPOT_CODE` | 400 | 车位号格式不正确 |
| `SPOT_ALREADY_BOUND` | 409 | 车位已被绑定 |
| `BORROW_SELF_SPOT` | 400 | 不能借用自己发布的车位 |
| `BORROW_UNAVAILABLE` | 409 | 车位已被借用 |
| `BORROW_NOT_FOUND` | 404 | 借用记录不存在 |
| `BORROW_NOT_OWNER` | 403 | 无权操作此借用记录 |

### 4.2 统一错误响应格式

```javascript
// 错误响应
res.status(400).json({
  code: 'INVALID_SPOT_CODE',
  message: '车位号格式不正确'
});

// 成功响应
res.json({
  success: true,
  data: { ... }
});
```

---

*文档版本：v1.0*
*创建时间：2026-04-19*