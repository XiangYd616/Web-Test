# 性能测试执行指南

## 📋 目录

- [概述](#概述)
- [安装K6](#安装k6)
- [测试脚本说明](#测试脚本说明)
- [运行性能测试](#运行性能测试)
- [测试场景](#测试场景)
- [性能指标](#性能指标)
- [结果分析](#结果分析)
- [优化建议](#优化建议)

---

## 概述

本项目使用**K6**进行性能和压力测试。K6是一个现代化的负载测试工具,支持编写JavaScript脚本,易于CI/CD集成。

### 测试目标

- ✅ 验证系统在高并发下的稳定性
- ✅ 测量关键API的响应时间
- ✅ 发现性能瓶颈
- ✅ 确保满足SLA要求

---

## 安装K6

### Windows

```powershell
# 使用Chocolatey
choco install k6

# 或使用Scoop
scoop install k6

# 或下载安装包
# https://github.com/grafana/k6/releases
```

### macOS

```bash
brew install k6
```

### Linux

```bash
# Debian/Ubuntu
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# RedHat/CentOS
wget https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.rpm
sudo rpm -i k6-v0.47.0-linux-amd64.rpm
```

### 验证安装

```bash
k6 version
```

---

## 测试脚本说明

### 1. MFA性能测试 (mfa-performance.js)

**路径**: `tests/performance/mfa-performance.js`

**测试场景:**
- 40% 流量: 新用户注册并设置MFA
- 50% 流量: 已有用户进行MFA登录验证
- 10% 流量: 备用码验证

**负载模型:**
```
预热期: 0 → 50用户 (30秒)
正常期: 50 → 100用户 (1分钟)
高负载: 100 → 500用户 (2分钟)
峰值期: 500 → 1000用户 (1分钟)
下降期: 1000 → 500用户 (2分钟)
冷却期: 500 → 0用户 (1分钟)

总时长: 7.5分钟
最大并发: 1000用户
```

**性能阈值:**
- P95响应时间 < 500ms
- P99响应时间 < 1000ms
- 错误率 < 1%
- MFA设置 P95 < 800ms
- MFA验证 P95 < 300ms
- 备用码验证 P95 < 200ms

---

### 2. OAuth性能测试 (oauth-performance.js)

**路径**: `tests/performance/oauth-performance.js`

**测试场景:**
- 50% 流量: Google OAuth登录
- 30% 流量: GitHub OAuth登录
- 20% 流量: OAuth账户关联

**负载模型:**
```
预热期: 0 → 20用户 (30秒)
正常期: 20 → 100用户 (1分钟)
中等负载: 100 → 300用户 (2分钟)
高负载: 300 → 500用户 (1分钟)
下降期: 500 → 300用户 (1分钟)
冷却期: 300 → 0用户 (30秒)

总时长: 6分钟
最大并发: 500用户
```

**性能阈值:**
- P95响应时间 < 800ms
- P99响应时间 < 1500ms
- 错误率 < 2%
- OAuth登录 P95 < 1000ms
- 账户关联 P95 < 600ms

---

## 运行性能测试

### 基本运行

```bash
# MFA性能测试
k6 run tests/performance/mfa-performance.js

# OAuth性能测试
k6 run tests/performance/oauth-performance.js
```

### 自定义配置

```bash
# 指定基础URL
k6 run --env BASE_URL=http://your-server.com:3000 tests/performance/mfa-performance.js

# 自定义虚拟用户数和持续时间
k6 run --vus 100 --duration 3m tests/performance/oauth-performance.js

# 自定义负载阶段
k6 run \
  --stage 1m:100 \
  --stage 2m:500 \
  --stage 1m:0 \
  tests/performance/mfa-performance.js
```

### 输出结果到文件

```bash
# 输出JSON格式
k6 run --out json=mfa-results.json tests/performance/mfa-performance.js

# 输出CSV格式
k6 run --out csv=mfa-results.csv tests/performance/mfa-performance.js

# 同时输出多种格式
k6 run \
  --out json=results.json \
  --out csv=results.csv \
  tests/performance/mfa-performance.js
```

### Cloud运行(K6 Cloud)

```bash
# 登录K6 Cloud
k6 login cloud

# 上传并运行测试
k6 cloud tests/performance/mfa-performance.js
```

---

## 测试场景

### 场景1: 烟雾测试 (Smoke Test)

**目的**: 验证脚本正确性和系统基本功能

```bash
k6 run \
  --vus 1 \
  --duration 30s \
  --iterations 10 \
  tests/performance/mfa-performance.js
```

**预期**: 
- 所有请求成功
- 无错误
- 功能正常

---

### 场景2: 负载测试 (Load Test)

**目的**: 验证系统在预期负载下的表现

```bash
k6 run \
  --stage 2m:100 \
  --stage 5m:100 \
  --stage 2m:0 \
  tests/performance/mfa-performance.js
```

**预期**:
- 平均响应时间 < 200ms
- P95响应时间 < 500ms
- 错误率 < 0.1%

---

### 场景3: 压力测试 (Stress Test)

**目的**: 找到系统的性能极限

```bash
k6 run \
  --stage 2m:100 \
  --stage 5m:200 \
  --stage 2m:300 \
  --stage 5m:400 \
  --stage 2m:0 \
  tests/performance/mfa-performance.js
```

**预期**:
- 找到系统开始出现错误的临界点
- 识别性能瓶颈

---

### 场景4: 峰值测试 (Spike Test)

**目的**: 测试系统应对突发流量的能力

```bash
k6 run \
  --stage 1m:10 \
  --stage 30s:500 \
  --stage 3m:500 \
  --stage 1m:10 \
  tests/performance/mfa-performance.js
```

**预期**:
- 系统在流量突增时不崩溃
- 能快速恢复到正常水平

---

### 场景5: 浸泡测试 (Soak Test)

**目的**: 测试系统长时间运行的稳定性

```bash
k6 run \
  --stage 5m:100 \
  --stage 2h:100 \
  --stage 5m:0 \
  tests/performance/mfa-performance.js
```

**预期**:
- 无内存泄漏
- 性能不随时间下降
- 无资源耗尽

---

## 性能指标

### 核心指标

#### 1. 响应时间 (Response Time)

```javascript
http_req_duration: 
  avg: 平均响应时间
  min: 最小响应时间
  max: 最大响应时间
  p(90): 90%请求的响应时间
  p(95): 95%请求的响应时间
  p(99): 99%请求的响应时间
```

**目标:**
- 平均 < 200ms
- P95 < 500ms
- P99 < 1000ms

---

#### 2. 吞吐量 (Throughput)

```javascript
http_reqs: 总请求数
http_req_rate: 每秒请求数(RPS)
```

**目标:**
- MFA: > 1000 RPS
- OAuth: > 500 RPS

---

#### 3. 错误率 (Error Rate)

```javascript
http_req_failed: HTTP请求失败率
errors: 业务逻辑错误率
```

**目标:**
- HTTP错误率 < 0.1%
- 业务错误率 < 1%

---

#### 4. 并发用户数 (Virtual Users)

```javascript
vus: 当前虚拟用户数
vus_max: 最大虚拟用户数
```

---

### 自定义指标

#### MFA测试指标

```javascript
mfa_setup_duration: MFA设置耗时
mfa_verify_duration: MFA验证耗时
backup_code_duration: 备用码验证耗时
```

#### OAuth测试指标

```javascript
oauth_login_duration: OAuth登录耗时
account_link_duration: 账户关联耗时
google_oauth_requests: Google OAuth请求数
github_oauth_requests: GitHub OAuth请求数
```

---

## 结果分析

### 命令行输出

运行测试后,K6会在终端输出摘要:

```
     ✓ MFA设置初始化成功
     ✓ 返回密钥
     ✓ 返回备用码
     ✓ 响应时间<1000ms

     checks.........................: 95.23% ✓ 19046      ✗ 954
     data_received..................: 15 MB  2.0 MB/s
     data_sent......................: 12 MB  1.6 MB/s
     http_req_blocked...............: avg=1.23ms  min=0s     med=1ms    max=45.67ms  p(90)=2.34ms p(95)=3.45ms
     http_req_connecting............: avg=1.01ms  min=0s     med=0s     max=42.34ms  p(90)=1.89ms p(95)=2.78ms
     http_req_duration..............: avg=187.45ms min=23.45ms med=165.23ms max=1234.56ms p(90)=345.67ms p(95)=456.78ms
       { expected_response:true }...: avg=182.34ms min=23.45ms med=160.12ms max=998.76ms  p(90)=340.23ms p(95)=450.12ms
     http_req_failed................: 0.47%  ✓ 94         ✗ 19906
     http_req_receiving.............: avg=0.34ms  min=0s     med=0.23ms max=12.34ms   p(90)=0.67ms  p(95)=0.89ms
     http_req_sending...............: avg=0.12ms  min=0s     med=0.08ms max=5.67ms    p(90)=0.23ms  p(95)=0.34ms
     http_req_tls_handshaking.......: avg=0ms     min=0s     med=0s     max=0ms       p(90)=0s      p(95)=0s
     http_req_waiting...............: avg=186.99ms min=22.89ms med=164.78ms max=1230.12ms p(90)=344.56ms p(95)=455.23ms
     http_reqs......................: 20000  2666.67/s
     iteration_duration.............: avg=2.34s   min=1.23s  med=2.25s  max=4.56s     p(90)=2.89s   p(95)=3.12s
     iterations.....................: 5000   666.67/it/s
     mfa_setup_duration.............: avg=456.78ms min=234.56ms med=445.23ms max=987.65ms p(90)=678.90ms p(95)=756.78ms
     mfa_verify_duration............: avg=123.45ms min=56.78ms med=118.90ms max=345.67ms p(90)=198.76ms p(95)=234.56ms
     vus............................: 1000   min=0        max=1000
     vus_max........................: 1000   min=1000     max=1000
```

### HTML报告

测试完成后会生成HTML报告:

```bash
# 打开MFA测试报告
open mfa-performance-summary.html

# 打开OAuth测试报告
open oauth-performance-summary.html
```

报告包含:
- 📊 核心指标图表
- ⏱️ 响应时间分布
- 📈 吞吐量趋势
- ⚠️ 错误率统计
- 💡 优化建议

### JSON结果

```bash
# 解析JSON结果
cat mfa-performance-results.json | jq '.metrics.http_req_duration'
```

---

## 优化建议

### 根据测试结果优化

#### 1. 响应时间过长

**问题**: P95 > 500ms

**可能原因:**
- 数据库查询慢
- 网络延迟
- CPU密集操作
- 未使用缓存

**优化方案:**
```javascript
// 添加Redis缓存
const cachedUser = await redis.get(`user:${userId}`);
if (cachedUser) return JSON.parse(cachedUser);

// 数据库查询添加索引
CREATE INDEX idx_users_email ON users(email);

// 使用连接池
const pool = new Pool({ max: 20 });
```

---

#### 2. 错误率过高

**问题**: 错误率 > 1%

**可能原因:**
- 数据库连接耗尽
- 内存不足
- 超时设置不当
- 并发控制缺失

**优化方案:**
```javascript
// 增加数据库连接数
max_connections = 200

// 添加超时控制
const timeout = setTimeout(() => {
  throw new Error('Request timeout');
}, 5000);

// 实现限流
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 100 // 限制100请求
});
```

---

#### 3. 吞吐量不足

**问题**: RPS < 目标值

**可能原因:**
- 同步I/O操作
- 单线程瓶颈
- 未优化的算法

**优化方案:**
```javascript
// 使用异步操作
await Promise.all([
  asyncOperation1(),
  asyncOperation2(),
  asyncOperation3()
]);

// 使用Worker Threads
const { Worker } = require('worker_threads');

// 批量处理
const batchSize = 100;
for (let i = 0; i < items.length; i += batchSize) {
  await processBatch(items.slice(i, i + batchSize));
}
```

---

## 持续性能监控

### 集成到CI/CD

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  push:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *'  # 每天凌晨2点

jobs:
  performance:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Install K6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run MFA Performance Test
        run: k6 run tests/performance/mfa-performance.js
      
      - name: Run OAuth Performance Test
        run: k6 run tests/performance/oauth-performance.js
      
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: |
            *-performance-results.json
            *-performance-summary.html
```

---

## 参考资源

- [K6官方文档](https://k6.io/docs/)
- [性能测试最佳实践](https://k6.io/docs/testing-guides/test-types/)
- [K6 Cloud](https://k6.io/cloud/)
- [Grafana Integration](https://k6.io/docs/results-visualization/grafana-dashboards/)

---

**最后更新**: 2025-10-16  
**版本**: 1.0  
**维护**: Test Web Backend Team

