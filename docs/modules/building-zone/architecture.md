# 楼栋区域模块 架构设计

## 技术选型
- units 用逗号分隔字符串存储：简单直接，不需要关联表
- 不用缓存：数据量小（30条楼栋 + 7条区域），查询极快

## 数据流
```
前端请求 /api/buildings
  ↓
查 buildings 表 → 返回 JSON
前端解析 units 字段（逗号分隔）→ 渲染下拉
```

## 依赖关系
```
database/init.js ← buildingController.js → routes.js
                   (被前端注册页调用)
```

## 扩展性
如果后续小区增加到 100+ 幢楼，考虑：
- units 改为独立的 building_units 表
- 加缓存（Redis 或内存）
但 MVP 阶段不需要。