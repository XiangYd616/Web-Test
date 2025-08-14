/**
 * 链接分析器
 * 本地化程度：100%
 * 分析页面的内部链接和外部链接结构
 */

class LinkAnalyzer {
  constructor() {
    this.rules = {
      maxInternalLinks: 100,
      maxExternalLinks: 50,
      maxEmptyLinks: 0,
      minAnchorTextLength: 3,
      maxAnchorTextLength: 60
    };
  }

  /**
   * 执行链接分析
   */
  async analyze(pageData) {
    const { $, url } = pageData;
    
    const analysis = {
      internal: this.analyzeInternalLinks($, url),
      external: this.analyzeExternalLinks($, url),
      anchors: this.analyzeAnchorLinks($),
      navigation: this.analyzeNavigationLinks($),
      breadcrumbs: this.analyzeBreadcrumbs($),
      pagination: this.analyzePagination($)
    };
    
    // 汇总分析结果
    analysis.summary = this.createSummary(analysis);
    analysis.score = this.calculateScore(analysis);
    analysis.issues = this.identifyIssues(analysis);
    
    return analysis;
  }

  /**
   * 分析内部链接
   */
  analyzeInternalLinks($, currentUrl) {
    const internalLinks = [];
    const currentDomain = this.extractDomain(currentUrl);
    
    $('a[href]').each((i, el) => {
      const $link = $(el);
      const href = $link.attr('href');
      const text = $link.text().trim();
      const title = $link.attr('title');
      
      if (this.isInternalLink(href, currentDomain)) {
        internalLinks.push({
          href,
          text,
          title,
          textLength: text.length,
          hasText: text.length > 0,
          hasTitle: !!title,
          isImageLink: $link.find('img').length > 0,
          isButtonLink: $link.hasClass('btn') || $link.hasClass('button'),
          position: i,
          element: el
        });
      }
    });
    
    // 分析链接质量
    const emptyLinks = internalLinks.filter(link => !link.hasText && !link.isImageLink);
    const shortAnchorTexts = internalLinks.filter(link => 
      link.hasText && link.textLength < this.rules.minAnchorTextLength
    );
    const longAnchorTexts = internalLinks.filter(link => 
      link.hasText && link.textLength > this.rules.maxAnchorTextLength
    );
    
    // 检测重复链接
    const linkFrequency = {};
    internalLinks.forEach(link => {
      linkFrequency[link.href] = (linkFrequency[link.href] || 0) + 1;
    });
    
    const duplicateLinks = Object.entries(linkFrequency)
      .filter(([href, count]) => count > 1)
      .map(([href, count]) => ({ href, count }));
    
    return {
      links: internalLinks,
      count: internalLinks.length,
      emptyLinks: emptyLinks.length,
      shortAnchorTexts: shortAnchorTexts.length,
      longAnchorTexts: longAnchorTexts.length,
      duplicateLinks: duplicateLinks.length,
      duplicates: duplicateLinks,
      averageAnchorLength: internalLinks.length > 0 ? 
        Math.round(internalLinks.reduce((sum, link) => sum + link.textLength, 0) / internalLinks.length) : 0,
      hasExcessiveLinks: internalLinks.length > this.rules.maxInternalLinks
    };
  }

  /**
   * 分析外部链接
   */
  analyzeExternalLinks($, currentUrl) {
    const externalLinks = [];
    const currentDomain = this.extractDomain(currentUrl);
    
    $('a[href]').each((i, el) => {
      const $link = $(el);
      const href = $link.attr('href');
      const text = $link.text().trim();
      const title = $link.attr('title');
      const target = $link.attr('target');
      const rel = $link.attr('rel');
      
      if (this.isExternalLink(href, currentDomain)) {
        externalLinks.push({
          href,
          text,
          title,
          target,
          rel,
          textLength: text.length,
          hasText: text.length > 0,
          hasTitle: !!title,
          opensInNewTab: target === '_blank',
          hasNofollow: rel && rel.includes('nofollow'),
          hasNoopener: rel && rel.includes('noopener'),
          hasNoreferrer: rel && rel.includes('noreferrer'),
          domain: this.extractDomain(href),
          isImageLink: $link.find('img').length > 0,
          position: i
        });
      }
    });
    
    // 分析外部链接安全性
    const unsafeExternalLinks = externalLinks.filter(link => 
      link.opensInNewTab && !link.hasNoopener
    );
    
    // 统计外部域名
    const domainFrequency = {};
    externalLinks.forEach(link => {
      if (link.domain) {
        domainFrequency[link.domain] = (domainFrequency[link.domain] || 0) + 1;
      }
    });
    
    return {
      links: externalLinks,
      count: externalLinks.length,
      domains: Object.keys(domainFrequency).length,
      domainFrequency,
      unsafeLinks: unsafeExternalLinks.length,
      nofollowLinks: externalLinks.filter(link => link.hasNofollow).length,
      newTabLinks: externalLinks.filter(link => link.opensInNewTab).length,
      hasExcessiveLinks: externalLinks.length > this.rules.maxExternalLinks
    };
  }

  /**
   * 分析锚点链接
   */
  analyzeAnchorLinks($) {
    const anchorLinks = [];
    
    $('a[href^="#"]').each((i, el) => {
      const $link = $(el);
      const href = $link.attr('href');
      const text = $link.text().trim();
      const targetId = href.substring(1);
      const targetExists = targetId && $(`#${targetId}`).length > 0;
      
      anchorLinks.push({
        href,
        text,
        targetId,
        targetExists,
        hasText: text.length > 0,
        isValid: targetExists || href === '#'
      });
    });
    
    const brokenAnchors = anchorLinks.filter(link => !link.isValid);
    
    return {
      links: anchorLinks,
      count: anchorLinks.length,
      brokenAnchors: brokenAnchors.length,
      validAnchors: anchorLinks.length - brokenAnchors.length
    };
  }

  /**
   * 分析导航链接
   */
  analyzeNavigationLinks($) {
    const navigationSelectors = [
      'nav',
      '.navigation',
      '.nav',
      '.menu',
      '#navigation',
      '#nav',
      '#menu',
      '[role="navigation"]'
    ];
    
    const navigationLinks = [];
    
    navigationSelectors.forEach(selector => {
      $(selector).find('a[href]').each((i, el) => {
        const $link = $(el);
        const href = $link.attr('href');
        const text = $link.text().trim();
        
        navigationLinks.push({
          href,
          text,
          selector,
          hasText: text.length > 0,
          isActive: $link.hasClass('active') || $link.hasClass('current')
        });
      });
    });
    
    // 去重
    const uniqueNavigationLinks = navigationLinks.filter((link, index, self) => 
      index === self.findIndex(l => l.href === link.href)
    );
    
    return {
      links: uniqueNavigationLinks,
      count: uniqueNavigationLinks.length,
      hasNavigation: uniqueNavigationLinks.length > 0,
      activeLinks: uniqueNavigationLinks.filter(link => link.isActive).length
    };
  }

  /**
   * 分析面包屑导航
   */
  analyzeBreadcrumbs($) {
    const breadcrumbSelectors = [
      '.breadcrumb',
      '.breadcrumbs',
      '.crumbs',
      '[role="navigation"] ol',
      '[role="navigation"] ul',
      'nav ol',
      'nav ul'
    ];
    
    let breadcrumbs = null;
    
    for (const selector of breadcrumbSelectors) {
      const $breadcrumb = $(selector).first();
      if ($breadcrumb.length > 0) {
        const items = [];
        
        $breadcrumb.find('a, span, li').each((i, el) => {
          const $item = $(el);
          const text = $item.text().trim();
          const href = $item.attr('href');
          
          if (text) {
            items.push({
              text,
              href,
              isLink: !!href,
              position: i
            });
          }
        });
        
        if (items.length > 1) {
          breadcrumbs = {
            selector,
            items,
            count: items.length,
            hasStructuredData: $breadcrumb.find('[itemtype*="BreadcrumbList"]').length > 0 ||
                             $breadcrumb.find('[typeof*="BreadcrumbList"]').length > 0
          };
          break;
        }
      }
    }
    
    return {
      exists: !!breadcrumbs,
      breadcrumbs,
      hasStructuredData: breadcrumbs?.hasStructuredData || false
    };
  }

  /**
   * 分析分页链接
   */
  analyzePagination($) {
    const paginationSelectors = [
      '.pagination',
      '.pager',
      '.page-navigation',
      '.page-nav'
    ];
    
    let pagination = null;
    
    for (const selector of paginationSelectors) {
      const $pagination = $(selector).first();
      if ($pagination.length > 0) {
        const links = [];
        
        $pagination.find('a').each((i, el) => {
          const $link = $(el);
          const href = $link.attr('href');
          const text = $link.text().trim();
          const rel = $link.attr('rel');
          
          links.push({
            href,
            text,
            rel,
            isPrev: rel === 'prev' || text.toLowerCase().includes('prev'),
            isNext: rel === 'next' || text.toLowerCase().includes('next'),
            isNumeric: /^\d+$/.test(text)
          });
        });
        
        if (links.length > 0) {
          pagination = {
            selector,
            links,
            count: links.length,
            hasPrev: links.some(link => link.isPrev),
            hasNext: links.some(link => link.isNext),
            hasNumeric: links.some(link => link.isNumeric)
          };
          break;
        }
      }
    }
    
    return {
      exists: !!pagination,
      pagination
    };
  }

  /**
   * 创建分析摘要
   */
  createSummary(analysis) {
    const totalLinks = analysis.internal.count + analysis.external.count + analysis.anchors.count;
    
    return {
      totalLinks,
      internalLinks: analysis.internal.count,
      externalLinks: analysis.external.count,
      anchorLinks: analysis.anchors.count,
      navigationLinks: analysis.navigation.count,
      hasBreadcrumbs: analysis.breadcrumbs.exists,
      hasPagination: analysis.pagination.exists,
      linkQuality: {
        emptyLinks: analysis.internal.emptyLinks + (analysis.external.links?.filter(l => !l.hasText).length || 0),
        duplicateLinks: analysis.internal.duplicateLinks,
        brokenAnchors: analysis.anchors.brokenAnchors,
        unsafeExternalLinks: analysis.external.unsafeLinks
      }
    };
  }

  /**
   * 计算链接评分
   */
  calculateScore(analysis) {
    let score = 0;
    let maxScore = 0;
    
    // 内部链接质量评分 (权重: 40%)
    maxScore += 40;
    if (analysis.internal.count > 0) {
      let internalScore = 40;
      if (analysis.internal.emptyLinks > 0) internalScore -= 10;
      if (analysis.internal.duplicateLinks > 5) internalScore -= 10;
      if (analysis.internal.hasExcessiveLinks) internalScore -= 10;
      score += Math.max(0, internalScore);
    } else {
      score += 20; // 有内部链接比没有好，但不是必需的
    }
    
    // 外部链接质量评分 (权重: 25%)
    maxScore += 25;
    if (analysis.external.count > 0) {
      let externalScore = 25;
      if (analysis.external.unsafeLinks > 0) externalScore -= 10;
      if (analysis.external.hasExcessiveLinks) externalScore -= 5;
      score += Math.max(0, externalScore);
    } else {
      score += 15; // 没有外部链接也可以接受
    }
    
    // 导航结构评分 (权重: 20%)
    maxScore += 20;
    if (analysis.navigation.hasNavigation) score += 10;
    if (analysis.breadcrumbs.exists) score += 5;
    if (analysis.breadcrumbs.hasStructuredData) score += 5;
    
    // 锚点链接评分 (权重: 15%)
    maxScore += 15;
    if (analysis.anchors.count > 0) {
      if (analysis.anchors.brokenAnchors === 0) {
        score += 15;
      } else {
        score += Math.max(0, 15 - analysis.anchors.brokenAnchors * 3);
      }
    } else {
      score += 10; // 没有锚点链接也可以接受
    }
    
    return Math.round((score / maxScore) * 100);
  }

  /**
   * 识别链接问题
   */
  identifyIssues(analysis) {
    const issues = [];
    
    // 空链接问题
    if (analysis.internal.emptyLinks > 0) {
      issues.push({
        type: 'empty-internal-links',
        severity: 'medium',
        message: `${analysis.internal.emptyLinks}个内部链接缺少锚文本`
      });
    }
    
    // 重复链接问题
    if (analysis.internal.duplicateLinks > 5) {
      issues.push({
        type: 'duplicate-internal-links',
        severity: 'low',
        message: `${analysis.internal.duplicateLinks}个重复的内部链接`
      });
    }
    
    // 不安全的外部链接
    if (analysis.external.unsafeLinks > 0) {
      issues.push({
        type: 'unsafe-external-links',
        severity: 'medium',
        message: `${analysis.external.unsafeLinks}个外部链接缺少安全属性`
      });
    }
    
    // 损坏的锚点链接
    if (analysis.anchors.brokenAnchors > 0) {
      issues.push({
        type: 'broken-anchor-links',
        severity: 'high',
        message: `${analysis.anchors.brokenAnchors}个锚点链接指向不存在的目标`
      });
    }
    
    // 缺少导航结构
    if (!analysis.navigation.hasNavigation) {
      issues.push({
        type: 'missing-navigation',
        severity: 'medium',
        message: '页面缺少明确的导航结构'
      });
    }
    
    return issues;
  }

  // 辅助方法
  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  isInternalLink(href, currentDomain) {
    if (!href) return false;
    if (href.startsWith('/') && !href.startsWith('//')) return true;
    if (href.startsWith('#')) return false;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    
    try {
      const linkDomain = new URL(href).hostname;
      return linkDomain === currentDomain;
    } catch {
      return false;
    }
  }

  isExternalLink(href, currentDomain) {
    if (!href) return false;
    if (href.startsWith('/') || href.startsWith('#')) return false;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    
    try {
      const linkDomain = new URL(href).hostname;
      return linkDomain !== currentDomain;
    } catch {
      return false;
    }
  }
}

module.exports = LinkAnalyzer;
