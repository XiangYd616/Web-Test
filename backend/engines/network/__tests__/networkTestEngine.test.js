/**
 * 网络测试引擎单元测试
 * @description 测试网络延迟、带宽、DNS等网络性能功能
 */

const NetworkTestEngine = require('../networkTestEngine');
const dns = require('dns').promises;
const { exec } = require('child_process');
const net = require('net');

// Mock模块
jest.mock('dns');
jest.mock('child_process');
jest.mock('net');

describe('网络测试引擎', () => {
  let networkEngine;

  beforeEach(() => {
    networkEngine = new NetworkTestEngine();
    jest.clearAllMocks();
  });

  describe('引擎初始化', () => {
    test('应该正确初始化引擎', () => {
      expect(networkEngine.name).toBe('network');
      expect(networkEngine.version).toBeDefined();
      expect(networkEngine.description).toBeTruthy();
    });

    test('应该有默认配置', () => {
      expect(networkEngine.options).toBeDefined();
      expect(networkEngine.options.timeout).toBeDefined();
      expect(networkEngine.options.retries).toBeDefined();
    });
  });

  describe('Ping测试', () => {
    test('应该成功测量ping延迟', async () => {
      const mockExec = jest.fn((cmd, callback) => {
        callback(null, {
          stdout: 'time=25.3 ms\ntime=26.1 ms\ntime=24.8 ms',
          stderr: ''
        });
      });
      require('child_process').exec = mockExec;

      const result = await networkEngine.testPing('google.com');

      expect(result.success).toBe(true);
      expect(result.averageLatency).toBeDefined();
      expect(result.minLatency).toBeDefined();
      expect(result.maxLatency).toBeDefined();
    });

    test('应该处理ping失败', async () => {
      const mockExec = jest.fn((cmd, callback) => {
        callback(new Error('Host unreachable'), null);
      });
      require('child_process').exec = mockExec;

      const result = await networkEngine.testPing('unreachable-host.com');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('应该检测高延迟', async () => {
      const mockExec = jest.fn((cmd, callback) => {
        callback(null, {
          stdout: 'time=500 ms\ntime=520 ms\ntime=510 ms',
          stderr: ''
        });
      });
      require('child_process').exec = mockExec;

      const result = await networkEngine.testPing('slow-server.com');

      expect(result.averageLatency).toBeGreaterThan(400);
      expect(result.warnings).toContain('高延迟');
    });

    test('应该计算丢包率', async () => {
      const mockExec = jest.fn((cmd, callback) => {
        callback(null, {
          stdout: 'time=25 ms\nRequest timeout\ntime=26 ms',
          stderr: ''
        });
      });
      require('child_process').exec = mockExec;

      const result = await networkEngine.testPing('lossy-connection.com');

      expect(result.packetLoss).toBeGreaterThan(0);
    });
  });

  describe('DNS解析测试', () => {
    test('应该成功解析域名', async () => {
      dns.resolve4 = jest.fn().mockResolvedValue(['93.184.216.34']);
      dns.resolve6 = jest.fn().mockResolvedValue(['2606:2800:220:1:248:1893:25c8:1946']);

      const result = await networkEngine.testDNS('example.com');

      expect(result.success).toBe(true);
      expect(result.ipv4).toContain('93.184.216.34');
      expect(result.ipv6).toBeDefined();
      expect(result.resolutionTime).toBeDefined();
    });

    test('应该处理DNS解析失败', async () => {
      dns.resolve4 = jest.fn().mockRejectedValue(new Error('ENOTFOUND'));

      const result = await networkEngine.testDNS('nonexistent-domain-12345.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('ENOTFOUND');
    });

    test('应该测量DNS解析时间', async () => {
      dns.resolve4 = jest.fn(() =>
        new Promise(resolve => setTimeout(() => resolve(['1.2.3.4']), 50))
      );

      const result = await networkEngine.testDNS('example.com');

      expect(result.resolutionTime).toBeGreaterThan(0);
      expect(result.resolutionTime).toBeGreaterThan(40);
    });

    test('应该检测慢速DNS', async () => {
      dns.resolve4 = jest.fn(() =>
        new Promise(resolve => setTimeout(() => resolve(['1.2.3.4']), 2000))
      );

      const result = await networkEngine.testDNS('slow-dns.com');

      expect(result.warnings).toContain('DNS解析缓慢');
    });

    test('应该查询多种DNS记录类型', async () => {
      dns.resolveMx = jest.fn().mockResolvedValue([
        { exchange: 'mail.example.com', priority: 10 }
      ]);
      dns.resolveTxt = jest.fn().mockResolvedValue([['v=spf1 ~all']]);

      const result = await networkEngine.testDNS('example.com', {
        types: ['MX', 'TXT']
      });

      expect(result.mx).toBeDefined();
      expect(result.txt).toBeDefined();
    });
  });

  describe('端口扫描测试', () => {
    test('应该检测开放端口', async () => {
      const mockSocket = {
        connect: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'connect') {
            setTimeout(callback, 10);
          }
        }),
        destroy: jest.fn()
      };

      net.createConnection = jest.fn().mockReturnValue(mockSocket);

      const result = await networkEngine.scanPort('example.com', 80);

      expect(result.open).toBe(true);
      expect(result.port).toBe(80);
    });

    test('应该检测关闭端口', async () => {
      const mockSocket = {
        connect: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('ECONNREFUSED')), 10);
          }
        }),
        destroy: jest.fn()
      };

      net.createConnection = jest.fn().mockReturnValue(mockSocket);

      const result = await networkEngine.scanPort('example.com', 12345);

      expect(result.open).toBe(false);
    });

    test('应该扫描多个端口', async () => {
      const mockSocket = {
        connect: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'connect') {
            setTimeout(callback, 10);
          }
        }),
        destroy: jest.fn()
      };

      net.createConnection = jest.fn().mockReturnValue(mockSocket);

      const result = await networkEngine.scanPorts('example.com', [80, 443, 22]);

      expect(result.scannedPorts).toBe(3);
      expect(result.openPorts).toBeDefined();
      expect(result.closedPorts).toBeDefined();
    });
  });

  describe('带宽测试', () => {
    test('应该测量下载速度', async () => {
      const mockData = Buffer.alloc(1000000); // 1MB

      const result = await networkEngine.testBandwidth({
        testSize: 1000000,
        direction: 'download'
      });

      expect(result.downloadSpeed).toBeDefined();
      expect(result.downloadSpeed).toBeGreaterThan(0);
    });

    test('应该测量上传速度', async () => {
      const result = await networkEngine.testBandwidth({
        testSize: 500000,
        direction: 'upload'
      });

      expect(result.uploadSpeed).toBeDefined();
    });

    test('应该计算速度单位', () => {
      const speed = networkEngine.calculateSpeed(10000000, 1); // 10MB in 1s

      expect(speed.value).toBe(10);
      expect(speed.unit).toBe('MB/s');
    });

    test('应该检测低速连接', async () => {
      const result = await networkEngine.testBandwidth({
        testSize: 100000,
        expectedMinSpeed: 10 // 10 MB/s
      });

      if (result.downloadSpeed < 10) {
        expect(result.warnings).toContain('带宽不足');
      }
    });
  });

  describe('路由跟踪测试', () => {
    test('应该追踪网络路由', async () => {
      const mockExec = jest.fn((cmd, callback) => {
        callback(null, {
          stdout: `
            1  192.168.1.1  5ms
            2  10.0.0.1  15ms
            3  93.184.216.34  25ms
          `,
          stderr: ''
        });
      });
      require('child_process').exec = mockExec;

      const result = await networkEngine.traceRoute('example.com');

      expect(result.success).toBe(true);
      expect(result.hops).toBeDefined();
      expect(result.hops.length).toBeGreaterThan(0);
      expect(result.totalHops).toBe(3);
    });

    test('应该检测路由异常', async () => {
      const mockExec = jest.fn((cmd, callback) => {
        callback(null, {
          stdout: `
            1  192.168.1.1  5ms
            2  *  *  *
            3  *  *  *
          `,
          stderr: ''
        });
      });
      require('child_process').exec = mockExec;

      const result = await networkEngine.traceRoute('problematic.com');

      expect(result.warnings).toBeDefined();
      expect(result.timeouts).toBeGreaterThan(0);
    });
  });

  describe('网络质量评估', () => {
    test('应该评估网络质量', async () => {
      const metrics = {
        latency: 25,
        jitter: 5,
        packetLoss: 0,
        bandwidth: 100
      };

      const quality = networkEngine.assessQuality(metrics);

      expect(quality.rating).toBe('excellent');
      expect(quality.score).toBeGreaterThan(90);
    });

    test('应该识别差质量网络', async () => {
      const metrics = {
        latency: 500,
        jitter: 100,
        packetLoss: 10,
        bandwidth: 1
      };

      const quality = networkEngine.assessQuality(metrics);

      expect(quality.rating).toBe('poor');
      expect(quality.recommendations).toBeDefined();
    });

    test('应该计算抖动', async () => {
      const latencies = [20, 25, 22, 28, 24];
      
      const jitter = networkEngine.calculateJitter(latencies);

      expect(jitter).toBeDefined();
      expect(jitter).toBeGreaterThan(0);
    });
  });

  describe('HTTP连接测试', () => {
    test('应该测试HTTP连接', async () => {
      const result = await networkEngine.testHTTPConnection('https://example.com');

      expect(result).toBeDefined();
      expect(result.statusCode).toBeDefined();
      expect(result.connectionTime).toBeDefined();
    });

    test('应该测量TTFB（首字节时间）', async () => {
      const result = await networkEngine.testHTTPConnection('https://example.com');

      expect(result.ttfb).toBeDefined();
      expect(result.ttfb).toBeGreaterThan(0);
    });

    test('应该检测HTTP连接问题', async () => {
      const result = await networkEngine.testHTTPConnection('https://timeout.com', {
        timeout: 1000
      });

      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('完整测试执行', () => {
    test('应该返回标准化的测试结果', async () => {
      dns.resolve4 = jest.fn().mockResolvedValue(['1.2.3.4']);
      
      const mockExec = jest.fn((cmd, callback) => {
        callback(null, {
          stdout: 'time=25 ms',
          stderr: ''
        });
      });
      require('child_process').exec = mockExec;

      const result = await networkEngine.executeTest({
        target: 'example.com',
        tests: ['ping', 'dns']
      });

      expect(result.engine).toBe('network');
      expect(result.version).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.results).toBeDefined();
    });
  });

  describe('错误处理', () => {
    test('应该处理无效的目标主机', async () => {
      const result = await networkEngine.executeTest({
        target: ''
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('目标主机');
    });

    test('应该处理网络不可达', async () => {
      const mockExec = jest.fn((cmd, callback) => {
        callback(new Error('Network is unreachable'), null);
      });
      require('child_process').exec = mockExec;

      const result = await networkEngine.testPing('example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('unreachable');
    });
  });

  describe('优化建议', () => {
    test('应该为高延迟生成建议', () => {
      const metrics = { latency: 500 };
      
      const recommendations = networkEngine.generateRecommendations(metrics);

      expect(recommendations).toContain('优化网络路由');
    });

    test('应该为丢包生成建议', () => {
      const metrics = { packetLoss: 15 };
      
      const recommendations = networkEngine.generateRecommendations(metrics);

      expect(recommendations).toContain('检查网络连接');
    });

    test('应该为DNS问题生成建议', () => {
      const metrics = { dnsTime: 2000 };
      
      const recommendations = networkEngine.generateRecommendations(metrics);

      expect(recommendations).toContain('更换DNS服务器');
    });
  });
});

