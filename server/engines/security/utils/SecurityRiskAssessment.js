/**
 * 安全风险评估引擎
 * 本地化程度：100%
 * 智能化安全风险评估：风险等级划分、修复建议、安全基线对比、合规性检查等
 */

class SecurityRiskAssessment {
  constructor() {
    // 风险等级定义
    this.riskLevels = {
      critical: {
        score: 90,
        color: '#dc3545',
        label: '严重',
        description: '需要立即处理的严重安全风险',
        maxResponseTime: '24小时',
        businessImpact: '可能导致数据泄露、系统瘫痪或重大经济损失'
      },
      high: {
        score: 70,
        color: '#fd7e14',
        label: '高风险',
        description: '需要优先处理的高风险安全问题',
        maxResponseTime: '72小时',
        businessImpact: '可能导致部分数据泄露或服务中断'
      },
      medium: {
        score: 40,
        color: '#ffc107',
        label: '中风险',
        description: '需要及时关注的中等风险',
        maxResponseTime: '1周',
        businessImpact: '可能影响系统安全性或用户体验'
      },
      low: {
        score: 20,
        color: '#28a745',
        label: '低风险',
        description: '建议修复的低风险问题',
        maxResponseTime: '1个月',
        businessImpact: '对系统安全影响较小'
      },
      info: {
        score: 0,
        color: '#17a2b8',
        label: '信息',
        description: '安全建议和最佳实践',
        maxResponseTime: '下次维护',
        businessImpact: '安全加固建议'
      }
    };

    // 漏洞类型权重
    this.vulnerabilityWeights = {
      'sql_injection': { weight: 0.9, category: 'injection' },
      'xss': { weight: 0.8, category: 'injection' },
      'csrf': { weight: 0.7, category: 'broken_auth' },
      'insecure_ssl': { weight: 0.8, category: 'crypto_failures' },
      'missing_security_headers': { weight: 0.6, category: 'security_misconfiguration' },
      'information_disclosure': { weight: 0.5, category: 'security_misconfiguration' },
      'weak_authentication': { weight: 0.8, category: 'broken_auth' },
      'insecure_direct_object_reference': { weight: 0.7, category: 'broken_access_control' },
      'security_misconfiguration': { weight: 0.6, category: 'security_misconfiguration' },
      'sensitive_data_exposure': { weight: 0.8, category: 'crypto_failures' }
    };

    // OWASP Top 10 2021 映射
    this.owaspTop10 = {
      'A01_2021': {
        name: 'Broken Access Control',
        description: '访问控制失效',
        examples: ['权限提升', '查看/编辑他人账户', '访问未授权功能'],
        prevention: ['实施最小权限原则', '拒绝默认访问', '记录访问控制失败']
      },
      'A02_2021': {
        name: 'Cryptographic Failures',
        description: '加密机制失效',
        examples: ['明文传输敏感数据', '使用弱加密算法', '密钥管理不当'],
        prevention: ['使用强加密算法', '启用HTTPS', '安全存储敏感数据']
      },
      'A03_2021': {
        name: 'Injection',
        description: '注入攻击',
        examples: ['SQL注入', 'NoSQL注入', 'OS命令注入', 'LDAP注入'],
        prevention: ['使用参数化查询', '输入验证', '使用安全API']
      },
      'A04_2021': {
        name: 'Insecure Design',
        description: '不安全设计',
        examples: ['缺少安全控制', '威胁建模不足', '安全架构缺陷'],
        prevention: ['安全开发生命周期', '威胁建模', '安全架构审查']
      },
      'A05_2021': {
        name: 'Security Misconfiguration',
        description: '安全配置错误',
        examples: ['默认配置', '不完整配置', '开放云存储', '详细错误信息'],
        prevention: ['安全配置基线', '自动化配置', '定期安全审查']
      },
      'A06_2021': {
        name: 'Vulnerable and Outdated Components',
        description: '易受攻击和过时的组件',
        examples: ['过时的库', '未打补丁的组件', '不安全的组件配置'],
        prevention: ['组件清单管理', '定期更新', '安全扫描']
      },
      'A07_2021': {
        name: 'Identification and Authentication Failures',
        description: '身份识别和身份验证失效',
        examples: ['弱密码', '会话管理缺陷', '凭据填充攻击'],
        prevention: ['多因素认证', '强密码策略', '安全会话管理']
      },
      'A08_2021': {
        name: 'Software and Data Integrity Failures',
        description: '软件和数据完整性失效',
        examples: ['不安全的CI/CD', '自动更新缺陷', '不可信来源'],
        prevention: ['数字签名', '完整性检查', '可信仓库']
      },
      'A09_2021': {
        name: 'Security Logging and Monitoring Failures',
        description: '安全日志记录和监控失效',
        examples: ['日志记录不足', '监控缺失', '响应不及时'],
        prevention: ['全面日志记录', '实时监控', '事件响应计划']
      },
      'A10_2021': {
        name: 'Server-Side Request Forgery',
        description: '服务器端请求伪造',
        examples: ['内网扫描', '云元数据访问', '数据泄露'],
        prevention: ['网络分段', 'URL白名单', '响应验证']
      }
    };

    // 合规性框架
    this.complianceFrameworks = {
      'ISO27001': {
        name: 'ISO/IEC 27001',
        description: '信息安全管理体系国际标准',
        requirements: [
          '信息安全政策',
          '风险管理',
          '访问控制',
          '加密控制',
          '物理安全',
          '运营安全',
          '通信安全',
          '系统获取、开发和维护',
          '供应商关系',
          '信息安全事件管理',
          '业务连续性',
          '合规性'
        ]
      },
      'NIST': {
        name: 'NIST Cybersecurity Framework',
        description: '美国国家标准与技术研究院网络安全框架',
        functions: ['识别', '保护', '检测', '响应', '恢复']
      },
      'GDPR': {
        name: 'General Data Protection Regulation',
        description: '欧盟通用数据保护条例',
        principles: [
          '合法性、公平性和透明度',
          '目的限制',
          '数据最小化',
          '准确性',
          '存储限制',
          '完整性和保密性',
          '问责制'
        ]
      },
      'PCI_DSS': {
        name: 'Payment Card Industry Data Security Standard',
        description: '支付卡行业数据安全标准',
        requirements: [
          '安装和维护防火墙配置',
          '不使用供应商提供的默认密码',
          '保护存储的持卡人数据',
          '加密传输中的持卡人数据',
          '使用和定期更新防病毒软件',
          '开发和维护安全系统和应用程序',
          '限制按业务需要了解的持卡人数据访问',
          '为每个具有计算机访问权限的人分配唯一ID',
          '限制对持卡人数据的物理访问',
          '跟踪和监控对网络资源和持卡人数据的所有访问',
          '定期测试安全系统和流程',
          '维护解决信息安全的政策'
        ]
      }
    };

    // 行业安全基线
    this.industryBaselines = {
      'financial': {
        name: '金融行业',
        requiredControls: [
          'multi_factor_authentication',
          'data_encryption',
          'access_logging',
          'regular_security_audits',
          'incident_response_plan'
        ],
        minSecurityScore: 85
      },
      'healthcare': {
        name: '医疗行业',
        requiredControls: [
          'hipaa_compliance',
          'data_encryption',
          'access_controls',
          'audit_trails',
          'backup_procedures'
        ],
        minSecurityScore: 80
      },
      'ecommerce': {
        name: '电子商务',
        requiredControls: [
          'pci_dss_compliance',
          'ssl_encryption',
          'secure_payment_processing',
          'fraud_detection',
          'customer_data_protection'
        ],
        minSecurityScore: 75
      },
      'government': {
        name: '政府机构',
        requiredControls: [
          'classified_data_protection',
          'multi_layer_security',
          'continuous_monitoring',
          'incident_response',
          'security_clearance_management'
        ],
        minSecurityScore: 90
      },
      'general': {
        name: '一般企业',
        requiredControls: [
          'basic_access_controls',
          'data_backup',
          'antivirus_protection',
          'security_awareness_training',
          'regular_updates'
        ],
        minSecurityScore: 70
      }
    };
  }

  /**
   * 执行安全风险评估
   */
  assessSecurityRisk(securityAnalysisResults) {
    console.log('🔍 开始安全风险评估...');

    const assessment = {
      timestamp: new Date().toISOString(),
      overallRiskLevel: 'low',
      overallRiskScore: 0,
      riskDistribution: {},
      vulnerabilityAnalysis: null,
      complianceStatus: null,
      industryBaseline: null,
      recommendations: [],
      actionPlan: null,
      executiveSummary: null
    };

    // 分析漏洞风险
    assessment.vulnerabilityAnalysis = this.analyzeVulnerabilities(securityAnalysisResults.vulnerabilities || []);

    // 计算总体风险评分
    assessment.overallRiskScore = this.calculateOverallRiskScore(assessment.vulnerabilityAnalysis);
    assessment.overallRiskLevel = this.determineRiskLevel(assessment.overallRiskScore);

    // 风险分布统计
    assessment.riskDistribution = this.calculateRiskDistribution(assessment.vulnerabilityAnalysis);

    // 合规性检查
    assessment.complianceStatus = this.checkCompliance(securityAnalysisResults);

    // 行业基线对比
    assessment.industryBaseline = this.compareWithIndustryBaseline(assessment.overallRiskScore);

    // 生成修复建议
    assessment.recommendations = this.generateRecommendations(assessment);

    // 生成行动计划
    assessment.actionPlan = this.generateActionPlan(assessment);

    // 生成执行摘要
    assessment.executiveSummary = this.generateExecutiveSummary(assessment);

    console.log(`✅ 安全风险评估完成 - 总体风险等级: ${assessment.overallRiskLevel} (${assessment.overallRiskScore}分)`);

    return assessment;
  }

  /**
   * 分析漏洞风险
   */
  analyzeVulnerabilities(vulnerabilities) {
    const analysis = {
      totalCount: vulnerabilities.length,
      byCategory: {},
      bySeverity: {},
      byOwaspTop10: {},
      riskScores: [],
      criticalVulnerabilities: [],
      trends: null
    };

    vulnerabilities.forEach(vuln => {
      // 按类别分类
      const category = this.categorizeVulnerability(vuln);
      if (!analysis.byCategory[category]) {
        analysis.byCategory[category] = { count: 0, vulnerabilities: [] };
      }
      analysis.byCategory[category].count++;
      analysis.byCategory[category].vulnerabilities.push(vuln);

      // 按严重程度分类
      const severity = vuln.severity || 'medium';
      if (!analysis.bySeverity[severity]) {
        analysis.bySeverity[severity] = { count: 0, vulnerabilities: [] };
      }
      analysis.bySeverity[severity].count++;
      analysis.bySeverity[severity].vulnerabilities.push(vuln);

      // OWASP Top 10 映射
      const owaspCategory = this.mapToOwaspTop10(vuln);
      if (owaspCategory) {
        if (!analysis.byOwaspTop10[owaspCategory]) {
          analysis.byOwaspTop10[owaspCategory] = { count: 0, vulnerabilities: [] };
        }
        analysis.byOwaspTop10[owaspCategory].count++;
        analysis.byOwaspTop10[owaspCategory].vulnerabilities.push(vuln);
      }

      // 计算风险评分
      const riskScore = this.calculateVulnerabilityRiskScore(vuln);
      analysis.riskScores.push(riskScore);

      // 识别严重漏洞
      if (severity === 'critical' || riskScore >= 80) {
        analysis.criticalVulnerabilities.push({
          ...vuln,
          riskScore,
          priority: 'immediate'
        });
      }
    });

    return analysis;
  }

  /**
   * 计算总体风险评分
   */
  calculateOverallRiskScore(vulnerabilityAnalysis) {
    if (vulnerabilityAnalysis.totalCount === 0) {
      return 0;
    }

    let totalScore = 0;
    let weightSum = 0;

    // 基于严重程度加权计算
    Object.entries(vulnerabilityAnalysis.bySeverity).forEach(([severity, data]) => {
      const severityWeight = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1
      }[severity] || 1;

      totalScore += data.count * severityWeight * 20;
      weightSum += data.count * severityWeight;
    });

    return Math.min(100, Math.round(totalScore / Math.max(1, weightSum)));
  }

  /**
   * 确定风险等级
   */
  determineRiskLevel(riskScore) {
    if (riskScore >= 90) return 'critical';
    if (riskScore >= 70) return 'high';
    if (riskScore >= 40) return 'medium';
    if (riskScore >= 20) return 'low';
    return 'info';
  }

  /**
   * 计算风险分布
   */
  calculateRiskDistribution(vulnerabilityAnalysis) {
    const distribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };

    Object.entries(vulnerabilityAnalysis.bySeverity).forEach(([severity, data]) => {
      distribution[severity] = data.count;
    });

    return distribution;
  }

  /**
   * 合规性检查
   */
  checkCompliance(securityAnalysisResults) {
    const compliance = {};

    // ISO 27001 检查
    compliance.iso27001 = this.checkISO27001Compliance(securityAnalysisResults);

    // NIST 检查
    compliance.nist = this.checkNISTCompliance(securityAnalysisResults);

    // GDPR 检查
    compliance.gdpr = this.checkGDPRCompliance(securityAnalysisResults);

    // PCI DSS 检查
    compliance.pciDss = this.checkPCIDSSCompliance(securityAnalysisResults);

    return compliance;
  }

  /**
   * 行业基线对比
   */
  compareWithIndustryBaseline(overallRiskScore, industry = 'general') {
    const baseline = this.industryBaselines[industry] || this.industryBaselines.general;
    const securityScore = 100 - overallRiskScore;

    return {
      industry: baseline.name,
      currentScore: securityScore,
      baselineScore: baseline.minSecurityScore,
      meetsBaseline: securityScore >= baseline.minSecurityScore,
      gap: Math.max(0, baseline.minSecurityScore - securityScore),
      requiredControls: baseline.requiredControls,
      recommendation: securityScore >= baseline.minSecurityScore ?
        '符合行业安全基线要求' :
        `需要提升${baseline.minSecurityScore - securityScore}分以达到行业基线`
    };
  }

  /**
   * 生成修复建议
   */
  generateRecommendations(assessment) {
    const recommendations = [];

    // 基于严重漏洞生成建议
    assessment.vulnerabilityAnalysis.criticalVulnerabilities.forEach(vuln => {
      recommendations.push({
        priority: 'critical',
        category: 'vulnerability_fix',
        title: `修复严重漏洞: ${vuln.type}`,
        description: vuln.description,
        impact: 'high',
        effort: this.estimateFixEffort(vuln),
        timeline: '24小时内',
        steps: this.generateFixSteps(vuln)
      });
    });

    // 基于合规性生成建议
    Object.entries(assessment.complianceStatus).forEach(([framework, status]) => {
      if (!status.compliant) {
        recommendations.push({
          priority: 'medium',
          category: 'compliance',
          title: `提升${framework.toUpperCase()}合规性`,
          description: `当前合规性评分: ${status.score}%`,
          impact: 'medium',
          effort: 'high',
          timeline: '1-3个月',
          steps: status.recommendations || []
        });
      }
    });

    // 基于行业基线生成建议
    if (!assessment.industryBaseline.meetsBaseline) {
      recommendations.push({
        priority: 'medium',
        category: 'baseline_improvement',
        title: '提升至行业安全基线',
        description: assessment.industryBaseline.recommendation,
        impact: 'medium',
        effort: 'medium',
        timeline: '2-4周',
        steps: this.generateBaselineImprovementSteps(assessment.industryBaseline)
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 生成行动计划
   */
  generateActionPlan(assessment) {
    const plan = {
      immediate: [], // 24小时内
      shortTerm: [], // 1周内
      mediumTerm: [], // 1个月内
      longTerm: []   // 3个月内
    };

    assessment.recommendations.forEach(rec => {
      switch (rec.timeline) {
        case '24小时内':
          plan.immediate.push(rec);
          break;
        case '1周内':
        case '2-4周':
          plan.shortTerm.push(rec);
          break;
        case '1个月内':
        case '1-3个月':
          plan.mediumTerm.push(rec);
          break;
        default:
          plan.longTerm.push(rec);
      }
    });

    return {
      phases: plan,
      totalActions: assessment.recommendations.length,
      estimatedCost: this.estimateTotalCost(assessment.recommendations),
      estimatedTime: this.estimateTotalTime(assessment.recommendations)
    };
  }

  /**
   * 生成执行摘要
   */
  generateExecutiveSummary(assessment) {
    const riskLevel = this.riskLevels[assessment.overallRiskLevel];

    return {
      overallStatus: {
        riskLevel: assessment.overallRiskLevel,
        riskScore: assessment.overallRiskScore,
        description: riskLevel.description,
        businessImpact: riskLevel.businessImpact
      },
      keyFindings: [
        `发现 ${assessment.vulnerabilityAnalysis.totalCount} 个安全问题`,
        `其中 ${assessment.riskDistribution.critical || 0} 个严重风险需要立即处理`,
        `安全评分: ${100 - assessment.overallRiskScore}/100`,
        `行业基线对比: ${assessment.industryBaseline.meetsBaseline ? '符合' : '不符合'}要求`
      ],
      priorityActions: assessment.recommendations
        .filter(r => r.priority === 'critical')
        .slice(0, 3)
        .map(r => r.title),
      complianceGaps: Object.entries(assessment.complianceStatus)
        .filter(([, status]) => !status.compliant)
        .map(([framework]) => framework.toUpperCase()),
      nextSteps: [
        '立即处理严重安全漏洞',
        '制定详细的修复计划',
        '建立持续安全监控',
        '定期进行安全评估'
      ]
    };
  }

  // 辅助方法
  categorizeVulnerability(vuln) {
    const type = vuln.type || 'unknown';
    const mapping = this.vulnerabilityWeights[type];
    return mapping ? mapping.category : 'other';
  }

  mapToOwaspTop10(vuln) {
    const type = vuln.type || '';
    const category = this.categorizeVulnerability(vuln);

    const mapping = {
      'injection': 'A03_2021',
      'broken_auth': 'A07_2021',
      'crypto_failures': 'A02_2021',
      'broken_access_control': 'A01_2021',
      'security_misconfiguration': 'A05_2021'
    };

    return mapping[category];
  }

  calculateVulnerabilityRiskScore(vuln) {
    const severityScores = {
      critical: 90,
      high: 70,
      medium: 40,
      low: 20
    };

    const baseScore = severityScores[vuln.severity] || 20;
    const typeWeight = this.vulnerabilityWeights[vuln.type]?.weight || 0.5;

    return Math.round(baseScore * typeWeight);
  }

  checkISO27001Compliance(securityResults) {
    // 简化的ISO 27001合规性检查
    let score = 0;
    const maxScore = 100;

    // 检查访问控制
    if (securityResults.details?.headers?.securityHeaders?.present?.some(h =>
      ['x-frame-options', 'content-security-policy'].includes(h.header))) {
      score += 20;
    }

    // 检查加密控制
    if (securityResults.details?.ssl?.httpsEnabled) {
      score += 30;
    }

    // 检查安全配置
    if (securityResults.details?.headers?.securityScore > 70) {
      score += 25;
    }

    // 检查漏洞管理
    const criticalVulns = securityResults.vulnerabilities?.filter(v => v.severity === 'critical') || [];
    if (criticalVulns.length === 0) {
      score += 25;
    }

    return {
      compliant: score >= 80,
      score: Math.round(score),
      gaps: score < 80 ? ['访问控制', '加密控制', '安全配置', '漏洞管理'].slice(0, Math.ceil((80 - score) / 20)) : [],
      recommendations: score < 80 ? ['加强访问控制措施', '完善加密机制', '优化安全配置'] : []
    };
  }

  checkNISTCompliance(securityResults) {
    // 简化的NIST框架检查
    const functions = {
      identify: 20,
      protect: 30,
      detect: 20,
      respond: 15,
      recover: 15
    };

    let totalScore = 0;

    // 识别功能
    if (securityResults.vulnerabilities?.length >= 0) totalScore += functions.identify;

    // 保护功能
    if (securityResults.details?.ssl?.httpsEnabled) totalScore += functions.protect * 0.5;
    if (securityResults.details?.headers?.securityScore > 60) totalScore += functions.protect * 0.5;

    // 检测功能
    if (securityResults.details?.headers?.present?.some(h => h.header === 'content-security-policy')) {
      totalScore += functions.detect;
    }

    return {
      compliant: totalScore >= 70,
      score: Math.round(totalScore),
      functionScores: functions,
      recommendations: totalScore < 70 ? ['完善安全监控', '加强事件响应能力'] : []
    };
  }

  checkGDPRCompliance(securityResults) {
    // 简化的GDPR合规性检查
    let score = 0;

    // 数据保护措施
    if (securityResults.details?.ssl?.httpsEnabled) score += 40;
    if (securityResults.details?.headers?.securityScore > 70) score += 30;
    if (securityResults.vulnerabilities?.filter(v => v.category === 'data_exposure').length === 0) score += 30;

    return {
      compliant: score >= 80,
      score: Math.round(score),
      recommendations: score < 80 ? ['加强数据传输加密', '完善隐私保护措施'] : []
    };
  }

  checkPCIDSSCompliance(securityResults) {
    // 简化的PCI DSS合规性检查
    let score = 0;

    // 网络安全
    if (securityResults.details?.ssl?.httpsEnabled) score += 25;

    // 数据保护
    if (securityResults.details?.ssl?.grade && ['A+', 'A', 'A-'].includes(securityResults.details.ssl.grade)) {
      score += 25;
    }

    // 访问控制
    if (securityResults.details?.headers?.securityScore > 70) score += 25;

    // 监控
    if (securityResults.vulnerabilities?.length < 5) score += 25;

    return {
      compliant: score >= 80,
      score: Math.round(score),
      requirements: this.complianceFrameworks.PCI_DSS.requirements,
      recommendations: score < 80 ? ['加强网络安全', '完善访问控制', '建立监控机制'] : []
    };
  }

  estimateFixEffort(vuln) {
    const effortMap = {
      critical: 'high',
      high: 'medium',
      medium: 'medium',
      low: 'low'
    };
    return effortMap[vuln.severity] || 'medium';
  }

  generateFixSteps(vuln) {
    // 基于漏洞类型生成修复步骤
    const stepTemplates = {
      sql_injection: [
        '使用参数化查询或预编译语句',
        '验证和过滤所有用户输入',
        '实施最小权限数据库访问',
        '定期进行代码审查'
      ],
      xss: [
        '对所有用户输入进行HTML编码',
        '实施内容安全策略(CSP)',
        '使用安全的模板引擎',
        '验证和过滤输入数据'
      ],
      missing_security_headers: [
        '配置必要的安全头',
        '启用HSTS强制HTTPS',
        '设置适当的CSP策略',
        '定期检查安全头配置'
      ]
    };

    return stepTemplates[vuln.type] || ['分析漏洞详情', '制定修复方案', '实施修复措施', '验证修复效果'];
  }

  generateBaselineImprovementSteps(baseline) {
    return [
      `实施${baseline.requiredControls.length}项必需安全控制`,
      '建立安全管理制度',
      '定期进行安全培训',
      '建立持续改进机制'
    ];
  }

  estimateTotalCost(recommendations) {
    // 简化的成本估算
    const costMap = {
      critical: 10000,
      high: 5000,
      medium: 2000,
      low: 500
    };

    return recommendations.reduce((total, rec) => {
      return total + (costMap[rec.priority] || 1000);
    }, 0);
  }

  estimateTotalTime(recommendations) {
    // 简化的时间估算
    const timeMap = {
      critical: 24,
      high: 72,
      medium: 168,
      low: 720
    };

    const totalHours = recommendations.reduce((total, rec) => {
      return total + (timeMap[rec.priority] || 168);
    }, 0);

    return {
      hours: totalHours,
      days: Math.ceil(totalHours / 8),
      weeks: Math.ceil(totalHours / 40)
    };
  }
}

module.exports = SecurityRiskAssessment;
