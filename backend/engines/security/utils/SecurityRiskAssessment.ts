/**
 * 安全风险评估引擎
 * 本地化程度：100%
 * 智能化安全风险评估：风险等级划分、修复建议、安全基线对比、合规性检查等
 */

interface RiskLevel {
  score: number;
  color: string;
  label: string;
  description: string;
  maxResponseTime: string;
  businessImpact: string;
}

interface RiskLevels {
  critical: RiskLevel;
  high: RiskLevel;
  medium: RiskLevel;
  low: RiskLevel;
  info: RiskLevel;
}

interface SecurityVulnerability {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  impact: string;
  likelihood: 'high' | 'medium' | 'low';
  cvssScore?: number;
  cweId?: string;
  category: string;
  affectedAssets: string[];
  remediation: {
    steps: string[];
    complexity: 'low' | 'medium' | 'high';
    priority: 'high' | 'medium' | 'low';
    estimatedTime: string;
    resources: string[];
  };
  references: string[];
  discoveredAt: Date;
  status: 'open' | 'in-progress' | 'resolved' | 'false-positive';
}

interface RiskAssessmentResult {
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'info';
    totalVulnerabilities: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
  };
  categories: CategoryRiskAssessment[];
  vulnerabilities: SecurityVulnerability[];
  recommendations: RiskRecommendation[];
  compliance: ComplianceAssessment;
  timeline: RiskTimeline;
  summary: RiskSummary;
}

interface CategoryRiskAssessment {
  category: string;
  score: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'info';
  vulnerabilityCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  recommendations: string[];
}

interface RiskRecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  category: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
  dependencies: string[];
  resources: string[];
  steps: string[];
  metrics: string[];
}

interface ComplianceAssessment {
  framework: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  requirements: ComplianceRequirement[];
  overallStatus: 'compliant' | 'partial' | 'non-compliant';
}

interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'compliant' | 'partial' | 'non-compliant';
  score: number;
  evidence: string[];
  gaps: string[];
  recommendations: string[];
}

interface RiskTimeline {
  phases: RiskPhase[];
  totalDuration: number;
  criticalPath: string[];
  milestones: RiskMilestone[];
}

interface RiskPhase {
  phase: number;
  name: string;
  description: string;
  duration: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  vulnerabilities: string[];
  dependencies: string[];
  resources: string[];
  deliverables: string[];
}

interface RiskMilestone {
  id: string;
  name: string;
  date: Date;
  description: string;
  criteria: string[];
  status: 'pending' | 'in-progress' | 'completed';
}

interface RiskSummary {
  keyFindings: string[];
  immediateActions: string[];
  longTermGoals: string[];
  riskTrend: 'improving' | 'stable' | 'deteriorating';
  businessImpact: {
    financial: number;
    reputational: number;
    operational: number;
    legal: number;
  };
}

class SecurityRiskAssessment {
  private riskLevels: RiskLevels;

  constructor() {
    // 风险等级定义
    this.riskLevels = {
      critical: {
        score: 90,
        color: '#dc3545',
        label: '严重',
        description: '需要立即处理的严重安全风险',
        maxResponseTime: '24小时',
        businessImpact: '可能导致数据泄露、系统瘫痪或重大经济损失',
      },
      high: {
        score: 70,
        color: '#fd7e14',
        label: '高风险',
        description: '需要优先处理的高风险安全问题',
        maxResponseTime: '72小时',
        businessImpact: '可能导致部分数据泄露或服务中断',
      },
      medium: {
        score: 40,
        color: '#ffc107',
        label: '中风险',
        description: '需要在合理时间内处理的中等风险问题',
        maxResponseTime: '2周',
        businessImpact: '可能影响系统性能或用户体验',
      },
      low: {
        score: 20,
        color: '#28a745',
        label: '低风险',
        description: '可以在常规维护中处理的低风险问题',
        maxResponseTime: '1个月',
        businessImpact: '影响较小，主要为潜在风险',
      },
      info: {
        score: 10,
        color: '#17a2b8',
        label: '信息',
        description: '供参考的安全信息和建议',
        maxResponseTime: '按需处理',
        businessImpact: '主要为改进建议，无直接风险',
      },
    };
  }

  /**
   * 评估安全风险
   */
  async assess(
    vulnerabilities: SecurityVulnerability[],
    options: {
      framework?: string;
      businessContext?: string;
      riskTolerance?: 'low' | 'medium' | 'high';
      includeRecommendations?: boolean;
      generateTimeline?: boolean;
    } = {}
  ): Promise<RiskAssessmentResult> {
    const {
      framework = 'ISO27001',
      businessContext: _businessContext = 'general',
      riskTolerance = 'medium',
      includeRecommendations = true,
      generateTimeline = true,
    } = options;

    try {
      // 计算总体风险
      const overall = this.calculateOverallRisk(vulnerabilities, riskTolerance);

      // 分类风险评估
      const categories = this.assessCategories(vulnerabilities);

      // 生成建议
      const recommendations = includeRecommendations
        ? this.generateRecommendations(vulnerabilities, categories)
        : [];

      // 合规性评估
      const compliance = await this.assessCompliance(vulnerabilities, framework);

      // 生成时间线
      const timeline = generateTimeline
        ? this.generateTimeline(vulnerabilities, recommendations)
        : this.createEmptyTimeline();

      // 生成摘要
      const summary = this.generateSummary(vulnerabilities, overall, categories);

      return {
        overall,
        categories,
        vulnerabilities,
        recommendations,
        compliance,
        timeline,
        summary,
      };
    } catch (error) {
      throw new Error(`风险评估失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 计算总体风险
   */
  private calculateOverallRisk(
    vulnerabilities: SecurityVulnerability[],
    riskTolerance: 'low' | 'medium' | 'high'
  ): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'info';
    totalVulnerabilities: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
  } {
    const totalVulnerabilities = vulnerabilities.length;
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;
    const lowCount = vulnerabilities.filter(v => v.severity === 'low').length;
    const infoCount = vulnerabilities.filter(v => v.severity === 'info').length;

    // 计算风险分数
    let score = 100;

    // 根据严重程度扣分
    score -= criticalCount * 25;
    score -= highCount * 15;
    score -= mediumCount * 8;
    score -= lowCount * 3;
    score -= infoCount * 1;

    // 根据可能性调整
    vulnerabilities.forEach(vuln => {
      const likelihoodMultiplier = {
        high: 1.5,
        medium: 1.0,
        low: 0.5,
      };
      score -=
        (100 - this.riskLevels[vuln.severity].score) * likelihoodMultiplier[vuln.likelihood] * 0.1;
    });

    // 根据风险容忍度调整
    const toleranceMultiplier = {
      low: 1.2,
      medium: 1.0,
      high: 0.8,
    };
    score *= toleranceMultiplier[riskTolerance];

    score = Math.max(0, Math.min(100, score));

    // 确定等级和风险级别
    const grade = this.getGrade(score);
    const riskLevel = this.getRiskLevel(score);

    return {
      score,
      grade,
      riskLevel,
      totalVulnerabilities,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      infoCount,
    };
  }

  /**
   * 分类风险评估
   */
  private assessCategories(vulnerabilities: SecurityVulnerability[]): CategoryRiskAssessment[] {
    const categories: Map<string, SecurityVulnerability[]> = new Map();

    // 按类别分组
    vulnerabilities.forEach(vuln => {
      const existing = categories.get(vuln.category);
      if (existing) {
        existing.push(vuln);
      } else {
        categories.set(vuln.category, [vuln]);
      }
    });

    // 评估每个类别
    const assessments: CategoryRiskAssessment[] = [];

    categories.forEach((vulns, category) => {
      const categoryScore = this.calculateCategoryScore(vulns);
      const categoryRiskLevel = this.getRiskLevel(categoryScore);

      const vulnerabilityCount = vulns.length;
      const criticalCount = vulns.filter(v => v.severity === 'critical').length;
      const highCount = vulns.filter(v => v.severity === 'high').length;
      const mediumCount = vulns.filter(v => v.severity === 'medium').length;
      const lowCount = vulns.filter(v => v.severity === 'low').length;
      const infoCount = vulns.filter(v => v.severity === 'info').length;

      const recommendations = this.generateCategoryRecommendations(vulns, category);

      assessments.push({
        category,
        score: categoryScore,
        riskLevel: categoryRiskLevel,
        vulnerabilityCount,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        infoCount,
        recommendations,
      });
    });

    return assessments.sort((a, b) => b.score - a.score);
  }

  /**
   * 计算类别分数
   */
  private calculateCategoryScore(vulnerabilities: SecurityVulnerability[]): number {
    if (vulnerabilities.length === 0) return 100;

    const severityWeights = {
      critical: 25,
      high: 15,
      medium: 8,
      low: 3,
      info: 1,
    };

    const likelihoodWeights = {
      high: 1.5,
      medium: 1.0,
      low: 0.5,
    };

    let totalRisk = 0;

    vulnerabilities.forEach(vuln => {
      const severityWeight = severityWeights[vuln.severity];
      const likelihoodWeight = likelihoodWeights[vuln.likelihood];
      totalRisk += severityWeight * likelihoodWeight;
    });

    const maxPossibleRisk = vulnerabilities.length * 25 * 1.5; // 最坏情况
    const score = Math.max(0, 100 - (totalRisk / maxPossibleRisk) * 100);

    return Math.round(score);
  }

  /**
   * 生成类别建议
   */
  private generateCategoryRecommendations(
    vulnerabilities: SecurityVulnerability[],
    category: string
  ): string[] {
    // 基于类别生成通用建议
    const categoryRecommendations: Record<string, string[]> = {
      authentication: [
        '实施多因素认证(MFA)',
        '加强密码策略要求',
        '定期审计用户权限',
        '实施账户锁定机制',
      ],
      authorization: [
        '实施最小权限原则',
        '定期审查访问权限',
        '建立角色基础访问控制',
        '监控权限变更',
      ],
      encryption: ['升级到强加密算法', '实施端到端加密', '定期轮换加密密钥', '使用安全的密钥管理'],
      network: ['实施网络分段', '配置防火墙规则', '监控网络流量', '使用VPN保护远程访问'],
      application: [
        '实施安全开发生命周期',
        '定期进行安全测试',
        '使用Web应用防火墙',
        '实施输入验证和输出编码',
      ],
      data: ['实施数据分类和保护', '建立数据备份策略', '监控数据访问', '实施数据丢失防护'],
    };

    const baseRecommendations = categoryRecommendations[category] || [
      '定期进行安全评估',
      '实施安全监控',
      '建立安全事件响应流程',
      '提供安全培训',
    ];

    // 基于具体漏洞生成针对性建议
    const specificRecommendations = vulnerabilities.map(
      vuln => vuln.remediation.steps[0] || `修复${vuln.title}`
    );

    return [...baseRecommendations, ...specificRecommendations].slice(0, 5);
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    vulnerabilities: SecurityVulnerability[],
    categories: CategoryRiskAssessment[]
  ): RiskRecommendation[] {
    const recommendations: RiskRecommendation[] = [];

    // 基于严重程度生成建议
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
    const highVulns = vulnerabilities.filter(v => v.severity === 'high');

    // 严重漏洞建议
    if (criticalVulns.length > 0) {
      recommendations.push({
        id: 'immediate-critical',
        priority: 'critical',
        title: '立即处理严重安全漏洞',
        description: `发现${criticalVulns.length}个严重安全漏洞，需要立即处理`,
        category: 'immediate',
        impact: '防止数据泄露和系统瘫痪',
        effort: 'high',
        timeframe: '24-48小时',
        dependencies: [],
        resources: ['安全团队', '开发团队', '运维团队'],
        steps: [
          '立即隔离受影响的系统',
          '评估漏洞影响范围',
          '制定修复计划',
          '实施紧急修复',
          '验证修复效果',
        ],
        metrics: ['漏洞修复率', '系统恢复时间', '数据安全状态'],
      });
    }

    // 高风险漏洞建议
    if (highVulns.length > 0) {
      recommendations.push({
        id: 'priority-high',
        priority: 'high',
        title: '优先处理高风险漏洞',
        description: `发现${highVulns.length}个高风险漏洞，需要优先处理`,
        category: 'priority',
        impact: '减少安全风险和业务影响',
        effort: 'medium',
        timeframe: '1-2周',
        dependencies: [],
        resources: ['安全团队', '开发团队'],
        steps: ['分析漏洞根因', '制定修复方案', '实施修复措施', '进行安全测试', '部署修复补丁'],
        metrics: ['漏洞修复进度', '测试覆盖率', '部署成功率'],
      });
    }

    // 基于类别生成建议
    categories.forEach(category => {
      if (category.riskLevel === 'critical' || category.riskLevel === 'high') {
        recommendations.push({
          id: `category-${category.category}`,
          priority: category.riskLevel === 'critical' ? 'high' : 'medium',
          title: `加强${category.category}安全`,
          description: `${category.category}类别存在${category.vulnerabilityCount}个漏洞，需要加强安全措施`,
          category: category.category,
          impact: `提升${category.category}安全性`,
          effort: 'medium',
          timeframe: '2-4周',
          dependencies: [],
          resources: ['相关团队'],
          steps: category.recommendations,
          metrics: ['安全评分提升', '漏洞数量减少', '合规性改善'],
        });
      }
    });

    // 通用安全改进建议
    recommendations.push({
      id: 'security-program',
      priority: 'medium',
      title: '建立安全改进计划',
      description: '制定全面的安全改进计划，持续提升安全水平',
      category: 'program',
      impact: '建立长期安全防护体系',
      effort: 'high',
      timeframe: '3-6个月',
      dependencies: [],
      resources: ['安全团队', '管理层', '全体员工'],
      steps: ['制定安全策略', '建立安全流程', '实施安全培训', '建立监控体系', '定期评估改进'],
      metrics: ['安全成熟度', '员工安全意识', '事件响应时间', '合规性水平'],
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 合规性评估
   */
  private async assessCompliance(
    vulnerabilities: SecurityVulnerability[],
    framework: string
  ): Promise<ComplianceAssessment> {
    const requirements = this.getFrameworkRequirements(framework);
    const assessment: ComplianceRequirement[] = [];

    requirements.forEach(req => {
      const relevantVulns = vulnerabilities.filter(
        vuln => req.categories.includes(vuln.category) || req.severityLevels.includes(vuln.severity)
      );

      const isCompliant = relevantVulns.length === 0;
      const isPartial = relevantVulns.some(
        vuln => vuln.severity === 'low' || vuln.severity === 'info'
      );

      const status = isCompliant ? 'compliant' : isPartial ? 'partial' : 'non-compliant';
      const score = isCompliant ? 100 : isPartial ? 60 : 20;

      const gaps = relevantVulns.map(vuln => vuln.title);
      const recommendations = this.getComplianceRecommendations(req, relevantVulns);

      assessment.push({
        id: req.id,
        name: req.name,
        description: req.description,
        category: req.category,
        status,
        score,
        evidence: [],
        gaps,
        recommendations,
      });
    });

    const overallScore = assessment.reduce((sum, req) => sum + req.score, 0) / assessment.length;
    const grade = this.getGrade(overallScore);
    const overallStatus =
      overallScore >= 80 ? 'compliant' : overallScore >= 60 ? 'partial' : 'non-compliant';

    return {
      framework,
      score: Math.round(overallScore),
      grade,
      requirements: assessment,
      overallStatus,
    };
  }

  /**
   * 获取框架要求
   */
  private getFrameworkRequirements(framework: string): Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    categories: string[];
    severityLevels: ('critical' | 'high' | 'medium' | 'low' | 'info')[];
  }> {
    type FrameworkRequirement = {
      id: string;
      name: string;
      description: string;
      category: string;
      categories: string[];
      severityLevels: ('critical' | 'high' | 'medium' | 'low' | 'info')[];
    };

    const frameworks: Record<string, FrameworkRequirement[]> = {
      ISO27001: [
        {
          id: 'A.9.1.1',
          name: '访问控制策略',
          description: '建立访问控制策略和程序',
          category: 'access-control',
          categories: ['authentication', 'authorization'],
          severityLevels: ['critical', 'high', 'medium'],
        },
        {
          id: 'A.10.1.1',
          name: '密码策略',
          description: '实施密码控制和密码管理',
          category: 'authentication',
          categories: ['authentication'],
          severityLevels: ['high', 'medium'],
        },
        {
          id: 'A.12.1.2',
          name: '恶意软件防护',
          description: '防范恶意软件感染',
          category: 'malware',
          categories: ['application', 'network'],
          severityLevels: ['critical', 'high', 'medium'],
        },
      ],
      GDPR: [
        {
          id: 'Art.32',
          name: '安全措施',
          description: '实施适当的技术和组织措施',
          category: 'security',
          categories: ['encryption', 'network', 'application'],
          severityLevels: ['critical', 'high', 'medium'],
        },
        {
          id: 'Art.25',
          name: '数据保护设计',
          description: '在系统设计时考虑数据保护',
          category: 'privacy',
          categories: ['data', 'application'],
          severityLevels: ['high', 'medium', 'low'],
        },
      ],
      SOC2: [
        {
          id: 'CC6.1',
          name: '逻辑访问控制',
          description: '实施逻辑访问控制措施',
          category: 'access-control',
          categories: ['authentication', 'authorization'],
          severityLevels: ['critical', 'high', 'medium'],
        },
        {
          id: 'CC7.1',
          name: '系统操作',
          description: '监控系统操作和异常',
          category: 'monitoring',
          categories: ['network', 'application'],
          severityLevels: ['high', 'medium', 'low'],
        },
      ],
    };

    return frameworks[framework] || frameworks['ISO27001'];
  }

  /**
   * 获取合规建议
   */
  private getComplianceRecommendations(
    req: { name: string },
    vulnerabilities: SecurityVulnerability[]
  ): string[] {
    const recommendations: string[] = [];

    if (vulnerabilities.length === 0) {
      recommendations.push('继续保持当前安全水平');
      return recommendations;
    }

    recommendations.push(`修复${req.name}相关的安全漏洞`);
    recommendations.push('加强相关安全控制措施');
    recommendations.push('定期进行合规性评估');

    return recommendations;
  }

  /**
   * 生成时间线
   */
  private generateTimeline(
    vulnerabilities: SecurityVulnerability[],
    recommendations: RiskRecommendation[]
  ): RiskTimeline {
    const phases: RiskPhase[] = [];
    let currentPhase = 1;
    let totalDuration = 0;

    // 第一阶段：紧急响应
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
    if (criticalVulns.length > 0) {
      const phase: RiskPhase = {
        phase: currentPhase++,
        name: '紧急响应',
        description: '处理严重安全漏洞',
        duration: 3, // 3天
        priority: 'critical',
        vulnerabilities: criticalVulns.map(v => v.id),
        dependencies: [],
        resources: ['安全团队', '开发团队', '运维团队'],
        deliverables: ['漏洞修复报告', '安全状态评估'],
      };
      phases.push(phase);
      totalDuration += phase.duration;
    }

    // 第二阶段：高优先级修复
    const highVulns = vulnerabilities.filter(v => v.severity === 'high');
    if (highVulns.length > 0) {
      const phase: RiskPhase = {
        phase: currentPhase++,
        name: '高优先级修复',
        description: '处理高风险漏洞',
        duration: 10, // 10天
        priority: 'high',
        vulnerabilities: highVulns.map(v => v.id),
        dependencies: criticalVulns.length > 0 ? [phases[0].name] : [],
        resources: ['开发团队', '测试团队'],
        deliverables: ['修复补丁', '测试报告'],
      };
      phases.push(phase);
      totalDuration += phase.duration;
    }

    // 第三阶段：中低优先级修复
    const mediumLowVulns = vulnerabilities.filter(
      v => v.severity === 'medium' || v.severity === 'low'
    );
    if (mediumLowVulns.length > 0) {
      const phase: RiskPhase = {
        phase: currentPhase++,
        name: '中低优先级修复',
        description: '处理中低风险漏洞',
        duration: 20, // 20天
        priority: 'medium',
        vulnerabilities: mediumLowVulns.map(v => v.id),
        dependencies: highVulns.length > 0 ? [phases[phases.length - 1].name] : [],
        resources: ['开发团队'],
        deliverables: ['修复补丁', '更新文档'],
      };
      phases.push(phase);
      totalDuration += phase.duration;
    }

    // 第四阶段：安全改进
    const securityImprovements = recommendations.filter(r => r.category === 'program');
    if (securityImprovements.length > 0) {
      const phase: RiskPhase = {
        phase: currentPhase++,
        name: '安全改进',
        description: '实施长期安全改进计划',
        duration: 90, // 90天
        priority: 'medium',
        vulnerabilities: [],
        dependencies: phases.map(p => p.name),
        resources: ['安全团队', '管理层', '全体员工'],
        deliverables: ['安全策略', '培训材料', '监控体系'],
      };
      phases.push(phase);
      totalDuration += phase.duration;
    }

    // 生成里程碑
    const milestones: RiskMilestone[] = [
      {
        id: 'm1',
        name: '严重漏洞修复完成',
        date: new Date(Date.now() + (phases[0]?.duration || 0) * 24 * 60 * 60 * 1000),
        description: '所有严重安全漏洞修复完成',
        criteria: ['无严重漏洞', '系统恢复正常'],
        status: 'pending',
      },
      {
        id: 'm2',
        name: '高风险漏洞修复完成',
        date: new Date(Date.now() + totalDuration * 0.5 * 24 * 60 * 60 * 1000),
        description: '所有高风险漏洞修复完成',
        criteria: ['无高风险漏洞', '安全测试通过'],
        status: 'pending',
      },
      {
        id: 'm3',
        name: '安全改进完成',
        date: new Date(Date.now() + totalDuration * 24 * 60 * 60 * 1000),
        description: '安全改进计划实施完成',
        criteria: ['所有措施到位', '效果评估完成'],
        status: 'pending',
      },
    ];

    const criticalPath = phases
      .filter(p => p.priority === 'critical' || p.priority === 'high')
      .map(p => p.name);

    return {
      phases,
      totalDuration,
      criticalPath,
      milestones,
    };
  }

  /**
   * 创建空时间线
   */
  private createEmptyTimeline(): RiskTimeline {
    return {
      phases: [],
      totalDuration: 0,
      criticalPath: [],
      milestones: [],
    };
  }

  /**
   * 生成摘要
   */
  private generateSummary(
    vulnerabilities: SecurityVulnerability[],
    overall: ReturnType<SecurityRiskAssessment['calculateOverallRisk']>,
    categories: CategoryRiskAssessment[]
  ): RiskSummary {
    const keyFindings: string[] = [];
    const immediateActions: string[] = [];
    const longTermGoals: string[] = [];

    // 关键发现
    if (overall.criticalCount > 0) {
      keyFindings.push(`发现${overall.criticalCount}个严重安全漏洞`);
    }
    if (overall.highCount > 0) {
      keyFindings.push(`发现${overall.highCount}个高风险安全漏洞`);
    }

    const highRiskCategories = categories.filter(
      c => c.riskLevel === 'critical' || c.riskLevel === 'high'
    );
    if (highRiskCategories.length > 0) {
      keyFindings.push(`${highRiskCategories.map(c => c.category).join('、')}类别风险较高`);
    }

    // 立即行动
    if (overall.criticalCount > 0) {
      immediateActions.push('立即修复严重安全漏洞');
    }
    if (overall.highCount > 0) {
      immediateActions.push('优先处理高风险漏洞');
    }
    immediateActions.push('加强安全监控和日志记录');

    // 长期目标
    longTermGoals.push('建立完善的安全管理体系');
    longTermGoals.push('提升整体安全防护能力');
    longTermGoals.push('实现持续安全改进');

    // 业务影响评估
    const businessImpact = {
      financial:
        overall.criticalCount * 100000 + overall.highCount * 50000 + overall.mediumCount * 10000,
      reputational: overall.criticalCount * 80 + overall.highCount * 40 + overall.mediumCount * 20,
      operational: overall.criticalCount * 90 + overall.highCount * 50 + overall.mediumCount * 25,
      legal: overall.criticalCount * 70 + overall.highCount * 35 + overall.mediumCount * 15,
    };

    return {
      keyFindings,
      immediateActions,
      longTermGoals,
      riskTrend: 'stable', // 基于历史数据判断
      businessImpact,
    };
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
   * 获取风险级别
   */
  private getRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    if (score < 30) return 'critical';
    if (score < 50) return 'high';
    if (score < 70) return 'medium';
    if (score < 85) return 'low';
    return 'info';
  }

  /**
   * 获取风险等级配置
   */
  getRiskLevels(): RiskLevels {
    return { ...this.riskLevels };
  }

  /**
   * 设置风险等级配置
   */
  setRiskLevels(levels: Partial<RiskLevels>): void {
    this.riskLevels = { ...this.riskLevels, ...levels };
  }

  /**
   * 导出评估报告
   */
  exportReport(result: RiskAssessmentResult): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        result,
        riskLevels: this.riskLevels,
      },
      null,
      2
    );
  }
}

export default SecurityRiskAssessment;
