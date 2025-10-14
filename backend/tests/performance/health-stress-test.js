/**
 * k6 健康检查压力测试
 * 专注于测试服务的基本性能和可用性
 * 运行时间: ~1分钟
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const healthCheckDuration = new Trend('health_check_duration');
const successfulRequests = new Counter('successful_requests');

// 配置环境变量
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// 测试配置
export const options = {
  // 测试阶段 - 逐步增加负载
  stages: [
    { duration: '15s', target: 20 },   // 热身：15秒到20用户
    { duration: '30s', target: 50 },   // 负载：30秒到50用户
    { duration: '10s', target: 20 },   // 降温：10秒到20用户
    { duration: '5s', target: 0 },     // 结束：5秒到0
  ],

  // 性能阈值
  thresholds: {
    'http_req_duration': ['p(95)<100', 'p(99)<200'],  // 响应时间阈值
    'http_req_failed': ['rate<0.01'],                 // 失败率 < 1%
    'errors': ['rate<0.01'],                          // 错误率 < 1%
  },

  // 输出配置
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default function() {
  // 测试健康检查端点
  const healthRes = http.get(`${BASE_URL}/health`);
  
  const healthCheck = check(healthRes, {
    '状态码为 200': (r) => r.status === 200,
    '响应时间 < 50ms': (r) => r.timings.duration < 50,
    '响应包含 status': (r) => r.json('status') !== undefined,
    '服务状态为 healthy': (r) => {
      try {
        return r.json('status') === 'healthy';
      } catch {
        return false;
      }
    },
  });
  
  healthCheckDuration.add(healthRes.timings.duration);
  
  if (healthCheck) {
    successfulRequests.add(1);
  } else {
    errorRate.add(1);
  }

  // 短暂延迟模拟真实用户行为
  sleep(0.5);
}

// 测试总结
export function handleSummary(data) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🎯 Test-Web-backend 压力测试报告');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 提取关键指标
  const metrics = data.metrics;

  // 响应时间分析
  if (metrics.http_req_duration) {
    console.log('📊 响应时间分析:\n');
    const dur = metrics.http_req_duration.values;
    console.log(`   最小值:   ${dur.min.toFixed(2)}ms`);
    console.log(`   平均值:   ${dur.avg.toFixed(2)}ms`);
    console.log(`   中位数:   ${dur.med.toFixed(2)}ms`);
    console.log(`   P90:      ${dur['p(90)'].toFixed(2)}ms`);
    console.log(`   P95:      ${dur['p(95)'].toFixed(2)}ms`);
    console.log(`   P99:      ${dur['p(99)'].toFixed(2)}ms`);
    console.log(`   最大值:   ${dur.max.toFixed(2)}ms\n`);
    
    // 性能评级
    const p95 = dur['p(95)'];
    let rating;
    if (p95 < 50) rating = '🚀 优秀';
    else if (p95 < 100) rating = '✅ 良好';
    else if (p95 < 200) rating = '⚠️  一般';
    else rating = '❌ 需要优化';
    
    console.log(`   性能评级: ${rating}\n`);
  }

  // 吞吐量统计
  if (metrics.http_reqs) {
    console.log('📈 吞吐量统计:\n');
    console.log(`   总请求数:   ${metrics.http_reqs.values.count}`);
    console.log(`   请求速率:   ${metrics.http_reqs.values.rate.toFixed(2)} req/s\n`);
  }

  // 成功率统计
  if (metrics.successful_requests && metrics.http_reqs) {
    const successCount = metrics.successful_requests.values.count;
    const totalCount = metrics.http_reqs.values.count;
    const successRate = ((successCount / totalCount) * 100).toFixed(2);
    console.log('✅ 成功率统计:\n');
    console.log(`   成功请求:   ${successCount} / ${totalCount}`);
    console.log(`   成功率:     ${successRate}%\n`);
  }

  // 错误率分析
  if (metrics.http_req_failed) {
    const failRate = (metrics.http_req_failed.values.rate * 100).toFixed(2);
    console.log('⚠️  错误率分析:\n');
    console.log(`   HTTP失败率: ${failRate}%`);
    
    if (failRate < 1) {
      console.log(`   状态:       ✅ 优秀 (< 1%)\n`);
    } else if (failRate < 5) {
      console.log(`   状态:       ⚠️  可接受 (< 5%)\n`);
    } else {
      console.log(`   状态:       ❌ 需要关注 (>= 5%)\n`);
    }
  }

  // 并发统计
  if (metrics.vus) {
    console.log('👥 并发统计:\n');
    console.log(`   最大并发:   ${metrics.vus.values.max} 用户`);
    console.log(`   平均并发:   ${Math.round(metrics.vus.values.value)} 用户\n`);
  }

  // 测试时长
  if (metrics.data_received) {
    console.log('⏱️  测试统计:\n');
    const duration = data.state.testRunDurationMs / 1000;
    console.log(`   测试时长:   ${duration.toFixed(1)}s`);
    const dataReceived = metrics.data_received.values.count / 1024;
    console.log(`   数据接收:   ${dataReceived.toFixed(2)} KB\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 总体评估
  const p95 = metrics.http_req_duration?.values['p(95)'] || 0;
  const failRate = metrics.http_req_failed?.values.rate || 0;
  
  let overallStatus;
  if (p95 < 100 && failRate < 0.01) {
    overallStatus = '✅ 通过 - 性能优秀';
  } else if (p95 < 200 && failRate < 0.05) {
    overallStatus = '⚠️  通过 - 性能可接受';
  } else {
    overallStatus = '❌ 未通过 - 需要优化';
  }

  console.log(`总体评估: ${overallStatus}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 返回标准格式
  return {
    'stdout': '\n',
    'summary.json': JSON.stringify(data, null, 2),
  };
}

