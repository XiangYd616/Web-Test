const { check, sleep } = require('k6');
const http = require('k6/http');

// 负载测试配置
export let options = {
  stages: [
    { duration: '2m', target: 10 }, // 预热阶段
    { duration: '5m', target: 50 }, // 正常负载
    { duration: '2m', target: 100 }, // 峰值负载
    { duration: '5m', target: 100 }, // 持续峰值
    { duration: '2m', target: 0 }, // 冷却阶段
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%的请求响应时间小于500ms
    http_req_failed: ['rate<0.1'], // 错误率小于10%
  },
};

export default function () {
  // 测试主页
  let response = http.get('http://localhost:3000');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  // 测试API端点
  response = http.get('http://localhost:3000/api/health');
  check(response, {
    'API status is 200': (r) => r.status === 200,
    'API response time < 200ms': (r) => r.timings.duration < 200,
  });

  // 测试静态资源
  response = http.get('http://localhost:3000/_next/static/css/app.css');
  check(response, {
    'CSS loads successfully': (r) => r.status === 200,
  });

  sleep(1);
}

// 测试生命周期钩子
export function setup() {
  console.log('开始负载测试...');

  // 预热服务器
  http.get('http://localhost:3000');
}

export function teardown(data) {
  console.log('负载测试完成');
}

// 自定义指标
import { Trend } from 'k6/metrics';

const customTrend = new Trend('custom_response_time');

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data),
    'load-test-summary.html': htmlReport(data),
  };
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>负载测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
        .pass { background-color: #d4edda; }
        .fail { background-color: #f8d7da; }
    </style>
</head>
<body>
    <h1>负载测试报告</h1>
    <div class="metric ${data.metrics.http_req_duration.values.p95 < 500 ? 'pass' : 'fail'}">
        <h3>响应时间 (P95)</h3>
        <p>${data.metrics.http_req_duration.values.p95.toFixed(2)}ms</p>
    </div>
    <div class="metric ${data.metrics.http_req_failed.values.rate < 0.1 ? 'pass' : 'fail'}">
        <h3>错误率</h3>
        <p>${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%</p>
    </div>
    <div class="metric">
        <h3>总请求数</h3>
        <p>${data.metrics.http_reqs.values.count}</p>
    </div>
    <div class="metric">
        <h3>平均响应时间</h3>
        <p>${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</p>
    </div>
</body>
</html>
  `;
}
