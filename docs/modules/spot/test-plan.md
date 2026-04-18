# 车位管理模块 测试计划

## 测试范围
- 附近可借车位查询
- 区域统计
- 车位搜索
- 绑定车位
- 发布/取消共享

## 测试用例

| 编号 | 测试项 | 输入 | 预期结果 | 实际结果 | 状态 |
|------|--------|------|----------|----------|------|
| SPOT-001 | 附近车位（有 preferred_zone） | GET /api/spots/nearby + token | 返回同区域优先的车位列表 | | |
| SPOT-002 | 附近车位（无 preferred_zone） | GET /api/spots/nearby + token（新用户） | 返回所有可用车位 | | |
| SPOT-003 | 附近车位（无可用） | 所有车位都 idle | 返回空数组 [] | | |
| SPOT-004 | 区域统计 | GET /api/spots/stats | 返回 A~G 各区域统计 | | |
| SPOT-005 | 搜索车位 | GET /api/spots/search?q=G01 | 返回匹配的 G01x 车位 | | |
| SPOT-006 | 搜索短关键词 | GET /api/spots/search?q=G | 返回空（<2字符不搜索） | | |
| SPOT-007 | 绑定空闲车位 | POST /api/spots/bind {spot_code: "A001"} | 绑定成功，status=available | | |
| SPOT-008 | 绑定已绑定车位 | POST /api/spots/bind {spot_code: "A001"}（再次） | 400 "已被绑定" | | |
| SPOT-009 | 绑定超上限 | 绑定第 3 个车位 | 400 "最多绑定 2 个" | | |
| SPOT-010 | 发布共享 | POST /api/spots/publish {spot_id, price_hour} | status=available | | |
| SPOT-011 | 取消共享 | POST /api/spots/:id/unpublish | status=idle | | |
| SPOT-012 | 取消别人的共享 | 用别人的 spot_id | 403 无权操作 | | |

## 接口测试

```bash
TOKEN="<有效JWT>"

# 附近车位
curl -s http://localhost:3000/api/spots/nearby -H "Authorization: Bearer $TOKEN" | jq

# 区域统计
curl -s http://localhost:3000/api/spots/stats | jq

# 搜索
curl -s "http://localhost:3000/api/spots/search?q=A01" | jq

# 绑定
curl -s -X POST http://localhost:3000/api/spots/bind \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"spot_code":"A001"}' | jq
```

## 验收标准
- [ ] 附近车位同区域优先显示
- [ ] 区域统计覆盖 A~G
- [ ] 绑定车位后状态变为 available
- [ ] 不能绑定别人的车位
- [ ] 不能绑定超过 2 个车位

## 测试结果记录
| 日期 | 测试人 | 通过率 | 备注 |
|------|--------|--------|------|
| | | | |