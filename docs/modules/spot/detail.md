# 车位管理模块 详细设计

## 接口定义

### 1. GET /api/spots/nearby
- **功能**：获取附近可借车位（按常用区域排序）
- **认证**：需要 JWT
- **请求参数**：`?limit=5`（可选，默认 5）
- **处理逻辑**：
  1. 获取 req.user.id → 查询用户的 preferred_zone
  2. 查询可借车位：
     ```sql
     SELECT s.*, u.nickname as owner_name, u.building as owner_building, u.unit as owner_unit
     FROM spots s LEFT JOIN users u ON s.owner_id = u.id
     WHERE s.status = 'available' AND s.owner_id != ?
     ORDER BY
       CASE WHEN s.zone = ? THEN 0 ELSE 1 END,  -- 同区域优先
       s.price_hour ASC                           -- 价格低优先
     LIMIT ?
     ```
- **响应**：
  ```json
  [
    {"id": 1, "spot_code": "G-012", "zone": "G", "price_hour": 4, "owner_name": "张三", "owner_building": "20幢", "owner_unit": "2单元"}
  ]
  ```
- **异常**：用户未设置 preferred_zone → 返回所有可用车位（不分区域）

### 2. GET /api/spots/stats
- **功能**：区域统计
- **认证**：无（公开）
- **响应**：
  ```json
  {"all": {"total": 2325, "available": 5, "occupied": 2}, "A": {"total": 378, "available": 1, "occupied": 0}, ...}
  ```

### 3. GET /api/spots/search?q=xxx
- **功能**：按车位号模糊搜索
- **认证**：无（公开）
- **响应**：最多 20 条匹配结果

### 4. GET /api/spots/:id
- **功能**：单个车位详情
- **认证**：无（公开）
- **响应**：车位信息 + 业主信息

### 5. GET /api/spots/mine
- **功能**：我的车位列表
- **认证**：需要 JWT
- **SQL**：`SELECT * FROM spots WHERE owner_id = ? ORDER BY spot_code`

### 6. POST /api/spots/bind
- **功能**：绑定车位
- **认证**：需要 JWT
- **请求体**：`{"spot_code": "A005", "contract_image": ""}`
- **处理逻辑**：
  1. 检查车位是否存在且未被绑定
  2. 检查用户是否已绑定 2 个车位（上限）
  3. UPDATE spots SET owner_id = ?, status = 'available' WHERE spot_code = ?
- **异常**：
  - 车位不存在 → 400
  - 已被绑定 → 400
  - 已达上限 → 400

### 7. POST /api/spots/publish
- **功能**：发布共享
- **认证**：需要 JWT（必须是车位 owner）
- **请求体**：`{"spot_id": 1, "price_hour": 4, "price_cap": 20, "notes": ""}`
- **处理逻辑**：
  1. 检查 spot_id 是自己的车位
  2. UPDATE spots SET status = 'available', price_hour = ?, price_cap = ?, notes = ? WHERE id = ?

### 8. POST /api/spots/:id/unpublish
- **功能**：取消共享
- **认证**：需要 JWT（必须是车位 owner）
- **处理逻辑**：UPDATE spots SET status = 'idle' WHERE id = ? AND owner_id = ?