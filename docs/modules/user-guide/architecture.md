# 新用户引导 + 空状态优化 - 架构设计

## 系统架构

```
┌─────────────────────────────────────────────────┐
│                   前端 (SPA)                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │ 引导组件  │  │ 空状态组件│  │ 错误处理  │    │
│  └───────────┘  └───────────┘  └───────────┘    │
│         │              │              │          │
│         └──────────────┼──────────────┘          │
│                        │                         │
│  ┌─────────────────────▼─────────────────────┐   │
│  │           app.js (业务逻辑)               │   │
│  │  - navigate()                             │   │
│  │  - loadUser()                             │   │
│  │  - handleError()                          │   │
│  │  - renderEmptyState()                     │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                        │
                        │ HTTP/JSON
                        ▼
┌─────────────────────────────────────────────────┐
│                   后端 (Express)                 │
│  ┌───────────────────────────────────────────┐   │
│  │              routes.js                    │   │
│  │  - auth, user, spot, borrow, admin        │   │
│  └───────────────────────────────────────────┘   │
│         │              │              │          │
│  ┌──────▼─────┐ ┌──────▼─────┐ ┌──────▼─────┐   │
│  │ controllers│ │ middleware │ │   utils    │   │
│  │ - auth     │ │ - auth     │ │ - errors   │   │
│  │ - user     │ │ - admin    │ │ - response │   │
│  │ - spot     │ │            │ │            │   │
│  │ - borrow   │ │            │ │            │   │
│  └────────────┘ └────────────┘ └────────────┘   │
│                        │                         │
│  ┌─────────────────────▼─────────────────────┐   │
│  │           SQLite 数据库                   │   │
│  │  - users, spots, borrows, buildings       │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## 组件设计

### 1. 引导组件 (Guide)

**职责**：
- 检测是否需要显示引导
- 渲染引导步骤
- 定位高亮区域
- 记录引导完成状态

**接口**：
```javascript
// 公共方法
startGuide()          // 开始引导
nextGuideStep()       // 下一步
skipGuide()           // 跳过引导
finishGuide()         // 完成引导

// 数据
guideSteps[]          // 引导步骤配置
currentGuideStep      // 当前步骤
```

### 2. 空状态组件 (EmptyState)

**职责**：
- 渲染统一的空状态UI
- 支持插图、文案、操作按钮

**接口**：
```javascript
renderEmptyState(config)
// config: { icon, title, description, action }
```

### 3. 错误处理 (ErrorHandler)

**职责**：
- 统一处理所有错误
- 分类显示错误提示
- 记录错误日志

**接口**：
```javascript
handleError(error, context)
// error: Error对象或API错误响应
// context: 错误上下文（如 'POST /spots/bind'）
```

## 数据流

### 引导流程

```
用户登录 → init() → shouldShowGuide() → true
  ↓
startGuide() → showGuideStep(0)
  ↓
用户点击"下一步" → nextGuideStep() → showGuideStep(1)
  ↓
... 循环 ...
  ↓
finishGuide() → localStorage.setItem('ph_has_seen_guide', 'true')
```

### 空状态渲染

```
loadMySpots() → API返回空数组
  ↓
mySpots.innerHTML = renderEmptyState({ ... })
```

### 错误处理

```
api('POST', '/spots/bind', { code: 'A999' })
  ↓
fetch() → 409 Conflict → { code: 'SPOT_ALREADY_BOUND' }
  ↓
handleError() → toast('该车位已被绑定', 'error')
```

## 状态管理

### localStorage 状态

| 键 | 值 | 说明 |
|----|----|------|
| `ph_token` | JWT字符串 | 用户登录token |
| `ph_has_seen_guide` | `'true'` | 是否已看过引导 |

### 内存状态

```javascript
let currentUser = null;      // 当前用户
let currentSpots = [];       // 我的车位
let currentBorrows = [];     // 借用记录
let currentGuideStep = 0;    // 引导步骤
```

## 依赖关系

```
guide-overlay.js
  └── depends on: app.js (navigate, currentUser)

empty-state.js
  └── depends on: app.js (renderEmptyState)

error-handler.js
  └── depends on: toast.js (显示提示)
```

## 扩展点

1. **引导步骤可配置**：从后端获取引导步骤（支持A/B测试）
2. **空状态插图**：支持自定义SVG插图
3. **错误码映射**：支持国际化错误消息

---

*文档版本：v1.0*
*创建时间：2026-04-19*