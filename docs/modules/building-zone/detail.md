# 楼栋区域模块 详细设计

## 接口定义

### 1. GET /api/buildings
- **功能**：返回楼栋-单元列表
- **认证**：无（公开）
- **SQL**：`SELECT * FROM buildings ORDER BY sort_order, name`
- **响应**：
  ```json
  [
    {"id": 1, "name": "1幢", "units": "1单元"},
    {"id": 20, "name": "20幢", "units": "1单元,2单元"}
  ]
  ```

### 2. GET /api/zones
- **功能**：返回停车区域列表
- **认证**：无（公开）
- **SQL**：`SELECT * FROM zones ORDER BY sort_order`
- **响应**：
  ```json
  [
    {"id": 1, "code": "A", "label": "地下一层A区", "floor": 1},
    {"id": 7, "code": "G", "label": "地下二层G区", "floor": 2}
  ]
  ```

## 数据维护
- buildings 表：管理员通过 SQL 或后台界面手动维护
- zones 表：初始化后基本不变
- 楼栋数量少（~30条），不缓存，每次查询实时读