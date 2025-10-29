/**
 * K6 性能测试脚本 - OAuth登录
 * 
 * 测试场景:
 * - Google OAuth登录性能
 * - GitHub OAuth登录性能
 * - OAuth账户关联性能
 * - 并发OAuth请求
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const oauthLoginDuration = new Trend('oauth_login_duration');
const accountLinkDuration = new Trend('account_link_duration');
const googleOAuthCount = new Counter('google_oauth_requests');
const githubOAuthCount = new Counter('github_oauth_requests');

// 测试配置
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // 预热
    { duration: '1m', target: 100 },   // 正常负载
    { duration: '2m', target: 300 },   // 中等负载
    { duration: '1m', target: 500 },   // 高负载
    { duration: '1m', target: 300 },   // 下降
    { duration: '30s', target: 0 },    // 冷却
  ],
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.02'],
    errors: ['rate<0.05'],
    oauth_login_duration: ['p(95)<1000'],
    account_link_duration: ['p(95)<600'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Mock OAuth数据(实际测试中需要真实OAuth流程或Mock服务)
const mockGoogleProfile = {
  id: `google-${Math.random().toString(36).substring(7)}`,
  email: `test-${Date.now()}@gmail.com`,
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg'
};

const mockGitHubProfile = {
  id: Math.floor(Math.random() * 1000000),
  login: `testuser${Date.now()}`,
  name: 'Test User',
  email: `test-${Date.now()}@github.com`,
  avatar_url: 'https://github.com/avatar.jpg'
};

// 生成测试用户
function generateTestUser() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return {
    username: `oauthtest${timestamp}${random}`,
    email: `oauth-${timestamp}-${random}@example.com`,
    password: 'TestPassword123!'
  };
}

// 注册用户
function registerUser(user) {
  const payload = JSON.stringify({
    username: user.username,
    email: user.email,
    password: user.password,
    confirmPassword: user.password
  });

  const res = http.post(
    `${BASE_URL}/api/auth/register`,
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    '注册成功': (r) => r.status === 201,
  }) || errorRate.add(1);

  return res;
}

// 登录用户
function loginUser(user) {
  const payload = JSON.stringify({
    email: user.email,
    password: user.password
  });

  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    '登录成功': (r) => r.status === 200,
  }) || errorRate.add(1);

  return res.json('accessToken');
}

// 模拟Google OAuth登录流程
function googleOAuthLogin() {
  googleOAuthCount.add(1);
  
  const start = Date.now();
  
  // 步骤1: 重定向到Google授权页面
  const authRes = http.get(`${BASE_URL}/auth/oauth/google`, {
    redirects: 0  // 不自动跟随重定向
  });
  
  check(authRes, {
    'Google授权重定向': (r) => r.status === 302,
    '包含Google URL': (r) => r.headers['Location'] && r.headers['Location'].includes('accounts.google.com'),
  }) || errorRate.add(1);
  
  sleep(0.3);
  
  // 步骤2: 模拟Google回调(使用mock数据)
  // 注意: 实际测试需要完整的OAuth流程或Mock服务
  const mockCode = `mock_google_code_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const callbackRes = http.get(
    `${BASE_URL}/auth/oauth/google/callback?code=${mockCode}`,
    { tags: { name: 'GoogleOAuthCallback' } }
  );
  
  const duration = Date.now() - start;
  oauthLoginDuration.add(duration);
  
  const success = check(callbackRes, {
    'OAuth登录成功': (r) => r.status === 200,
    '返回token': (r) => {
      try {
        const body = r.json();
        return body && body.accessToken !== undefined;
      } catch (e) {
        return false;
      }
    },
    '响应时间<2000ms': () => duration < 2000,
  });
  
  if (!success) errorRate.add(1);
  
  return callbackRes;
}

// 模拟GitHub OAuth登录流程
function githubOAuthLogin() {
  githubOAuthCount.add(1);
  
  const start = Date.now();
  
  // 步骤1: 重定向到GitHub授权页面
  const authRes = http.get(`${BASE_URL}/auth/oauth/github`, {
    redirects: 0
  });
  
  check(authRes, {
    'GitHub授权重定向': (r) => r.status === 302,
    '包含GitHub URL': (r) => r.headers['Location'] && r.headers['Location'].includes('github.com'),
  }) || errorRate.add(1);
  
  sleep(0.3);
  
  // 步骤2: 模拟GitHub回调
  const mockCode = `mock_github_code_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const callbackRes = http.get(
    `${BASE_URL}/auth/oauth/github/callback?code=${mockCode}`,
    { tags: { name: 'GitHubOAuthCallback' } }
  );
  
  const duration = Date.now() - start;
  oauthLoginDuration.add(duration);
  
  const success = check(callbackRes, {
    'OAuth登录成功': (r) => r.status === 200,
    '返回token': (r) => {
      try {
        const body = r.json();
        return body && body.accessToken !== undefined;
      } catch (e) {
        return false;
      }
    },
    '响应时间<2000ms': () => duration < 2000,
  });
  
  if (!success) errorRate.add(1);
  
  return callbackRes;
}

// OAuth账户关联
function linkOAuthAccount(token, provider) {
  const mockCode = `mock_link_code_${Date.now()}`;
  const payload = JSON.stringify({ code: mockCode });
  
  const start = Date.now();
  
  const res = http.post(
    `${BASE_URL}/auth/oauth/link/${provider}`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const duration = Date.now() - start;
  accountLinkDuration.add(duration);
  
  const success = check(res, {
    '账户关联成功': (r) => r.status === 200,
    '返回关联列表': (r) => {
      try {
        return r.json('linkedAccounts') !== undefined;
      } catch (e) {
        return false;
      }
    },
    '响应时间<1000ms': () => duration < 1000,
  });
  
  if (!success) errorRate.add(1);
  
  return res;
}

// 查看关联账户
function getLinkedAccounts(token) {
  const res = http.get(
    `${BASE_URL}/auth/oauth/linked-accounts`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  check(res, {
    '获取关联账户成功': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  return res;
}

// 解绑OAuth账户
function unlinkOAuthAccount(token, provider) {
  const res = http.del(
    `${BASE_URL}/auth/oauth/unlink/${provider}`,
    null,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  check(res, {
    '解绑账户成功': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  return res;
}

// 主测试场景
export default function() {
  // 场景1: Google OAuth登录 (50%流量)
  if (Math.random() < 0.5) {
    googleOAuthLogin();
    sleep(1);
  }
  
  // 场景2: GitHub OAuth登录 (30%流量)
  else if (Math.random() < 0.8) {
    githubOAuthLogin();
    sleep(1);
  }
  
  // 场景3: 账户关联流程 (20%流量)
  else {
    const user = generateTestUser();
    
    // 注册并登录
    registerUser(user);
    sleep(0.5);
    
    const token = loginUser(user);
    if (!token) return;
    sleep(0.3);
    
    // 关联Google账户
    linkOAuthAccount(token, 'google');
    sleep(0.5);
    
    // 查看关联账户
    getLinkedAccounts(token);
    sleep(0.5);
    
    // 关联GitHub账户
    linkOAuthAccount(token, 'github');
    sleep(0.5);
    
    // 再次查看关联账户
    getLinkedAccounts(token);
    sleep(1);
  }
}

// 测试摘要
export function handleSummary(data) {
  return {
    'stdout': generateTextSummary(data),
    'oauth-performance-results.json': JSON.stringify(data),
    'oauth-performance-summary.html': generateHTMLReport(data),
  };
}

function generateTextSummary(data) {
  const summary = [
    '\n' + '='.repeat(60),
    '  OAuth性能测试结果',
    '='.repeat(60),
    '',
    `  总请求数: ${data.metrics.http_reqs.values.count}`,
    `  成功率: ${(100 - data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`,
    `  错误率: ${(data.metrics.errors ? data.metrics.errors.values.rate * 100 : 0).toFixed(2)}%`,
    '',
    '  OAuth请求分布:',
    `    Google OAuth: ${data.metrics.google_oauth_requests ? data.metrics.google_oauth_requests.values.count : 0}次`,
    `    GitHub OAuth: ${data.metrics.github_oauth_requests ? data.metrics.github_oauth_requests.values.count : 0}次`,
    '',
    '  响应时间:',
    `    平均: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`,
    `    P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`,
    `    P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms`,
    '',
    '  OAuth特定指标:',
    `    OAuth登录平均时长: ${data.metrics.oauth_login_duration ? data.metrics.oauth_login_duration.values.avg.toFixed(2) + 'ms' : 'N/A'}`,
    `    账户关联平均时长: ${data.metrics.account_link_duration ? data.metrics.account_link_duration.values.avg.toFixed(2) + 'ms' : 'N/A'}`,
    '',
    '='.repeat(60),
    ''
  ];
  
  return summary.join('\n');
}

function generateHTMLReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>OAuth性能测试报告</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #2196F3; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .metric { background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #2196F3; }
    .metric-name { font-weight: bold; color: #333; }
    .metric-value { font-size: 24px; color: #2196F3; margin: 5px 0; }
    .status-pass { color: #4CAF50; }
    .status-fail { color: #f44336; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #2196F3; color: white; }
    tr:hover { background-color: #f5f5f5; }
    .chart-container { margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔗 OAuth性能测试报告</h1>
    <p><strong>测试时间:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>测试配置:</strong> 峰值500并发用户, 持续6分钟</p>
    
    <h2>📊 核心指标</h2>
    <div class="metric">
      <div class="metric-name">总请求数</div>
      <div class="metric-value">${data.metrics.http_reqs.values.count}</div>
    </div>
    
    <div class="metric">
      <div class="metric-name">成功率</div>
      <div class="metric-value ${100 - data.metrics.http_req_failed.values.rate * 100 > 98 ? 'status-pass' : 'status-fail'}">
        ${(100 - data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
      </div>
    </div>
    
    <h2>🌐 OAuth请求分布</h2>
    <table>
      <tr>
        <th>OAuth提供商</th>
        <th>请求次数</th>
        <th>占比</th>
      </tr>
      <tr>
        <td>Google OAuth</td>
        <td>${data.metrics.google_oauth_requests ? data.metrics.google_oauth_requests.values.count : 0}</td>
        <td>${data.metrics.google_oauth_requests ? ((data.metrics.google_oauth_requests.values.count / data.metrics.http_reqs.values.count) * 100).toFixed(1) : 0}%</td>
      </tr>
      <tr>
        <td>GitHub OAuth</td>
        <td>${data.metrics.github_oauth_requests ? data.metrics.github_oauth_requests.values.count : 0}</td>
        <td>${data.metrics.github_oauth_requests ? ((data.metrics.github_oauth_requests.values.count / data.metrics.http_reqs.values.count) * 100).toFixed(1) : 0}%</td>
      </tr>
    </table>
    
    <h2>⏱️ 响应时间</h2>
    <table>
      <tr>
        <th>指标</th>
        <th>值</th>
        <th>目标</th>
        <th>状态</th>
      </tr>
      <tr>
        <td>平均响应时间</td>
        <td>${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</td>
        <td>&lt; 300ms</td>
        <td class="${data.metrics.http_req_duration.values.avg < 300 ? 'status-pass' : 'status-fail'}">
          ${data.metrics.http_req_duration.values.avg < 300 ? '✓ 通过' : '✗ 未达标'}
        </td>
      </tr>
      <tr>
        <td>P95响应时间</td>
        <td>${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</td>
        <td>&lt; 800ms</td>
        <td class="${data.metrics.http_req_duration.values['p(95)'] < 800 ? 'status-pass' : 'status-fail'}">
          ${data.metrics.http_req_duration.values['p(95)'] < 800 ? '✓ 通过' : '✗ 未达标'}
        </td>
      </tr>
      <tr>
        <td>P99响应时间</td>
        <td>${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms</td>
        <td>&lt; 1500ms</td>
        <td class="${data.metrics.http_req_duration.values['p(99)'] < 1500 ? 'status-pass' : 'status-fail'}">
          ${data.metrics.http_req_duration.values['p(99)'] < 1500 ? '✓ 通过' : '✗ 未达标'}
        </td>
      </tr>
    </table>
    
    <h2>🔗 OAuth特定指标</h2>
    <table>
      <tr>
        <th>操作</th>
        <th>平均时长</th>
        <th>P95</th>
        <th>P99</th>
      </tr>
      <tr>
        <td>OAuth登录</td>
        <td>${data.metrics.oauth_login_duration ? data.metrics.oauth_login_duration.values.avg.toFixed(2) + 'ms' : 'N/A'}</td>
        <td>${data.metrics.oauth_login_duration ? data.metrics.oauth_login_duration.values['p(95)'].toFixed(2) + 'ms' : 'N/A'}</td>
        <td>${data.metrics.oauth_login_duration ? data.metrics.oauth_login_duration.values['p(99)'].toFixed(2) + 'ms' : 'N/A'}</td>
      </tr>
      <tr>
        <td>账户关联</td>
        <td>${data.metrics.account_link_duration ? data.metrics.account_link_duration.values.avg.toFixed(2) + 'ms' : 'N/A'}</td>
        <td>${data.metrics.account_link_duration ? data.metrics.account_link_duration.values['p(95)'].toFixed(2) + 'ms' : 'N/A'}</td>
        <td>${data.metrics.account_link_duration ? data.metrics.account_link_duration.values['p(99)'].toFixed(2) + 'ms' : 'N/A'}</td>
      </tr>
    </table>
    
    <h2>📈 结论</h2>
    <p>
      ${data.metrics.http_req_duration.values['p(95)'] < 800 && 
        data.metrics.http_req_failed.values.rate < 0.02 ? 
        '<strong class="status-pass">✓ OAuth系统性能达标</strong> - 所有指标均满足要求' : 
        '<strong class="status-fail">✗ OAuth系统性能需要优化</strong> - 部分指标未达标'
      }
    </p>
    
    <h2>💡 建议</h2>
    <ul>
      <li>OAuth回调处理可能需要优化以减少延迟</li>
      <li>考虑缓存OAuth用户信息以提高性能</li>
      <li>监控第三方OAuth提供商的响应时间</li>
      <li>实现OAuth请求的速率限制和熔断机制</li>
    </ul>
  </div>
</body>
</html>
  `;
}

