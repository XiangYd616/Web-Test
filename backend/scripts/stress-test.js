/**
 * 后端API压力测试脚本
 * 测试系统在高并发下的表现
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// 压力测试配置
const config = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3001',
  duration: parseInt(process.env.TEST_DURATION) || 30, // 秒
  concurrency: parseInt(process.env.TEST_CONCURRENCY) || 10, // 并发数
  endpoint: process.env.TEST_ENDPOINT || '/health',
  method: process.env.TEST_METHOD || 'GET',
  auth: process.env.TEST_AUTH_TOKEN || null
};

// 统计数据
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: {},
  startTime: null,
  endTime: null
};

/**
 * 发送单个HTTP请求
 */
async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: config.method,
      headers: {
        'User-Agent': 'Stress-Test/1.0',
        'Accept': 'application/json',
        ...options.headers
      },
      timeout: 30000
    };

    const startTime = Date.now();
    
    const req = client.request(reqOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          responseTime,
          success: res.statusCode >= 200 && res.statusCode < 400,
          data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * 执行单次请求并记录统计
 */
async function performRequest() {
  stats.totalRequests++;
  
  try {
    const url = `${config.baseURL}${config.endpoint}`;
    const options = {};
    
    if (config.auth) {
      options.headers = {
        'Authorization': `Bearer ${config.auth}`
      };
    }

    const result = await makeRequest(url, options);
    
    if (result.success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }
    
    stats.responseTimes.push(result.responseTime);
    
  } catch (error) {
    stats.failedRequests++;
    const errorKey = error.message;
    stats.errors[errorKey] = (stats.errors[errorKey] || 0) + 1;
  }
}

/**
 * 执行并发测试
 */
async function runStressTest() {
  console.log('🔥 开始压力测试...\n');
  console.log('配置:');
  console.log(`  目标URL: ${config.baseURL}${config.endpoint}`);
  console.log(`  测试时长: ${config.duration}秒`);
  console.log(`  并发数: ${config.concurrency}`);
  console.log(`  HTTP方法: ${config.method}\n`);

  stats.startTime = Date.now();
  const endTime = stats.startTime + (config.duration * 1000);

  // 启动并发请求
  const workers = [];
  for (let i = 0; i < config.concurrency; i++) {
    workers.push(runWorker(endTime));
  }

  await Promise.all(workers);
  stats.endTime = Date.now();

  // 显示结果
  displayResults();
}

/**
 * 工作进程 - 持续发送请求直到测试结束
 */
async function runWorker(endTime) {
  while (Date.now() < endTime) {
    await performRequest();
    
    // 小延迟避免过度占用CPU
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

/**
 * 计算统计数据
 */
function calculateStats() {
  const sortedTimes = [...stats.responseTimes].sort((a, b) => a - b);
  const totalTime = stats.endTime - stats.startTime;
  
  return {
    totalRequests: stats.totalRequests,
    successfulRequests: stats.successfulRequests,
    failedRequests: stats.failedRequests,
    successRate: ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2),
    totalTime: totalTime,
    requestsPerSecond: (stats.totalRequests / (totalTime / 1000)).toFixed(2),
    avgResponseTime: (stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length).toFixed(2),
    minResponseTime: Math.min(...stats.responseTimes),
    maxResponseTime: Math.max(...stats.responseTimes),
    p50: sortedTimes[Math.floor(sortedTimes.length * 0.5)],
    p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
    p99: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
    errors: stats.errors
  };
}

/**
 * 显示测试结果
 */
function displayResults() {
  const results = calculateStats();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 压力测试结果');
  console.log('='.repeat(60) + '\n');

  console.log('📈 请求统计:');
  console.log(`  总请求数: ${results.totalRequests}`);
  console.log(`  成功请求: ${results.successfulRequests}`);
  console.log(`  失败请求: ${results.failedRequests}`);
  console.log(`  成功率: ${results.successRate}%`);
  console.log(`  总耗时: ${results.totalTime}ms`);
  console.log(`  QPS: ${results.requestsPerSecond} 请求/秒\n`);

  console.log('⏱️  响应时间:');
  console.log(`  平均值: ${results.avgResponseTime}ms`);
  console.log(`  最小值: ${results.minResponseTime}ms`);
  console.log(`  最大值: ${results.maxResponseTime}ms`);
  console.log(`  P50: ${results.p50}ms`);
  console.log(`  P95: ${results.p95}ms`);
  console.log(`  P99: ${results.p99}ms\n`);

  if (Object.keys(results.errors).length > 0) {
    console.log('❌ 错误统计:');
    Object.entries(results.errors).forEach(([error, count]) => {
      console.log(`  ${error}: ${count}次`);
    });
    console.log('');
  }

  // 性能评级
  const rating = getRating(results);
  console.log(`🎯 性能评级: ${rating.grade} (${rating.score}/100)`);
  console.log(`   ${rating.message}\n`);

  // 建议
  if (results.successRate < 95) {
    console.log('⚠️  警告: 成功率低于95%，请检查系统稳定性');
  }
  if (results.avgResponseTime > 1000) {
    console.log('⚠️  警告: 平均响应时间超过1秒，建议优化性能');
  }
  if (results.p99 > 3000) {
    console.log('⚠️  警告: P99响应时间过高，存在性能瓶颈');
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * 计算性能评级
 */
function getRating(results) {
  let score = 100;
  const messages = [];

  // 成功率评分 (40分)
  if (results.successRate < 95) {
    score -= 40;
    messages.push('成功率低');
  } else if (results.successRate < 99) {
    score -= 20;
    messages.push('成功率一般');
  }

  // 平均响应时间评分 (30分)
  if (results.avgResponseTime > 1000) {
    score -= 30;
    messages.push('响应慢');
  } else if (results.avgResponseTime > 500) {
    score -= 15;
    messages.push('响应一般');
  }

  // P99响应时间评分 (30分)
  if (results.p99 > 3000) {
    score -= 30;
    messages.push('长尾延迟高');
  } else if (results.p99 > 1500) {
    score -= 15;
    messages.push('长尾延迟一般');
  }

  let grade;
  if (score >= 90) grade = 'A+ 优秀';
  else if (score >= 80) grade = 'A 良好';
  else if (score >= 70) grade = 'B+ 中等';
  else if (score >= 60) grade = 'B 及格';
  else grade = 'C 需改进';

  return {
    score,
    grade,
    message: messages.length > 0 ? messages.join(', ') : '系统表现优秀'
  };
}

/**
 * 主函数
 */
async function main() {
  try {
    await runStressTest();
    process.exit(0);
  } catch (error) {
    console.error('❌ 压力测试失败:', error.message);
    process.exit(1);
  }
}

// 处理Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n⚠️  测试被中断');
  if (stats.startTime) {
    stats.endTime = Date.now();
    displayResults();
  }
  process.exit(0);
});

// 运行测试
if (require.main === module) {
  main();
}

module.exports = { runStressTest, calculateStats };

