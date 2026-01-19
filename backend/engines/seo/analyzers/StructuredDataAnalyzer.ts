/**
 * 结构化数据分析器
 * 本地化程度：100%
 * 分析页面的结构化数据，包括JSON-LD、Microdata、RDFa等
 */

import puppeteer from 'puppeteer';

interface StructuredDataResult {
  url: string;
  timestamp: Date;
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    valid: boolean;
    totalItems: number;
  };
  jsonLd: JsonLdAnalysis;
  microdata: MicrodataAnalysis;
  rdfa: RdfaAnalysis;
  validation: ValidationAnalysis;
  recommendations: StructuredDataRecommendation[];
}

interface JsonLdAnalysis {
  present: boolean;
  items: JsonLdItem[];
  total: number;
  valid: number;
  issues: JsonLdIssue[];
  score: number;
}

interface JsonLdItem {
  type: string;
  id?: string;
  context: string;
  data: any;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface JsonLdIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  count: number;
}

interface MicrodataAnalysis {
  present: boolean;
  items: MicrodataItem[];
  total: number;
  valid: number;
  issues: MicrodataIssue[];
  score: number;
}

interface MicrodataItem {
  itemType: string;
  itemScope: boolean;
  properties: MicrodataProperty[];
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface MicrodataProperty {
  name: string;
  value: string;
  type: string;
}

interface MicrodataIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  count: number;
}

interface RdfaAnalysis {
  present: boolean;
  items: RdfaItem[];
  total: number;
  valid: number;
  issues: RdfaIssue[];
  score: number;
}

interface RdfaItem {
  vocab?: string;
  typeof?: string;
  property?: string;
  content?: string;
  resource?: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface RdfaIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  count: number;
}

interface ValidationAnalysis {
  syntaxErrors: ValidationError[];
  semanticErrors: ValidationError[];
  warnings: ValidationWarning[];
  total: number;
  score: number;
}

interface ValidationError {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location: string;
  suggestion: string;
}

interface ValidationWarning {
  type: string;
  message: string;
  location: string;
  suggestion: string;
}

interface StructuredDataRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  examples: CodeExample[];
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

interface CodeExample {
  title: string;
  language: string;
  code: string;
  explanation: string;
}

class StructuredDataAnalyzer {
  private supportedTypes: string[];

  constructor() {
    this.supportedTypes = [
      'Organization',
      'Person',
      'Product',
      'Article',
      'BlogPosting',
      'NewsArticle',
      'Recipe',
      'Event',
      'LocalBusiness',
      'WebSite',
      'WebPage',
      'BreadcrumbList',
      'FAQPage',
      'HowTo',
    ];
  }

  /**
   * 执行结构化数据分析
   */
  async analyze(
    url: string,
    options: {
      timeout?: number;
      viewport?: { width: number; height: number };
      device?: 'desktop' | 'mobile';
      validateSyntax?: boolean;
      checkSemantics?: boolean;
    } = {}
  ): Promise<StructuredDataResult> {
    const {
      timeout = 30000,
      viewport = { width: 1920, height: 1080 },
      device = 'desktop',
      validateSyntax = true,
      checkSemantics = true,
    } = options;

    const timestamp = new Date();

    let browser;
    let page;

    try {
      // 启动浏览器
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      page = await browser.newPage();

      // 设置视口
      await page.setViewport(viewport);

      // 设置用户代理
      const userAgent =
        device === 'mobile'
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      await page.setUserAgent(userAgent);

      // 导航到页面
      await page.goto(url, { waitUntil: 'networkidle0', timeout });

      // 提取结构化数据
      const structuredData = await this.extractStructuredData(page);

      // 分析JSON-LD
      const jsonLd = this.analyzeJsonLd(structuredData.jsonLd);

      // 分析Microdata
      const microdata = this.analyzeMicrodata(structuredData.microdata);

      // 分析RDFa
      const rdfa = this.analyzeRdfa(structuredData.rdfa);

      // 验证分析
      const validation =
        validateSyntax || checkSemantics
          ? this.validateStructuredData(jsonLd, microdata, rdfa)
          : this.createEmptyValidationAnalysis();

      // 计算总体分数
      const overall = this.calculateOverallScore(jsonLd, microdata, rdfa, validation);

      // 生成建议
      const recommendations = this.generateRecommendations(jsonLd, microdata, rdfa, validation);

      return {
        url,
        timestamp,
        overall,
        jsonLd,
        microdata,
        rdfa,
        validation,
        recommendations,
      };
    } catch (error) {
      throw new Error(
        `结构化数据分析失败: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  }

  /**
   * 提取结构化数据
   */
  private async extractStructuredData(page: any): Promise<{
    jsonLd: any[];
    microdata: any[];
    rdfa: any[];
  }> {
    return await page.evaluate(() => {
      // 提取JSON-LD
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      const jsonLd: any[] = [];

      jsonLdScripts.forEach(script => {
        try {
          const content = script.textContent || '';
          if (content.trim()) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              jsonLd.push(...parsed);
            } else {
              jsonLd.push(parsed);
            }
          }
        } catch (e) {
          // JSON解析错误
          jsonLd.push({
            '@context': 'https://schema.org',
            '@type': 'Error',
            error: 'Invalid JSON',
            rawContent: script.textContent,
          });
        }
      });

      // 提取Microdata
      const microdataElements = document.querySelectorAll('[itemscope]');
      const microdata: any[] = [];

      microdataElements.forEach(element => {
        const htmlElement = element as HTMLElement;
        const item = {
          itemType: htmlElement.getAttribute('itemtype') || '',
          itemScope: htmlElement.hasAttribute('itemscope'),
          properties: this.extractMicrodataProperties(htmlElement),
        };
        microdata.push(item);
      });

      // 提取RDFa
      const rdfaElements = document.querySelectorAll('[vocab], [typeof], [property], [resource]');
      const rdfa: any[] = [];

      rdfaElements.forEach(element => {
        const htmlElement = element as HTMLElement;
        const item = {
          vocab: htmlElement.getAttribute('vocab') || undefined,
          typeof: htmlElement.getAttribute('typeof') || undefined,
          property: htmlElement.getAttribute('property') || undefined,
          content: htmlElement.getAttribute('content') || undefined,
          resource: htmlElement.getAttribute('resource') || undefined,
        };
        rdfa.push(item);
      });

      return { jsonLd, microdata, rdfa };
    });
  }

  /**
   * 提取Microdata属性
   */
  private extractMicrodataProperties(element: HTMLElement): MicrodataProperty[] {
    const properties: MicrodataProperty[] = [];

    // 这里需要在页面上下文中执行，简化处理
    return properties;
  }

  /**
   * 分析JSON-LD
   */
  private analyzeJsonLd(jsonLdData: any[]): JsonLdAnalysis {
    const items: JsonLdItem[] = jsonLdData.map((data, index) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      let valid = true;

      // 检查基本结构
      if (!data['@context']) {
        errors.push('缺少@context');
        valid = false;
      }

      if (!data['@type']) {
        errors.push('缺少@type');
        valid = false;
      } else if (
        typeof data['@type'] === 'string' &&
        !this.supportedTypes.includes(data['@type'])
      ) {
        warnings.push(`不支持的类型: ${data['@type']}`);
      }

      // 检查必需属性
      if (data['@type'] === 'Article' && !data.name) {
        errors.push('Article缺少name属性');
        valid = false;
      }

      if (data['@type'] === 'Organization' && !data.name) {
        errors.push('Organization缺少name属性');
        valid = false;
      }

      return {
        type: data['@type'] || 'Unknown',
        id: data['@id'],
        context: data['@context'] || '',
        data,
        valid,
        errors,
        warnings,
      };
    });

    const total = items.length;
    const valid = items.filter(item => item.valid).length;

    const issuesMap: Record<string, JsonLdIssue> = {};
    items.forEach(item => {
      item.errors.forEach(error => {
        if (!issuesMap[error]) {
          issuesMap[error] = {
            type: error,
            severity: 'high',
            description: error,
            suggestion: this.getJsonLdSuggestion(error),
            count: 0,
          };
        }
        issuesMap[error].count++;
      });
    });

    const issues = Object.values(issuesMap);
    const score = total > 0 ? (valid / total) * 100 : 100;

    return {
      present: total > 0,
      items,
      total,
      valid,
      issues,
      score,
    };
  }

  /**
   * 分析Microdata
   */
  private analyzeMicrodata(microdataData: any[]): MicrodataAnalysis {
    const items: MicrodataItem[] = microdataData.map((data, index) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      let valid = true;

      if (!data.itemType) {
        errors.push('缺少itemtype');
        valid = false;
      }

      if (!data.itemScope) {
        errors.push('缺少itemscope');
        valid = false;
      }

      if (data.properties.length === 0) {
        warnings.push('没有属性定义');
      }

      return {
        itemType: data.itemType,
        itemScope: data.itemScope,
        properties: data.properties,
        valid,
        errors,
        warnings,
      };
    });

    const total = items.length;
    const valid = items.filter(item => item.valid).length;

    const issuesMap: Record<string, MicrodataIssue> = {};
    items.forEach(item => {
      item.errors.forEach(error => {
        if (!issuesMap[error]) {
          issuesMap[error] = {
            type: error,
            severity: 'high',
            description: error,
            suggestion: this.getMicrodataSuggestion(error),
            count: 0,
          };
        }
        issuesMap[error].count++;
      });
    });

    const issues = Object.values(issuesMap);
    const score = total > 0 ? (valid / total) * 100 : 100;

    return {
      present: total > 0,
      items,
      total,
      valid,
      issues,
      score,
    };
  }

  /**
   * 分析RDFa
   */
  private analyzeRdfa(rdfaData: any[]): RdfaAnalysis {
    const items: RdfaItem[] = rdfaData.map((data, index) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      let valid = true;

      if (!data.vocab && !data.typeof && !data.property) {
        errors.push('缺少RDFa属性');
        valid = false;
      }

      if (data.property && !data.content && !data.resource) {
        warnings.push('property缺少content或resource');
      }

      return {
        vocab: data.vocab,
        typeof: data.typeof,
        property: data.property,
        content: data.content,
        resource: data.resource,
        valid,
        errors,
        warnings,
      };
    });

    const total = items.length;
    const valid = items.filter(item => item.valid).length;

    const issuesMap: Record<string, RdfaIssue> = {};
    items.forEach(item => {
      item.errors.forEach(error => {
        if (!issuesMap[error]) {
          issuesMap[error] = {
            type: error,
            severity: 'high',
            description: error,
            suggestion: this.getRdfaSuggestion(error),
            count: 0,
          };
        }
        issuesMap[error].count++;
      });
    });

    const issues = Object.values(issuesMap);
    const score = total > 0 ? (valid / total) * 100 : 100;

    return {
      present: total > 0,
      items,
      total,
      valid,
      issues,
      score,
    };
  }

  /**
   * 验证结构化数据
   */
  private validateStructuredData(
    jsonLd: JsonLdAnalysis,
    microdata: MicrodataAnalysis,
    rdfa: RdfaAnalysis
  ): ValidationAnalysis {
    const syntaxErrors: ValidationError[] = [];
    const semanticErrors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // JSON-LD语法错误
    jsonLd.items.forEach(item => {
      item.errors.forEach(error => {
        syntaxErrors.push({
          type: 'json-ld-syntax',
          severity: 'high',
          message: error,
          location: `JSON-LD ${item.type}`,
          suggestion: this.getJsonLdSuggestion(error),
        });
      });

      item.warnings.forEach(warning => {
        warnings.push({
          type: 'json-ld-warning',
          message: warning,
          location: `JSON-LD ${item.type}`,
          suggestion: '检查类型定义',
        });
      });
    });

    // Microdata语法错误
    microdata.items.forEach(item => {
      item.errors.forEach(error => {
        syntaxErrors.push({
          type: 'microdata-syntax',
          severity: 'high',
          message: error,
          location: `Microdata ${item.itemType}`,
          suggestion: this.getMicrodataSuggestion(error),
        });
      });
    });

    // RDFa语法错误
    rdfa.items.forEach(item => {
      item.errors.forEach(error => {
        syntaxErrors.push({
          type: 'rdfa-syntax',
          severity: 'high',
          message: error,
          location: 'RDFa',
          suggestion: this.getRdfaSuggestion(error),
        });
      });
    });

    const total = syntaxErrors.length + semanticErrors.length + warnings.length;
    const score =
      total > 0
        ? Math.max(
            0,
            100 - (syntaxErrors.length * 20 + semanticErrors.length * 15 + warnings.length * 5)
          )
        : 100;

    return {
      syntaxErrors,
      semanticErrors,
      warnings,
      total,
      score,
    };
  }

  /**
   * 获取JSON-LD建议
   */
  private getJsonLdSuggestion(error: string): string {
    const suggestions: Record<string, string> = {
      '缺少@context': '添加 "@context": "https://schema.org"',
      '缺少@type': '添加 "@type": "Article" 或其他适当类型',
      Article缺少name属性: '添加 "name": "文章标题"',
      Organization缺少name属性: '添加 "name": "组织名称"',
    };

    return suggestions[error] || '检查JSON-LD语法';
  }

  /**
   * 获取Microdata建议
   */
  private getMicrodataSuggestion(error: string): string {
    const suggestions: Record<string, string> = {
      缺少itemtype: '添加 itemtype="https://schema.org/Article"',
      缺少itemscope: '添加 itemscope 属性',
    };

    return suggestions[error] || '检查Microdata语法';
  }

  /**
   * 获取RDFa建议
   */
  private getRdfaSuggestion(error: string): string {
    const suggestions: Record<string, string> = {
      缺少RDFa属性: '添加 vocab="https://schema.org/" 或其他RDFa属性',
    };

    return suggestions[error] || '检查RDFa语法';
  }

  /**
   * 计算总体分数
   */
  private calculateOverallScore(
    jsonLd: JsonLdAnalysis,
    microdata: MicrodataAnalysis,
    rdfa: RdfaAnalysis,
    validation: ValidationAnalysis
  ): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    valid: boolean;
    totalItems: number;
  } {
    const weights = {
      jsonLd: 0.4,
      microdata: 0.3,
      rdfa: 0.2,
      validation: 0.1,
    };

    const overallScore =
      jsonLd.score * weights.jsonLd +
      microdata.score * weights.microdata +
      rdfa.score * weights.rdfa +
      validation.score * weights.validation;

    const grade = this.getGrade(overallScore);
    const valid = overallScore >= 80;
    const totalItems = jsonLd.total + microdata.total + rdfa.total;

    return {
      score: Math.round(overallScore),
      grade,
      valid,
      totalItems,
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    jsonLd: JsonLdAnalysis,
    microdata: MicrodataAnalysis,
    rdfa: RdfaAnalysis,
    validation: ValidationAnalysis
  ): StructuredDataRecommendation[] {
    const recommendations: StructuredDataRecommendation[] = [];

    // JSON-LD建议
    if (!jsonLd.present) {
      recommendations.push({
        priority: 'high',
        category: 'json-ld',
        title: '添加JSON-LD结构化数据',
        description: '使用JSON-LD格式添加结构化数据提高SEO效果',
        examples: [
          {
            title: 'JSON-LD示例',
            language: 'json',
            code: `{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "文章标题",
  "author": {
    "@type": "Person",
    "name": "作者姓名"
  },
  "datePublished": "2024-01-01",
  "image": "https://example.com/image.jpg"
}`,
            explanation: '使用JSON-LD格式定义文章结构化数据',
          },
        ],
        impact: '改善搜索引擎理解和搜索结果显示',
        effort: 'medium',
      });
    }

    // 验证错误建议
    if (validation.syntaxErrors.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'validation',
        title: '修复结构化数据错误',
        description: '修复语法和语义错误确保结构化数据有效',
        examples: [
          {
            title: '错误修复示例',
            language: 'json',
            code: `// 错误示例
{
  "@type": "Article"
  // 缺少@context
}

// 正确示例
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "文章标题"
}`,
            explanation: '添加必需的@context属性',
          },
        ],
        impact: '确保结构化数据被正确解析',
        effort: 'medium',
      });
    }

    // 类型建议
    const presentTypes = [...new Set(jsonLd.items.map(item => item.type))];
    const recommendedTypes = ['Article', 'Organization', 'WebSite'];
    const missingTypes = recommendedTypes.filter(type => !presentTypes.includes(type));

    if (missingTypes.length > 0 && jsonLd.present) {
      recommendations.push({
        priority: 'medium',
        category: 'types',
        title: '添加更多结构化数据类型',
        description: `考虑添加${missingTypes.join(', ')}等类型`,
        examples: [
          {
            title: '组织信息示例',
            language: 'json',
            code: `{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "公司名称",
  "url": "https://example.com",
  "logo": "https://example.com/logo.jpg",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-234-567-8900",
    "contactType": "customer service"
  }
}`,
            explanation: '添加组织信息结构化数据',
          },
        ],
        impact: '丰富搜索引擎对网站的理解',
        effort: 'low',
      });
    }

    return recommendations;
  }

  /**
   * 创建空的验证分析结果
   */
  private createEmptyValidationAnalysis(): ValidationAnalysis {
    return {
      syntaxErrors: [],
      semanticErrors: [],
      warnings: [],
      total: 0,
      score: 100,
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
   * 获取支持的类型
   */
  getSupportedTypes(): string[] {
    return [...this.supportedTypes];
  }

  /**
   * 设置支持的类型
   */
  setSupportedTypes(types: string[]): void {
    this.supportedTypes = [...types];
  }

  /**
   * 导出分析报告
   */
  exportReport(result: StructuredDataResult): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        result,
        supportedTypes: this.supportedTypes,
      },
      null,
      2
    );
  }
}

export default StructuredDataAnalyzer;
