# 借用管理模块 架构设计

## 技术选型
- 线下结算：MVP 阶段不接入支付
- 单向确认：只有 owner 能确认/拒绝/结束（简单可靠）

## 数据流
```
borrower 申请借用
  ↓
INSERT borrows (status=pending)
  ↓
owner 确认
  ↓
UPDATE borrows → active
UPDATE spots → occupied
  ↓
owner 结束
  ↓
计算费用 → UPDATE borrows → done
UPDATE spots → available
```

## 状态机
```
pending → active → done
  ↓         ↓
rejected  (可手动结束)
```

## 依赖关系
```
database/init.js ← borrowController.js → middleware/auth.js
                         ↓ spotController.js（间接依赖，更新车位状态）
```

## 安全考虑
- 确认/拒绝/结束：检查 owner_id == req.user.id
- 不能自己借自己的车位
- 同一车位同一时间只能有一个 pending/active 借用