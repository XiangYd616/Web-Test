/**
 * 安全测试引擎 - 前端
 * 提供网站安全检测、漏洞扫描、安全评估功能
 */

export interface SecurityTestConfig {
  url: string;
  depth?: number;
  includeSubdomains?: boolean;
  checkSSL?: boolean;
  checkHeaders?: boolean;
  checkCookies?: boolean;
  scanType?: 'basic' | 'comprehensive';
}

export interface SecurityTestResult {
  url: string;
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  vulnerabilities: SecurityVulnerability[];
  recommendations: SecurityRecommendation[];
  securityHeaders: SecurityHeaders;
  sslInfo: SSLInfo;
  timestamp: string;
}

export interface SecurityVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  solution: string;
  cwe?: string;
  cvss?: number;
}

export interface SecurityRecommendation {
  category: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action: string;
  impact: string;
}

export interface SecurityHeaders {
  contentSecurityPolicy: boolean;
  strictTransportSecurity: boolean;
  xFrameOptions: boolean;
  xContentTypeOptions: boolean;
  xXSSProtection: boolean;
  referrerPolicy: boolean;
  permissionsPolicy: boolean;
}

export interface SSLInfo {
  isSecure: boolean;
  protocol: string;
  cipher: string;
  validFrom: string;
  validTo: string;
  issuer: string;
  grade: string;
  vulnerabilities: string[];
}

class SecurityTestEngine {
  private baseUrl = '/api/security';

  /**
   * 执行安全测试
   */
  async runTest(config: SecurityTestConfig): Promise<SecurityTestResult> {
    try {
      const response = await fetch(`${this.baseUrl}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '安全测试失败');
      }

      return data.data;
    } catch (error) {
      console.error('安全测试失败:', error);
      throw error;
    }
  }

  /**
   * 检查SSL证书
   */
  async checkSSL(url: string): Promise<SSLInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/ssl?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'SSL检查失败');
      }

      return data.data;
    } catch (error) {
      console.error('SSL检查失败:', error);
      throw error;
    }
  }

  /**
   * 检查安全头
   */
  async checkHeaders(url: string): Promise<SecurityHeaders> {
    try {
      const response = await fetch(`${this.baseUrl}/headers?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '安全头检查失败');
      }

      return data.data;
    } catch (error) {
      console.error('安全头检查失败:', error);
      throw error;
    }
  }

  /**
   * 漏洞扫描
   */
  async scanVulnerabilities(url: string, scanType: 'basic' | 'comprehensive' = 'basic') {
    try {
      const response = await fetch(`${this.baseUrl}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url, scanType })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '漏洞扫描失败');
      }

      return data.data;
    } catch (error) {
      console.error('漏洞扫描失败:', error);
      throw error;
    }
  }

  /**
   * 获取安全建议
   */
  async getRecommendations(url: string): Promise<SecurityRecommendation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/recommendations?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取安全建议失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取安全建议失败:', error);
      throw error;
    }
  }

  /**
   * 获取安全历史
   */
  async getHistory(pagination: { page: number; limit: number } = { page: 1, limit: 20 }) {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      const response = await fetch(`${this.baseUrl}/history?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取安全历史失败');
      }

      return data.data;
    } catch (error) {
      console.error('获取安全历史失败:', error);
      throw error;
    }
  }

  /**
   * 导出安全报告
   */
  async exportReport(testId: string, format: 'json' | 'html' | 'pdf' = 'html'): Promise<string> {
    try {
      const params = new URLSearchParams({ format });
      const response = await fetch(`${this.baseUrl}/${testId}/export?${params}`);

      if (format === 'json') {
        const data = await response.json();
        return data.success ? data.downloadUrl : '';
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        return url;
      }
    } catch (error) {
      console.error('导出安全报告失败:', error);
      throw error;
    }
  }

  /**
   * 验证配置
   */
  validateConfig(config: SecurityTestConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.url) {
      errors.push('URL是必需的');
    }

    if (config.url && !this.isValidUrl(config.url)) {
      errors.push('URL格式无效');
    }

    if (config.depth && (config.depth < 1 || config.depth > 5)) {
      errors.push('扫描深度必须在1-5之间');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): SecurityTestConfig {
    return {
      url: '',
      depth: 1,
      includeSubdomains: false,
      checkSSL: true,
      checkHeaders: true,
      checkCookies: true,
      scanType: 'basic'
    };
  }

  /**
   * 计算安全评分
   */
  calculateSecurityScore(result: SecurityTestResult): number {
    let score = 100;

    // 根据漏洞严重程度扣分
    result.vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    });

    // 安全头检查
    const headers = result.securityHeaders;
    if (!headers.contentSecurityPolicy) score -= 10;
    if (!headers.strictTransportSecurity) score -= 8;
    if (!headers.xFrameOptions) score -= 5;
    if (!headers.xContentTypeOptions) score -= 3;
    if (!headers.xXSSProtection) score -= 3;

    // SSL检查
    if (!result.sslInfo.isSecure) score -= 20;
    else if (result.sslInfo.vulnerabilities.length > 0) score -= 10;

    return Math.max(0, Math.round(score));
  }

  /**
   * 获取风险级别
   */
  getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'critical';
  }

  /**
   * 格式化安全结果
   */
  formatResults(result: SecurityTestResult): string {
    let report = `安全测试报告\n`;
    report += `URL: ${result.url}\n`;
    report += `评分: ${result.score}/100\n`;
    report += `风险级别: ${this.getRiskLevelText(result.riskLevel)}\n`;
    report += `测试时间: ${new Date(result.timestamp).toLocaleString()}\n\n`;

    // SSL信息
    report += `SSL证书信息:\n`;
    report += `- 安全连接: ${result.sslInfo.isSecure ? '是' : '否'}\n`;
    if (result.sslInfo.isSecure) {
      report += `- 协议: ${result.sslInfo.protocol}\n`;
      report += `- 等级: ${result.sslInfo.grade}\n`;
      report += `- 有效期: ${result.sslInfo.validFrom} - ${result.sslInfo.validTo}\n`;
      report += `- 颁发者: ${result.sslInfo.issuer}\n`;
    }
    report += '\n';

    // 安全头
    report += `安全头检查:\n`;
    report += `- Content Security Policy: ${result.securityHeaders.contentSecurityPolicy ? '✓' : '✗'}\n`;
    report += `- Strict Transport Security: ${result.securityHeaders.strictTransportSecurity ? '✓' : '✗'}\n`;
    report += `- X-Frame-Options: ${result.securityHeaders.xFrameOptions ? '✓' : '✗'}\n`;
    report += `- X-Content-Type-Options: ${result.securityHeaders.xContentTypeOptions ? '✓' : '✗'}\n`;
    report += `- X-XSS-Protection: ${result.securityHeaders.xXSSProtection ? '✓' : '✗'}\n`;
    report += '\n';

    // 漏洞
    if (result.vulnerabilities.length > 0) {
      report += `发现的漏洞 (${result.vulnerabilities.length}个):\n`;
      result.vulnerabilities.forEach((vuln, index) => {
        report += `${index + 1}. [${vuln.severity.toUpperCase()}] ${vuln.title}\n`;
        report += `   描述: ${vuln.description}\n`;
        report += `   影响: ${vuln.impact}\n`;
        report += `   解决方案: ${vuln.solution}\n`;
        if (vuln.cwe) report += `   CWE: ${vuln.cwe}\n`;
        if (vuln.cvss) report += `   CVSS评分: ${vuln.cvss}\n`;
        report += '\n';
      });
    }

    // 建议
    if (result.recommendations.length > 0) {
      report += `安全建议 (${result.recommendations.length}个):\n`;
      result.recommendations.forEach((rec, index) => {
        report += `${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}\n`;
        report += `   ${rec.description}\n`;
        report += `   操作: ${rec.action}\n`;
        report += `   影响: ${rec.impact}\n`;
      });
    }

    return report;
  }

  /**
   * 私有辅助方法
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private getRiskLevelText(level: string): string {
    const texts: Record<string, string> = {
      'low': '低风险',
      'medium': '中等风险',
      'high': '高风险',
      'critical': '严重风险'
    };
    return texts[level] || level;
  }
}

export const securityTestEngine = new SecurityTestEngine();
export default securityTestEngine;
