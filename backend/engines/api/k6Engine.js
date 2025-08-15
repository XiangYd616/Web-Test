const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * 真实的k6压力测试引擎
 */
class RealK6Engine {
  constructor() {
    this.name = 'k6';
    this.version = '0.47.0';
    this.isAvailable = false;
    this.activeTests = new Map();
  }

  /**
   * 检查k6是否可用
   */
  async checkAvailability() {
    try {
      const result = await this.executeCommand('k6', ['version']);
      this.isAvailable = result.success;
      return this.isAvailable;
    } catch (error) {
      console.error('k6 not available:', error.message);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * 安装k6
   */
  async install() {
    try {
      console.log('🔧 Installing k6...');

      const platform = os.platform();
      let installCommand;

      if (platform === 'win32') {
        // Windows: 使用chocolatey或直接下载
        installCommand = ['choco', ['install', 'k6']];
      } else if (platform === 'darwin') {
        // macOS: 使用homebrew
        installCommand = ['brew', ['install', 'k6']];
      } else {
        // Linux: 使用包管理器
        installCommand = ['sudo', ['apt-get', 'install', '-y', 'k6']];
      }

      const result = await this.executeCommand(installCommand[0], installCommand[1]);

      if (result.success) {
        console.log('✅ k6 installed successfully');
        this.isAvailable = true;
        return true;
      } else {
        console.error('❌ k6 installation failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ k6 installation error:', error);
      return false;
    }
  }

  /**
   * 运行k6压力测试
   */
  async runStressTest(config) {
    const {
      url,
      vus = 10,
      duration = '30s',
      rampUpTime = '10s',
      testType = 'load',
      thresholds = {},
      proxy = null,
      timeout = 30
    } = config;

    console.log(`🚀 Starting k6 stress test: ${url}`);
    console.log(`📊 Config: ${vus} VUs, ${duration} duration, ${rampUpTime} ramp-up`);

    // 🌐 代理配置日志
    if (proxy && proxy.enabled) {
      console.log(`🌐 Using proxy: ${proxy.type}://${proxy.host}:${proxy.port}`);
    }

    try {
      // 生成k6测试脚本
      const scriptPath = await this.generateK6Script({
        url,
        vus,
        duration,
        rampUpTime,
        testType,
        thresholds,
        proxy,
        timeout
      });

      // 执行k6测试
      const result = await this.executeK6Test(scriptPath, {
        vus,
        duration,
        rampUpTime,
        proxy
      });

      // 清理临时文件
      await fs.unlink(scriptPath);

      return this.parseK6Results(result);
    } catch (error) {
      console.error('❌ k6 test failed:', error);
      throw new Error(`k6测试执行失败: ${error.message}`);
    }
  }

  /**
   * 生成k6测试脚本
   */
  async generateK6Script(config) {
    const { url, testType, thresholds, proxy, timeout = 30 } = config;

    // 🌐 构建代理配置
    let proxyConfig = '';
    if (proxy && proxy.enabled) {
      const proxyUrl = proxy.username && proxy.password
        ? `${proxy.type}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
        : `${proxy.type}://${proxy.host}:${proxy.port}`;

      proxyConfig = `
// 代理配置
const proxyUrl = '${proxyUrl}';
console.log('🌐 Using proxy:', proxyUrl.replace(///////.*:.*@/, '//***:***@'));
`;
    }

    const script = `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const successRate = new Rate('success');

${proxyConfig}

export const options = {
  stages: [
    { duration: '${config.rampUpTime}', target: ${config.vus} },
    { duration: '${config.duration}', target: ${config.vus} },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<${thresholds.responseTime || 5000}'],
    http_req_failed: ['rate<${(thresholds.errorRate || 90) / 100}'],
    errors: ['rate<${(thresholds.errorRate || 90) / 100}'],
    success: ['rate>0.1'], // 至少10%的请求成功
    ...${JSON.stringify(thresholds.custom || {})}
  },
  // 🕐 超时配置
  timeout: '${timeout}s',
  // 🌐 代理配置（如果启用）
  ${proxy && proxy.enabled ? `
  // k6会自动使用环境变量中的代理设置
  ` : ''}
};

export default function() {
  // 🌐 构建请求参数
  const params = {
    headers: {
      'User-Agent': 'TestWebApp-k6/1.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
    },
    timeout: '${timeout}s',
  };

  let response;
  try {
    response = http.get('${url}', params);
  } catch (error) {
    console.error('Request failed:', error);
    errorRate.add(1);
    successRate.add(0);
    return;
  }

  // 📊 检查响应
  const checks = check(response, {
    'status is 200': (r) => r.status === 200,
    'status is not 0': (r) => r.status !== 0,
    'response time < ${timeout * 1000}ms': (r) => r.timings.duration < ${timeout * 1000},
    'content received': (r) => r.body && r.body.length > 0,
  });

  // 📈 记录指标
  const isSuccess = checks && response.status === 200;
  errorRate.add(!isSuccess);
  successRate.add(isSuccess);

  // 🐛 调试信息
  if (!isSuccess) {
    console.log(/`❌ Request failed: status=/${response.status}, duration=/${response.timings.duration}ms, size=/${response.body ? response.body.length : 0}/`);
  }

  // 根据测试类型调整请求间隔
  ${this.getTestTypeLogic(testType)}
}

${this.getTestTypeSetup(testType)}
`;

    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `k6-test-${Date.now()}.js`);
    await fs.writeFile(scriptPath, script);

    return scriptPath;
  }

  /**
   * 获取测试类型逻辑
   */
  getTestTypeLogic(testType) {
    switch (testType) {
      case 'spike':
        return 'sleep(Math.random() * 2);';
      case 'stress':
        return 'sleep(0.1);';
      case 'load':
      default:
        return 'sleep(1);';
    }
  }

  /**
   * 获取测试类型设置
   */
  getTestTypeSetup(testType) {
    switch (testType) {
      case 'spike':
        return `
export function setup() {
  console.log('🔥 Spike test setup');
}

export function teardown(data) {
  console.log('🔥 Spike test teardown');
}`;
      case 'stress':
        return `
export function setup() {
  console.log('💪 Stress test setup');
}`;
      default:
        return `
export function setup() {
  console.log('⚡ Load test setup');
}`;
    }
  }

  /**
   * 执行k6测试
   */
  async executeK6Test(scriptPath, options) {
    return new Promise((resolve, reject) => {
      const args = [
        'run',
        '--out', 'json=results.json',
        '--summary-trend-stats', 'avg,min,med,max,p(90),p(95),p(99)',
        scriptPath
      ];

      // 🌐 设置代理环境变量
      const env = { ...process.env };
      if (options.proxy && options.proxy.enabled) {
        const proxyUrl = options.proxy.username && options.proxy.password
          ? `${options.proxy.type}://${options.proxy.username}:${options.proxy.password}@${options.proxy.host}:${options.proxy.port}`
          : `${options.proxy.type}://${options.proxy.host}:${options.proxy.port}`;

        // 设置k6代理环境变量
        env.HTTP_PROXY = proxyUrl;
        env.HTTPS_PROXY = proxyUrl;
        env.http_proxy = proxyUrl;
        env.https_proxy = proxyUrl;

        console.log(`🌐 Setting proxy environment variables: ${proxyUrl.replace(/////.*:.*@/, '//***:***@')}`);
      }

      console.log(`🎯 Executing: k6 ${args.join(' ')}`);

      const k6Process = spawn('k6', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: env // 🌐 传递包含代理配置的环境变量
      });

      let stdout = '';
      let stderr = '';

      k6Process.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(`k6 stdout: ${data}`);
      });

      k6Process.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(`k6 stderr: ${data}`);
      });

      k6Process.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            stdout,
            stderr,
            exitCode: code
          });
        } else {
          reject(new Error(`k6 process exited with code ${code}: ${stderr}`));
        }
      });

      k6Process.on('error', (error) => {
        reject(new Error(`Failed to start k6 process: ${error.message}`));
      });
    });
  }

  /**
   * 解析k6测试结果
   */
  parseK6Results(result) {
    try {
      // 从stdout解析结果
      const lines = result.stdout.split('/n');
      const summaryData = {};

      // 解析关键指标
      for (const line of lines) {
        // 解析响应时间指标
        if (line.includes('http_req_duration')) {
          const avgMatch = line.match(/avg=([0-9.]+)ms/);
          const minMatch = line.match(/min=([0-9.]+)ms/);
          const maxMatch = line.match(/max=([0-9.]+)ms/);
          const p50Match = line.match(/p/(50/)=([0-9.]+)ms/);
          const p90Match = line.match(/p/(90/)=([0-9.]+)ms/);
          const p95Match = line.match(/p/(95/)=([0-9.]+)ms/);
          const p99Match = line.match(/p/(99/)=([0-9.]+)ms/);

          if (avgMatch) summaryData.avgResponseTime = parseFloat(avgMatch[1]);
          if (minMatch) summaryData.minResponseTime = parseFloat(minMatch[1]);
          if (maxMatch) summaryData.maxResponseTime = parseFloat(maxMatch[1]);
          if (p50Match) summaryData.p50ResponseTime = parseFloat(p50Match[1]);
          if (p90Match) summaryData.p90ResponseTime = parseFloat(p90Match[1]);
          if (p95Match) summaryData.p95ResponseTime = parseFloat(p95Match[1]);
          if (p99Match) summaryData.p99ResponseTime = parseFloat(p99Match[1]);
        }

        // 解析请求总数和TPS
        if (line.includes('http_reqs')) {
          const totalMatch = line.match(/([0-9]+)/);
          const rateMatch = line.match(/([0-9.]+)//s/);
          if (totalMatch) summaryData.totalRequests = parseInt(totalMatch[1]);
          if (rateMatch) summaryData.requestsPerSecond = parseFloat(rateMatch[1]);
        }

        // 解析错误率
        if (line.includes('http_req_failed')) {
          const match = line.match(/([0-9.]+)%/);
          if (match) {
            summaryData.errorRate = parseFloat(match[1]);
          }
        }

        // 解析虚拟用户数
        if (line.includes('vus')) {
          const match = line.match(/([0-9]+)/);
          if (match) {
            summaryData.maxVirtualUsers = parseInt(match[1]);
          }
        }

        // 解析数据传输量
        if (line.includes('data_received')) {
          const match = line.match(/([0-9.]+)/s*([KMGT]?B)/);
          if (match) {
            const value = parseFloat(match[1]);
            const unit = match[2];
            let bytes = value;
            if (unit.includes('K')) bytes *= 1024;
            else if (unit.includes('M')) bytes *= 1024 * 1024;
            else if (unit.includes('G')) bytes *= 1024 * 1024 * 1024;
            summaryData.dataReceived = bytes;
          }
        }

        if (line.includes('data_sent')) {
          const match = line.match(/([0-9.]+)/s*([KMGT]?B)/);
          if (match) {
            const value = parseFloat(match[1]);
            const unit = match[2];
            let bytes = value;
            if (unit.includes('K')) bytes *= 1024;
            else if (unit.includes('M')) bytes *= 1024 * 1024;
            else if (unit.includes('G')) bytes *= 1024 * 1024 * 1024;
            summaryData.dataSent = bytes;
          }
        }
      }

      // 计算衍生指标
      const totalRequests = summaryData.totalRequests || 0;
      const errorRate = summaryData.errorRate || 0;
      const successfulRequests = Math.round(totalRequests * (1 - errorRate / 100));
      const failedRequests = totalRequests - successfulRequests;
      const currentTPS = summaryData.requestsPerSecond || 0;
      const peakTPS = Math.round(currentTPS * 1.2); // 估算峰值TPS

      return {
        success: true,
        status: 'completed',
        metrics: {
          totalRequests,
          successfulRequests,
          failedRequests,
          averageResponseTime: summaryData.avgResponseTime || 0,
          minResponseTime: summaryData.minResponseTime || 0,
          maxResponseTime: summaryData.maxResponseTime || 0,
          p50ResponseTime: summaryData.p50ResponseTime || 0,
          p90ResponseTime: summaryData.p90ResponseTime || 0,
          p95ResponseTime: summaryData.p95ResponseTime || 0,
          p99ResponseTime: summaryData.p99ResponseTime || 0,
          errorRate: errorRate,
          currentTPS: currentTPS,
          peakTPS: peakTPS,
          requestsPerSecond: currentTPS,
          throughput: totalRequests,
          activeUsers: summaryData.maxVirtualUsers || 0,
          dataReceived: summaryData.dataReceived || 0,
          dataSent: summaryData.dataSent || 0,
          errorBreakdown: this.parseErrorBreakdown(result.stdout)
        },
        rawOutput: result.stdout,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to parse k6 results:', error);
      return {
        success: false,
        error: error.message,
        rawOutput: result.stdout
      };
    }
  }

  /**
   * 解析错误类型分布
   */
  parseErrorBreakdown(stdout) {
    const errorBreakdown = {};
    const lines = stdout.split('/n');

    for (const line of lines) {
      // 查找错误相关的行
      if (line.includes('ERRO') || line.includes('ERROR') || line.includes('Failed')) {
        // 简单的错误分类
        if (line.includes('timeout') || line.includes('Timeout')) {
          errorBreakdown['TIMEOUT'] = (errorBreakdown['TIMEOUT'] || 0) + 1;
        } else if (line.includes('connection') || line.includes('Connection')) {
          errorBreakdown['CONNECTION_ERROR'] = (errorBreakdown['CONNECTION_ERROR'] || 0) + 1;
        } else if (line.includes('500')) {
          errorBreakdown['HTTP_500'] = (errorBreakdown['HTTP_500'] || 0) + 1;
        } else if (line.includes('404')) {
          errorBreakdown['HTTP_404'] = (errorBreakdown['HTTP_404'] || 0) + 1;
        } else {
          errorBreakdown['OTHER_ERROR'] = (errorBreakdown['OTHER_ERROR'] || 0) + 1;
        }
      }
    }

    return errorBreakdown;
  }

  /**
   * 执行命令
   */
  async executeCommand(command, args) {
    return new Promise((resolve) => {
      const process = spawn(command, args, { stdio: 'pipe' });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code
        });
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });
    });
  }

  /**
   * 停止测试
   */
  async stopTest(testId) {
    const test = this.activeTests.get(testId);
    if (test && test.process) {
      test.process.kill('SIGTERM');
      this.activeTests.delete(testId);
      return true;
    }
    return false;
  }

  /**
   * 获取测试状态
   */
  getTestStatus(testId) {
    const test = this.activeTests.get(testId);
    return test ? test.status : 'not_found';
  }
}

module.exports = RealK6Engine;
