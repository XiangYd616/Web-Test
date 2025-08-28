/**
 * SSL/TLS安全分析器
 * 检测SSL证书、加密套件、协议版本等安全配置
 */

const https = require('https');
const tls = require('tls');
const { URL } = require('url');

class SSLAnalyzer {
  constructor() {
    this.name = 'ssl';
    this.timeout = 30000;
  }

  /**
   * 分析SSL/TLS配置
   */
  async analyze(url) {
    try {
      console.log(`🔒 开始SSL/TLS分析: ${url}`);
      
      const urlObj = new URL(url);
      
      // 如果不是HTTPS，直接返回
      if (urlObj.protocol !== 'https:') {
        return {
          httpsEnabled: false,
          score: 0,
          vulnerabilities: [{
            type: 'ssl',
            severity: 'high',
            description: '网站未启用HTTPS',
            recommendation: '启用HTTPS以保护数据传输安全'
          }],
          summary: {
            httpsEnabled: false,
            certificateValid: false,
            tlsVersion: null,
            score: 0
          }
        };
      }

      const results = {
        httpsEnabled: true,
        certificate: null,
        tlsVersion: null,
        cipherSuite: null,
        vulnerabilities: [],
        score: 0,
        summary: {}
      };

      // 获取SSL证书信息
      const certInfo = await this.getCertificateInfo(urlObj.hostname, urlObj.port || 443);
      results.certificate = certInfo;

      // 检查证书有效性
      const certValidation = this.validateCertificate(certInfo);
      results.vulnerabilities.push(...certValidation.vulnerabilities);

      // 检查TLS版本
      const tlsInfo = await this.getTLSInfo(urlObj.hostname, urlObj.port || 443);
      results.tlsVersion = tlsInfo.version;
      results.cipherSuite = tlsInfo.cipherSuite;

      // 检查TLS配置安全性
      const tlsValidation = this.validateTLSConfig(tlsInfo);
      results.vulnerabilities.push(...tlsValidation.vulnerabilities);

      // 计算总体评分
      results.score = this.calculateSSLScore(results);
      results.summary = {
        httpsEnabled: true,
        certificateValid: certValidation.valid,
        tlsVersion: tlsInfo.version,
        score: results.score,
        totalVulnerabilities: results.vulnerabilities.length
      };

      console.log(`✅ SSL/TLS分析完成: ${url}, 评分: ${results.score}`);
      return results;

    } catch (error) {
      console.error(`❌ SSL/TLS分析失败: ${url}`, error);
      return {
        httpsEnabled: false,
        error: error.message,
        vulnerabilities: [{
          type: 'ssl',
          severity: 'high',
          description: 'SSL/TLS分析失败',
          recommendation: '检查网站SSL配置'
        }],
        score: 0,
        summary: {
          httpsEnabled: false,
          error: error.message
        }
      };
    }
  }

  /**
   * 获取SSL证书信息
   */
  async getCertificateInfo(hostname, port) {
    return new Promise((resolve, reject) => {
      const options = {
        host: hostname,
        port: port,
        method: 'GET',
        rejectUnauthorized: false
      };

      const req = https.request(options, (res) => {
        const cert = res.socket.getPeerCertificate();
        resolve({
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          fingerprint: cert.fingerprint,
          serialNumber: cert.serialNumber,
          subjectAltName: cert.subjectaltname
        });
      });

      req.on('error', reject);
      req.setTimeout(this.timeout, () => {
        req.destroy();
        reject(new Error('SSL连接超时'));
      });
      
      req.end();
    });
  }

  /**
   * 获取TLS信息
   */
  async getTLSInfo(hostname, port) {
    return new Promise((resolve, reject) => {
      const socket = tls.connect({
        host: hostname,
        port: port,
        rejectUnauthorized: false
      }, () => {
        const info = {
          version: socket.getProtocol(),
          cipherSuite: socket.getCipher(),
          authorized: socket.authorized,
          authorizationError: socket.authorizationError
        };
        socket.end();
        resolve(info);
      });

      socket.on('error', reject);
      socket.setTimeout(this.timeout, () => {
        socket.destroy();
        reject(new Error('TLS连接超时'));
      });
    });
  }

  /**
   * 验证证书
   */
  validateCertificate(cert) {
    const vulnerabilities = [];
    let valid = true;

    // 检查证书过期
    const now = new Date();
    const validTo = new Date(cert.validTo);
    const validFrom = new Date(cert.validFrom);

    if (now > validTo) {
      vulnerabilities.push({
        type: 'ssl',
        severity: 'critical',
        description: 'SSL证书已过期',
        recommendation: '立即更新SSL证书'
      });
      valid = false;
    } else if ((validTo - now) < 30 * 24 * 60 * 60 * 1000) { // 30天内过期
      vulnerabilities.push({
        type: 'ssl',
        severity: 'medium',
        description: 'SSL证书即将过期',
        recommendation: '准备更新SSL证书'
      });
    }

    if (now < validFrom) {
      vulnerabilities.push({
        type: 'ssl',
        severity: 'high',
        description: 'SSL证书尚未生效',
        recommendation: '检查系统时间或证书配置'
      });
      valid = false;
    }

    return { valid, vulnerabilities };
  }

  /**
   * 验证TLS配置
   */
  validateTLSConfig(tlsInfo) {
    const vulnerabilities = [];

    // 检查TLS版本
    if (tlsInfo.version && tlsInfo.version.includes('1.0')) {
      vulnerabilities.push({
        type: 'ssl',
        severity: 'high',
        description: '使用了不安全的TLS 1.0协议',
        recommendation: '升级到TLS 1.2或更高版本'
      });
    } else if (tlsInfo.version && tlsInfo.version.includes('1.1')) {
      vulnerabilities.push({
        type: 'ssl',
        severity: 'medium',
        description: '使用了较旧的TLS 1.1协议',
        recommendation: '升级到TLS 1.2或更高版本'
      });
    }

    // 检查加密套件
    if (tlsInfo.cipherSuite) {
      const cipher = tlsInfo.cipherSuite.name;
      if (cipher.includes('RC4') || cipher.includes('DES')) {
        vulnerabilities.push({
          type: 'ssl',
          severity: 'high',
          description: '使用了弱加密算法',
          recommendation: '配置强加密套件'
        });
      }
    }

    return { vulnerabilities };
  }

  /**
   * 计算SSL评分
   */
  calculateSSLScore(results) {
    let score = 100;

    // 根据漏洞严重程度扣分
    results.vulnerabilities.forEach(vuln => {
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
}

module.exports = SSLAnalyzer;
