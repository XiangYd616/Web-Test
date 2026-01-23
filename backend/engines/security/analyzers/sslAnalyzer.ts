/**
 * SSL/TLS安全分析器
 * 检测SSL证书、加密套件、协议版本等安全配置
 */

import * as tls from 'tls';
import { URL } from 'url';

interface SSLCertificate {
  valid: boolean;
  protocol: string;
  cipher: string;
  issuer: string;
  subject: string;
  expiresAt: Date;
  daysUntilExpiry: number;
  fingerprint: string;
  serial: string;
  selfSigned: boolean;
  issues: string[];
}

interface SSLVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  remediation: string;
  evidence?: string;
}

interface SSLAnalysisResult {
  url: string;
  timestamp: Date;
  httpsEnabled: boolean;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  certificate: SSLCertificate;
  protocol: {
    version: string;
    secure: boolean;
    issues: string[];
  };
  cipher: {
    name: string;
    secure: boolean;
    keySize: number;
    issues: string[];
  };
  vulnerabilities: SSLVulnerability[];
  recommendations: SSLRecommendation[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
}

interface SSLRecommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  category: string;
  effort: 'low' | 'medium' | 'high';
  examples: CodeExample[];
}

interface CodeExample {
  title: string;
  language: string;
  code: string;
  explanation: string;
}

class SSLAnalyzer {
  private name: string;
  private timeout: number;

  constructor() {
    this.name = 'ssl';
    this.timeout = 30000;
  }

  /**
   * 分析SSL/TLS配置
   */
  async analyze(
    url: string,
    options: {
      timeout?: number;
      checkProtocols?: boolean;
      checkCiphers?: boolean;
      checkCertificate?: boolean;
    } = {}
  ): Promise<SSLAnalysisResult> {
    const {
      timeout = this.timeout,
      checkProtocols = true,
      checkCiphers = true,
      checkCertificate = true,
    } = options;

    const timestamp = new Date();

    try {
      const urlObj = new URL(url);

      // 如果不是HTTPS，直接返回
      if (urlObj.protocol.toLowerCase() !== 'https:') {
        return {
          url,
          timestamp,
          httpsEnabled: false,
          score: 0,
          grade: 'F',
          certificate: this.createEmptyCertificate(),
          protocol: {
            version: 'none',
            secure: false,
            issues: ['未启用HTTPS'],
          },
          cipher: {
            name: 'none',
            secure: false,
            keySize: 0,
            issues: ['未启用HTTPS'],
          },
          vulnerabilities: [
            {
              type: 'ssl',
              severity: 'critical',
              description: '未启用HTTPS加密',
              impact: '所有通信都是明文传输，存在窃听和篡改风险',
              remediation: '启用SSL/TLS加密',
            },
          ],
          recommendations: [
            {
              priority: 'high',
              title: '启用HTTPS',
              description: '配置SSL证书启用HTTPS加密传输',
              category: 'encryption',
              effort: 'medium',
              examples: [
                {
                  title: 'Nginx配置',
                  language: 'nginx',
                  code: `server {
    listen 443 ssl;
    server_name example.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
}`,
                  explanation: '配置Nginx启用HTTPS',
                },
              ],
            },
          ],
          summary: {
            totalIssues: 1,
            criticalIssues: 1,
            highIssues: 0,
            mediumIssues: 0,
            lowIssues: 0,
          },
        };
      }

      // 获取SSL证书信息
      const port = Number(urlObj.port) || 443;

      const certificate = checkCertificate
        ? await this.getCertificate(urlObj.hostname, port, timeout)
        : this.createEmptyCertificate();

      // 分析协议版本
      const protocol = checkProtocols
        ? await this.analyzeProtocol(urlObj.hostname, port)
        : {
            version: certificate.protocol,
            secure: this.isSecureProtocol(certificate.protocol),
            issues: [],
          };

      // 分析加密套件
      const cipher = checkCiphers
        ? await this.analyzeCipher(urlObj.hostname, port)
        : {
            name: certificate.cipher,
            secure: this.isSecureCipher(certificate.cipher),
            keySize: this.getCipherKeySize(certificate.cipher),
            issues: [],
          };

      // 检测漏洞
      const vulnerabilities = this.detectVulnerabilities(certificate, protocol, cipher);

      // 生成建议
      const recommendations = this.generateRecommendations(
        vulnerabilities,
        certificate,
        protocol,
        cipher
      );

      // 计算分数
      const score = this.calculateScore(certificate, protocol, cipher, vulnerabilities);

      // 生成摘要
      const summary = this.generateSummary(vulnerabilities);

      return {
        url,
        timestamp,
        httpsEnabled: true,
        score,
        grade: this.getGrade(score),
        certificate,
        protocol,
        cipher,
        vulnerabilities,
        recommendations,
        summary,
      };
    } catch (error) {
      throw new Error(`SSL分析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取SSL证书信息
   */
  private async getCertificate(
    hostname: string,
    port: number,
    timeout: number
  ): Promise<SSLCertificate> {
    return new Promise((resolve, reject) => {
      const socket = tls.connect(
        {
          host: hostname,
          port,
          servername: hostname,
        },
        () => {
          const cert = socket.getPeerCertificate(true);

          if (!cert) {
            resolve(this.createEmptyCertificate());
            return;
          }

          const expiresAt = new Date(cert.valid_to);
          const daysUntilExpiry = Math.ceil(
            (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          const selfSigned = cert.issuer === cert.subject;

          const issues: string[] = [];

          if (!socket.authorized) {
            issues.push('证书验证失败');
          }

          if (selfSigned) {
            issues.push('使用自签名证书');
          }

          if (daysUntilExpiry < 30) {
            issues.push(`证书将在${daysUntilExpiry}天内过期`);
          }

          if (daysUntilExpiry < 0) {
            issues.push('证书已过期');
          }

          resolve({
            valid: socket.authorized || true,
            protocol: socket.getProtocol() || 'unknown',
            cipher: socket.getCipher()?.name || 'unknown',
            issuer: cert.issuer?.CN || '',
            subject: cert.subject?.CN || '',
            expiresAt,
            daysUntilExpiry,
            fingerprint: cert.fingerprint || '',
            serial: cert.serialNumber || '',
            selfSigned,
            issues,
          });
        }
      );

      socket.on('error', error => {
        reject(error);
      });

      socket.setTimeout(timeout, () => {
        socket.destroy();
        reject(new Error('SSL连接超时'));
      });
    });
  }

  /**
   * 分析协议版本
   */
  private async analyzeProtocol(
    hostname: string,
    port: number
  ): Promise<{
    version: string;
    secure: boolean;
    issues: string[];
  }> {
    const insecureProtocols = ['SSLv2', 'SSLv3', 'TLSv1', 'TLSv1.1'];
    const issues: string[] = [];

    try {
      // 测试支持的协议版本
      const supportedProtocols = await this.testProtocols(hostname, port);
      const currentProtocol = supportedProtocols[supportedProtocols.length - 1] || 'unknown';

      // 检查是否支持不安全的协议
      const supportedInsecure = supportedProtocols.filter(p => insecureProtocols.includes(p));
      if (supportedInsecure.length > 0) {
        issues.push(`支持不安全协议: ${supportedInsecure.join(', ')}`);
      }

      // 检查当前协议是否安全
      if (!this.isSecureProtocol(currentProtocol)) {
        issues.push(`当前协议不安全: ${currentProtocol}`);
      }

      // 检查是否支持TLS 1.3
      if (!supportedProtocols.includes('TLSv1.3')) {
        issues.push('未支持TLS 1.3协议');
      }

      return {
        version: currentProtocol,
        secure: this.isSecureProtocol(currentProtocol),
        issues,
      };
    } catch {
      return {
        version: 'unknown',
        secure: false,
        issues: ['无法检测协议版本'],
      };
    }
  }

  /**
   * 测试支持的协议版本
   */
  private async testProtocols(hostname: string, port: number): Promise<string[]> {
    const protocols = ['TLSv1.3', 'TLSv1.2', 'TLSv1.1', 'TLSv1', 'SSLv3'];
    const supported: string[] = [];

    for (const protocol of protocols) {
      try {
        await this.testProtocol(hostname, port, protocol);
        supported.push(protocol);
      } catch {
        // 协议不支持
      }
    }

    return supported;
  }

  /**
   * 测试特定协议
   */
  private testProtocol(hostname: string, port: number, protocol: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = tls.connect(
        {
          host: hostname,
          port,
          servername: hostname,
          secureProtocol: protocol,
        },
        () => {
          socket.destroy();
          resolve();
        }
      );

      socket.on('error', error => {
        reject(error);
      });

      socket.setTimeout(5000, () => {
        socket.destroy();
        reject(new Error('协议测试超时'));
      });
    });
  }

  /**
   * 分析加密套件
   */
  private async analyzeCipher(
    hostname: string,
    port: number
  ): Promise<{
    name: string;
    secure: boolean;
    keySize: number;
    issues: string[];
  }> {
    const insecureCiphers = [
      'RC4',
      'DES',
      '3DES',
      'MD5',
      'NULL',
      'AES128',
      'AES256', // 需要检查密钥长度
    ];

    const issues: string[] = [];

    try {
      const socket = await this.createSecureConnection(hostname, port);
      const cipher = socket.getCipher();

      if (!cipher) {
        return {
          name: 'unknown',
          secure: false,
          keySize: 0,
          issues: ['无法获取加密套件信息'],
        };
      }

      const cipherName = cipher.name;
      const keySize = this.getCipherKeySize(cipherName);

      // 检查加密套件安全性
      if (insecureCiphers.some(insecure => cipherName.includes(insecure))) {
        issues.push(`使用不安全加密套件: ${cipherName}`);
      }

      // 检查密钥长度
      if (keySize < 128) {
        issues.push(`密钥长度不足: ${keySize}位`);
      } else if (keySize < 256) {
        issues.push(`密钥长度建议升级: ${keySize}位`);
      }

      // 检查是否使用强加密套件
      if (!this.isSecureCipher(cipherName)) {
        issues.push(`加密套件不够强: ${cipherName}`);
      }

      socket.destroy();

      return {
        name: cipherName,
        secure: this.isSecureCipher(cipherName),
        keySize,
        issues,
      };
    } catch {
      return {
        name: 'unknown',
        secure: false,
        keySize: 0,
        issues: ['无法分析加密套件'],
      };
    }
  }

  /**
   * 创建安全连接
   */
  private createSecureConnection(hostname: string, port: number): Promise<tls.TLSSocket> {
    return new Promise((resolve, reject) => {
      const socket = tls.connect(
        {
          host: hostname,
          port,
          servername: hostname,
        },
        () => {
          resolve(socket);
        }
      );

      socket.on('error', error => {
        reject(error);
      });

      socket.setTimeout(5000, () => {
        socket.destroy();
        reject(new Error('连接超时'));
      });
    });
  }

  /**
   * 检测漏洞
   */
  private detectVulnerabilities(
    certificate: SSLCertificate,
    protocol: { version: string; secure: boolean; issues: string[] },
    cipher: { name: string; secure: boolean; keySize: number; issues: string[] }
  ): SSLVulnerability[] {
    const vulnerabilities: SSLVulnerability[] = [];

    // 证书相关漏洞
    if (!certificate.valid) {
      vulnerabilities.push({
        type: 'certificate',
        severity: 'critical',
        description: 'SSL证书无效',
        impact: '无法建立安全的HTTPS连接',
        remediation: '安装有效的SSL证书',
      });
    }

    if (certificate.selfSigned) {
      vulnerabilities.push({
        type: 'certificate',
        severity: 'medium',
        description: '使用自签名证书',
        impact: '浏览器会显示安全警告',
        remediation: '使用受信任的CA签发的证书',
      });
    }

    if (certificate.daysUntilExpiry < 0) {
      vulnerabilities.push({
        type: 'certificate',
        severity: 'critical',
        description: 'SSL证书已过期',
        impact: '无法建立安全连接',
        remediation: '更新SSL证书',
      });
    } else if (certificate.daysUntilExpiry < 30) {
      vulnerabilities.push({
        type: 'certificate',
        severity: 'high',
        description: `SSL证书即将过期 (${certificate.daysUntilExpiry}天)`,
        impact: '证书过期后服务将不可用',
        remediation: '及时更新SSL证书',
      });
    }

    // 协议相关漏洞
    if (!protocol.secure) {
      vulnerabilities.push({
        type: 'protocol',
        severity: 'high',
        description: `使用不安全的TLS协议: ${protocol.version}`,
        impact: '存在已知安全漏洞',
        remediation: '升级到TLS 1.2或更高版本',
      });
    }

    // 加密套件相关漏洞
    if (!cipher.secure) {
      vulnerabilities.push({
        type: 'cipher',
        severity: 'medium',
        description: `使用不安全的加密套件: ${cipher.name}`,
        impact: '加密强度不足',
        remediation: '使用强加密套件',
      });
    }

    if (cipher.keySize < 128) {
      vulnerabilities.push({
        type: 'cipher',
        severity: 'high',
        description: `密钥长度不足: ${cipher.keySize}位`,
        impact: '容易被暴力破解',
        remediation: '使用至少128位的密钥',
      });
    }

    return vulnerabilities;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    vulnerabilities: SSLVulnerability[],
    certificate: SSLCertificate,
    protocol: { version: string; secure: boolean; issues: string[] },
    cipher: { name: string; secure: boolean; keySize: number; issues: string[] }
  ): SSLRecommendation[] {
    const recommendations: SSLRecommendation[] = [];

    // 证书建议
    if (!certificate.valid || certificate.selfSigned) {
      recommendations.push({
        priority: 'high',
        title: '更新SSL证书',
        description: '安装有效的、受信任CA签发的SSL证书',
        category: 'certificate',
        effort: 'medium',
        examples: [
          {
            title: "Let's Encrypt证书",
            language: 'bash',
            code: `# 安装Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取免费证书
sudo certbot --nginx -d example.com -d www.example.com`,
            explanation: "使用Let's Encrypt获取免费SSL证书",
          },
        ],
      });
    }

    // 协议建议
    if (!protocol.secure || protocol.issues.length > 0) {
      recommendations.push({
        priority: 'high',
        title: '升级TLS协议',
        description: '禁用不安全的协议版本，启用TLS 1.2和TLS 1.3',
        category: 'protocol',
        effort: 'low',
        examples: [
          {
            title: 'Nginx协议配置',
            language: 'nginx',
            code: `ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;`,
            explanation: '配置安全的TLS协议版本',
          },
        ],
      });
    }

    // 加密套件建议
    if (!cipher.secure || cipher.keySize < 256) {
      recommendations.push({
        priority: 'medium',
        title: '强化加密套件',
        description: '使用强加密套件和足够长的密钥',
        category: 'cipher',
        effort: 'low',
        examples: [
          {
            title: 'Nginx加密套件配置',
            language: 'nginx',
            code: `ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;`,
            explanation: '配置强加密套件',
          },
        ],
      });
    }

    // HSTS建议
    recommendations.push({
      priority: 'medium',
      title: '启用HSTS',
      description: '强制使用HTTPS连接，防止协议降级攻击',
      category: 'security',
      effort: 'low',
      examples: [
        {
          title: 'HSTS配置',
          language: 'nginx',
          code: `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;`,
          explanation: '启用HTTP严格传输安全',
        },
      ],
    });

    return recommendations;
  }

  /**
   * 计算分数
   */
  private calculateScore(
    certificate: SSLCertificate,
    protocol: { version: string; secure: boolean; issues: string[] },
    cipher: { name: string; secure: boolean; keySize: number; issues: string[] },
    vulnerabilities: SSLVulnerability[]
  ): number {
    let score = 100;

    // 证书评分
    if (!certificate.valid) {
      score -= 40;
    } else if (certificate.selfSigned) {
      score -= 20;
    }

    if (certificate.daysUntilExpiry < 0) {
      score -= 30;
    } else if (certificate.daysUntilExpiry < 30) {
      score -= 15;
    }

    // 协议评分
    if (!protocol.secure) {
      score -= 25;
    } else if (protocol.version !== 'TLSv1.3') {
      score -= 10;
    }

    // 加密套件评分
    if (!cipher.secure) {
      score -= 20;
    } else if (cipher.keySize < 256) {
      score -= 10;
    }

    // 漏洞评分
    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    return Math.max(0, score);
  }

  /**
   * 生成摘要
   */
  private generateSummary(vulnerabilities: SSLVulnerability[]): {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  } {
    const summary = {
      totalIssues: vulnerabilities.length,
      criticalIssues: vulnerabilities.filter(v => v.severity === 'critical').length,
      highIssues: vulnerabilities.filter(v => v.severity === 'high').length,
      mediumIssues: vulnerabilities.filter(v => v.severity === 'medium').length,
      lowIssues: vulnerabilities.filter(v => v.severity === 'low').length,
    };

    return summary;
  }

  /**
   * 获取等级
   */
  private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 判断协议是否安全
   */
  private isSecureProtocol(protocol: string): boolean {
    const secureProtocols = ['TLSv1.2', 'TLSv1.3'];
    return secureProtocols.includes(protocol);
  }

  /**
   * 判断加密套件是否安全
   */
  private isSecureCipher(cipher: string): boolean {
    const insecurePatterns = ['RC4', 'DES', '3DES', 'MD5', 'NULL'];
    return !insecurePatterns.some(pattern => cipher.includes(pattern));
  }

  /**
   * 获取密钥长度
   */
  private getCipherKeySize(cipher: string): number {
    const keySizeMap: Record<string, number> = {
      AES128: 128,
      AES256: 256,
      CHACHA20: 256,
      CAMELLIA128: 128,
      CAMELLIA256: 256,
    };

    for (const [key, size] of Object.entries(keySizeMap)) {
      if (cipher.includes(key)) {
        return size;
      }
    }

    return 128; // 默认值
  }

  /**
   * 创建空证书
   */
  private createEmptyCertificate(): SSLCertificate {
    return {
      valid: false,
      protocol: 'none',
      cipher: 'none',
      issuer: '',
      subject: '',
      expiresAt: new Date(),
      daysUntilExpiry: 0,
      fingerprint: '',
      serial: '',
      selfSigned: false,
      issues: ['无法获取证书信息'],
    };
  }

  /**
   * 导出分析报告
   */
  exportReport(result: SSLAnalysisResult): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        result,
      },
      null,
      2
    );
  }
}

export default SSLAnalyzer;
