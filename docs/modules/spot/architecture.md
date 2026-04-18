# 车位管理模块 架构设计

## 技术选型
- SQLite 参数化查询：防 SQL 注入
- 同区域优先排序：用 CASE WHEN 实现，不需要地理计算

## 数据流
```
用户请求附近车位
  ↓
auth 中间件验证 → req.user.id
  ↓
查 users 表获取 preferred_zone
  ↓
查 spots 表（JOIN users）按区域+价格排序
  ↓
返回 JSON
```

## 依赖关系
```
database/init.js ← spotController.js → middleware/auth.js
                         ↑
                    routes.js (注册路由)
```

## 模块间接口
| 调用方 | 调用内容 |
|--------|----------|
| borrow 模块 | 查询 spots.status、更新为 occupied |
| 前端 | 调用所有 /api/spots/* 接口 |

## 安全考虑
- 绑定车位：检查 owner_id IS NULL 防止重复绑定
- 发布共享：检查 req.user.id == spot.owner_id
- 搜索：限制结果数量（20 条），防资源泄露