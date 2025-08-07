/**
 * SSL/TLS安全检测器
 * 本地化程度：100%
 * 检测SSL证书、协议版本、密码套件等安全性
 */

const tls = require('tls');
const https = require('https');
const crypto = require('crypto');

class SSLAnalyzer {
  constructor() {
    // 安全协议版本
    this.secureProtocols = ['TLSv1.2', 'TLSv1.3'];
    this.insecureProtocols = ['SSLv2', 'SSLv3', 'TLSv1', 'TLSv1.1'];
    
    // 安全密码套件模式
    this.secureCipherPatterns = [
      /ECDHE.*AES.*GCM/,
      /ECDHE.*CHACHA20/,
      /DHE.*AES.*GCM/
    ];
    
    // 不安全密码套件模式
    this.insecureCipherPatterns = [
      /RC4/,
      /DES/,
      /MD5/,
      /NULL/,
      /EXPORT/,
      /anon/i
    ];
    
    // 弱密钥长度
    this.minimumKeyLengths = {
      'RSA': 2048,
      'DSA': 2048,
      'EC': 256
    };
  }

  /**
   * 执行SSL/TLS安全检测
   */
  async analyze(url) {
    try {
      console.log('🔒 开始SSL/TLS安全检测...');
      
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'https:') {
        return {
          vulnerabilities: [{
            type: 'ssl_not_used',
            severity: 'high',
            description: '网站未使用HTTPS协议',
            recommendation: '启用HTTPS以保护数据传输安全'
          }],
          summary: {
            riskLevel: 'high',
            httpsEnabled: false
          }
        };
      }
      
      const hostname = urlObj.hostname;
      const port = urlObj.port || 443;
      
      const results = {
        vulnerabilities: [],
        details: {
          certificate: null,
          protocols: null,
          ciphers: null,
          headers: null
        },
        summary: {
          riskLevel: 'low',
          httpsEnabled: true
        }
      };
      
      // 检测SSL证书
      const certAnalysis = await this.analyzeCertificate(hostname, port);
      results.details.certificate = certAnalysis;
      results.vulnerabilities.push(...certAnalysis.vulnerabilities);
      
      // 检测支持的协议
      const protocolAnalysis = await this.analyzeProtocols(hostname, port);
      results.details.protocols = protocolAnalysis;
      results.vulnerabilities.push(...protocolAnalysis.vulnerabilities);
      
      // 检测密码套件
      const cipherAnalysis = await this.analyzeCiphers(hostname, port);
      results.details.ciphers = cipherAnalysis;
      results.vulnerabilities.push(...cipherAnalysis.vulnerabilities);
      
      // 检测安全头
      const headerAnalysis = await this.analyzeSecurityHeaders(url);
      results.details.headers = headerAnalysis;
      results.vulnerabilities.push(...headerAnalysis.vulnerabilities);
      
      // 计算总体风险等级
      results.summary = this.calculateSummary(results.vulnerabilities);
      
      console.log(`✅ SSL/TLS检测完成，发现 ${results.vulnerabilities.length} 个安全问题`);
      
      return results;
    } catch (error) {
      console.error('❌ SSL/TLS检测失败:', error);
      throw error;
    }
  }

  /**
   * 分析SSL证书
   */
  async analyzeCertificate(hostname, port) {
    return new Promise((resolve) => {
      const vulnerabilities = [];
      let certificate = null;
      
      const options = {
        host: hostname,
        port: port,
        servername: hostname,
        rejectUnauthorized: false // 允许自签名证书以进行分析
      };
      
      const socket = tls.connect(options, () => {
        try {
          certificate = socket.getPeerCertificate(true);
          
          if (!certificate || Object.keys(certificate).length === 0) {
            vulnerabilities.push({
              type: 'no_certificate',
              severity: 'critical',
              description: '无法获取SSL证书',
              recommendation: '确保服务器配置了有效的SSL证书'
            });
            return resolve({ certificate: null, vulnerabilities });
          }
          
          // 检查证书有效期
          const now = new Date();
          const notBefore = new Date(certificate.valid_from);
          const notAfter = new Date(certificate.valid_to);
          
          if (now < notBefore) {
            vulnerabilities.push({
              type: 'certificate_not_yet_valid',
              severity: 'high',
              description: '证书尚未生效',
              details: { validFrom: certificate.valid_from },
              recommendation: '检查服务器时间设置'
            });
          }
          
          if (now > notAfter) {
            vulnerabilities.push({
              type: 'certificate_expired',
              severity: 'critical',
              description: '证书已过期',
              details: { expiredOn: certificate.valid_to },
              recommendation: '立即更新SSL证书'
            });
          } else {
            // 检查即将过期的证书
            const daysUntilExpiry = Math.floor((notAfter - now) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry <= 30) {
              vulnerabilities.push({
                type: 'certificate_expiring_soon',
                severity: 'medium',
                description: `证书将在${daysUntilExpiry}天后过期`,
                details: { expiresOn: certificate.valid_to, daysLeft: daysUntilExpiry },
                recommendation: '计划更新SSL证书'
              });
            }
          }
          
          // 检查证书主体名称
          const subjectAltNames = certificate.subjectaltname ? 
            certificate.subjectaltname.split(', ').map(name => name.replace('DNS:', '')) : [];
          const commonName = certificate.subject.CN;
          
          const validNames = [commonName, ...subjectAltNames].filter(Boolean);
          const hostnameMatches = validNames.some(name => {
            if (name.startsWith('*.')) {
              const domain = name.substring(2);
              return hostname.endsWith(domain) && hostname !== domain;
            }
            return name === hostname;
          });
          
          if (!hostnameMatches) {
            vulnerabilities.push({
              type: 'hostname_mismatch',
              severity: 'high',
              description: '证书主体名称与域名不匹配',
              details: { 
                hostname, 
                commonName, 
                subjectAltNames 
              },
              recommendation: '使用匹配域名的证书'
            });
          }
          
          // 检查证书密钥长度
          if (certificate.pubkey) {
            const keyInfo = this.analyzePublicKey(certificate.pubkey);
            if (keyInfo.isWeak) {
              vulnerabilities.push({
                type: 'weak_key',
                severity: 'high',
                description: `证书使用弱密钥: ${keyInfo.algorithm} ${keyInfo.length}位`,
                details: keyInfo,
                recommendation: `使用至少${this.minimumKeyLengths[keyInfo.algorithm]}位的${keyInfo.algorithm}密钥`
              });
            }
          }
          
          // 检查签名算法
          if (certificate.signatureAlgorithm) {
            if (certificate.signatureAlgorithm.includes('md5') || 
                certificate.signatureAlgorithm.includes('sha1')) {
              vulnerabilities.push({
                type: 'weak_signature_algorithm',
                severity: 'medium',
                description: `证书使用弱签名算法: ${certificate.signatureAlgorithm}`,
                details: { algorithm: certificate.signatureAlgorithm },
                recommendation: '使用SHA-256或更强的签名算法'
              });
            }
          }
          
          // 检查自签名证书
          if (certificate.issuer.CN === certificate.subject.CN) {
            vulnerabilities.push({
              type: 'self_signed_certificate',
              severity: 'medium',
              description: '使用自签名证书',
              recommendation: '使用受信任CA签发的证书'
            });
          }
          
          socket.end();
          resolve({
            certificate: {
              subject: certificate.subject,
              issuer: certificate.issuer,
              validFrom: certificate.valid_from,
              validTo: certificate.valid_to,
              serialNumber: certificate.serialNumber,
              fingerprint: certificate.fingerprint,
              signatureAlgorithm: certificate.signatureAlgorithm,
              subjectAltNames
            },
            vulnerabilities
          });
          
        } catch (error) {
          socket.end();
          vulnerabilities.push({
            type: 'certificate_analysis_error',
            severity: 'medium',
            description: '证书分析过程中出现错误',
            details: { error: error.message },
            recommendation: '检查证书配置'
          });
          resolve({ certificate: null, vulnerabilities });
        }
      });
      
      socket.on('error', (error) => {
        vulnerabilities.push({
          type: 'ssl_connection_error',
          severity: 'high',
          description: 'SSL连接失败',
          details: { error: error.message },
          recommendation: '检查SSL配置和网络连接'
        });
        resolve({ certificate: null, vulnerabilities });
      });
      
      socket.setTimeout(10000, () => {
        socket.destroy();
        vulnerabilities.push({
          type: 'ssl_connection_timeout',
          severity: 'medium',
          description: 'SSL连接超时',
          recommendation: '检查网络连接和服务器响应'
        });
        resolve({ certificate: null, vulnerabilities });
      });
    });
  }

  /**
   * 分析支持的协议
   */
  async analyzeProtocols(hostname, port) {
    const vulnerabilities = [];
    const supportedProtocols = [];
    
    // 测试不同的TLS协议版本
    const protocolsToTest = [
      { name: 'TLSv1.3', secureOptions: crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3 | crypto.constants.SSL_OP_NO_TLSv1 | crypto.constants.SSL_OP_NO_TLSv1_1 | crypto.constants.SSL_OP_NO_TLSv1_2 },
      { name: 'TLSv1.2', secureOptions: crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3 | crypto.constants.SSL_OP_NO_TLSv1 | crypto.constants.SSL_OP_NO_TLSv1_1 },
      { name: 'TLSv1.1', secureOptions: crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3 | crypto.constants.SSL_OP_NO_TLSv1 },
      { name: 'TLSv1.0', secureOptions: crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3 }
    ];
    
    for (const protocol of protocolsToTest) {
      try {
        const isSupported = await this.testProtocol(hostname, port, protocol);
        if (isSupported) {
          supportedProtocols.push(protocol.name);
          
          // 检查不安全的协议
          if (this.insecureProtocols.includes(protocol.name)) {
            vulnerabilities.push({
              type: 'insecure_protocol_supported',
              severity: 'high',
              description: `支持不安全的协议: ${protocol.name}`,
              details: { protocol: protocol.name },
              recommendation: `禁用${protocol.name}协议，仅使用TLS 1.2和1.3`
            });
          }
        }
      } catch (error) {
        // 协议不支持，这是正常的
      }
    }
    
    // 检查是否支持安全协议
    const hasSecureProtocol = supportedProtocols.some(p => this.secureProtocols.includes(p));
    if (!hasSecureProtocol) {
      vulnerabilities.push({
        type: 'no_secure_protocols',
        severity: 'critical',
        description: '不支持安全的TLS协议版本',
        details: { supportedProtocols },
        recommendation: '启用TLS 1.2和1.3支持'
      });
    }
    
    return {
      supportedProtocols,
      vulnerabilities
    };
  }

  /**
   * 测试特定协议是否支持
   */
  testProtocol(hostname, port, protocol) {
    return new Promise((resolve) => {
      const options = {
        host: hostname,
        port: port,
        servername: hostname,
        secureOptions: protocol.secureOptions,
        rejectUnauthorized: false
      };
      
      const socket = tls.connect(options, () => {
        socket.end();
        resolve(true);
      });
      
      socket.on('error', () => {
        resolve(false);
      });
      
      socket.setTimeout(5000, () => {
        socket.destroy();
        resolve(false);
      });
    });
  }

  /**
   * 分析密码套件
   */
  async analyzeCiphers(hostname, port) {
    return new Promise((resolve) => {
      const vulnerabilities = [];
      
      const options = {
        host: hostname,
        port: port,
        servername: hostname,
        rejectUnauthorized: false
      };
      
      const socket = tls.connect(options, () => {
        try {
          const cipher = socket.getCipher();
          const protocol = socket.getProtocol();
          
          if (cipher) {
            // 检查密码套件安全性
            const cipherName = cipher.name;
            const isInsecure = this.insecureCipherPatterns.some(pattern => pattern.test(cipherName));
            const isSecure = this.secureCipherPatterns.some(pattern => pattern.test(cipherName));
            
            if (isInsecure) {
              vulnerabilities.push({
                type: 'insecure_cipher',
                severity: 'high',
                description: `使用不安全的密码套件: ${cipherName}`,
                details: { cipher: cipherName, protocol },
                recommendation: '配置安全的密码套件，如ECDHE-RSA-AES256-GCM-SHA384'
              });
            } else if (!isSecure) {
              vulnerabilities.push({
                type: 'weak_cipher',
                severity: 'medium',
                description: `使用较弱的密码套件: ${cipherName}`,
                details: { cipher: cipherName, protocol },
                recommendation: '使用更强的密码套件，优先选择AEAD算法'
              });
            }
          }
          
          socket.end();
          resolve({
            cipher: cipher,
            protocol: protocol,
            vulnerabilities
          });
          
        } catch (error) {
          socket.end();
          resolve({
            cipher: null,
            protocol: null,
            vulnerabilities: [{
              type: 'cipher_analysis_error',
              severity: 'medium',
              description: '密码套件分析失败',
              details: { error: error.message }
            }]
          });
        }
      });
      
      socket.on('error', (error) => {
        resolve({
          cipher: null,
          protocol: null,
          vulnerabilities: [{
            type: 'cipher_connection_error',
            severity: 'medium',
            description: '密码套件检测连接失败',
            details: { error: error.message }
          }]
        });
      });
      
      socket.setTimeout(10000, () => {
        socket.destroy();
        resolve({
          cipher: null,
          protocol: null,
          vulnerabilities: [{
            type: 'cipher_connection_timeout',
            severity: 'low',
            description: '密码套件检测超时'
          }]
        });
      });
    });
  }

  /**
   * 分析安全头
   */
  async analyzeSecurityHeaders(url) {
    return new Promise((resolve) => {
      const vulnerabilities = [];
      
      https.get(url, { rejectUnauthorized: false }, (res) => {
        const headers = res.headers;
        
        // 检查HSTS头
        if (!headers['strict-transport-security']) {
          vulnerabilities.push({
            type: 'missing_hsts',
            severity: 'medium',
            description: '缺少HSTS安全头',
            recommendation: '添加Strict-Transport-Security头以强制HTTPS'
          });
        }
        
        // 检查安全Cookie设置
        const setCookieHeaders = headers['set-cookie'] || [];
        setCookieHeaders.forEach(cookie => {
          if (!cookie.includes('Secure')) {
            vulnerabilities.push({
              type: 'insecure_cookie',
              severity: 'medium',
              description: 'Cookie未设置Secure标志',
              details: { cookie: cookie.split(';')[0] },
              recommendation: '为所有Cookie添加Secure标志'
            });
          }
        });
        
        resolve({
          headers: {
            hsts: headers['strict-transport-security'],
            cookies: setCookieHeaders
          },
          vulnerabilities
        });
      }).on('error', (error) => {
        resolve({
          headers: null,
          vulnerabilities: [{
            type: 'header_analysis_error',
            severity: 'low',
            description: '安全头分析失败',
            details: { error: error.message }
          }]
        });
      });
    });
  }

  /**
   * 分析公钥信息
   */
  analyzePublicKey(pubkey) {
    // 简化的公钥分析
    const keyLength = pubkey.length * 8; // 粗略估算
    let algorithm = 'RSA'; // 默认假设
    
    // 检查是否为弱密钥
    const minimumLength = this.minimumKeyLengths[algorithm] || 2048;
    const isWeak = keyLength < minimumLength;
    
    return {
      algorithm,
      length: keyLength,
      isWeak
    };
  }

  /**
   * 计算总体安全评估
   */
  calculateSummary(vulnerabilities) {
    const severities = vulnerabilities.map(v => v.severity);
    let riskLevel = 'low';
    
    if (severities.includes('critical')) {
      riskLevel = 'critical';
    } else if (severities.includes('high')) {
      riskLevel = 'high';
    } else if (severities.includes('medium')) {
      riskLevel = 'medium';
    }
    
    return {
      riskLevel,
      httpsEnabled: true,
      totalIssues: vulnerabilities.length,
      criticalCount: severities.filter(s => s === 'critical').length,
      highCount: severities.filter(s => s === 'high').length,
      mediumCount: severities.filter(s => s === 'medium').length,
      lowCount: severities.filter(s => s === 'low').length
    };
  }
}

module.exports = SSLAnalyzer;
