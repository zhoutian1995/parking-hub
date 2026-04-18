# 借用管理模块 详细设计

## 接口定义

### 1. POST /api/borrows
- **功能**：申请借用
- **认证**：需要 JWT
- **请求体**：`{"spot_id": 1, "plate": "浙A·12345"}`
- **处理逻辑**：
  1. 检查车位是否存在且 status = 'available'
  2. 检查不能借自己的车位
  3. 检查该车位没有 pending/active 的借用
  4. INSERT INTO borrows (spot_id, owner_id, borrower_id, borrower_plate, status, price_hour)
- **异常**：
  - 车位不可用 → 400
  - 自己的车位 → 400
  - 已被申请 → 400

### 2. POST /api/borrows/:id/accept
- **功能**：owner 确认借用
- **认证**：需要 JWT（必须是 owner_id）
- **处理逻辑**：
  1. UPDATE borrows SET status = 'active' WHERE id = ? AND owner_id = ?
  2. UPDATE spots SET status = 'occupied' WHERE id = ?

### 3. POST /api/borrows/:id/reject
- **功能**：owner 拒绝借用
- **认证**：需要 JWT（必须是 owner_id）
- **处理逻辑**：UPDATE borrows SET status = 'rejected' WHERE id = ?

### 4. POST /api/borrows/:id/done
- **功能**：结束借用
- **认证**：需要 JWT（必须是 owner_id）
- **处理逻辑**：
  1. 计算费用：hours = ceil((now - start_time) / 3600s)，total = min(hours * price_hour, 20)
  2. UPDATE borrows SET status = 'done', end_time = now, total_price = ?
  3. UPDATE spots SET status = 'available'

### 5. GET /api/borrows/mine
- **功能**：我的借用记录
- **认证**：需要 JWT
- **SQL**：SELECT * FROM borrows WHERE owner_id = ? OR borrower_id = ? ORDER BY start_time DESC

## 计费规则
- 按小时计费，向上取整（不足 1 小时按 1 小时）
- 封顶价格：默认 20 元
- 公式：`total = min(ceil(hours) * price_hour, price_cap)`