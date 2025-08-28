/**
 * 📊 分析核心服务
 * 统一所有测试结果分析和建议生成功能
 */

class AnalysisCore {
  constructor() {
    this.name = 'analysis-core';
    this.analysisHistory = [];
    
    // 评分权重配置
    this.scoreWeights = {
      performance: {
        coreWebVitals: 0.4,
        pageSpeed: 0.3,
        resources: 0.2,
        caching: 0.1
      },
      security: {
        ssl: 0.3,
        headers: 0.25,
        vulnerabilities: 0.3,
        cookies: 0.15
      },
      api: {
        functionality: 0.4,
        performance: 0.3,
        security: 0.2,
        reliability: 0.1
      }
    };
  }

  /**
   * 生成性能测试摘要 - 统一实现
   */
  generatePerformanceSummary(results) {
    console.log('📊 生成性能测试摘要');
    
    const summary = {
      overallScore: 0,
      grade: 'F',
      strengths: [],
      weaknesses: [],
      criticalIssues: [],
      recommendations: [],
      metrics: {}
    };

    // Core Web Vitals 分析
    if (results.coreWebVitals) {
      const cwv = results.coreWebVitals;
      summary.metrics.coreWebVitals = cwv.overallScore;
      
      if (cwv.overallScore >= 80) {
        summary.strengths.push('Core Web Vitals 表现优秀');
      } else if (cwv.overallScore < 50) {
        summary.criticalIssues.push('Core Web Vitals 需要紧急优化');
        summary.recommendations.push('优化 LCP、FID 和 CLS 指标');
      }
    }

    // 页面速度分析
    if (results.pageSpeed) {
      const speed = results.pageSpeed;
      summary.metrics.pageSpeed = speed.grade;
      
      if (speed.totalLoadTime > 3000) {
        summary.criticalIssues.push(`页面加载时间过长: ${speed.totalLoadTime}ms`);
        summary.recommendations.push('优化关键渲染路径，减少阻塞资源');
      } else if (speed.totalLoadTime < 1000) {
        summary.strengths.push('页面加载速度优秀');
      }
      
      if (speed.totalRequests > 100) {
        summary.weaknesses.push(`HTTP请求数量过多: ${speed.totalRequests}`);
        summary.recommendations.push('合并和压缩资源文件');
      }
    }

    // 资源优化分析
    if (results.resources) {
      const resources = results.resources;
      
      if (resources.compressionAnalysis.compressionRate < 70) {
        summary.weaknesses.push('资源压缩率不足');
        summary.recommendations.push('启用Gzip或Brotli压缩');
      }
      
      if (resources.totalSize > 5 * 1024 * 1024) { // 5MB
        summary.weaknesses.push('页面资源总大小过大');
        summary.recommendations.push('优化图片和资源文件大小');
      }
    }

    // 缓存策略分析
    if (results.caching) {
      const caching = results.caching;
      
      if (caching.cacheScore < 50) {
        summary.weaknesses.push('缓存策略配置不当');
        summary.recommendations.push('配置适当的缓存头部');
      } else if (caching.cacheScore >= 80) {
        summary.strengths.push('缓存策略配置良好');
      }
    }

    // 计算综合评分
    summary.overallScore = this.calculatePerformanceScore(results);
    summary.grade = this.getGrade(summary.overallScore);

    // 生成总体建议
    if (summary.overallScore < 60) {
      summary.recommendations.unshift('性能需要全面优化，建议优先处理关键问题');
    } else if (summary.overallScore >= 90) {
      summary.recommendations.unshift('性能表现优秀，继续保持');
    }

    return summary;
  }

  /**
   * 生成安全测试摘要 - 统一实现
   */
  generateSecuritySummary(results) {
    console.log('🛡️ 生成安全测试摘要');
    
    const summary = {
      overallScore: 0,
      riskLevel: 'unknown',
      strengths: [],
      vulnerabilities: [],
      criticalIssues: [],
      recommendations: [],
      metrics: {}
    };

    // SSL/TLS 分析
    if (results.ssl) {
      const ssl = results.ssl;
      summary.metrics.ssl = ssl.score;
      
      if (ssl.score >= 80) {
        summary.strengths.push('SSL/TLS 配置安全');
      } else if (ssl.score < 50) {
        summary.criticalIssues.push('SSL/TLS 配置存在严重问题');
        summary.recommendations.push('升级SSL证书和加密协议');
      }
    }

    // 安全头分析
    if (results.headers) {
      const headers = results.headers;
      summary.metrics.securityHeaders = headers.score;
      
      if (headers.details.missing.length > 0) {
        summary.vulnerabilities.push(`缺少 ${headers.details.missing.length} 个安全头`);
        summary.recommendations.push('配置缺失的安全头部');
      }
      
      if (headers.score >= 80) {
        summary.strengths.push('安全头配置完善');
      }
    }

    // 漏洞扫描分析
    if (results.vulnerabilities) {
      const vulns = results.vulnerabilities;
      
      vulns.details.vulnerabilities.forEach(vuln => {
        if (vuln.severity === 'critical' || vuln.severity === 'high') {
          summary.criticalIssues.push(`${vuln.type}: ${vuln.description}`);
        } else {
          summary.vulnerabilities.push(`${vuln.type}: ${vuln.description}`);
        }
      });
      
      summary.recommendations.push(...vulns.recommendations);
    }

    // Cookie 安全分析
    if (results.cookies) {
      const cookies = results.cookies;
      summary.metrics.cookies = cookies.score;
      
      if (cookies.score < 70) {
        summary.vulnerabilities.push('Cookie 安全配置不足');
        summary.recommendations.push('为Cookie添加Secure和HttpOnly属性');
      }
    }

    // 计算综合评分和风险等级
    summary.overallScore = this.calculateSecurityScore(results);
    summary.riskLevel = this.getRiskLevel(summary.overallScore);

    // 生成总体建议
    if (summary.criticalIssues.length > 0) {
      summary.recommendations.unshift('存在严重安全问题，需要立即处理');
    } else if (summary.overallScore >= 90) {
      summary.recommendations.unshift('安全配置优秀，继续保持');
    }

    return summary;
  }

  /**
   * 生成HTTP测试摘要 - 统一实现
   */
  generateHTTPSummary(results, testType) {
    console.log(`🌐 生成${testType}测试摘要`);
    
    const summary = {
      overallScore: 0,
      testType,
      strengths: [],
      issues: [],
      recommendations: [],
      metrics: {}
    };

    if (testType === 'api') {
      return this.generateAPISummary(results, summary);
    } else if (testType === 'stress') {
      return this.generateStressSummary(results, summary);
    }

    return summary;
  }

  /**
   * 生成API测试摘要
   */
  generateAPISummary(results, summary) {
    // 端点测试分析
    if (results.endpoints) {
      const endpoints = results.endpoints;
      summary.metrics.successRate = ((endpoints.successfulEndpoints / endpoints.totalEndpoints) * 100).toFixed(1);
      summary.metrics.averageResponseTime = endpoints.averageResponseTime;
      
      if (endpoints.successfulEndpoints === endpoints.totalEndpoints) {
        summary.strengths.push('所有API端点测试通过');
      } else {
        summary.issues.push(`${endpoints.failedEndpoints} 个端点测试失败`);
        summary.recommendations.push('检查失败的API端点配置');
      }
      
      if (endpoints.averageResponseTime > 1000) {
        summary.issues.push('API响应时间较慢');
        summary.recommendations.push('优化API性能和数据库查询');
      }
    }

    // 性能测试分析
    if (results.performance) {
      const perf = results.performance;
      const slowEndpoints = perf.results.filter(r => r.metrics.average > 500);
      
      if (slowEndpoints.length > 0) {
        summary.issues.push(`${slowEndpoints.length} 个端点响应较慢`);
        summary.recommendations.push('优化慢速API端点');
      }
    }

    // 安全测试分析
    if (results.security) {
      const security = results.security;
      const insecureEndpoints = security.results.filter(r => r.overallScore < 70);
      
      if (insecureEndpoints.length > 0) {
        summary.issues.push(`${insecureEndpoints.length} 个端点存在安全问题`);
        summary.recommendations.push('加强API安全配置');
      }
    }

    summary.overallScore = this.calculateAPIScore(results);
    return summary;
  }

  /**
   * 生成压力测试摘要
   */
  generateStressSummary(results, summary) {
    if (results.stress) {
      const stress = results.stress;
      
      summary.metrics.totalRequests = stress.totalRequests;
      summary.metrics.successRate = ((stress.successfulRequests / stress.totalRequests) * 100).toFixed(1);
      summary.metrics.requestsPerSecond = stress.requestsPerSecond;
      summary.metrics.averageResponseTime = stress.averageResponseTime;
      summary.metrics.errorRate = stress.errorRate;
      
      // 分析结果
      if (parseFloat(stress.errorRate) < 1) {
        summary.strengths.push('错误率很低，系统稳定');
      } else if (parseFloat(stress.errorRate) > 5) {
        summary.issues.push('错误率较高，系统可能存在瓶颈');
        summary.recommendations.push('检查服务器配置和资源限制');
      }
      
      if (stress.averageResponseTime < 200) {
        summary.strengths.push('响应时间优秀');
      } else if (stress.averageResponseTime > 1000) {
        summary.issues.push('响应时间较长');
        summary.recommendations.push('优化服务器性能和数据库查询');
      }
      
      if (parseFloat(stress.requestsPerSecond) > 100) {
        summary.strengths.push('吞吐量表现良好');
      }
    }

    summary.overallScore = this.calculateStressScore(results);
    return summary;
  }

  /**
   * 生成分析测试摘要 - 统一实现
   */
  generateAnalysisSummary(results, testType) {
    console.log(`🔍 生成${testType}分析摘要`);
    
    const summary = {
      overallScore: 0,
      testType,
      findings: [],
      recommendations: [],
      metrics: {}
    };

    if (testType === 'compatibility') {
      // 兼容性分析
      if (results.browserCompatibility) {
        const browserCompat = results.browserCompatibility;
        summary.metrics.browserSupport = browserCompat.supportPercentage;
        
        if (browserCompat.supportPercentage >= 95) {
          summary.findings.push('浏览器兼容性优秀');
        } else if (browserCompat.supportPercentage < 80) {
          summary.findings.push('浏览器兼容性需要改进');
          summary.recommendations.push('添加浏览器兼容性polyfill');
        }
      }
      
      if (results.deviceCompatibility) {
        const deviceCompat = results.deviceCompatibility;
        summary.metrics.deviceSupport = deviceCompat.supportPercentage;
        
        if (deviceCompat.mobileOptimized) {
          summary.findings.push('移动设备优化良好');
        } else {
          summary.recommendations.push('优化移动设备体验');
        }
      }
    }

    summary.overallScore = this.calculateAnalysisScore(results, testType);
    return summary;
  }

  /**
   * 生成综合建议 - 统一实现
   */
  async generateRecommendations(testResult) {
    console.log('💡 生成综合建议');
    
    const recommendations = {
      immediate: [], // 立即处理
      shortTerm: [], // 短期处理
      longTerm: [], // 长期规划
      priority: 'medium'
    };

    // 基于测试类型生成建议
    switch (testResult.testType) {
      case 'performance':
        this.addPerformanceRecommendations(testResult, recommendations);
        break;
      case 'security':
        this.addSecurityRecommendations(testResult, recommendations);
        break;
      case 'api':
        this.addAPIRecommendations(testResult, recommendations);
        break;
      case 'stress':
        this.addStressRecommendations(testResult, recommendations);
        break;
    }

    // 确定优先级
    if (recommendations.immediate.length > 0) {
      recommendations.priority = 'high';
    } else if (recommendations.shortTerm.length > 3) {
      recommendations.priority = 'medium';
    } else {
      recommendations.priority = 'low';
    }

    return recommendations;
  }

  /**
   * 添加性能优化建议
   */
  addPerformanceRecommendations(testResult, recommendations) {
    const summary = testResult.summary;
    
    if (summary.overallScore < 50) {
      recommendations.immediate.push('性能严重不足，需要立即优化');
      recommendations.immediate.push('检查服务器配置和网络连接');
    }
    
    if (summary.criticalIssues.length > 0) {
      recommendations.immediate.push(...summary.criticalIssues);
    }
    
    recommendations.shortTerm.push(...summary.recommendations);
    
    recommendations.longTerm.push('建立性能监控体系');
    recommendations.longTerm.push('定期进行性能测试和优化');
  }

  /**
   * 添加安全优化建议
   */
  addSecurityRecommendations(testResult, recommendations) {
    const summary = testResult.summary;
    
    if (summary.criticalIssues.length > 0) {
      recommendations.immediate.push(...summary.criticalIssues);
      recommendations.immediate.push('立即修复严重安全漏洞');
    }
    
    if (summary.vulnerabilities.length > 0) {
      recommendations.shortTerm.push(...summary.vulnerabilities);
    }
    
    recommendations.shortTerm.push(...summary.recommendations);
    
    recommendations.longTerm.push('建立安全监控和响应机制');
    recommendations.longTerm.push('定期进行安全审计');
  }

  /**
   * 添加API优化建议
   */
  addAPIRecommendations(testResult, recommendations) {
    const summary = testResult.summary;
    
    if (parseFloat(summary.metrics.successRate) < 95) {
      recommendations.immediate.push('修复失败的API端点');
    }
    
    if (summary.metrics.averageResponseTime > 1000) {
      recommendations.shortTerm.push('优化API响应时间');
      recommendations.shortTerm.push('添加缓存机制');
    }
    
    recommendations.longTerm.push('实施API版本管理');
    recommendations.longTerm.push('建立API监控和告警');
  }

  /**
   * 添加压力测试建议
   */
  addStressRecommendations(testResult, recommendations) {
    const summary = testResult.summary;
    
    if (parseFloat(summary.metrics.errorRate) > 5) {
      recommendations.immediate.push('系统在高负载下不稳定，需要立即检查');
    }
    
    if (summary.metrics.averageResponseTime > 1000) {
      recommendations.shortTerm.push('优化系统性能以应对高负载');
      recommendations.shortTerm.push('考虑增加服务器资源');
    }
    
    recommendations.longTerm.push('建立自动扩缩容机制');
    recommendations.longTerm.push('定期进行容量规划');
  }

  /**
   * 计算性能评分
   */
  calculatePerformanceScore(results) {
    let totalScore = 0;
    let totalWeight = 0;
    
    const weights = this.scoreWeights.performance;
    
    if (results.coreWebVitals) {
      totalScore += results.coreWebVitals.overallScore * weights.coreWebVitals;
      totalWeight += weights.coreWebVitals;
    }
    
    if (results.pageSpeed) {
      const speedScore = this.gradeToScore(results.pageSpeed.grade);
      totalScore += speedScore * weights.pageSpeed;
      totalWeight += weights.pageSpeed;
    }
    
    if (results.resources) {
      const resourceScore = Math.min(100, results.resources.compressionAnalysis.compressionRate);
      totalScore += resourceScore * weights.resources;
      totalWeight += weights.resources;
    }
    
    if (results.caching) {
      totalScore += results.caching.cacheScore * weights.caching;
      totalWeight += weights.caching;
    }
    
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * 计算安全评分
   */
  calculateSecurityScore(results) {
    let totalScore = 0;
    let totalWeight = 0;
    
    const weights = this.scoreWeights.security;
    
    if (results.ssl) {
      totalScore += results.ssl.score * weights.ssl;
      totalWeight += weights.ssl;
    }
    
    if (results.headers) {
      totalScore += results.headers.score * weights.headers;
      totalWeight += weights.headers;
    }
    
    if (results.vulnerabilities) {
      totalScore += results.vulnerabilities.score * weights.vulnerabilities;
      totalWeight += weights.vulnerabilities;
    }
    
    if (results.cookies) {
      totalScore += results.cookies.score * weights.cookies;
      totalWeight += weights.cookies;
    }
    
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * 计算API评分
   */
  calculateAPIScore(results) {
    let score = 0;
    
    if (results.endpoints) {
      score += (results.endpoints.successfulEndpoints / results.endpoints.totalEndpoints) * 40;
      
      if (results.endpoints.averageResponseTime < 200) score += 30;
      else if (results.endpoints.averageResponseTime < 500) score += 20;
      else if (results.endpoints.averageResponseTime < 1000) score += 10;
    }
    
    if (results.security) {
      score += (results.security.summary.securityScore / 100) * 20;
    }
    
    if (results.performance) {
      score += 10; // 基础分
    }
    
    return Math.round(Math.min(100, score));
  }

  /**
   * 计算压力测试评分
   */
  calculateStressScore(results) {
    if (!results.stress) return 0;
    
    const stress = results.stress;
    let score = 0;
    
    // 成功率评分 (40%)
    const successRate = (stress.successfulRequests / stress.totalRequests) * 100;
    if (successRate >= 99) score += 40;
    else if (successRate >= 95) score += 35;
    else if (successRate >= 90) score += 25;
    else if (successRate >= 80) score += 15;
    
    // 响应时间评分 (30%)
    if (stress.averageResponseTime < 100) score += 30;
    else if (stress.averageResponseTime < 200) score += 25;
    else if (stress.averageResponseTime < 500) score += 20;
    else if (stress.averageResponseTime < 1000) score += 10;
    
    // 吞吐量评分 (20%)
    const rps = parseFloat(stress.requestsPerSecond);
    if (rps >= 100) score += 20;
    else if (rps >= 50) score += 15;
    else if (rps >= 20) score += 10;
    else if (rps >= 10) score += 5;
    
    // 错误率评分 (10%)
    const errorRate = parseFloat(stress.errorRate);
    if (errorRate < 1) score += 10;
    else if (errorRate < 2) score += 8;
    else if (errorRate < 5) score += 5;
    
    return Math.round(score);
  }

  /**
   * 计算分析评分
   */
  calculateAnalysisScore(results, testType) {
    if (testType === 'compatibility') {
      let score = 0;
      
      if (results.browserCompatibility) {
        score += results.browserCompatibility.supportPercentage * 0.6;
      }
      
      if (results.deviceCompatibility) {
        score += results.deviceCompatibility.supportPercentage * 0.4;
      }
      
      return Math.round(score);
    }
    
    return 0;
  }

  /**
   * 计算综合评分
   */
  calculateOverallScore(testResult) {
    if (testResult.summary && testResult.summary.overallScore) {
      return testResult.summary.overallScore;
    }
    
    // 根据测试类型计算评分
    switch (testResult.testType) {
      case 'performance':
        return this.calculatePerformanceScore(testResult.results);
      case 'security':
        return this.calculateSecurityScore(testResult.results);
      case 'api':
        return this.calculateAPIScore(testResult.results);
      case 'stress':
        return this.calculateStressScore(testResult.results);
      default:
        return 0;
    }
  }

  /**
   * 获取等级
   */
  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 等级转评分
   */
  gradeToScore(grade) {
    const gradeMap = { 'A': 95, 'B': 85, 'C': 75, 'D': 65, 'F': 45 };
    return gradeMap[grade] || 0;
  }

  /**
   * 获取风险等级
   */
  getRiskLevel(score) {
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'critical';
  }

  /**
   * 获取分析历史
   */
  getAnalysisHistory(limit = 50) {
    return this.analysisHistory.slice(-limit);
  }

  /**
   * 清理分析历史
   */
  clearAnalysisHistory() {
    this.analysisHistory = [];
    console.log('🧹 分析历史已清理');
  }
}

module.exports = AnalysisCore;
