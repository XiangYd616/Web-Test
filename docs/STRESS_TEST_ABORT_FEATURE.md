# 压力测试中止功能完善

## 🎯 功能概述

完善了压力测试的中止功能，允许用户在测试运行过程中安全地停止测试，并保留已收集的数据。

## ✨ 新增功能

### 1. **后端中止支持**
- ✅ 添加了 `stopStressTest()` 方法
- ✅ 添加了 `shouldStopTest()` 检查方法
- ✅ 添加了 `cleanupTest()` 资源清理方法
- ✅ 在虚拟用户循环中添加中止检查

### 2. **API端点**
- ✅ 新增 `POST /api/test/stress/stop/:testId` 端点
- ✅ 支持安全的测试中止和状态更新

### 3. **前端用户体验**
- ✅ 添加中止确认对话框
- ✅ 停止按钮加载状态显示
- ✅ 实时状态更新和反馈
- ✅ WebSocket事件处理

## 🔧 技术实现

### 后端实现

#### 1. 压力测试引擎中止方法
```javascript
// server/services/realStressTestEngine.js

async stopStressTest(testId) {
  // 获取测试状态
  const testStatus = this.runningTests.get(testId);
  
  // 标记为取消
  testStatus.status = 'cancelled';
  testStatus.cancelled = true;
  
  // 广播取消状态
  this.broadcastTestStatus(testId, {
    status: 'cancelled',
    message: '测试已被用户取消'
  });
  
  // 计算最终指标
  this.calculateFinalMetrics(testStatus);
  
  return { success: true, data: testStatus };
}
```

#### 2. 虚拟用户循环中止检查
```javascript
while (Date.now() < endTime) {
  // 检查测试是否被中止
  if (this.shouldStopTest(results.testId)) {
    console.log(`🛑 用户 ${userId} 检测到测试中止，退出循环`);
    break;
  }
  
  // 继续执行请求...
}
```

#### 3. API路由
```javascript
// server/routes/test.js

router.post('/stress/stop/:testId', optionalAuth, asyncHandler(async (req, res) => {
  const { testId } = req.params;
  const result = await realStressTestEngine.stopStressTest(testId);
  
  if (result.success) {
    res.json({ success: true, data: result.data });
  } else {
    res.status(400).json({ success: false, message: result.message });
  }
}));
```

### 前端实现

#### 1. 中止函数
```typescript
// src/pages/StressTest.tsx

const handleStopTest = async () => {
  // 确认对话框
  const confirmed = window.confirm(
    '确定要停止当前的压力测试吗？\n\n停止后将无法恢复测试，但会保留已收集的数据。'
  );
  
  if (!confirmed) return;
  
  try {
    setIsStopping(true);
    
    // 调用后端API
    const response = await fetch(`/api/test/stress/stop/${currentTestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (data.success) {
      // 更新状态
      setResult({ ...data.data, status: 'cancelled' });
      setTestStatus('failed'); // 使用 failed 状态表示取消
      setTestProgress('测试已停止');
    }
  } catch (error) {
    setError(`停止测试失败: ${error.message}`);
  } finally {
    setIsStopping(false);
  }
};
```

#### 2. UI状态管理
```typescript
const [isStopping, setIsStopping] = useState(false);

// 停止按钮UI
<button
  onClick={handleStopTest}
  disabled={isStopping}
  className={`${isStopping ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
>
  {isStopping ? (
    <Loader className="w-3 h-3 animate-spin" />
  ) : (
    <Square className="w-3 h-3" />
  )}
  <span>{isStopping ? '停止中...' : '停止'}</span>
</button>
```

#### 3. WebSocket事件处理
```typescript
case 'testCancelled':
  setBackgroundTestInfo(testInfo);
  setTestProgress('测试已取消');
  setTestStatus('failed');
  setIsRunning(false);
  setIsStopping(false);
  
  if (testInfo.result) {
    setResult({
      ...testInfo.result,
      status: 'cancelled',
      message: '测试已被用户取消'
    });
  }
  break;
```

## 🎯 用户体验流程

### 1. **开始中止**
1. 用户点击"停止"按钮
2. 显示确认对话框
3. 用户确认后，按钮变为"停止中..."状态

### 2. **中止处理**
1. 前端调用中止API
2. 后端标记测试为取消状态
3. 虚拟用户检测到中止信号并退出
4. 计算已收集数据的最终指标

### 3. **完成中止**
1. 返回测试结果（包含已收集的数据）
2. 更新UI状态为"测试已停止"
3. 显示已收集的指标和图表
4. 保存测试记录（标记为取消）

## 🔍 数据保留

中止测试时会保留：
- ✅ **已收集的指标**：总请求数、成功/失败数、响应时间等
- ✅ **实时数据**：时间序列数据点
- ✅ **错误信息**：已记录的错误详情
- ✅ **测试配置**：原始测试参数
- ✅ **执行时长**：实际运行时间

## 🚀 使用方法

### 基本使用
1. 启动压力测试
2. 在测试运行期间点击"停止"按钮
3. 确认中止操作
4. 查看已收集的测试数据

### 注意事项
- ⚠️ 中止后无法恢复测试
- ✅ 已收集的数据会被保留
- ✅ 测试记录会标记为"已取消"
- ✅ 可以基于已收集数据生成报告

## 🔧 故障排除

### 常见问题

1. **停止按钮无响应**
   - 检查网络连接
   - 查看浏览器控制台错误
   - 确认测试ID有效

2. **中止后数据丢失**
   - 检查后端日志
   - 确认API调用成功
   - 验证数据保存逻辑

3. **UI状态异常**
   - 刷新页面重置状态
   - 检查WebSocket连接
   - 查看状态管理逻辑

### 调试命令
```bash
# 查看正在运行的测试
curl http://localhost:3001/api/test/stress/status/[testId]

# 手动停止测试
curl -X POST http://localhost:3001/api/test/stress/stop/[testId]
```

## 📋 测试验证

### 功能测试
1. ✅ 启动压力测试
2. ✅ 在运行期间点击停止
3. ✅ 确认对话框正常显示
4. ✅ 测试成功停止
5. ✅ 数据正确保留
6. ✅ UI状态正确更新

### 边界测试
1. ✅ 测试刚开始时中止
2. ✅ 测试即将结束时中止
3. ✅ 网络异常时中止
4. ✅ 重复点击停止按钮

## 🎉 完成状态

压力测试中止功能已完全实现并测试通过！用户现在可以：

- 🛑 **安全中止测试**：随时停止正在运行的压力测试
- 💾 **保留数据**：中止后保留已收集的所有测试数据
- 📊 **查看结果**：基于已收集数据生成测试报告
- 🔄 **状态同步**：前后端状态实时同步
- 🎯 **用户友好**：直观的UI反馈和确认机制
