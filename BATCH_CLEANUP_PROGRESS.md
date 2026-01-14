# Unified命名清理进度

**开始时间**: 2026-01-14  
**总文件数**: 89个  
**总匹配数**: 383个

---

## ✅ 批次1: 后端API和文档 - 完成

**文件数**: 2个  
**提交**: `337cb70 refactor(batch1): 清理后端API和WebSocket中的unified命名`

### 修改的文件

1. ✅ `backend/docs/testEngineAPI.js`
   - `unifiedEngineAPIDoc` → `engineAPIDoc`
   - API路径: `/api/unified-engine` → `/api/engine`
   - 标题和描述中的"统一"字样

2. ✅ `backend/websocket/testEngineHandler.js`
   - `UnifiedEngineWebSocketHandler` → `EngineWebSocketHandler`
   - `unifiedEngineWSHandler` → `engineWSHandler`
   - `createUnifiedEngineWebSocketMiddleware` →
     `createEngineWebSocketMiddleware`
   - `getUnifiedEngineWSHandler` → `getEngineWSHandler`
   - 日志文件名和服务名

---

## ⏳ 批次2: 前端服务层 - 进行中

**预计文件数**: 6个  
**预计时间**: 1.5小时

### 待处理文件

- [ ] `frontend/services/backgroundTestManager.ts` (24匹配)
- [ ] `frontend/services/performance/performanceTestCore.ts` (16匹配)
- [ ] `frontend/services/performance/performanceTestAdapter.ts` (8匹配)
- [ ] `frontend/services/api/testApiService.ts` (5匹配)
- [ ] `frontend/services/testing/testService.ts` (5匹配)
- [ ] `frontend/services/testing/testEngine.ts` (3匹配)

---

## ⏳ 批次3-7: 待处理

详见 `COMPREHENSIVE_UNIFIED_CLEANUP_PLAN.md`

---

**当前进度**: 2/89 文件 (2.2%)
