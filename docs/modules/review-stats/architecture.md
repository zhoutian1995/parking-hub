# 借用评价 + 数据统计 - 架构设计

## 系统架构

```
┌─────────────────────────────────────────────────┐
│                   前端 (SPA)                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │ 评价弹窗  │  │ 评价展示  │  │ 统计页面  │    │
│  └───────────┘  └───────────┘  └───────────┘    │
│         │              │              │          │
│         └──────────────┼──────────────┘          │
│                        │                         │
│  ┌─────────────────────▼─────────────────────┐   │
│  │           app.js (业务逻辑)               │   │
│  │  - showReviewModal()                      │   │
│  │  - submitReview()                         │   │
│  │  - loadSpotReviews()                      │   │
│  │  - loadAdminStats()                       │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                        │
                        │ HTTP/JSON
                        ▼
┌─────────────────────────────────────────────────┐
│                   后端 (Express)                 │
│  ┌───────────────────────────────────────────┐   │
│  │              routes.js                    │   │
│  │  - POST /borrows/:id/review               │   │
│  │  - GET /spots/:id/reviews                 │   │
│  │  - GET /admin/stats                       │   │
│  └───────────────────────────────────────────┘   │
│         │              │              │          │
│  ┌──────▼─────┐ ┌──────▼─────┐ ┌──────▼─────┐   │
│  │ controllers│ │ middleware │ │   utils    │   │
│  │ - review   │ │ - auth     │ │ - stats    │   │
│  │ - stats    │ │ - admin    │ │ - rating   │   │
│  └────────────┘ └────────────┘ └────────────┘   │
│                        │                         │
│  ┌─────────────────────▼─────────────────────┐   │
│  │           SQLite 数据库                   │   │
│  │  - reviews (新表)                         │   │
│  │  - spots (增加 avg_rating, review_count)  │   │
│  │  - borrows (关联评价)                     │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## 组件设计

### 1. 评价组件 (Review)

**职责**：
- 显示评价弹窗
- 收集评分和评论
- 提交评价请求
- 展示历史评价

**接口**：
```javascript
// 公共方法
showReviewModal(borrowId)  // 显示评价弹窗
submitReview()             // 提交评价
loadSpotReviews(spotId)    // 加载车位评价
setRating(rating)          // 设置评分

// 数据
currentReviewBorrowId      // 当前评价的借用ID
currentRating              // 当前评分
```

### 2. 统计组件 (Stats)

**职责**：
- 加载统计数据
- 渲染统计图表
- 支持时间/区域筛选

**接口**：
```javascript
// 公共方法
loadAdminStats()           // 加载统计数据
renderStatsCharts()        // 渲染图表
filterStatsByTime(range)   // 按时间筛选
filterStatsByZone(zone)    // 按区域筛选

// 数据
currentStats               // 当前统计数据
selectedTimeRange          // 选中的时间范围
selectedZone               // 选中的区域
```

## 数据流

### 评价流程

```
borrow done → showReviewModal(borrowId)
  ↓
用户填写评分+评论
  ↓
submitReview() → POST /api/borrows/:id/review
  ↓
后端验证 → INSERT INTO reviews
  ↓
触发器更新 spots.avg_rating
  ↓
返回成功 → 关闭弹窗 → 刷新评价列表
```

### 统计流程

```
管理员进入后台 → loadAdminStats()
  ↓
GET /api/admin/stats
  ↓
后端计算统计数据
  ↓
返回 JSON → renderStatsCharts()
```

## 状态管理

### 内存状态

```javascript
let currentReviewBorrowId = null;  // 当前评价的借用ID
let currentRating = 0;             // 当前评分
let currentStats = null;           // 当前统计数据
```

### 数据库状态

```sql
-- reviews 表
INSERT INTO reviews (borrow_id, spot_id, reviewer_id, rating, comment)
VALUES (?, ?, ?, ?, ?);

-- spots 表（自动更新）
UPDATE spots SET avg_rating = ?, review_count = ? WHERE id = ?;
```

## 性能考虑

1. **评价查询优化**：为 `spot_id` 和 `reviewer_id` 创建索引
2. **统计缓存**：统计数据可缓存 5 分钟，减少数据库查询
3. **分页加载**：评价列表分页，每次加载 10 条

## 扩展点

1. **评价标签**：支持选择标签（如"好停"、"位置偏"、"干净"）
2. **评价图片**：支持上传车位照片
3. **统计图表**：使用 Chart.js 或 ECharts 渲染图表
4. **导出功能**：支持导出统计数据为 CSV

---

*文档版本：v1.0*
*创建时间：2026-04-19*