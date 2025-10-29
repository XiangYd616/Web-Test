/**
 * K6 性能测试脚本 - MFA验证
 * 
 * 测试场景:
 * - MFA设置流程性能
 * - TOTP验证性能
 * - 备用码验证性能
 * - 并发用户场景
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const mfaSetupDuration = new Trend('mfa_setup_duration');
const mfaVerifyDuration = new Trend('mfa_verify_duration');
const backupCodeDuration = new Trend('backup_code_duration');

// 测试配置
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // 预热: 30秒到50用户
    { duration: '1m', target: 100 },   // 正常负载: 1分钟100用户
    { duration: '2m', target: 500 },   // 高负载: 2分钟500用户
    { duration: '1m', target: 1000 },  // 峰值负载: 1分钟1000用户
    { duration: '2m', target: 500 },   // 下降: 2分钟降到500
    { duration: '1m', target: 0 },     // 冷却: 1分钟降到0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95%请求<500ms, 99%<1000ms
    http_req_failed: ['rate<0.01'],                  // 错误率<1%
    errors: ['rate<0.05'],                           // 业务错误<5%
    mfa_setup_duration: ['p(95)<800'],               // MFA设置<800ms
    mfa_verify_duration: ['p(95)<300'],              // MFA验证<300ms
    backupCode_duration: ['p(95)<200'],              // 备用码验证<200ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// 生成随机测试数据
function generateTestUser() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return {
    username: `perftest${timestamp}${random}`,
    email: `perftest-${timestamp}-${random}@example.com`,
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

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/api/auth/register`, payload, params);
  
  check(res, {
    '注册成功': (r) => r.status === 201,
    '返回用户信息': (r) => r.json('user') !== undefined,
  }) || errorRate.add(1);

  return res;
}

// 登录用户
function loginUser(user) {
  const payload = JSON.stringify({
    email: user.email,
    password: user.password
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);
  
  check(res, {
    '登录成功': (r) => r.status === 200,
    '返回token': (r) => r.json('accessToken') !== undefined,
  }) || errorRate.add(1);

  return res.json('accessToken');
}

// MFA设置初始化
function setupMFA(token, password) {
  const payload = JSON.stringify({ password });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/auth/mfa/setup`, payload, params);
  const duration = Date.now() - start;
  
  mfaSetupDuration.add(duration);

  const success = check(res, {
    'MFA设置初始化成功': (r) => r.status === 200,
    '返回密钥': (r) => r.json('secretKey') !== undefined,
    '返回备用码': (r) => r.json('backupCodes') !== undefined,
    '响应时间<1000ms': () => duration < 1000,
  });

  if (!success) errorRate.add(1);

  return res.json();
}

// 验证TOTP并完成MFA设置
function verifyMFASetup(token, totpCode) {
  const payload = JSON.stringify({ token: totpCode });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  };

  const res = http.post(`${BASE_URL}/api/auth/mfa/verify-setup`, payload, params);
  
  check(res, {
    'MFA设置验证成功': (r) => r.status === 200,
  }) || errorRate.add(1);

  return res;
}

// MFA登录验证
function verifyMFALogin(email, totpCode) {
  const payload = JSON.stringify({
    email,
    token: totpCode,
    trustDevice: false
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/auth/mfa/verify`, payload, params);
  const duration = Date.now() - start;
  
  mfaVerifyDuration.add(duration);

  const success = check(res, {
    'MFA验证成功': (r) => r.status === 200,
    '返回新token': (r) => r.json('accessToken') !== undefined,
    '响应时间<500ms': () => duration < 500,
  });

  if (!success) errorRate.add(1);

  return res;
}

// 备用码验证
function verifyBackupCode(email, backupCode) {
  const payload = JSON.stringify({
    email,
    backupCode,
    trustDevice: false
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/auth/mfa/verify-backup`, payload, params);
  const duration = Date.now() - start;
  
  backupCodeDuration.add(duration);

  const success = check(res, {
    '备用码验证成功': (r) => r.status === 200,
    '返回剩余备用码数量': (r) => r.json('backupCodesRemaining') !== undefined,
    '响应时间<400ms': () => duration < 400,
  });

  if (!success) errorRate.add(1);

  return res;
}

// 获取MFA状态
function getMFAStatus(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`
    },
  };

  const res = http.get(`${BASE_URL}/api/auth/mfa/status`, params);
  
  check(res, {
    'MFA状态获取成功': (r) => r.status === 200,
    '返回MFA状态': (r) => r.json('data.mfaEnabled') !== undefined,
  }) || errorRate.add(1);

  return res;
}

// 主测试场景
export default function() {
  // 场景1: 新用户注册并设置MFA (40%流量)
  if (Math.random() < 0.4) {
    const user = generateTestUser();
    
    // 注册
    registerUser(user);
    sleep(1);
    
    // 登录
    const token = loginUser(user);
    if (!token) return;
    sleep(0.5);
    
    // 设置MFA
    const mfaData = setupMFA(token, user.password);
    if (!mfaData || !mfaData.secretKey) return;
    sleep(0.5);
    
    // 模拟TOTP验证(测试环境使用固定码)
    verifyMFASetup(token, '123456');
    sleep(1);
    
    // 查看MFA状态
    getMFAStatus(token);
  }
  
  // 场景2: 已有用户进行MFA登录验证 (50%流量)
  else if (Math.random() < 0.9) {
    const user = generateTestUser();
    
    // 注册并快速设置MFA
    registerUser(user);
    sleep(0.5);
    
    const token = loginUser(user);
    if (!token) return;
    
    const mfaData = setupMFA(token, user.password);
    if (!mfaData) return;
    
    verifyMFASetup(token, '123456');
    sleep(0.5);
    
    // 再次登录(需要MFA验证)
    loginUser(user);
    sleep(0.3);
    
    // MFA验证
    verifyMFALogin(user.email, '123456');
    sleep(1);
  }
  
  // 场景3: 备用码验证 (10%流量)
  else {
    const user = generateTestUser();
    
    registerUser(user);
    sleep(0.5);
    
    const token = loginUser(user);
    if (!token) return;
    
    const mfaData = setupMFA(token, user.password);
    if (!mfaData || !mfaData.backupCodes) return;
    
    verifyMFASetup(token, '123456');
    sleep(0.5);
    
    // 登录后使用备用码验证
    loginUser(user);
    sleep(0.3);
    
    const backupCode = mfaData.backupCodes[0];
    verifyBackupCode(user.email, backupCode);
    sleep(1);
  }
}

// 测试完成后的汇总
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'mfa-performance-results.json': JSON.stringify(data),
    'mfa-performance-summary.html': htmlReport(data),
  };
}

// 简单的文本摘要
function textSummary(data, options) {
  const summary = [
    '\n' + '='.repeat(60),
    '  MFA性能测试结果',
    '='.repeat(60),
    '',
    `  总请求数: ${data.metrics.http_reqs.values.count}`,
    `  成功率: ${(100 - data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`,
    `  错误率: ${(data.metrics.errors ? data.metrics.errors.values.rate * 100 : 0).toFixed(2)}%`,
    '',
    '  响应时间:',
    `    平均: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`,
    `    P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`,
    `    P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms`,
    '',
    '  MFA特定指标:',
    `    MFA设置平均时长: ${data.metrics.mfa_setup_duration ? data.metrics.mfa_setup_duration.values.avg.toFixed(2) + 'ms' : 'N/A'}`,
    `    MFA验证平均时长: ${data.metrics.mfa_verify_duration ? data.metrics.mfa_verify_duration.values.avg.toFixed(2) + 'ms' : 'N/A'}`,
    `    备用码验证平均时长: ${data.metrics.backup_code_duration ? data.metrics.backup_code_duration.values.avg.toFixed(2) + 'ms' : 'N/A'}`,
    '',
    '='.repeat(60),
    ''
  ];
  
  return summary.join('\n');
}

// HTML报告生成
function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>MFA性能测试报告</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .metric { background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; }
    .metric-name { font-weight: bold; color: #333; }
    .metric-value { font-size: 24px; color: #4CAF50; margin: 5px 0; }
    .status-pass { color: #4CAF50; }
    .status-fail { color: #f44336; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #4CAF50; color: white; }
    tr:hover { background-color: #f5f5f5; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 MFA性能测试报告</h1>
    <p><strong>测试时间:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>测试配置:</strong> 峰值1000并发用户, 持续7分钟</p>
    
    <h2>📊 核心指标</h2>
    <div class="metric">
      <div class="metric-name">总请求数</div>
      <div class="metric-value">${data.metrics.http_reqs.values.count}</div>
    </div>
    
    <div class="metric">
      <div class="metric-name">成功率</div>
      <div class="metric-value ${100 - data.metrics.http_req_failed.values.rate * 100 > 99 ? 'status-pass' : 'status-fail'}">
        ${(100 - data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
      </div>
    </div>
    
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
        <td>&lt; 200ms</td>
        <td class="${data.metrics.http_req_duration.values.avg < 200 ? 'status-pass' : 'status-fail'}">
          ${data.metrics.http_req_duration.values.avg < 200 ? '✓ 通过' : '✗ 未达标'}
        </td>
      </tr>
      <tr>
        <td>P95响应时间</td>
        <td>${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</td>
        <td>&lt; 500ms</td>
        <td class="${data.metrics.http_req_duration.values['p(95)'] < 500 ? 'status-pass' : 'status-fail'}">
          ${data.metrics.http_req_duration.values['p(95)'] < 500 ? '✓ 通过' : '✗ 未达标'}
        </td>
      </tr>
      <tr>
        <td>P99响应时间</td>
        <td>${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms</td>
        <td>&lt; 1000ms</td>
        <td class="${data.metrics.http_req_duration.values['p(99)'] < 1000 ? 'status-pass' : 'status-fail'}">
          ${data.metrics.http_req_duration.values['p(99)'] < 1000 ? '✓ 通过' : '✗ 未达标'}
        </td>
      </tr>
    </table>
    
    <h2>🔐 MFA特定指标</h2>
    <table>
      <tr>
        <th>操作</th>
        <th>平均时长</th>
        <th>P95</th>
        <th>P99</th>
      </tr>
      <tr>
        <td>MFA设置</td>
        <td>${data.metrics.mfa_setup_duration ? data.metrics.mfa_setup_duration.values.avg.toFixed(2) + 'ms' : 'N/A'}</td>
        <td>${data.metrics.mfa_setup_duration ? data.metrics.mfa_setup_duration.values['p(95)'].toFixed(2) + 'ms' : 'N/A'}</td>
        <td>${data.metrics.mfa_setup_duration ? data.metrics.mfa_setup_duration.values['p(99)'].toFixed(2) + 'ms' : 'N/A'}</td>
      </tr>
      <tr>
        <td>MFA验证</td>
        <td>${data.metrics.mfa_verify_duration ? data.metrics.mfa_verify_duration.values.avg.toFixed(2) + 'ms' : 'N/A'}</td>
        <td>${data.metrics.mfa_verify_duration ? data.metrics.mfa_verify_duration.values['p(95)'].toFixed(2) + 'ms' : 'N/A'}</td>
        <td>${data.metrics.mfa_verify_duration ? data.metrics.mfa_verify_duration.values['p(99)'].toFixed(2) + 'ms' : 'N/A'}</td>
      </tr>
      <tr>
        <td>备用码验证</td>
        <td>${data.metrics.backup_code_duration ? data.metrics.backup_code_duration.values.avg.toFixed(2) + 'ms' : 'N/A'}</td>
        <td>${data.metrics.backup_code_duration ? data.metrics.backup_code_duration.values['p(95)'].toFixed(2) + 'ms' : 'N/A'}</td>
        <td>${data.metrics.backup_code_duration ? data.metrics.backup_code_duration.values['p(99)'].toFixed(2) + 'ms' : 'N/A'}</td>
      </tr>
    </table>
    
    <h2>📈 结论</h2>
    <p>
      ${data.metrics.http_req_duration.values['p(95)'] < 500 && 
        data.metrics.http_req_failed.values.rate < 0.01 ? 
        '<strong class="status-pass">✓ 系统性能达标</strong> - 所有指标均满足要求' : 
        '<strong class="status-fail">✗ 系统性能需要优化</strong> - 部分指标未达标'
      }
    </p>
  </div>
</body>
</html>
  `;
}

