/**
 * K6 负载测试脚本
 * 用于测试 Test-Web 后端系统的性能和容量
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const requestCounter = new Counter('request_count');

// 测试配置
export const options = {
  stages: [
    // 热身阶段：逐步增加到10个用户，持续30秒
    { duration: '30s', target: 10 },
    
    // 负载增长阶段：增加到50个用户，持续1分钟
    { duration: '1m', target: 50 },
    
    // 高负载阶段：增加到100个用户，持续2分钟
    { duration: '2m', target: 100 },
    
    // 压力测试阶段：增加到200个用户，持续1分钟
    { duration: '1m', target: 200 },
    
    // 峰值测试：增加到300个用户，持续30秒
    { duration: '30s', target: 300 },
    
    // 降温阶段：逐步减少到0，持续30秒
    { duration: '30s', target: 0 },
  ],
  
  thresholds: {
    // 95%的请求必须在500ms内完成
    'http_req_duration': ['p(95)<500'],
    
    // 错误率必须低于1%
    'errors': ['rate<0.01'],
    
    // 99%的请求必须在1000ms内完成
    'http_req_duration': ['p(99)<1000'],
    
    // HTTP失败率必须低于5%
    'http_req_failed': ['rate<0.05'],
  },
};

// 测试配置
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TEST_USER_EMAIL = __ENV.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || 'Test123456!';

let authToken = null;

/**
 * 设置阶段 - 在测试开始前执行一次
 */
export function setup() {
  console.log('🚀 开始压力测试...');
  console.log(`📍 目标服务器: ${BASE_URL}`);
  
  // 尝试登录获取认证令牌
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    authToken = body.data?.accessToken || body.accessToken;
    console.log('✅ 登录成功，获得认证令牌');
    return { token: authToken };
  } else {
    console.log('⚠️  登录失败，将使用未认证模式测试公开端点');
    return { token: null };
  }
}

/**
 * 主测试函数 - 每个虚拟用户重复执行
 */
export default function(data) {
  const token = data.token;
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // 测试组1: 健康检查和系统状态
  group('Health Check & System Status', () => {
    const healthRes = http.get(`${BASE_URL}/health`);
    
    check(healthRes, {
      'health check status is 200': (r) => r.status === 200,
      'health check response time < 200ms': (r) => r.timings.duration < 200,
    });
    
    errorRate.add(healthRes.status !== 200);
    apiResponseTime.add(healthRes.timings.duration);
    requestCounter.add(1);
    
    sleep(0.5);
  });
  
  // 测试组2: 认证端点
  if (token) {
    group('Authentication Tests', () => {
      // 测试刷新令牌
      const refreshRes = http.post(`${BASE_URL}/auth/refresh`, JSON.stringify({
        refreshToken: token,
      }), { headers });
      
      check(refreshRes, {
        'refresh token status is 200 or 401': (r) => [200, 401].includes(r.status),
      });
      
      requestCounter.add(1);
      sleep(0.3);
      
      // 测试获取用户信息
      const profileRes = http.get(`${BASE_URL}/users/profile`, { headers });
      
      check(profileRes, {
        'get profile status is 200': (r) => r.status === 200,
        'profile has user data': (r) => {
          if (r.status === 200) {
            const body = JSON.parse(r.body);
            return body.data !== undefined || body.user !== undefined;
          }
          return false;
        },
      });
      
      errorRate.add(profileRes.status !== 200);
      apiResponseTime.add(profileRes.timings.duration);
      requestCounter.add(1);
      
      sleep(0.5);
    });
  }
  
  // 测试组3: 测试引擎端点
  if (token) {
    group('Test Engine APIs', () => {
      // 获取可用引擎列表
      const enginesRes = http.get(`${BASE_URL}/engines/available`, { headers });
      
      check(enginesRes, {
        'get engines status is 200': (r) => r.status === 200,
        'engines list is not empty': (r) => {
          if (r.status === 200) {
            const body = JSON.parse(r.body);
            const data = body.data || body;
            return Array.isArray(data) && data.length > 0;
          }
          return false;
        },
      });
      
      errorRate.add(enginesRes.status !== 200);
      apiResponseTime.add(enginesRes.timings.duration);
      requestCounter.add(1);
      
      sleep(0.5);
      
      // 获取引擎状态
      const statusRes = http.get(`${BASE_URL}/engines/status`, { headers });
      
      check(statusRes, {
        'get engine status is 200': (r) => r.status === 200,
      });
      
      requestCounter.add(1);
      sleep(0.3);
    });
  }
  
  // 测试组4: 测试历史记录
  if (token) {
    group('Test History APIs', () => {
      const historyRes = http.get(`${BASE_URL}/tests/history?limit=10`, { headers });
      
      check(historyRes, {
        'get history status is 200': (r) => r.status === 200,
        'history response time < 500ms': (r) => r.timings.duration < 500,
      });
      
      errorRate.add(historyRes.status !== 200);
      apiResponseTime.add(historyRes.timings.duration);
      requestCounter.add(1);
      
      sleep(0.5);
    });
  }
  
  // 测试组5: 报告端点
  if (token) {
    group('Reports APIs', () => {
      const reportsRes = http.get(`${BASE_URL}/reports?limit=5`, { headers });
      
      check(reportsRes, {
        'get reports status is 200': (r) => r.status === 200,
      });
      
      errorRate.add(reportsRes.status !== 200);
      requestCounter.add(1);
      
      sleep(0.5);
    });
  }
  
  // 测试组6: 监控端点
  if (token) {
    group('Monitoring APIs', () => {
      const monitoringRes = http.get(`${BASE_URL}/monitoring/sites`, { headers });
      
      check(monitoringRes, {
        'get monitoring sites status is 200': (r) => r.status === 200,
      });
      
      requestCounter.add(1);
      sleep(0.3);
    });
  }
  
  // 模拟真实用户的思考时间
  sleep(Math.random() * 2 + 1);
}

/**
 * 清理阶段 - 在测试结束后执行一次
 */
export function teardown(data) {
  console.log('🏁 压力测试完成');
  
  if (data.token) {
    // 可以在这里执行登出操作
    http.post(`${BASE_URL}/auth/logout`, null, {
      headers: { 'Authorization': `Bearer ${data.token}` },
    });
  }
}

/**
 * 处理摘要统计 - 测试结束后显示
 */
export function handleSummary(data) {
  console.log('📊 生成测试报告...');
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
    'summary.html': htmlReport(data),
  };
}

// 文本摘要生成器
function textSummary(data, options) {
  const { indent = '', enableColors = false } = options;
  
  let summary = '\n';
  summary += `${indent}📊 压力测试结果摘要\n`;
  summary += `${indent}${'='.repeat(50)}\n\n`;
  
  // 请求统计
  const requests = data.metrics.http_reqs?.values;
  if (requests) {
    summary += `${indent}📈 请求统计:\n`;
    summary += `${indent}  - 总请求数: ${requests.count}\n`;
    summary += `${indent}  - 请求速率: ${requests.rate?.toFixed(2)}/s\n\n`;
  }
  
  // 响应时间
  const duration = data.metrics.http_req_duration?.values;
  if (duration) {
    summary += `${indent}⏱️  响应时间:\n`;
    summary += `${indent}  - 平均: ${duration.avg?.toFixed(2)}ms\n`;
    summary += `${indent}  - 最小: ${duration.min?.toFixed(2)}ms\n`;
    summary += `${indent}  - 最大: ${duration.max?.toFixed(2)}ms\n`;
    summary += `${indent}  - P95: ${duration['p(95)']?.toFixed(2)}ms\n`;
    summary += `${indent}  - P99: ${duration['p(99)']?.toFixed(2)}ms\n\n`;
  }
  
  // 错误率
  const failed = data.metrics.http_req_failed?.values;
  if (failed) {
    summary += `${indent}❌ 错误率:\n`;
    summary += `${indent}  - 失败请求: ${(failed.rate * 100)?.toFixed(2)}%\n\n`;
  }
  
  summary += `${indent}${'='.repeat(50)}\n`;
  
  return summary;
}

// HTML报告生成器
function htmlReport(data) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>压力测试报告</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .card {
            background: white;
            padding: 20px;
            margin: 10px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric {
            display: inline-block;
            margin: 10px 20px 10px 0;
        }
        .metric-label {
            color: #666;
            font-size: 14px;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        .good { color: #10b981; }
        .warning { color: #f59e0b; }
        .bad { color: #ef4444; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Test-Web 后端压力测试报告</h1>
        <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
    </div>
    
    <div class="card">
        <h2>📊 测试概览</h2>
        <div class="metric">
            <div class="metric-label">总请求数</div>
            <div class="metric-value">${data.metrics.http_reqs?.values?.count || 0}</div>
        </div>
        <div class="metric">
            <div class="metric-label">平均响应时间</div>
            <div class="metric-value">${data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 0}ms</div>
        </div>
        <div class="metric">
            <div class="metric-label">请求速率</div>
            <div class="metric-value">${data.metrics.http_reqs?.values?.rate?.toFixed(2) || 0}/s</div>
        </div>
        <div class="metric">
            <div class="metric-label">错误率</div>
            <div class="metric-value ${data.metrics.http_req_failed?.values?.rate > 0.05 ? 'bad' : 'good'}">
                ${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%
            </div>
        </div>
    </div>
    
    <div class="card">
        <h2>⏱️ 响应时间分布</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 2px solid #eee;">
                <th style="padding: 10px; text-align: left;">指标</th>
                <th style="padding: 10px; text-align: right;">值 (ms)</th>
            </tr>
            <tr>
                <td style="padding: 10px;">最小值</td>
                <td style="padding: 10px; text-align: right;">${data.metrics.http_req_duration?.values?.min?.toFixed(2) || 0}</td>
            </tr>
            <tr>
                <td style="padding: 10px;">平均值</td>
                <td style="padding: 10px; text-align: right;">${data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 0}</td>
            </tr>
            <tr>
                <td style="padding: 10px;">中位数 (P50)</td>
                <td style="padding: 10px; text-align: right;">${data.metrics.http_req_duration?.values?.med?.toFixed(2) || 0}</td>
            </tr>
            <tr>
                <td style="padding: 10px;">P95</td>
                <td style="padding: 10px; text-align: right;">${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}</td>
            </tr>
            <tr>
                <td style="padding: 10px;">P99</td>
                <td style="padding: 10px; text-align: right;">${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 0}</td>
            </tr>
            <tr>
                <td style="padding: 10px;">最大值</td>
                <td style="padding: 10px; text-align: right;">${data.metrics.http_req_duration?.values?.max?.toFixed(2) || 0}</td>
            </tr>
        </table>
    </div>
    
    <div class="card">
        <h2>✅ 测试结论</h2>
        <p><strong>系统性能评估:</strong></p>
        <ul>
            <li>${data.metrics.http_req_duration?.values?.['p(95)'] < 500 ? '✅' : '❌'} 95%的请求响应时间 < 500ms</li>
            <li>${data.metrics.http_req_duration?.values?.['p(99)'] < 1000 ? '✅' : '❌'} 99%的请求响应时间 < 1000ms</li>
            <li>${data.metrics.http_req_failed?.values?.rate < 0.01 ? '✅' : '❌'} 错误率 < 1%</li>
            <li>${data.metrics.http_req_failed?.values?.rate < 0.05 ? '✅' : '❌'} HTTP失败率 < 5%</li>
        </ul>
    </div>
</body>
</html>
  `;
}

