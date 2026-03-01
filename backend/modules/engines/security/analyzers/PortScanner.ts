/**
 * 端口扫描器
 * 提供 TCP 端口扫描能力，用于安全测试中的服务发现和端口暴露检测
 * 支持常见端口扫描、自定义端口范围、服务指纹识别
 */

import net from 'net';
import { URL } from 'url';
import Logger from '../../../utils/logger';

export interface PortScanOptions {
  /** 目标主机（域名或 IP） */
  host: string;
  /** 要扫描的端口列表（不指定则使用常见端口） */
  ports?: number[];
  /** 端口范围起始 */
  portRangeStart?: number;
  /** 端口范围结束 */
  portRangeEnd?: number;
  /** 单个端口连接超时 (ms) */
  timeout?: number;
  /** 最大并发连接数 */
  concurrency?: number;
  /** 进度回调 */
  onProgress?: (scanned: number, total: number, found: PortResult[]) => void;
}

export interface PortResult {
  /** 端口号 */
  port: number;
  /** 端口状态 */
  state: 'open' | 'closed' | 'filtered';
  /** 识别到的服务名称 */
  service?: string;
  /** 服务版本（如果能获取到 banner） */
  banner?: string;
  /** 扫描耗时 (ms) */
  latency: number;
  /** 安全风险等级 */
  risk?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  /** 风险描述 */
  riskDescription?: string;
}

export interface PortScanResult {
  /** 目标主机 */
  host: string;
  /** 扫描的端口总数 */
  totalScanned: number;
  /** 开放端口数 */
  openPorts: number;
  /** 过滤端口数 */
  filteredPorts: number;
  /** 各端口详情 */
  ports: PortResult[];
  /** 安全评分 (0-100) */
  score: number;
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** 安全建议 */
  recommendations: string[];
  /** 扫描耗时 (ms) */
  duration: number;
  /** 扫描时间戳 */
  timestamp: string;
}

/** 常见端口及其服务映射 */
const COMMON_PORTS: Record<
  number,
  { service: string; risk: PortResult['risk']; description: string }
> = {
  21: { service: 'FTP', risk: 'high', description: 'FTP 服务暴露，可能存在匿名访问或弱密码风险' },
  22: {
    service: 'SSH',
    risk: 'medium',
    description: 'SSH 服务暴露，确保使用密钥认证并禁用 root 登录',
  },
  23: {
    service: 'Telnet',
    risk: 'critical',
    description: 'Telnet 明文传输，强烈建议禁用并使用 SSH 替代',
  },
  25: { service: 'SMTP', risk: 'medium', description: 'SMTP 服务暴露，确保配置了认证和 TLS' },
  53: { service: 'DNS', risk: 'low', description: 'DNS 服务暴露，确保禁用区域传送' },
  80: { service: 'HTTP', risk: 'low', description: 'HTTP 服务，建议强制跳转到 HTTPS' },
  110: { service: 'POP3', risk: 'medium', description: 'POP3 服务暴露，建议使用 POP3S (995)' },
  135: { service: 'MSRPC', risk: 'high', description: 'Windows RPC 服务暴露，高风险' },
  139: { service: 'NetBIOS', risk: 'high', description: 'NetBIOS 服务暴露，可能泄露系统信息' },
  143: { service: 'IMAP', risk: 'medium', description: 'IMAP 服务暴露，建议使用 IMAPS (993)' },
  443: { service: 'HTTPS', risk: 'none', description: 'HTTPS 服务，正常' },
  445: {
    service: 'SMB',
    risk: 'critical',
    description: 'SMB 服务暴露，高危漏洞风险（如 EternalBlue）',
  },
  993: { service: 'IMAPS', risk: 'none', description: 'IMAPS 加密邮件服务' },
  995: { service: 'POP3S', risk: 'none', description: 'POP3S 加密邮件服务' },
  1433: {
    service: 'MSSQL',
    risk: 'critical',
    description: 'SQL Server 端口暴露，数据库不应对外开放',
  },
  1521: {
    service: 'Oracle',
    risk: 'critical',
    description: 'Oracle 数据库端口暴露，数据库不应对外开放',
  },
  3306: { service: 'MySQL', risk: 'critical', description: 'MySQL 端口暴露，数据库不应对外开放' },
  3389: { service: 'RDP', risk: 'high', description: '远程桌面服务暴露，建议限制 IP 或使用 VPN' },
  5432: {
    service: 'PostgreSQL',
    risk: 'critical',
    description: 'PostgreSQL 端口暴露，数据库不应对外开放',
  },
  5900: { service: 'VNC', risk: 'high', description: 'VNC 远程桌面暴露，建议限制访问' },
  6379: { service: 'Redis', risk: 'critical', description: 'Redis 端口暴露，可能存在未授权访问' },
  8080: { service: 'HTTP-Alt', risk: 'low', description: 'HTTP 备用端口，可能是开发/管理界面' },
  8443: { service: 'HTTPS-Alt', risk: 'low', description: 'HTTPS 备用端口' },
  9200: { service: 'Elasticsearch', risk: 'high', description: 'Elasticsearch 暴露，可能泄露数据' },
  9300: { service: 'ES-Transport', risk: 'high', description: 'Elasticsearch 传输端口暴露' },
  27017: {
    service: 'MongoDB',
    risk: 'critical',
    description: 'MongoDB 端口暴露，数据库不应对外开放',
  },
  11211: {
    service: 'Memcached',
    risk: 'high',
    description: 'Memcached 暴露，可能被利用进行 DDoS 放大攻击',
  },
};

/** 默认扫描的常见端口列表 */
const DEFAULT_SCAN_PORTS = [
  21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 993, 995, 1433, 1521, 3306, 3389, 5432,
  5900, 6379, 8080, 8443, 9200, 27017,
];

class PortScanner {
  /**
   * 从 URL 中提取主机名
   */
  static extractHost(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return url;
    }
  }

  /**
   * 扫描单个端口
   */
  private static scanPort(host: string, port: number, timeout: number): Promise<PortResult> {
    return new Promise(resolve => {
      const startTime = Date.now();
      const socket = new net.Socket();
      let banner = '';

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        const latency = Date.now() - startTime;
        const portInfo = COMMON_PORTS[port];
        let resolved = false;

        // 尝试读取 banner
        socket.once('data', (data: Buffer) => {
          banner = data.toString('utf8', 0, Math.min(data.length, 256)).trim();
          socket.destroy();
          if (!resolved) {
            resolved = true;
            resolve({
              port,
              state: 'open',
              service: portInfo?.service || this.guessService(port),
              banner: banner || undefined,
              latency,
              risk: portInfo?.risk || 'low',
              riskDescription: portInfo?.description,
            });
          }
        });

        // 给 banner 读取一点时间，超时后不等了
        setTimeout(() => {
          socket.destroy();
          if (!resolved) {
            resolved = true;
            resolve({
              port,
              state: 'open',
              service: portInfo?.service || this.guessService(port),
              banner: banner || undefined,
              latency,
              risk: portInfo?.risk || 'low',
              riskDescription: portInfo?.description,
            });
          }
        }, 500);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          port,
          state: 'filtered',
          latency: Date.now() - startTime,
        });
      });

      socket.on('error', (err: NodeJS.ErrnoException) => {
        socket.destroy();
        const latency = Date.now() - startTime;

        if (err.code === 'ECONNREFUSED') {
          resolve({ port, state: 'closed', latency });
        } else {
          resolve({ port, state: 'filtered', latency });
        }
      });

      socket.connect(port, host);
    });
  }

  /**
   * 猜测端口对应的服务
   */
  private static guessService(port: number): string {
    if (port >= 8000 && port <= 9999) return 'HTTP-Alt';
    if (port >= 49152) return 'Dynamic/Private';
    return 'unknown';
  }

  /**
   * 执行端口扫描
   */
  static async scan(options: PortScanOptions): Promise<PortScanResult> {
    const startTime = Date.now();
    const host = options.host;
    const timeout = options.timeout || 3000;
    const concurrency = options.concurrency || 10;

    // 确定要扫描的端口列表
    let ports: number[];
    if (options.ports && options.ports.length > 0) {
      ports = [...new Set(options.ports)].sort((a, b) => a - b);
    } else if (options.portRangeStart !== undefined && options.portRangeEnd !== undefined) {
      ports = [];
      const start = Math.max(1, options.portRangeStart);
      const end = Math.min(65535, options.portRangeEnd);
      for (let p = start; p <= end; p++) {
        ports.push(p);
      }
    } else {
      ports = [...DEFAULT_SCAN_PORTS];
    }

    Logger.info(`🔍 开始端口扫描: ${host} (${ports.length} 个端口)`);

    const results: PortResult[] = [];
    let scanned = 0;

    // 分批并发扫描
    for (let i = 0; i < ports.length; i += concurrency) {
      const batch = ports.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(port => this.scanPort(host, port, timeout)));
      results.push(...batchResults);
      scanned += batch.length;

      if (options.onProgress) {
        const openSoFar = results.filter(r => r.state === 'open');
        options.onProgress(scanned, ports.length, openSoFar);
      }
    }

    const openPorts = results.filter(r => r.state === 'open');
    const filteredPorts = results.filter(r => r.state === 'filtered');
    const duration = Date.now() - startTime;

    // 计算安全评分
    const { score, riskLevel, recommendations } = this.assessSecurity(openPorts);

    Logger.info(
      `✅ 端口扫描完成: ${host} - ${openPorts.length} 开放, ${filteredPorts.length} 过滤, 耗时 ${duration}ms`
    );

    return {
      host,
      totalScanned: ports.length,
      openPorts: openPorts.length,
      filteredPorts: filteredPorts.length,
      ports: results.filter(r => r.state === 'open' || r.state === 'filtered'),
      score,
      riskLevel,
      recommendations,
      duration,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 快速扫描（仅扫描最常见的高危端口）
   */
  static async quickScan(host: string): Promise<PortScanResult> {
    const criticalPorts = [21, 22, 23, 25, 80, 443, 445, 1433, 3306, 3389, 5432, 6379, 8080, 27017];
    return this.scan({ host, ports: criticalPorts, timeout: 2000, concurrency: 7 });
  }

  /**
   * 从 URL 快速扫描
   */
  static async scanFromUrl(url: string): Promise<PortScanResult> {
    const host = this.extractHost(url);
    return this.quickScan(host);
  }

  /**
   * 安全评估
   */
  private static assessSecurity(openPorts: PortResult[]): {
    score: number;
    riskLevel: PortScanResult['riskLevel'];
    recommendations: string[];
  } {
    let score = 100;
    const recommendations: string[] = [];

    for (const port of openPorts) {
      const info = COMMON_PORTS[port.port];
      if (!info) continue;

      switch (info.risk) {
        case 'critical':
          score -= 25;
          recommendations.push(
            `[严重] 关闭端口 ${port.port} (${info.service}): ${info.description}`
          );
          break;
        case 'high':
          score -= 15;
          recommendations.push(
            `[高危] 限制端口 ${port.port} (${info.service}): ${info.description}`
          );
          break;
        case 'medium':
          score -= 8;
          recommendations.push(
            `[中危] 加固端口 ${port.port} (${info.service}): ${info.description}`
          );
          break;
        case 'low':
          score -= 3;
          break;
      }
    }

    // 检查数据库端口暴露
    const dbPorts = openPorts.filter(p =>
      [3306, 5432, 1433, 1521, 27017, 6379, 9200].includes(p.port)
    );
    if (dbPorts.length > 0) {
      recommendations.unshift(
        `⚠️ 检测到 ${dbPorts.length} 个数据库/缓存端口对外暴露，这是最高优先级安全风险`
      );
    }

    // 检查明文协议
    const plaintextPorts = openPorts.filter(p => [21, 23, 110, 143].includes(p.port));
    if (plaintextPorts.length > 0) {
      recommendations.push(
        `建议将明文协议 (${plaintextPorts.map(p => COMMON_PORTS[p.port]?.service).join(', ')}) 升级为加密版本`
      );
    }

    // 检查远程管理端口
    const remotePorts = openPorts.filter(p => [3389, 5900, 22].includes(p.port));
    if (remotePorts.length > 1) {
      recommendations.push('检测到多个远程管理端口开放，建议仅保留一个并通过 VPN 访问');
    }

    score = Math.max(0, score);

    let riskLevel: PortScanResult['riskLevel'];
    if (score >= 80) riskLevel = 'low';
    else if (score >= 60) riskLevel = 'medium';
    else if (score >= 40) riskLevel = 'high';
    else riskLevel = 'critical';

    if (recommendations.length === 0) {
      recommendations.push('端口暴露情况良好，未发现明显风险');
    }

    return { score, riskLevel, recommendations };
  }
}

export default PortScanner;
