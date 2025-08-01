# 测试状态判断逻辑规范

## 🎯 状态定义

### 1. idle（空闲）
- **触发条件**: 初始状态，没有测试运行
- **特征**: 无测试活动，可以开始新测试

### 2. starting（启动中）
- **触发条件**: 用户点击开始测试，正在初始化
- **特征**: 测试配置验证、资源分配、队列检查

### 3. running（运行中）
- **触发条件**: 测试初始化完成，开始执行
- **特征**: 有活跃的测试ID，WebSocket连接，实时数据流

### 4. completed（已完成）✅
- **触发条件**: 
  - 测试引擎明确返回 `status: 'completed'`
  - **或** 有有效的测试结果（`metrics.totalRequests > 0`）
- **特征**: 
  - 有完整的测试指标
  - 有实时数据记录
  - 测试正常结束

### 5. failed（失败）❌
- **触发条件**: 
  - 测试过程中出现致命错误
  - **且** 没有有效的测试结果
- **特征**: 
  - 无有效测试指标
  - 有错误信息
  - 测试异常中断

### 6. cancelled（已取消）⚠️
- **触发条件**: 
  - 用户主动取消测试
  - 测试引擎返回 `status: 'cancelled'`
- **特征**: 
  - 明确的取消操作
  - 可能有部分测试结果

## 🔧 判断逻辑

### 后端状态判断（server/routes/test.js）

```javascript
let finalStatus = 'failed'; // 默认为失败

if (responseData.status === 'cancelled') {
  // 明确的取消状态
  finalStatus = 'cancelled';
} else if (responseData.status === 'completed') {
  // 明确的完成状态
  finalStatus = 'completed';
} else if (responseData.metrics && responseData.metrics.totalRequests > 0) {
  // 有有效的测试结果，认为是成功完成
  finalStatus = 'completed';
}
```

### 前端状态同步（src/pages/StressTest.tsx）

```typescript
// 终态保护：已完成、已取消、失败状态不应被覆盖
if (['cancelled', 'completed', 'failed'].includes(prevStatus) && !isRunning) {
  return prevStatus;
}

if (isRunning) {
  newStatus = 'running';
} else if (result) {
  if (result.status === 'cancelled') {
    newStatus = 'cancelled';
  } else if (result.status === 'completed' || 
            (result.metrics && result.metrics.totalRequests > 0)) {
    newStatus = 'completed'; // 智能判断
  } else {
    newStatus = 'failed';
  }
} else if (error && !result) {
  newStatus = 'failed';
}
```

## 🎯 关键改进

### 1. 智能完成判断
- 不再仅依赖引擎返回的状态
- 基于测试结果的有效性判断
- `totalRequests > 0` 表示测试有效执行

### 2. 终态保护
- 完成、取消、失败状态不会被意外覆盖
- 避免状态回退问题

### 3. 优先级明确
1. **cancelled** - 最高优先级（用户意图）
2. **completed** - 有效结果优先
3. **failed** - 仅在真正失败时
4. **running** - 活跃状态
5. **idle** - 默认状态

## 🔍 常见问题解决

### Q: 为什么测试有结果但显示失败？
A: 旧逻辑过于依赖引擎状态，新逻辑基于结果有效性判断

### Q: 什么情况下会显示失败？
A: 只有在没有有效结果且有错误时才显示失败

### Q: 如何确保状态不被错误覆盖？
A: 终态保护机制，完成状态不会被后续错误覆盖

## 📊 测试场景

| 场景 | 引擎状态 | 测试结果 | 最终状态 | 说明 |
|------|----------|----------|----------|------|
| 正常完成 | completed | 有效 | completed | 理想情况 |
| 结果有效 | undefined | 有效 | completed | 智能判断 |
| 用户取消 | cancelled | 部分 | cancelled | 用户意图 |
| 真正失败 | failed | 无效 | failed | 确实失败 |
| 网络中断 | undefined | 无效 | failed | 异常情况 |
