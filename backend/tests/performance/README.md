# 压力测试执行指南

## 📋 概述

本目录包含 Test-Web 后端系统的压力测试脚本和配置。使用 k6 进行负载测试，评估系统容量和性能表现。

## 🛠️ 安装 k6

### Windows
```powershell
# 使用 Chocolatey
choco install k6

# 或使用 Scoop
scoop install k6
```

### macOS
```bash
brew install k6
```

### Linux
```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## 🚀 执行测试

### 1. 启动后端服务器

```bash
cd D:\myproject\Test-Web-backend\backend
npm start
```

确保服务器运行在 http://localhost:3001

### 2. 创建测试用户（可选）

如果需要测试认证端点，先创建一个测试用户：

```bash
# 通过 API 注册用户
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "username": "testuser"
  }'
```

### 3. 运行压力测试

#### 基础测试
```bash
k6 run load-test.js
```

#### 自定义配置测试
```bash
# 指定目标服务器
k6 run --env BASE_URL=http://localhost:3001 load-test.js

# 指定测试用户
k6 run --env TEST_USER_EMAIL=test@example.com --env TEST_USER_PASSWORD=Test123456! load-test.js

# 生成 HTML 报告
k6 run --out json=results.json load-test.js
```

#### 快速测试（减少负载）
```bash
# 修改 load-test.js 中的 stages 配置为较小值
k6 run --stage 30s:10,1m:25 load-test.js
```

## 📊 测试场景

### 默认测试场景

1. **热身阶段** (30s)
   - 虚拟用户: 0 → 10
   - 目的: 预热系统

2. **负载增长阶段** (1m)
   - 虚拟用户: 10 → 50
   - 目的: 逐步增加负载

3. **高负载阶段** (2m)
   - 虚拟用户: 50 → 100
   - 目的: 稳定负载测试

4. **压力测试阶段** (1m)
   - 虚拟用户: 100 → 200
   - 目的: 识别性能极限

5. **峰值测试** (30s)
   - 虚拟用户: 200 → 300
   - 目的: 测试峰值负载

6. **降温阶段** (30s)
   - 虚拟用户: 300 → 0
   - 目的: 平滑结束测试

**总测试时间**: ~6分钟

### 测试的API端点

- ✅ `/health` - 健康检查
- ✅ `/auth/refresh` - 刷新令牌
- ✅ `/users/profile` - 用户信息
- ✅ `/engines/available` - 可用引擎
- ✅ `/engines/status` - 引擎状态
- ✅ `/tests/history` - 测试历史
- ✅ `/reports` - 报告列表
- ✅ `/monitoring/sites` - 监控站点

## 🎯 性能指标与阈值

### 响应时间目标
- **P95 < 500ms**: 95%的请求响应时间应小于500毫秒
- **P99 < 1000ms**: 99%的请求响应时间应小于1秒
- **平均 < 200ms**: 平均响应时间应小于200毫秒

### 错误率目标
- **错误率 < 1%**: 总体错误率应低于1%
- **HTTP失败率 < 5%**: HTTP请求失败率应低于5%

### 吞吐量目标
- **RPS > 100**: 系统应能处理每秒100+请求
- **并发 > 200**: 系统应能支持200+并发用户

## 📈 结果分析

### 测试输出

测试完成后会生成：

1. **控制台输出**: 实时测试进度和摘要
2. **summary.json**: 详细的JSON格式结果
3. **summary.html**: 可视化HTML报告

### 关键指标解读

#### http_req_duration
- **avg**: 平均响应时间
- **min/max**: 最小/最大响应时间
- **med**: 中位数
- **p(95)/p(99)**: 95/99百分位数

#### http_reqs
- **count**: 总请求数
- **rate**: 请求速率 (RPS)

#### http_req_failed
- **rate**: 失败率百分比

## 🔍 问题诊断

### 响应时间过长
- 检查数据库查询性能
- 检查 Redis 缓存命中率
- 查看应用日志中的慢查询
- 检查 CPU 和内存使用率

### 高错误率
- 查看应用错误日志
- 检查数据库连接池状态
- 验证认证令牌有效性
- 检查 API 路由配置

### 吞吐量不足
- 增加数据库连接池大小
- 启用更多的缓存策略
- 检查服务器资源限制
- 考虑水平扩展

## 📝 测试场景定制

### 修改负载配置

编辑 `load-test.js` 中的 `options.stages`:

```javascript
export const options = {
  stages: [
    { duration: '1m', target: 50 },  // 1分钟内增加到50用户
    { duration: '3m', target: 50 },  // 保持50用户3分钟
    { duration: '1m', target: 0 },   // 1分钟内降到0
  ],
};
```

### 修改性能阈值

编辑 `options.thresholds`:

```javascript
thresholds: {
  'http_req_duration': ['p(95)<300'],  // 更严格的要求
  'errors': ['rate<0.001'],            // 更低的错误率
},
```

### 添加测试场景

在 `default` 函数中添加新的测试组：

```javascript
group('Custom API Test', () => {
  const customRes = http.get(`${BASE_URL}/custom/endpoint`, { headers });
  check(customRes, {
    'custom endpoint status is 200': (r) => r.status === 200,
  });
});
```

## 🎬 最佳实践

### 测试前准备
1. ✅ 确保服务器资源充足
2. ✅ 清理测试数据库
3. ✅ 预热应用程序
4. ✅ 关闭不必要的后台服务

### 测试执行
1. ✅ 从小负载开始
2. ✅ 逐步增加并发数
3. ✅ 监控系统资源
4. ✅ 记录异常情况

### 测试后分析
1. ✅ 保存测试报告
2. ✅ 对比历史数据
3. ✅ 识别性能瓶颈
4. ✅ 制定优化计划

## 🔗 相关资源

- [k6 官方文档](https://k6.io/docs/)
- [k6 测试模式](https://k6.io/docs/test-types/load-test-types/)
- [性能测试最佳实践](https://k6.io/docs/testing-guides/)

## 📌 注意事项

⚠️ **不要在生产环境直接运行压力测试！**

- 压力测试会产生大量负载
- 可能影响正常用户使用
- 应在专门的测试环境进行
- 建议在非高峰时段测试

## 💡 提示

1. 首次测试建议使用较小负载
2. 关注系统资源使用情况
3. 定期执行回归测试
4. 建立性能基线数据
5. 持续优化和改进

---

**最后更新**: 2025-10-14  
**维护者**: Test-Web Team

