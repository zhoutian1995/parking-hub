# 车位管理模块 概要设计

## 目标
管理小区所有车位的生命周期：从录入到绑定到共享到借用。

## 范围
### 包含
- 车位 CRUD（录入、查询、绑定、解绑）
- 附近可借车位查询（按用户常用区域排序）
- 区域统计（各区域车位数/可用数/占用数）
- 发布共享 / 取消共享
- 车位搜索（按编号模糊搜索）

### 不包含
- 车位数据录入（由 init-spots.sql 批量导入或管理员手动操作）
- 借用流程（由 borrow 模块处理）
- SVG 地图（后续阶段）

## 输入
- 用户绑定车位：车位编号 + 合同照片（可选）
- 用户发布共享：车位 ID + 空闲时段 + 价格
- 前端查询：区域筛选 / 关键词搜索

## 输出
- 车位列表 JSON
- 单个车位详情 JSON
- 区域统计 JSON

## 依赖模块
### 依赖谁
- database 模块（读写 spots 表）
- auth 模块（需要 req.user.id）

### 被谁依赖
- borrow 模块（查询车位状态、更新为 occupied）

## 核心流程
### 绑定车位
1. 用户输入车位编号（如 "A005"）
2. 查 spots 表 WHERE spot_code = ? AND owner_id IS NULL
3. 找到 → UPDATE owner_id = user.id, status = 'available'
4. 未找到 → 返回错误（不存在或已被绑定）

### 附近可借车位
1. 获取当前用户的 preferred_zone
2. 查 spots WHERE status = 'available' AND zone = 用户常用区域
3. 同区域排前面，价格低排前面
4. 返回前 5 条（支持分页查看更多）
