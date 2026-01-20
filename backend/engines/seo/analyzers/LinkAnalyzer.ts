/**
 * 链接分析器
 * 本地化程度：100%
 * 分析页面的内部链接和外部链接结构
 */

import puppeteer, { Page } from 'puppeteer';

interface ExtractedLink {
  href: string;
  text: string;
  title: string;
  rel: string;
  className: string;
  id: string;
  position: number;
}

interface ExtractedAnchor {
  name: string;
  href: string;
  position: number;
}

interface NavigationLink {
  href: string;
  text: string;
}

interface NavigationBlock {
  type: string;
  links: NavigationLink[];
  position: string;
}

interface LinkData {
  links: ExtractedLink[];
  anchors: ExtractedAnchor[];
  navigation: NavigationBlock[];
  breadcrumbs: BreadcrumbItem[];
  pagination: PaginationStructure | null;
}

interface LinkRules {
  maxInternalLinks: number;
  maxExternalLinks: number;
  maxEmptyLinks: number;
  minAnchorTextLength: number;
  maxAnchorTextLength: number;
}

interface LinkAnalysisResult {
  url: string;
  timestamp: Date;
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    totalLinks: number;
    internalRatio: number;
    externalRatio: number;
  };
  internal: InternalLinkAnalysis;
  external: ExternalLinkAnalysis;
  anchors: AnchorLinkAnalysis;
  navigation: NavigationAnalysis;
  breadcrumbs: BreadcrumbAnalysis;
  pagination: PaginationAnalysis;
  recommendations: LinkRecommendation[];
}

interface InternalLinkAnalysis {
  links: InternalLink[];
  total: number;
  unique: number;
  depth: number;
  distribution: LinkDistribution;
  issues: LinkIssue[];
  score: number;
}

interface InternalLink {
  url: string;
  anchorText: string;
  title: string;
  rel: string;
  depth: number;
  position: number;
  isFollow: boolean;
  isValid: boolean;
  issues: string[];
}

interface ExternalLinkAnalysis {
  links: ExternalLink[];
  total: number;
  unique: number;
  domains: string[];
  distribution: LinkDistribution;
  issues: LinkIssue[];
  score: number;
}

interface ExternalLink {
  url: string;
  anchorText: string;
  title: string;
  rel: string;
  domain: string;
  position: number;
  isFollow: boolean;
  isValid: boolean;
  issues: string[];
}

interface AnchorLinkAnalysis {
  links: AnchorLink[];
  total: number;
  valid: number;
  issues: LinkIssue[];
  score: number;
}

interface AnchorLink {
  anchor: string;
  target: string;
  exists: boolean;
  position: number;
  issues: string[];
}

interface NavigationAnalysis {
  menus: NavigationMenu[];
  depth: number;
  consistency: number;
  issues: LinkIssue[];
  score: number;
}

interface NavigationMenu {
  type: string;
  links: InternalLink[];
  depth: number;
  position: string;
}

interface BreadcrumbAnalysis {
  present: boolean;
  structure: BreadcrumbItem[];
  depth: number;
  issues: LinkIssue[];
  score: number;
}

interface BreadcrumbItem {
  text: string;
  url: string;
  position: number;
  isCurrent: boolean;
}

interface PaginationAnalysis {
  present: boolean;
  structure: PaginationStructure;
  issues: LinkIssue[];
  score: number;
}

interface PaginationStructure {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextUrl: string;
  prevUrl: string;
}

interface LinkDistribution {
  byDepth: Record<number, number>;
  byPosition: Record<string, number>;
  byType: Record<string, number>;
}

interface LinkIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  count: number;
}

interface LinkRecommendation {
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

class LinkAnalyzer {
  private rules: LinkRules;

  constructor() {
    this.rules = {
      maxInternalLinks: 100,
      maxExternalLinks: 50,
      maxEmptyLinks: 0,
      minAnchorTextLength: 3,
      maxAnchorTextLength: 60,
    };
  }

  /**
   * 执行链接分析
   */
  async analyze(
    url: string,
    options: {
      timeout?: number;
      viewport?: { width: number; height: number };
      device?: 'desktop' | 'mobile';
      checkAnchors?: boolean;
      checkNavigation?: boolean;
    } = {}
  ): Promise<LinkAnalysisResult> {
    const {
      timeout = 30000,
      viewport = { width: 1920, height: 1080 },
      device = 'desktop',
      checkAnchors = true,
      checkNavigation = true,
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

      // 提取链接数据
      const linkData = await this.extractLinkData(page, url);

      // 分析内部链接
      const internal = this.analyzeInternalLinks(linkData, url);

      // 分析外部链接
      const external = this.analyzeExternalLinks(linkData, url);

      // 分析锚点链接
      const anchors = checkAnchors
        ? this.analyzeAnchorLinks(linkData)
        : this.createEmptyAnchorAnalysis();

      // 分析导航结构
      const navigation = checkNavigation
        ? this.analyzeNavigationLinks(linkData)
        : this.createEmptyNavigationAnalysis();

      // 分析面包屑
      const breadcrumbs = this.analyzeBreadcrumbs(linkData);

      // 分析分页
      const pagination = this.analyzePagination(linkData);

      // 计算总体分数
      const overall = this.calculateOverallScore(
        internal,
        external,
        anchors,
        navigation,
        breadcrumbs,
        pagination
      );

      // 生成建议
      const recommendations = this.generateRecommendations(
        internal,
        external,
        anchors,
        navigation,
        breadcrumbs,
        pagination
      );

      return {
        url,
        timestamp,
        overall,
        internal,
        external,
        anchors,
        navigation,
        breadcrumbs,
        pagination,
        recommendations,
      };
    } catch (error) {
      throw new Error(`链接分析失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  }

  /**
   * 提取链接数据
   */
  private async extractLinkData(page: Page, _baseUrl: string): Promise<LinkData> {
    return await page.evaluate(() => {
      // 提取所有链接
      const links: ExtractedLink[] = [];

      document.querySelectorAll('a[href]').forEach((link, index) => {
        const element = link as HTMLAnchorElement;
        links.push({
          href: element.href || '',
          text: element.textContent || '',
          title: element.title || '',
          rel: element.rel || '',
          className: element.className || '',
          id: element.id || '',
          position: index,
        });
      });

      // 提取锚点
      const anchors: ExtractedAnchor[] = [];

      document.querySelectorAll('a[name], a[id]').forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        const name = htmlElement.getAttribute('name') || htmlElement.id || '';
        if (name) {
          anchors.push({
            name,
            href: `#${name}`,
            position: index,
          });
        }
      });

      // 提取导航结构
      const navigation: NavigationBlock[] = [];

      // 主导航
      const mainNav = document.querySelector('nav, .nav, .navigation, #navigation');
      if (mainNav) {
        const navLinks = Array.from(mainNav.querySelectorAll('a')).map(link => ({
          href: (link as HTMLAnchorElement).href || '',
          text: (link as HTMLElement).textContent || '',
        }));
        navigation.push({
          type: 'main',
          links: navLinks,
          position: 'header',
        });
      }

      // 侧边栏导航
      const sidebarNav = document.querySelector('.sidebar, .side-nav, aside');
      if (sidebarNav) {
        const navLinks = Array.from(sidebarNav.querySelectorAll('a')).map(link => ({
          href: (link as HTMLAnchorElement).href || '',
          text: (link as HTMLElement).innerText || '',
        }));
        navigation.push({
          type: 'sidebar',
          links: navLinks,
          position: 'sidebar',
        });
      }

      // 页脚导航
      const footerNav = document.querySelector('footer, .footer');
      if (footerNav) {
        const navLinks = Array.from(footerNav.querySelectorAll('a')).map(link => ({
          href: (link as HTMLAnchorElement).href || '',
          text: (link as HTMLElement).textContent || '',
        }));
        navigation.push({
          type: 'footer',
          links: navLinks,
          position: 'footer',
        });
      }

      const breadcrumbs: BreadcrumbItem[] = [];
      const breadcrumbSelectors = [
        'nav[aria-label="breadcrumb"]',
        '.breadcrumb',
        '.breadcrumbs',
        '.breadcrumb-nav',
        '.breadcrumb-trail',
      ];
      const breadcrumbContainer =
        (breadcrumbSelectors
          .map(selector => document.querySelector(selector))
          .find((element): element is Element => Boolean(element)) as HTMLElement | null) || null;
      if (breadcrumbContainer) {
        const elements = Array.from(
          breadcrumbContainer.querySelectorAll('a, span, li')
        ) as HTMLElement[];
        elements
          .map((element, index) => {
            const text = element.textContent?.trim() || '';
            if (!text) return null;
            const anchor =
              element.tagName.toLowerCase() === 'a' ? (element as HTMLAnchorElement) : null;
            const url = anchor?.href || '';
            const isCurrent =
              element.getAttribute('aria-current') === 'page' ||
              element.classList.contains('current') ||
              element.classList.contains('active');
            return { text, url, position: index, isCurrent } as BreadcrumbItem;
          })
          .filter((item): item is BreadcrumbItem => Boolean(item))
          .forEach(item => breadcrumbs.push(item));

        if (breadcrumbs.length > 0 && !breadcrumbs.some(item => item.isCurrent)) {
          breadcrumbs[breadcrumbs.length - 1].isCurrent = true;
        }
      }

      const paginationSelectors = [
        '.pagination',
        '.pager',
        '.paging',
        '[aria-label="pagination"]',
        '.page-navigation',
        'nav[aria-label="pagination"]',
      ];
      const paginationContainer =
        (paginationSelectors
          .map(selector => document.querySelector(selector))
          .find((element): element is Element => Boolean(element)) as HTMLElement | null) || null;

      let pagination: PaginationStructure | null = null;
      if (paginationContainer) {
        const elements = Array.from(
          paginationContainer.querySelectorAll('a, button, span')
        ) as HTMLElement[];
        let currentPage = 1;
        let totalPages = 1;
        let hasNext = false;
        let hasPrev = false;
        let nextUrl = '';
        let prevUrl = '';

        const parsePageNumber = (element: HTMLElement): number | null => {
          const text = element.textContent?.trim() || '';
          const numeric = Number(text);
          if (!Number.isNaN(numeric)) return numeric;
          const data = element.getAttribute('data-page');
          if (data) {
            const parsed = Number(data);
            return Number.isNaN(parsed) ? null : parsed;
          }
          return null;
        };

        elements.forEach(element => {
          const text = element.textContent?.trim() || '';
          const anchor =
            element.tagName.toLowerCase() === 'a' ? (element as HTMLAnchorElement) : null;
          const rel = anchor?.rel || '';
          const href = anchor?.href || '';
          const pageNumber = parsePageNumber(element);
          const isCurrent =
            element.getAttribute('aria-current') === 'page' ||
            element.classList.contains('active') ||
            element.classList.contains('current');

          if (pageNumber) {
            totalPages = Math.max(totalPages, pageNumber);
            if (isCurrent) currentPage = pageNumber;
          }

          if (/下一页|next|›|»/i.test(text) || rel.includes('next')) {
            hasNext = true;
            if (href) nextUrl = href;
          }
          if (/上一页|prev|‹|«/i.test(text) || rel.includes('prev')) {
            hasPrev = true;
            if (href) prevUrl = href;
          }
        });

        pagination = {
          currentPage,
          totalPages,
          hasNext,
          hasPrev,
          nextUrl,
          prevUrl,
        };
      }

      return {
        links,
        anchors,
        navigation,
        breadcrumbs,
        pagination,
      };
    });
  }

  /**
   * 分析内部链接
   */
  private analyzeInternalLinks(linkData: LinkData, baseUrl: string): InternalLinkAnalysis {
    const urlObj = new URL(baseUrl);
    const domain = urlObj.hostname;

    const internalLinks = linkData.links.filter(link => {
      try {
        const linkUrl = new URL(link.href);
        return linkUrl.hostname === domain;
      } catch {
        return false;
      }
    });

    const links: InternalLink[] = internalLinks.map(link => {
      const issues: string[] = [];
      let isValid = true;

      // 检查锚文本
      if (!link.text || link.text.trim().length === 0) {
        issues.push('缺少锚文本');
        isValid = false;
      } else if (link.text.length < this.rules.minAnchorTextLength) {
        issues.push('锚文本过短');
      } else if (link.text.length > this.rules.maxAnchorTextLength) {
        issues.push('锚文本过长');
      }

      // 检查URL有效性
      if (!link.href || link.href === '#' || link.href === 'javascript:void(0)') {
        issues.push('无效链接URL');
        isValid = false;
      }

      // 检查rel属性
      const isFollow = !link.rel.includes('nofollow');

      return {
        url: link.href,
        anchorText: link.text,
        title: link.title,
        rel: link.rel,
        depth: this.calculateLinkDepth(link.href, baseUrl),
        position: link.position,
        isFollow,
        isValid,
        issues,
      };
    });

    const total = links.length;
    const unique = new Set(links.map(l => l.url)).size;
    const depth = Math.max(...links.map(l => l.depth), 0);
    const distribution = this.calculateLinkDistribution(links);

    const issues = this.categorizeLinkIssues(links);
    const score = this.calculateLinkScore(links, issues);

    return {
      links,
      total,
      unique,
      depth,
      distribution,
      issues,
      score,
    };
  }

  /**
   * 分析外部链接
   */
  private analyzeExternalLinks(linkData: LinkData, baseUrl: string): ExternalLinkAnalysis {
    const urlObj = new URL(baseUrl);
    const domain = urlObj.hostname;

    const externalLinks = linkData.links.filter(link => {
      try {
        const linkUrl = new URL(link.href);
        return linkUrl.hostname !== domain;
      } catch {
        return false;
      }
    });

    const links: ExternalLink[] = externalLinks.map(link => {
      const issues: string[] = [];
      let isValid = true;

      // 检查锚文本
      if (!link.text || link.text.trim().length === 0) {
        issues.push('缺少锚文本');
        isValid = false;
      }

      // 检查URL有效性
      if (!link.href) {
        issues.push('无效链接URL');
        isValid = false;
      }

      // 获取域名
      let domain = '';
      try {
        domain = new URL(link.href).hostname;
      } catch {
        issues.push('无法解析域名');
        isValid = false;
      }

      // 检查rel属性
      const isFollow = !link.rel.includes('nofollow');

      return {
        url: link.href,
        anchorText: link.text,
        title: link.title,
        rel: link.rel,
        domain,
        position: link.position,
        isFollow,
        isValid,
        issues,
      };
    });

    const total = links.length;
    const unique = new Set(links.map(l => l.url)).size;
    const domains = [...new Set(links.map(l => l.domain).filter(d => d))];
    const distribution = this.calculateLinkDistribution(links);

    const issues = this.categorizeLinkIssues(links);
    const score = this.calculateLinkScore(links, issues);

    return {
      links,
      total,
      unique,
      domains,
      distribution,
      issues,
      score,
    };
  }

  /**
   * 分析锚点链接
   */
  private analyzeAnchorLinks(linkData: LinkData): AnchorLinkAnalysis {
    const anchors = linkData.anchors || [];
    const links = linkData.links.filter(link => link.href.startsWith('#'));

    const anchorLinks: AnchorLink[] = links.map(link => {
      const issues: string[] = [];
      const targetId = link.href.substring(1);
      const exists = anchors.some(anchor => anchor.name === targetId);

      if (!exists) {
        issues.push('锚点目标不存在');
      }

      return {
        anchor: link.href,
        target: targetId,
        exists,
        position: link.position,
        issues,
      };
    });

    const total = anchorLinks.length;
    const valid = anchorLinks.filter(l => l.exists).length;
    const issues = this.categorizeLinkIssues(anchorLinks);
    const score = total > 0 ? (valid / total) * 100 : 100;

    return {
      links: anchorLinks,
      total,
      valid,
      issues,
      score,
    };
  }

  /**
   * 分析导航链接
   */
  private analyzeNavigationLinks(linkData: LinkData): NavigationAnalysis {
    const navigationData = linkData.navigation || [];
    const menus: NavigationMenu[] = navigationData.map(nav => ({
      type: nav.type,
      links: nav.links.map(link => ({
        url: link.href,
        anchorText: link.text,
        title: '',
        rel: '',
        depth: 1,
        position: 0,
        isFollow: true,
        isValid: !!link.href,
        issues: [],
      })),
      depth: 1,
      position: nav.position,
    }));

    const depth = Math.max(...menus.map(m => m.links.length), 0);
    const consistency = this.calculateNavigationConsistency(menus);
    const issues = this.analyzeNavigationIssues(menus);
    const score = this.calculateNavigationScore(menus, issues);

    return {
      menus,
      depth,
      consistency,
      issues,
      score,
    };
  }

  /**
   * 分析面包屑
   */
  private analyzeBreadcrumbs(linkData: LinkData): BreadcrumbAnalysis {
    const structure = linkData.breadcrumbs || [];
    const present = structure.length > 0;
    const depth = structure.length;

    const issues: LinkIssue[] = [];
    let score = 100;

    if (!present) {
      issues.push({
        type: 'missing',
        severity: 'medium',
        description: '缺少面包屑导航',
        suggestion: '添加面包屑导航提高用户体验',
        count: 1,
      });
      score = 0;
    } else {
      if (!structure.some(item => item.isCurrent)) {
        issues.push({
          type: 'missing-current',
          severity: 'low',
          description: '面包屑未标记当前页面',
          suggestion: '为当前页面添加aria-current或高亮样式',
          count: 1,
        });
        score -= 10;
      }
      if (depth < 2) {
        issues.push({
          type: 'shallow-breadcrumb',
          severity: 'low',
          description: '面包屑层级过浅',
          suggestion: '补充上级路径以提升导航指引',
          count: 1,
        });
        score -= 10;
      }
    }

    return {
      present,
      structure,
      depth,
      issues,
      score,
    };
  }

  /**
   * 分析分页
   */
  private analyzePagination(linkData: LinkData): PaginationAnalysis {
    const structure =
      linkData.pagination ||
      ({
        currentPage: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
        nextUrl: '',
        prevUrl: '',
      } as PaginationStructure);
    const present = Boolean(linkData.pagination);

    const issues: LinkIssue[] = [];
    let score = 100;

    if (present) {
      if (
        structure.totalPages > 1 &&
        !structure.hasNext &&
        structure.currentPage < structure.totalPages
      ) {
        issues.push({
          type: 'missing-next',
          severity: 'medium',
          description: '缺少下一页链接',
          suggestion: '补充下一页导航链接',
          count: 1,
        });
        score -= 15;
      }
      if (structure.totalPages > 1 && !structure.hasPrev && structure.currentPage > 1) {
        issues.push({
          type: 'missing-prev',
          severity: 'medium',
          description: '缺少上一页链接',
          suggestion: '补充上一页导航链接',
          count: 1,
        });
        score -= 15;
      }
      if (structure.totalPages > 1 && structure.currentPage <= 0) {
        issues.push({
          type: 'missing-current',
          severity: 'low',
          description: '分页未标记当前页',
          suggestion: '为当前页添加高亮或aria-current',
          count: 1,
        });
        score -= 10;
      }
    }

    return {
      present,
      structure,
      issues,
      score,
    };
  }

  /**
   * 计算链接深度
   */
  private calculateLinkDepth(linkUrl: string, baseUrl: string): number {
    try {
      const base = new URL(baseUrl);
      const link = new URL(linkUrl);

      if (link.hostname !== base.hostname) {
        return 0; // 外部链接
      }

      const basePath = base.pathname;
      const linkPath = link.pathname;

      if (linkPath === basePath) {
        return 1; // 同级页面
      }

      const pathSegments = linkPath.split('/').filter(segment => segment.length > 0);
      return pathSegments.length;
    } catch {
      return 0;
    }
  }

  /**
   * 计算链接分布
   */
  private calculateLinkDistribution(links: Array<InternalLink | ExternalLink>): LinkDistribution {
    const distribution: LinkDistribution = {
      byDepth: {},
      byPosition: {},
      byType: {},
    };

    links.forEach(link => {
      // 按深度分布
      const depth = 'depth' in link ? link.depth || 1 : 1;
      distribution.byDepth[depth] = (distribution.byDepth[depth] || 0) + 1;

      // 按位置分布
      const position = link.position < 10 ? 'top' : link.position < 50 ? 'middle' : 'bottom';
      distribution.byPosition[position] = (distribution.byPosition[position] || 0) + 1;

      // 按类型分布
      const type = link.isFollow ? 'follow' : 'nofollow';
      distribution.byType[type] = (distribution.byType[type] || 0) + 1;
    });

    return distribution;
  }

  /**
   * 分类链接问题
   */
  private categorizeLinkIssues(
    links: Array<InternalLink | ExternalLink | AnchorLink>
  ): LinkIssue[] {
    const issuesMap: Record<string, LinkIssue> = {};

    links.forEach(link => {
      link.issues.forEach((issue: string) => {
        if (!issuesMap[issue]) {
          issuesMap[issue] = {
            type: issue,
            severity: this.getIssueSeverity(issue),
            description: issue,
            suggestion: this.getIssueSuggestion(issue),
            count: 0,
          };
        }
        issuesMap[issue].count++;
      });
    });

    return Object.values(issuesMap);
  }

  /**
   * 获取问题严重程度
   */
  private getIssueSeverity(issue: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      缺少锚文本: 'high',
      锚文本过短: 'medium',
      锚文本过长: 'medium',
      无效链接URL: 'critical',
      无法解析域名: 'high',
      锚点目标不存在: 'medium',
    };

    return severityMap[issue] || 'low';
  }

  /**
   * 获取问题建议
   */
  private getIssueSuggestion(issue: string): string {
    const suggestionMap: Record<string, string> = {
      缺少锚文本: '为所有链接添加描述性的锚文本',
      锚文本过短: '增加锚文本长度，使其更具描述性',
      锚文本过长: '缩短锚文本，保持简洁明了',
      无效链接URL: '修复或移除无效的链接',
      无法解析域名: '检查链接URL格式',
      锚点目标不存在: '添加对应的锚点目标或移除锚点链接',
    };

    return suggestionMap[issue] || '请检查链接配置';
  }

  /**
   * 计算链接分数
   */
  private calculateLinkScore(
    links: Array<InternalLink | ExternalLink | AnchorLink>,
    issues: LinkIssue[]
  ): number {
    if (links.length === 0) return 100;

    let score = 100;

    issues.forEach(issue => {
      const penalty = this.getIssuePenalty(issue.severity);
      score -= penalty * issue.count;
    });

    return Math.max(0, score);
  }

  /**
   * 获取问题扣分
   */
  private getIssuePenalty(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    const penalties = {
      low: 2,
      medium: 5,
      high: 10,
      critical: 25,
    };

    return penalties[severity];
  }

  /**
   * 计算导航一致性
   */
  private calculateNavigationConsistency(menus: NavigationMenu[]): number {
    if (menus.length <= 1) return 100;
    const linkSets = menus.map(
      menu =>
        new Set(
          menu.links
            .map(
              link =>
                `${this.normalizeLinkText(link.anchorText)}|${this.normalizeLinkUrl(link.url)}`
            )
            .filter(item => item !== '|')
        )
    );
    const similarities: number[] = [];
    for (let i = 0; i < linkSets.length; i += 1) {
      for (let j = i + 1; j < linkSets.length; j += 1) {
        const union = new Set([...linkSets[i], ...linkSets[j]]);
        const intersectionCount = [...linkSets[i]].filter(item => linkSets[j].has(item)).length;
        if (union.size > 0) {
          similarities.push(intersectionCount / union.size);
        }
      }
    }
    const avgSimilarity = similarities.length
      ? similarities.reduce((sum, value) => sum + value, 0) / similarities.length
      : 1;
    const avgSize = menus.reduce((sum, menu) => sum + menu.links.length, 0) / menus.length;
    const sizeVariation = avgSize
      ? menus.reduce((sum, menu) => sum + Math.abs(menu.links.length - avgSize), 0) /
        (menus.length * avgSize)
      : 0;
    const sizePenalty = Math.min(0.5, sizeVariation * 0.3);
    return Math.max(0, Math.min(100, avgSimilarity * 100 * (1 - sizePenalty)));
  }

  private normalizeLinkText(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private normalizeLinkUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname.replace(/\/$/, '');
    } catch {
      return url.split('?')[0].replace(/\/$/, '');
    }
  }

  /**
   * 分析导航问题
   */
  private analyzeNavigationIssues(menus: NavigationMenu[]): LinkIssue[] {
    const issues: LinkIssue[] = [];

    if (menus.length === 0) {
      issues.push({
        type: 'missing-navigation',
        severity: 'medium',
        description: '缺少导航结构',
        suggestion: '添加清晰的导航菜单',
        count: 1,
      });
    }

    menus.forEach(menu => {
      if (menu.links.length === 0) {
        issues.push({
          type: 'empty-menu',
          severity: 'medium',
          description: `${menu.type}导航为空`,
          suggestion: `为${menu.type}导航添加链接`,
          count: 1,
        });
      }
    });

    return issues;
  }

  /**
   * 计算导航分数
   */
  private calculateNavigationScore(menus: NavigationMenu[], issues: LinkIssue[]): number {
    let score = 100;

    issues.forEach(issue => {
      const penalty = this.getIssuePenalty(issue.severity);
      score -= penalty * issue.count;
    });

    return Math.max(0, score);
  }

  /**
   * 计算总体分数
   */
  private calculateOverallScore(
    internal: InternalLinkAnalysis,
    external: ExternalLinkAnalysis,
    anchors: AnchorLinkAnalysis,
    navigation: NavigationAnalysis,
    breadcrumbs: BreadcrumbAnalysis,
    pagination: PaginationAnalysis
  ): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    totalLinks: number;
    internalRatio: number;
    externalRatio: number;
  } {
    const weights = {
      internal: 0.3,
      external: 0.2,
      anchors: 0.1,
      navigation: 0.2,
      breadcrumbs: 0.1,
      pagination: 0.1,
    };

    const overallScore =
      internal.score * weights.internal +
      external.score * weights.external +
      anchors.score * weights.anchors +
      navigation.score * weights.navigation +
      breadcrumbs.score * weights.breadcrumbs +
      pagination.score * weights.pagination;

    const totalLinks = internal.total + external.total;
    const internalRatio = totalLinks > 0 ? internal.total / totalLinks : 0;
    const externalRatio = totalLinks > 0 ? external.total / totalLinks : 0;

    const grade = this.getGrade(overallScore);

    return {
      score: Math.round(overallScore),
      grade,
      totalLinks,
      internalRatio,
      externalRatio,
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    internal: InternalLinkAnalysis,
    external: ExternalLinkAnalysis,
    anchors: AnchorLinkAnalysis,
    navigation: NavigationAnalysis,
    breadcrumbs: BreadcrumbAnalysis,
    _pagination: PaginationAnalysis
  ): LinkRecommendation[] {
    const recommendations: LinkRecommendation[] = [];

    // 内部链接建议
    if (internal.issues.some(issue => issue.severity === 'high' || issue.severity === 'critical')) {
      recommendations.push({
        priority: 'high',
        category: 'internal',
        title: '优化内部链接',
        description: '修复内部链接问题，改善网站结构',
        examples: [
          {
            title: '内部链接优化示例',
            language: 'html',
            code: `<a href="/about" title="关于我们">关于我们</a>
<a href="/services/web-design" title="网页设计服务">网页设计</a>
<a href="/blog/seo-tips" title="SEO技巧文章">SEO技巧</a>`,
            explanation: '使用描述性锚文本，确保链接有效',
          },
        ],
        impact: '改善用户体验和SEO',
        effort: 'medium',
      });
    }

    // 外部链接建议
    if (external.total > this.rules.maxExternalLinks) {
      recommendations.push({
        priority: 'medium',
        category: 'external',
        title: '控制外部链接数量',
        description: `当前有${external.total}个外部链接，建议控制在${this.rules.maxExternalLinks}个以内`,
        examples: [
          {
            title: '外部链接优化示例',
            language: 'html',
            code: `<a href="https://example.com" rel="nofollow" title="外部资源">外部资源</a>
<a href="https://partner.com" rel="noopener noreferrer" title="合作伙伴">合作伙伴</a>`,
            explanation: '为外部链接添加适当的rel属性',
          },
        ],
        impact: '减少链接权重流失',
        effort: 'low',
      });
    }

    // 导航建议
    if (navigation.issues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'navigation',
        title: '优化导航结构',
        description: '改善网站导航，提高用户体验',
        examples: [
          {
            title: '导航结构示例',
            language: 'html',
            code: `<nav>
  <ul>
    <li><a href="/">首页</a></li>
    <li><a href="/about">关于我们</a></li>
    <li><a href="/services">服务</a></li>
    <li><a href="/contact">联系我们</a></li>
  </ul>
</nav>`,
            explanation: '使用语义化的导航结构',
          },
        ],
        impact: '改善用户体验和网站结构',
        effort: 'medium',
      });
    }

    // 面包屑建议
    if (!breadcrumbs.present) {
      recommendations.push({
        priority: 'medium',
        category: 'breadcrumbs',
        title: '添加面包屑导航',
        description: '添加面包屑导航提高用户体验',
        examples: [
          {
            title: '面包屑示例',
            language: 'html',
            code: `<nav aria-label="breadcrumb">
  <ol class="breadcrumb">
    <li><a href="/">首页</a></li>
    <li><a href="/services">服务</a></li>
    <li aria-current="page">网页设计</li>
  </ol>
</nav>`,
            explanation: '使用语义化的面包屑结构',
          },
        ],
        impact: '改善用户体验和SEO',
        effort: 'low',
      });
    }

    return recommendations;
  }

  /**
   * 创建空的锚点分析结果
   */
  private createEmptyAnchorAnalysis(): AnchorLinkAnalysis {
    return {
      links: [],
      total: 0,
      valid: 0,
      issues: [],
      score: 100,
    };
  }

  /**
   * 创建空的导航分析结果
   */
  private createEmptyNavigationAnalysis(): NavigationAnalysis {
    return {
      menus: [],
      depth: 0,
      consistency: 100,
      issues: [],
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
   * 获取规则配置
   */
  getRules(): LinkRules {
    return { ...this.rules };
  }

  /**
   * 设置规则配置
   */
  setRules(rules: Partial<LinkRules>): void {
    this.rules = { ...this.rules, ...rules };
  }

  /**
   * 导出分析报告
   */
  exportReport(result: LinkAnalysisResult): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        result,
        rules: this.rules,
      },
      null,
      2
    );
  }
}

export default LinkAnalyzer;
