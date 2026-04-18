# 借用管理模块 概要设计

## 目标
处理车位借用的完整流程：申请 → 确认 → 使用 → 结算。

## 范围
### 包含
- 申请借用（borrower 发起）
- 确认/拒绝（owner 操作）
- 结束借用 + 计费
- 借用记录查询
- 一键通知管家文案生成（前端）

### 不包含
- 支付功能（MVP 阶段线下结算）
- 信用分扣减（后续阶段）

## 输入
- 借用方：车位 ID + 车牌号
- 出租方：确认/拒绝操作
- 结束借用：owner 点击完成

## 输出
- 借用记录 JSON
- 计费结果（总金额）

## 依赖模块
- database 模块（读写 borrows 表 + spots 表）
- auth 模块（需要 req.user.id）
- spot 模块（查询车位信息、更新车位状态）

## 核心流程
1. borrower 选车位 → 输入车牌 → 申请借用
2. owner 收到通知 → 确认或拒绝
3. 确认后 → spots.status = 'occupied'，borrows.status = 'active'
4. 停车结束 → owner 点"完成" → 计费 → spots.status = 'available'