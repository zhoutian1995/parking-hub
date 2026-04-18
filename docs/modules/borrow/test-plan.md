# 借用管理模块 测试计划

## 测试用例

| 编号 | 测试项 | 输入 | 预期结果 | 实际结果 | 状态 |
|------|--------|------|----------|----------|------|
| BR-001 | 申请可借车位 | POST /api/borrows {spot_id, plate} | 200，status=pending | | |
| BR-002 | 申请自己的车位 | 用自己的 spot_id | 400 "不能借自己的车位" | | |
| BR-003 | 申请已被借的车位 | 已有 pending 的 spot | 400 "车位已被申请" | | |
| BR-004 | owner 确认 | POST /api/borrows/:id/accept | borrows=active, spots=occupied | | |
| BR-005 | 非 owner 确认 | 别人的 borrow_id | 400 "借用请求不存在" | | |
| BR-006 | owner 结束 | POST /api/borrows/:id/done | borrows=done, spots=available, 返回费用 | | |
| BR-007 | owner 拒绝 | POST /api/borrows/:id/reject | borrows=rejected | | |
| BR-008 | 借用记录 | GET /api/borrows/mine | 返回自己的借用记录（作为owner或borrower） | | |
| BR-009 | 费用计算 | 借用 2.5 小时，4元/h | 总价 = min(3 * 4, 20) = 12 元 | | |
| BR-010 | 封顶计算 | 借用 10 小时，4元/h | 总价 = min(10 * 4, 20) = 20 元 | | |

## 验收标准
- [ ] 借用完整流程可走通（申请→确认→结束）
- [ ] 计费正确（按小时向上取整 + 封顶）
- [ ] 权限控制正确（只有 owner 能操作）
- [ ] 不能借自己的车位

## 测试结果记录
| 日期 | 测试人 | 通过率 | 备注 |
|------|--------|--------|------|
| | | | |