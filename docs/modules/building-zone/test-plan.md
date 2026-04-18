# 楼栋区域模块 测试计划

## 测试用例

| 编号 | 测试项 | 输入 | 预期结果 | 实际结果 | 状态 |
|------|--------|------|----------|----------|------|
| BZ-001 | 获取楼栋列表 | GET /api/buildings | 返回楼栋数组，含 name 和 units | | |
| BZ-002 | 楼栋排序 | GET /api/buildings | 按 sort_order 排序（1幢在前） | | |
| BZ-003 | 获取区域列表 | GET /api/zones | 返回 7 个区域（A~G） | | |
| BZ-004 | 区域排序 | GET /api/zones | A~F 在前（B1），G 在后（B2） | | |
| BZ-005 | 无需登录 | 不带 token 访问 | 200 正常返回 | | |

## 接口测试

```bash
# 楼栋列表
curl -s http://localhost:3000/api/buildings | jq

# 区域列表
curl -s http://localhost:3000/api/zones | jq
```

## 验收标准
- [ ] buildings 返回所有楼栋（约 30 条）
- [ ] zones 返回 7 个区域（A~G）
- [ ] 无需登录即可访问
- [ ] 排序正确

## 测试结果记录
| 日期 | 测试人 | 通过率 | 备注 |
|------|--------|--------|------|
| | | | |