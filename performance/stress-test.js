const { check, sleep } = require('k6');
const http = require('k6/http');

// 压力测试配置 - 逐步增加负载直到系统崩溃
export let options = {
  stages: [
    { duration: '1m', target: 10 },   // 基线
    { duration: '2m', target: 50 },   // 正常负载
    { duration: '2m', target: 100 },  // 高负载
    { duration: '2m', target: 200 },  // 压力负载
    { duration: '2m', target: 300 },  // 极限负载
    { duration: '2m', target: 400 },  // 破坏性负载
    { duration: '5m', target: 0 },    // 恢复测试
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 允许更高的响应时间
    http_req_failed: ['rate<0.5'], // 允许更高的错误率
  },
};

export default function () {
  const baseUrl = 'http://localhost:3000';

  // 测试不同的端点以模拟真实负载
  const endpoints = [
    '/',
    '/api/health',
    '/api/test/start',
    '/api/history',
    '/api-test',
    '/security-test',
    '/stress-test'
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  let response;
  if (endpoint === '/api/test/start') {
    // POST请求测试
    response = http.post(`${baseUrl}${endpoint}`, JSON.stringify({
      type: 'api',
      url: 'https://httpbin.org/get',
      config: { method: 'GET' },
      name: 'Stress Test'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } else {
    // GET请求测试
    response = http.get(`${baseUrl}${endpoint}`);
  }

  check(response, {
    'status is not 5xx': (r) => r.status < 500,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  // 记录系统指标
  if (response.status >= 500) {
    console.log(`Server error at ${endpoint}: ${response.status}`);
  }

  sleep(Math.random() * 2); // 随机等待时间
}

export function handleSummary(data) {
  const report = {
    timestamp: new Date().toISOString(),
    test_type: 'stress',
    summary: {
      total_requests: data.metrics.http_reqs.values.count,
      failed_requests: data.metrics.http_req_failed.values.count,
      error_rate: data.metrics.http_req_failed.values.rate,
      avg_response_time: data.metrics.http_req_duration.values.avg,
      p95_response_time: data.metrics.http_req_duration.values.p95,
      p99_response_time: data.metrics.http_req_duration.values.p99,
      max_response_time: data.metrics.http_req_duration.values.max,
    },
    thresholds: data.thresholds,
    breakdown_point: findBreakdownPoint(data),
  };

  return {
    'stress-test-results.json': JSON.stringify(report, null, 2),
    'stress-test-report.html': generateStressReport(report),
  };
}

function findBreakdownPoint(data) {
  // 分析数据找出系统崩溃点
  const errorRate = data.metrics.http_req_failed.values.rate;
  const p95ResponseTime = data.metrics.http_req_duration.values.p95;

  if (errorRate > 0.3) {
    return {
      type: 'high_error_rate',
      value: errorRate,
      description: '错误率过高，系统无法处理负载'
    };
  }

  if (p95ResponseTime > 5000) {
    return {
      type: 'high_response_time',
      value: p95ResponseTime,
      description: '响应时间过长，用户体验严重下降'
    };
  }

  return {
    type: 'no_breakdown',
    description: '系统在测试负载下表现良好'
  };
}

function generateStressReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>压力测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 5px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 20px 0; }
        .metric-card { padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .breakdown { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .pass { background-color: #d4edda; }
        .fail { background-color: #f8d7da; }
    </style>
</head>
<body>
    <div class="header">
        <h1>压力测试报告</h1>
        <p>测试时间: ${data.timestamp}</p>
    </div>

    <div class="metric-grid">
        <div class="metric-card">
            <h3>总请求数</h3>
            <div class="metric-value">${data.summary.total_requests}</div>
        </div>
        <div class="metric-card">
            <h3>失败请求数</h3>
            <div class="metric-value">${data.summary.failed_requests}</div>
        </div>
        <div class="metric-card">
            <h3>错误率</h3>
            <div class="metric-value">${(data.summary.error_rate * 100).toFixed(2)}%</div>
        </div>
        <div class="metric-card">
            <h3>平均响应时间</h3>
            <div class="metric-value">${data.summary.avg_response_time.toFixed(2)}ms</div>
        </div>
        <div class="metric-card">
            <h3>P95响应时间</h3>
            <div class="metric-value">${data.summary.p95_response_time.toFixed(2)}ms</div>
        </div>
        <div class="metric-card">
            <h3>最大响应时间</h3>
            <div class="metric-value">${data.summary.max_response_time.toFixed(2)}ms</div>
        </div>
    </div>

    <div class="breakdown">
        <h3>系统崩溃点分析</h3>
        <p><strong>类型:</strong> ${data.breakdown_point.type}</p>
        <p><strong>描述:</strong> ${data.breakdown_point.description}</p>
        ${data.breakdown_point.value ? `<p><strong>数值:</strong> ${data.breakdown_point.value}</p>` : ''}
    </div>
</body>
</html>
  `;
}
