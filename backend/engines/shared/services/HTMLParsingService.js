/**
 * HTML解析服务
 * 统一HTML解析逻辑，消除多个引擎中的重复解析代码
 */

import BaseService from './BaseService.js';

class HTMLParsingService extends BaseService {
  constructor() {
    super('HTMLParsingService');
    this.dependencies = ['cheerio'];
  }

  async performInitialization() {
    const cheerioModule = await import('cheerio');
    this.cheerio = cheerioModule.default || cheerioModule;
  }

  /**
   * 解析HTML内容
   */
  parseHTML(html, options = {}) {
    try {
      const $ = this.cheerio.load(html, {
        decodeEntities: options.decodeEntities !== false,
        normalizeWhitespace: options.normalizeWhitespace || false,
        ...options
      });

      return {
        $,
        success: true,
        parsed: true
      };
    } catch (error) {
      return this.handleError(error, 'parseHTML');
    }
  }

  /**
   * 提取meta标签信息
   */
  extractMetaTags($) {
    const metaTags = [];
    const metaData = {
      title: '',
      description: '',
      keywords: '',
      viewport: '',
      charset: '',
      robots: '',
      canonical: '',
      openGraph: {},
      twitterCard: {},
      structuredData: []
    };

    try {
      // 提取title
      metaData.title = $('title').text().trim();

      // 提取基础meta标签
      $('meta').each((i, el) => {
        const $el = $(el);
        const attributes = this.extractAttributes($el);
        metaTags.push(attributes);

        // 标准meta标签
        if (attributes.name) {
          switch (attributes.name.toLowerCase()) {
            case 'description':
              metaData.description = attributes.content || '';
              break;
            case 'keywords':
              metaData.keywords = attributes.content || '';
              break;
            case 'viewport':
              metaData.viewport = attributes.content || '';
              break;
            case 'robots':
              metaData.robots = attributes.content || '';
              break;
          }
        }

        // charset
        if (attributes.charset) {
          metaData.charset = attributes.charset;
        }

        // http-equiv
        if (attributes['http-equiv']) {
          metaData[attributes['http-equiv'].toLowerCase()] = attributes.content || '';
        }

        // Open Graph标签
        if (attributes.property && attributes.property.startsWith('og:')) {
          const key = attributes.property.replace('og:', '');
          metaData.openGraph[key] = attributes.content || '';
        }

        // Twitter Card标签
        if (attributes.name && attributes.name.startsWith('twitter:')) {
          const key = attributes.name.replace('twitter:', '');
          metaData.twitterCard[key] = attributes.content || '';
        }
      });

      // 提取canonical链接
      const canonical = $('link[rel="canonical"]').attr('href');
      if (canonical) {
        metaData.canonical = canonical;
      }

      // 提取JSON-LD结构化数据
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const jsonData = JSON.parse($(el).html());
          metaData.structuredData.push({
            type: 'JSON-LD',
            data: jsonData,
            valid: true
          });
        } catch (error) {
          metaData.structuredData.push({
            type: 'JSON-LD',
            valid: false,
            error: error.message
          });
        }
      });

      return {
        metaTags,
        metaData,
        success: true
      };
    } catch (error) {
      return this.handleError(error, 'extractMetaTags');
    }
  }

  /**
   * 提取标题结构 (H1-H6)
   */
  extractHeadingStructure($) {
    try {
      const headings = [];
      const headingCounts = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };

      $('h1, h2, h3, h4, h5, h6').each((i, el) => {
        const $el = $(el);
        const tag = el.tagName.toLowerCase();
        const text = $el.text().trim();
        const level = parseInt(tag.charAt(1));

        const heading = {
          tag,
          level,
          text,
          length: text.length,
          isEmpty: text.length === 0,
          position: i,
          attributes: this.extractAttributes($el)
        };

        headings.push(heading);
        headingCounts[tag]++;
      });

      // 分析标题层次结构
      const hierarchy = this.analyzeHeadingHierarchy(headings);

      return {
        headings,
        counts: headingCounts,
        totalCount: headings.length,
        hasH1: headingCounts.h1 > 0,
        h1Count: headingCounts.h1,
        hasMultipleH1: headingCounts.h1 > 1,
        hierarchy,
        success: true
      };
    } catch (error) {
      return this.handleError(error, 'extractHeadingStructure');
    }
  }

  /**
   * 提取图片信息
   */
  extractImages($) {
    try {
      const images = [];
      let totalImages = 0;
      let imagesWithAlt = 0;
      let imagesWithoutAlt = 0;

      $('img').each((i, el) => {
        const $el = $(el);
        const attributes = this.extractAttributes($el);
        
        const image = {
          src: attributes.src || '',
          alt: attributes.alt || '',
          title: attributes.title || '',
          width: attributes.width ? parseInt(attributes.width) : null,
          height: attributes.height ? parseInt(attributes.height) : null,
          loading: attributes.loading || '',
          srcset: attributes.srcset || '',
          sizes: attributes.sizes || '',
          hasAlt: !!attributes.alt,
          hasTitle: !!attributes.title,
          altLength: attributes.alt ? attributes.alt.length : 0,
          isEmpty: !attributes.src,
          isDecorative: attributes.alt === '',
          isInformative: !!(attributes.alt && attributes.alt.length > 0),
          attributes
        };

        images.push(image);
        totalImages++;

        if (image.hasAlt) {
          imagesWithAlt++;
        } else if (!image.isDecorative) {
          imagesWithoutAlt++;
        }
      });

      return {
        images,
        totalCount: totalImages,
        withAlt: imagesWithAlt,
        withoutAlt: imagesWithoutAlt,
        missingAltPercentage: totalImages > 0 ? Math.round((imagesWithoutAlt / totalImages) * 100) : 0,
        averageAltLength: imagesWithAlt > 0 ? 
          Math.round(images.filter(img => img.hasAlt).reduce((sum, img) => sum + img.altLength, 0) / imagesWithAlt) : 0,
        success: true
      };
    } catch (error) {
      return this.handleError(error, 'extractImages');
    }
  }

  /**
   * 提取链接信息
   */
  extractLinks($, baseUrl = '') {
    try {
      const links = [];
      let totalLinks = 0;
      let internalLinks = 0;
      let externalLinks = 0;
      let emptyLinks = 0;

      $('a[href]').each((i, el) => {
        const $el = $(el);
        const href = $el.attr('href') || '';
        const text = $el.text().trim();
        const attributes = this.extractAttributes($el);

        const isInternal = this.isInternalLink(href);
        const isExternal = this.isExternalLink(href, baseUrl);
        const isEmail = href.startsWith('mailto:');
        const isTel = href.startsWith('tel:');
        const isAnchor = href.startsWith('#');

        const link = {
          href,
          text,
          textLength: text.length,
          hasText: text.length > 0,
          isInternal,
          isExternal,
          isEmail,
          isTel,
          isAnchor,
          target: attributes.target || '_self',
          rel: attributes.rel || '',
          title: attributes.title || '',
          hasTitle: !!attributes.title,
          opensInNewTab: attributes.target === '_blank',
          hasNofollow: !!(attributes.rel && attributes.rel.includes('nofollow')),
          hasNoopener: !!(attributes.rel && attributes.rel.includes('noopener')),
          attributes
        };

        links.push(link);
        totalLinks++;

        if (isInternal) internalLinks++;
        if (isExternal) externalLinks++;
        if (!text) emptyLinks++;
      });

      return {
        links,
        totalCount: totalLinks,
        internal: internalLinks,
        external: externalLinks,
        empty: emptyLinks,
        email: links.filter(link => link.isEmail).length,
        telephone: links.filter(link => link.isTel).length,
        anchor: links.filter(link => link.isAnchor).length,
        withoutTitle: links.filter(link => !link.hasTitle).length,
        externalWithoutNoopener: links.filter(link => 
          link.isExternal && link.opensInNewTab && !link.hasNoopener
        ).length,
        internalToExternalRatio: externalLinks > 0 ? 
          Math.round((internalLinks / externalLinks) * 100) / 100 : internalLinks,
        success: true
      };
    } catch (error) {
      return this.handleError(error, 'extractLinks');
    }
  }

  /**
   * 提取文本内容
   */
  extractTextContent($, options = {}) {
    try {
      // 移除不需要的标签
      const excludeSelectors = options.excludeSelectors || [
        'script', 'style', 'nav', 'header', 'footer', 
        '.nav', '.navigation', '.menu', '.sidebar'
      ];
      
      $(excludeSelectors.join(', ')).remove();

      const bodyText = $('body').text();
      const mainContent = this.extractMainContent($);
      
      // 文本统计
      const words = this.countWords(bodyText);
      const sentences = this.countSentences(bodyText);
      const paragraphs = $('p').length;
      
      // 提取段落内容
      const paragraphsContent = [];
      $('p, article, section, main, .content, .post, .article').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 10) {
          paragraphsContent.push(text);
        }
      });

      return {
        totalText: bodyText,
        mainContent,
        wordCount: words,
        sentenceCount: sentences,
        paragraphCount: paragraphs,
        characterCount: bodyText.length,
        mainContentLength: mainContent.length,
        paragraphs: paragraphsContent,
        averageWordsPerSentence: sentences > 0 ? Math.round(words / sentences) : 0,
        averageWordsPerParagraph: paragraphs > 0 ? Math.round(words / paragraphs) : 0,
        contentRatio: bodyText.length > 0 ? Math.round((mainContent.length / bodyText.length) * 100) : 0,
        success: true
      };
    } catch (error) {
      return this.handleError(error, 'extractTextContent');
    }
  }

  /**
   * 提取元素属性
   */
  extractAttributes($element) {
    const attributes = {};
    
    if ($element && $element.length > 0) {
      const el = $element[0];
      if (el.attribs) {
        Object.assign(attributes, el.attribs);
      }
    }
    
    return attributes;
  }

  /**
   * 分析标题层次结构
   */
  analyzeHeadingHierarchy(headings) {
    let isProper = true;
    const gaps = [];
    const skippedLevels = [];
    let previousLevel = 0;

    for (const heading of headings) {
      if (heading.level > previousLevel + 1) {
        // 跳过了级别
        for (let i = previousLevel + 1; i < heading.level; i++) {
          skippedLevels.push(i);
        }
        gaps.push({ from: previousLevel, to: heading.level });
        isProper = false;
      }
      previousLevel = heading.level;
    }

    return {
      isProper,
      gaps,
      skippedLevels,
      flowScore: isProper ? 100 : Math.max(0, 100 - gaps.length * 20)
    };
  }

  /**
   * 提取主要内容
   */
  extractMainContent($) {
    const mainSelectors = [
      'main', 'article', '.content', '#content', '.main', '#main',
      '.post-content', '.entry-content', '.page-content'
    ];
    
    for (const selector of mainSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        return element.text().trim();
      }
    }
    
    return $('body').text().trim();
  }

  /**
   * 统计单词数
   */
  countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * 统计句子数
   */
  countSentences(text) {
    if (!text) return 0;
    return text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;
  }

  /**
   * 判断是否为内部链接
   */
  isInternalLink(href) {
    if (!href) return false;
    return href.startsWith('/') || href.startsWith('#') || href.startsWith('?');
  }

  /**
   * 判断是否为外部链接
   */
  isExternalLink(href, baseUrl = '') {
    if (!href) return false;
    if (!href.startsWith('http')) return false;
    
    if (baseUrl) {
      try {
        const url = new URL(baseUrl);
        return !href.includes(url.hostname);
      } catch (error) {
        return true;
      }
    }
    
    return true;
  }

  /**
   * HTML解码
   */
  decodeHTML(html) {
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' '
    };
    
    return html.replace(/&[a-zA-Z0-9#]+;/g, (match) => {
      return entities[match] || match;
    });
  }

  /**
   * 移除HTML标签
   */
  stripTags(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * 完整的HTML分析
   */
  async analyzeHTML(html, options = {}) {
    try {
      const parseResult = this.parseHTML(html, options);
      if (!parseResult.success) {
        return parseResult;
      }

      const $ = parseResult.$;
      
      const analysis = {
        metaTags: this.extractMetaTags($),
        headingStructure: this.extractHeadingStructure($),
        images: this.extractImages($),
        links: this.extractLinks($, options.baseUrl),
        textContent: this.extractTextContent($, options),
        timestamp: new Date().toISOString(),
        success: true
      };

      return this.createSuccessResponse(analysis, {
        parseTime: Date.now(),
        options
      });
    } catch (error) {
      return this.handleError(error, 'analyzeHTML');
    }
  }
}

export default HTMLParsingService;
