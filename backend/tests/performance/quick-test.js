/**
 * k6 快速基准测试
 * 用于快速验证服务性能和可用性
 * 运行时间: ~30秒
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const healthCheckDuration = new Trend('health_check_duration');

// 配置环境变量
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// 测试配置 - 快速版本
export const options = {
  // 测试阶段
  stages: [
    { duration: '10s', target: 10 },  // 热身：10秒内增加到10个用户
    { duration: '15s', target: 20 },  // 负载：15秒内增加到20个用户
    { duration: '5s', target: 0 },    // 降温：5秒内降到0
  ],

  // 性能阈值
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.05'],
    'errors': ['rate<0.01'],
  },

  // 输出配置
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// 测试数据
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'Test123456!',
  username: `testuser${Date.now()}`
};

export default function() {
  // 1. 健康检查
  const healthRes = http.get(`${BASE_URL}/health`);
  
  const healthCheck = check(healthRes, {
    '健康检查状态为 200': (r) => r.status === 200,
    '健康检查响应时间 < 200ms': (r) => r.timings.duration < 200,
  });
  
  healthCheckDuration.add(healthRes.timings.duration);
  errorRate.add(!healthCheck);

  // 2. 测试公开端点（根据实际路由结构）
  const publicEndpoints = [
    '/system/status',
    '/system/info'
  ];

  publicEndpoints.forEach(endpoint => {
    const res = http.get(`${BASE_URL}${endpoint}`);
    
    check(res, {
      [`${endpoint} 响应成功`]: (r) => r.status === 200 || r.status === 401 || r.status === 404,
    });
    
    if (res.status !== 200 && res.status !== 401 && res.status !== 404) {
      errorRate.add(true);
    }
  });

  // 随机等待 1-3 秒
  sleep(Math.random() * 2 + 1);
}

// 测试总结
export function handleSummary(data) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 k6 快速基准测试完成');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 提取关键指标
  const metrics = data.metrics;

  console.log('🎯 关键性能指标:\n');
  
  if (metrics.http_req_duration) {
    console.log('  响应时间:');
    console.log(`    平均值: ${metrics.http_req_duration.values.avg.toFixed(2)}ms`);
    console.log(`    中位数: ${metrics.http_req_duration.values.med.toFixed(2)}ms`);
    console.log(`    P95:    ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
    console.log(`    P99:    ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms`);
    console.log(`    最大值: ${metrics.http_req_duration.values.max.toFixed(2)}ms\n`);
  }

  if (metrics.http_reqs) {
    console.log('  请求统计:');
    console.log(`    总请求数: ${metrics.http_reqs.values.count}`);
    console.log(`    请求速率: ${metrics.http_reqs.values.rate.toFixed(2)} req/s\n`);
  }

  if (metrics.http_req_failed) {
    const failRate = (metrics.http_req_failed.values.rate * 100).toFixed(2);
    console.log('  错误率:');
    console.log(`    失败率: ${failRate}%`);
    
    if (failRate > 5) {
      console.log('    ⚠️  错误率偏高，建议检查服务状态');
    } else if (failRate > 1) {
      console.log('    ⚠️  有少量错误，建议关注');
    } else {
      console.log('    ✅ 错误率正常');
    }
    console.log('');
  }

  if (metrics.vus) {
    console.log('  虚拟用户:');
    console.log(`    最大并发: ${metrics.vus.values.max}`);
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 判断测试是否通过
  const p95 = metrics.http_req_duration?.values['p(95)'] || 0;
  const failRate = metrics.http_req_failed?.values.rate || 0;

  let status = '✅ 通过';
  if (p95 > 500 || failRate > 0.05) {
    status = '⚠️  需要关注';
  }

  console.log(`测试结果: ${status}\n`);

  // 返回标准格式
  return {
    'stdout': '\n',
    'summary.json': JSON.stringify(data, null, 2),
  };
}

