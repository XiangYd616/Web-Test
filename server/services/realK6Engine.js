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
      thresholds = {}
    } = config;

    console.log(`🚀 Starting k6 stress test: ${url}`);
    console.log(`📊 Config: ${vus} VUs, ${duration} duration, ${rampUpTime} ramp-up`);

    try {
      // 生成k6测试脚本
      const scriptPath = await this.generateK6Script({
        url,
        vus,
        duration,
        rampUpTime,
        testType,
        thresholds
      });

      // 执行k6测试
      const result = await this.executeK6Test(scriptPath, {
        vus,
        duration,
        rampUpTime
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
    const { url, testType, thresholds } = config;
    
    const script = `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '${config.rampUpTime}', target: ${config.vus} },
    { duration: '${config.duration}', target: ${config.vus} },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<${thresholds.responseTime || 5000}'],
    http_req_failed: ['rate<${thresholds.errorRate || 0.9}'],
    errors: ['rate<${thresholds.errorRate || 0.9}'],
    ...${JSON.stringify(thresholds.custom || {})}
  },
};

export default function() {
  const response = http.get('${url}', {
    headers: {
      'User-Agent': 'TestWebApp-k6/1.0',
    },
  });
  
  const result = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < ${thresholds.responseTime || 500}ms': (r) => r.timings.duration < ${thresholds.responseTime || 500},
    'content size > 0': (r) => r.body.length > 0,
  });
  
  errorRate.add(!result);
  
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

      console.log(`🎯 Executing: k6 ${args.join(' ')}`);

      const k6Process = spawn('k6', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
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
      const lines = result.stdout.split('\n');
      const summaryData = {};
      
      // 解析关键指标
      for (const line of lines) {
        if (line.includes('http_req_duration')) {
          const match = line.match(/avg=([0-9.]+)ms.*p\(95\)=([0-9.]+)ms/);
          if (match) {
            summaryData.avgResponseTime = parseFloat(match[1]);
            summaryData.p95ResponseTime = parseFloat(match[2]);
          }
        }
        
        if (line.includes('http_reqs')) {
          const match = line.match(/([0-9]+)/);
          if (match) {
            summaryData.totalRequests = parseInt(match[1]);
          }
        }
        
        if (line.includes('http_req_failed')) {
          const match = line.match(/([0-9.]+)%/);
          if (match) {
            summaryData.errorRate = parseFloat(match[1]);
          }
        }
      }

      return {
        success: true,
        summary: {
          totalRequests: summaryData.totalRequests || 0,
          avgResponseTime: summaryData.avgResponseTime || 0,
          p95ResponseTime: summaryData.p95ResponseTime || 0,
          errorRate: summaryData.errorRate || 0,
          throughput: summaryData.totalRequests ? (summaryData.totalRequests / 60) : 0
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
