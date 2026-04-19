# 借用评价 + 数据统计 - 详细设计

## 1. 数据库设计

### 1.1 新增表：reviews

```sql
CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  borrow_id INTEGER NOT NULL,
  spot_id INTEGER NOT NULL,
  reviewer_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (borrow_id) REFERENCES borrows(id),
  FOREIGN KEY (spot_id) REFERENCES spots(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  UNIQUE(borrow_id) -- 每个借用只能评价一次
);

CREATE INDEX idx_reviews_spot ON reviews(spot_id);
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);
```

### 1.2 修改表：spots

```sql
ALTER TABLE spots ADD COLUMN avg_rating REAL DEFAULT 0;
ALTER TABLE spots ADD COLUMN review_count INTEGER DEFAULT 0;
```

### 1.3 触发器：自动更新车位评分

```sql
-- 插入评价时更新车位评分
CREATE TRIGGER update_spot_rating_after_insert
AFTER INSERT ON reviews
BEGIN
  UPDATE spots SET
    avg_rating = (SELECT AVG(rating) FROM reviews WHERE spot_id = NEW.spot_id),
    review_count = (SELECT COUNT(*) FROM reviews WHERE spot_id = NEW.spot_id)
  WHERE id = NEW.spot_id;
END;

-- 删除评价时更新车位评分
CREATE TRIGGER update_spot_rating_after_delete
AFTER DELETE ON reviews
BEGIN
  UPDATE spots SET
    avg_rating = COALESCE((SELECT AVG(rating) FROM reviews WHERE spot_id = OLD.spot_id), 0),
    review_count = (SELECT COUNT(*) FROM reviews WHERE spot_id = OLD.spot_id)
  WHERE id = OLD.spot_id;
END;
```

## 2. 后端 API

### 2.1 提交评价

```
POST /api/borrows/:borrowId/review
Authorization: Bearer <token>

Request:
{
  "rating": 5,
  "comment": "车位好停，位置方便"
}

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "borrow_id": 1,
    "spot_id": 1,
    "rating": 5,
    "comment": "车位好停，位置方便",
    "created_at": "2026-04-19T12:00:00Z"
  }
}
```

**验证逻辑**：
1. 借用记录必须存在且状态为 `completed`
2. 评价人必须是借用方
3. 每个借用只能评价一次
4. 评分必须是 1-5

### 2.2 获取车位评价

```
GET /api/spots/:spotId/reviews

Response:
{
  "success": true,
  "data": {
    "avg_rating": 4.5,
    "review_count": 10,
    "reviews": [
      {
        "id": 1,
        "rating": 5,
        "comment": "车位好停",
        "reviewer": {
          "nickname": "20幢小王",
          "building": "20幢"
        },
        "created_at": "2026-04-19T12:00:00Z"
      }
    ]
  }
}
```

### 2.3 增强统计 API

```
GET /api/admin/stats

Response:
{
  "success": true,
  "data": {
    "spots": {
      "total": 2325,
      "bound": 150,
      "available": 30
    },
    "users": {
      "total": 200,
      "active": 50
    },
    "borrows": {
      "total": 500,
      "completed": 450,
      "completion_rate": 0.9
    },
    "revenue": {
      "total": 5000,  // 估算
      "today": 200
    },
    "hot_spots": [
      { "spot_code": "A050", "borrow_count": 20, "avg_rating": 4.8 },
      { "spot_code": "G106", "borrow_count": 15, "avg_rating": 4.5 }
    ],
    "by_zone": {
      "A": { "total": 378, "available": 10 },
      "B": { "total": 416, "available": 8 }
    }
  }
}
```

## 3. 前端实现

### 3.1 评价弹窗

```html
<div id="modal-review" class="modal-overlay hidden">
  <div class="modal-sheet">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold">评价车位</h2>
      <button onclick="closeReviewModal()" class="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">✕</button>
    </div>
    
    <div class="mb-4">
      <div class="text-sm text-neutral-600 mb-2">评分</div>
      <div id="rating-stars" class="flex gap-2">
        <button onclick="setRating(1)" class="text-2xl" data-rating="1">☆</button>
        <button onclick="setRating(2)" class="text-2xl" data-rating="2">☆</button>
        <button onclick="setRating(3)" class="text-2xl" data-rating="3">☆</button>
        <button onclick="setRating(4)" class="text-2xl" data-rating="4">☆</button>
        <button onclick="setRating(5)" class="text-2xl" data-rating="5">☆</button>
      </div>
    </div>
    
    <div class="mb-4">
      <div class="text-sm text-neutral-600 mb-2">评价（可选）</div>
      <textarea id="review-comment" rows="3" placeholder="车位好停吗？位置方便吗？"
        class="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm outline-none focus:border-neutral-400"></textarea>
    </div>
    
    <button onclick="submitReview()" class="w-full py-3 rounded-xl bg-neutral-900 text-white text-sm font-semibold">提交评价</button>
  </div>
</div>
```

### 3.2 评价展示

**车位详情页增加评价区域**：
```html
<div class="mt-4 border-t border-neutral-100 pt-4">
  <div class="flex items-center justify-between mb-3">
    <h3 class="text-sm font-semibold">评价</h3>
    <div class="flex items-center gap-1">
      <span class="text-yellow-500">★</span>
      <span class="text-sm font-medium">4.5</span>
      <span class="text-xs text-neutral-400">（10条评价）</span>
    </div>
  </div>
  
  <div class="space-y-3">
    <!-- 评价列表 -->
    <div class="bg-neutral-50 rounded-xl p-3">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs font-medium">20幢小王</span>
        <span class="text-yellow-500 text-sm">★★★★★</span>
      </div>
      <p class="text-xs text-neutral-600">车位好停，位置方便</p>
      <p class="text-xs text-neutral-400 mt-1">2026-04-19</p>
    </div>
  </div>
</div>
```

### 3.3 统计页面

**管理后台增加统计卡片**：
```html
<div class="grid grid-cols-2 gap-4 mb-6">
  <div class="bg-white rounded-2xl p-5 border border-neutral-100">
    <div class="text-2xl font-bold">2325</div>
    <div class="text-xs text-neutral-400">总车位数</div>
  </div>
  <div class="bg-white rounded-2xl p-5 border border-neutral-100">
    <div class="text-2xl font-bold">150</div>
    <div class="text-xs text-neutral-400">已绑定</div>
  </div>
  <div class="bg-white rounded-2xl p-5 border border-neutral-100">
    <div class="text-2xl font-bold">500</div>
    <div class="text-xs text-neutral-400">总借用次数</div>
  </div>
  <div class="bg-white rounded-2xl p-5 border border-neutral-100">
    <div class="text-2xl font-bold">90%</div>
    <div class="text-xs text-neutral-400">完成率</div>
  </div>
</div>

<div class="bg-white rounded-2xl p-5 border border-neutral-100 mb-6">
  <h3 class="text-sm font-semibold mb-3">热门车位 Top 5</h3>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <span class="text-sm">A050</span>
      <div class="flex items-center gap-2">
        <span class="text-yellow-500 text-xs">★ 4.8</span>
        <span class="text-xs text-neutral-400">20次借用</span>
      </div>
    </div>
  </div>
</div>
```

## 4. 业务逻辑

### 4.1 评价流程

```
借用结束（POST /borrows/:id/done）
  ↓
前端检查是否已评价
  ↓
未评价 → 显示评价弹窗
  ↓
用户填写评分+评论
  ↓
POST /api/borrows/:id/review
  ↓
后端验证 + 保存
  ↓
更新车位 avg_rating 和 review_count
  ↓
返回成功
```

### 4.2 统计计算

```javascript
// 后端统计查询
const stats = {
  spots: {
    total: db.prepare('SELECT COUNT(*) FROM spots').get()['COUNT(*)'],
    bound: db.prepare('SELECT COUNT(*) FROM spots WHERE owner_id IS NOT NULL').get()['COUNT(*)'],
    available: db.prepare("SELECT COUNT(*) FROM spots WHERE status = 'available'").get()['COUNT(*)']
  },
  borrows: {
    total: db.prepare('SELECT COUNT(*) FROM borrows').get()['COUNT(*)'],
    completed: db.prepare("SELECT COUNT(*) FROM borrows WHERE status = 'completed'").get()['COUNT(*)']
  },
  hot_spots: db.prepare(`
    SELECT s.spot_code, COUNT(b.id) as borrow_count, s.avg_rating
    FROM spots s
    LEFT JOIN borrows b ON b.spot_id = s.id
    GROUP BY s.id
    ORDER BY borrow_count DESC
    LIMIT 10
  `).all()
};
```

---

*文档版本：v1.0*
*创建时间：2026-04-19*