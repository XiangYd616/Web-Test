/**
 * 内容分析器
 * 本地化程度：100%
 * 分析页面内容质量、结构、关键词密度等
 */

class ContentAnalyzer {
  constructor() {
    this.rules = {
      content: {
        minWordCount: 300,
        optimalWordCount: 1000,
        maxKeywordDensity: 3.0,
        optimalKeywordDensity: 1.5
      },
      headings: {
        maxH1Count: 1,
        requiredH1: true,
        maxDepth: 6
      },
      images: {
        maxMissingAlt: 0.1, // 10%
        maxLargeImages: 0.2 // 20%
      }
    };
  }

  /**
   * 执行内容分析
   */
  async analyze(pageData) {
    const { $ } = pageData;
    
    const analysis = {
      textContent: this.analyzeTextContent($),
      headingStructure: this.analyzeHeadingStructure($),
      images: this.analyzeImages($),
      links: this.analyzeContentLinks($),
      keywords: this.analyzeKeywords($),
      readability: this.analyzeReadability($),
      uniqueness: this.analyzeUniqueness($),
      multimedia: this.analyzeMultimedia($)
    };
    
    // 计算内容评分
    analysis.score = this.calculateContentScore(analysis);
    analysis.issues = this.identifyIssues(analysis);
    
    return analysis;
  }

  /**
   * 分析文本内容
   */
  analyzeTextContent($) {
    // 移除脚本和样式标签
    $('script, style, nav, header, footer').remove();
    
    const bodyText = $('body').text();
    const mainContent = this.extractMainContent($);
    
    // 计算字数
    const words = this.countWords(bodyText);
    const sentences = this.countSentences(bodyText);
    const paragraphs = $('p').length;
    
    // 计算内容长度
    const totalLength = bodyText.length;
    const mainContentLength = mainContent.length;
    
    return {
      totalText: bodyText,
      mainContent,
      wordCount: words,
      sentenceCount: sentences,
      paragraphCount: paragraphs,
      characterCount: totalLength,
      mainContentLength,
      averageWordsPerSentence: sentences > 0 ? Math.round(words / sentences) : 0,
      averageWordsPerParagraph: paragraphs > 0 ? Math.round(words / paragraphs) : 0,
      isAdequateLength: words >= this.rules.content.minWordCount,
      isOptimalLength: words >= this.rules.content.optimalWordCount,
      contentRatio: totalLength > 0 ? Math.round((mainContentLength / totalLength) * 100) : 0
    };
  }

  /**
   * 分析标题结构
   */
  analyzeHeadingStructure($) {
    const headings = [];
    const headingCounts = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
    
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      const tag = el.tagName.toLowerCase();
      const text = $(el).text().trim();
      const level = parseInt(tag.charAt(1));
      
      headings.push({
        tag,
        level,
        text,
        length: text.length,
        isEmpty: text.length === 0,
        position: i
      });
      
      headingCounts[tag]++;
    });
    
    // 分析标题层次结构
    const structure = this.analyzeHeadingHierarchy(headings);
    
    return {
      headings,
      counts: headingCounts,
      totalCount: headings.length,
      hasH1: headingCounts.h1 > 0,
      h1Count: headingCounts.h1,
      hasMultipleH1: headingCounts.h1 > 1,
      hasProperHierarchy: structure.isProper,
      missingLevels: structure.missingLevels,
      skippedLevels: structure.skippedLevels,
      emptyHeadings: headings.filter(h => h.isEmpty).length,
      averageLength: headings.length > 0 ? Math.round(headings.reduce((sum, h) => sum + h.length, 0) / headings.length) : 0
    };
  }

  /**
   * 分析图片
   */
  analyzeImages($) {
    const images = [];
    
    $('img').each((i, el) => {
      const $img = $(el);
      const src = $img.attr('src');
      const alt = $img.attr('alt');
      const title = $img.attr('title');
      const width = $img.attr('width');
      const height = $img.attr('height');
      
      images.push({
        src,
        alt,
        title,
        width: width ? parseInt(width) : null,
        height: height ? parseInt(height) : null,
        hasAlt: !!alt,
        hasTitle: !!title,
        altLength: alt ? alt.length : 0,
        isEmpty: !src,
        isDecorative: alt === '',
        isInformative: alt && alt.length > 0
      });
    });
    
    const totalImages = images.length;
    const imagesWithoutAlt = images.filter(img => !img.hasAlt && !img.isDecorative).length;
    const decorativeImages = images.filter(img => img.isDecorative).length;
    const informativeImages = images.filter(img => img.isInformative).length;
    
    return {
      images,
      totalCount: totalImages,
      withAlt: totalImages - imagesWithoutAlt,
      withoutAlt: imagesWithoutAlt,
      decorative: decorativeImages,
      informative: informativeImages,
      missingAltPercentage: totalImages > 0 ? Math.round((imagesWithoutAlt / totalImages) * 100) : 0,
      averageAltLength: informativeImages > 0 ? Math.round(images.filter(img => img.isInformative).reduce((sum, img) => sum + img.altLength, 0) / informativeImages) : 0,
      hasProperAltTexts: imagesWithoutAlt === 0
    };
  }

  /**
   * 分析内容中的链接
   */
  analyzeContentLinks($) {
    const links = [];
    
    $('a[href]').each((i, el) => {
      const $link = $(el);
      const href = $link.attr('href');
      const text = $link.text().trim();
      const title = $link.attr('title');
      const target = $link.attr('target');
      const rel = $link.attr('rel');
      
      const isInternal = this.isInternalLink(href);
      const isExternal = this.isExternalLink(href);
      const isEmail = href.startsWith('mailto:');
      const isTel = href.startsWith('tel:');
      
      links.push({
        href,
        text,
        title,
        target,
        rel,
        textLength: text.length,
        hasText: text.length > 0,
        hasTitle: !!title,
        isInternal,
        isExternal,
        isEmail,
        isTel,
        opensInNewTab: target === '_blank',
        hasNofollow: rel && rel.includes('nofollow'),
        hasNoopener: rel && rel.includes('noopener')
      });
    });
    
    const totalLinks = links.length;
    const internalLinks = links.filter(link => link.isInternal).length;
    const externalLinks = links.filter(link => link.isExternal).length;
    const emptyLinks = links.filter(link => !link.hasText).length;
    
    return {
      links,
      totalCount: totalLinks,
      internal: internalLinks,
      external: externalLinks,
      email: links.filter(link => link.isEmail).length,
      telephone: links.filter(link => link.isTel).length,
      empty: emptyLinks,
      withoutTitle: links.filter(link => !link.hasTitle).length,
      externalWithoutNoopener: links.filter(link => link.isExternal && link.opensInNewTab && !link.hasNoopener).length,
      internalToExternalRatio: externalLinks > 0 ? Math.round((internalLinks / externalLinks) * 100) / 100 : internalLinks
    };
  }

  /**
   * 分析关键词
   */
  analyzeKeywords($) {
    const text = $('body').text().toLowerCase();
    const words = this.extractWords(text);
    const wordFrequency = this.calculateWordFrequency(words);
    
    // 获取最常见的关键词
    const topKeywords = Object.entries(wordFrequency)
      .filter(([word]) => word.length > 3) // 过滤短词
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word, count]) => ({
        word,
        count,
        density: Math.round((count / words.length) * 10000) / 100 // 保留两位小数
      }));
    
    const maxDensity = topKeywords.length > 0 ? topKeywords[0].density : 0;
    
    return {
      totalWords: words.length,
      uniqueWords: Object.keys(wordFrequency).length,
      topKeywords,
      maxKeywordDensity: maxDensity,
      isKeywordStuffing: maxDensity > this.rules.content.maxKeywordDensity,
      isOptimalDensity: maxDensity <= this.rules.content.optimalKeywordDensity,
      vocabularyRichness: words.length > 0 ? Math.round((Object.keys(wordFrequency).length / words.length) * 100) : 0
    };
  }

  /**
   * 分析可读性
   */
  analyzeReadability($) {
    const text = $('body').text();
    const words = this.countWords(text);
    const sentences = this.countSentences(text);
    const syllables = this.countSyllables(text);
    
    // 计算Flesch Reading Ease Score (简化版)
    let fleschScore = 0;
    if (sentences > 0 && words > 0) {
      const avgWordsPerSentence = words / sentences;
      const avgSyllablesPerWord = syllables / words;
      fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    }
    
    const readingLevel = this.getReadingLevel(fleschScore);
    
    return {
      fleschScore: Math.round(fleschScore),
      readingLevel,
      averageWordsPerSentence: sentences > 0 ? Math.round(words / sentences) : 0,
      averageSyllablesPerWord: words > 0 ? Math.round((syllables / words) * 100) / 100 : 0,
      isEasyToRead: fleschScore >= 60,
      isVeryEasyToRead: fleschScore >= 80,
      isDifficultToRead: fleschScore < 30
    };
  }

  /**
   * 分析内容唯一性
   */
  analyzeUniqueness($) {
    // 简化的唯一性分析
    const text = $('body').text();
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // 检测重复句子
    const sentenceFreq = {};
    sentences.forEach(sentence => {
      const normalized = sentence.trim().toLowerCase();
      sentenceFreq[normalized] = (sentenceFreq[normalized] || 0) + 1;
    });
    
    const duplicateSentences = Object.values(sentenceFreq).filter(count => count > 1).length;
    const uniquenessScore = sentences.length > 0 ? Math.round(((sentences.length - duplicateSentences) / sentences.length) * 100) : 100;
    
    return {
      totalSentences: sentences.length,
      duplicateSentences,
      uniquenessScore,
      isHighlyUnique: uniquenessScore >= 90,
      hasSignificantDuplication: uniquenessScore < 70
    };
  }

  /**
   * 分析多媒体内容
   */
  analyzeMultimedia($) {
    const videos = $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;
    const audios = $('audio').length;
    const embeds = $('embed, object').length;
    
    return {
      videos,
      audios,
      embeds,
      totalMultimedia: videos + audios + embeds,
      hasMultimedia: (videos + audios + embeds) > 0,
      hasVideos: videos > 0,
      hasAudios: audios > 0
    };
  }

  /**
   * 计算内容评分
   */
  calculateContentScore(analysis) {
    let score = 0;
    let maxScore = 0;
    
    // 内容长度评分 (权重: 25%)
    maxScore += 25;
    if (analysis.textContent.isOptimalLength) score += 25;
    else if (analysis.textContent.isAdequateLength) score += 20;
    else score += 10;
    
    // 标题结构评分 (权重: 20%)
    maxScore += 20;
    if (analysis.headingStructure.hasH1 && !analysis.headingStructure.hasMultipleH1) {
      score += 10;
      if (analysis.headingStructure.hasProperHierarchy) score += 10;
      else score += 5;
    }
    
    // 图片优化评分 (权重: 15%)
    maxScore += 15;
    if (analysis.images.hasProperAltTexts) score += 15;
    else if (analysis.images.missingAltPercentage <= 20) score += 10;
    else score += 5;
    
    // 关键词优化评分 (权重: 15%)
    maxScore += 15;
    if (analysis.keywords.isOptimalDensity && !analysis.keywords.isKeywordStuffing) score += 15;
    else if (!analysis.keywords.isKeywordStuffing) score += 10;
    else score += 5;
    
    // 可读性评分 (权重: 15%)
    maxScore += 15;
    if (analysis.readability.isEasyToRead) score += 15;
    else if (!analysis.readability.isDifficultToRead) score += 10;
    else score += 5;
    
    // 内容唯一性评分 (权重: 10%)
    maxScore += 10;
    if (analysis.uniqueness.isHighlyUnique) score += 10;
    else if (!analysis.uniqueness.hasSignificantDuplication) score += 7;
    else score += 3;
    
    return Math.round((score / maxScore) * 100);
  }

  /**
   * 识别内容问题
   */
  identifyIssues(analysis) {
    const issues = [];
    
    // 内容长度问题
    if (!analysis.textContent.isAdequateLength) {
      issues.push({
        type: 'content-length',
        severity: 'high',
        message: `内容过短 (${analysis.textContent.wordCount}词)，建议至少${this.rules.content.minWordCount}词`
      });
    }
    
    // 标题结构问题
    if (!analysis.headingStructure.hasH1) {
      issues.push({
        type: 'heading-structure',
        severity: 'critical',
        message: '缺少H1标题'
      });
    } else if (analysis.headingStructure.hasMultipleH1) {
      issues.push({
        type: 'heading-structure',
        severity: 'high',
        message: `页面有多个H1标题 (${analysis.headingStructure.h1Count}个)`
      });
    }
    
    if (!analysis.headingStructure.hasProperHierarchy) {
      issues.push({
        type: 'heading-structure',
        severity: 'medium',
        message: '标题层次结构不当'
      });
    }
    
    // 图片问题
    if (analysis.images.missingAltPercentage > 10) {
      issues.push({
        type: 'images',
        severity: 'high',
        message: `${analysis.images.missingAltPercentage}%的图片缺少alt属性`
      });
    }
    
    // 关键词问题
    if (analysis.keywords.isKeywordStuffing) {
      issues.push({
        type: 'keywords',
        severity: 'high',
        message: `关键词密度过高 (${analysis.keywords.maxKeywordDensity}%)，可能被视为关键词堆砌`
      });
    }
    
    // 可读性问题
    if (analysis.readability.isDifficultToRead) {
      issues.push({
        type: 'readability',
        severity: 'medium',
        message: `内容可读性较差 (Flesch评分: ${analysis.readability.fleschScore})`
      });
    }
    
    return issues;
  }

  // 辅助方法
  extractMainContent($) {
    // 尝试提取主要内容
    const mainSelectors = ['main', 'article', '.content', '#content', '.main', '#main'];
    for (const selector of mainSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        return element.text();
      }
    }
    return $('body').text();
  }

  countWords(text) {
    return text.trim().split(//s+/).filter(word => word.length > 0).length;
  }

  countSentences(text) {
    return text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;
  }

  countSyllables(text) {
    // 简化的音节计算
    const words = text.toLowerCase().match(//b/w+/b/g) || [];
    return words.reduce((total, word) => {
      const syllables = word.match(/[aeiouy]+/g) || [];
      return total + Math.max(1, syllables.length);
    }, 0);
  }

  extractWords(text) {
    return text.toLowerCase().match(//b/w+/b/g) || [];
  }

  calculateWordFrequency(words) {
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    return frequency;
  }

  analyzeHeadingHierarchy(headings) {
    let isProper = true;
    const missingLevels = [];
    const skippedLevels = [];
    
    let previousLevel = 0;
    
    for (const heading of headings) {
      if (heading.level > previousLevel + 1) {
        // 跳过了级别
        for (let i = previousLevel + 1; i < heading.level; i++) {
          skippedLevels.push(i);
        }
        isProper = false;
      }
      previousLevel = heading.level;
    }
    
    return { isProper, missingLevels, skippedLevels };
  }

  isInternalLink(href) {
    return href.startsWith('/') || href.startsWith('#') || href.startsWith('?');
  }

  isExternalLink(href) {
    return href.startsWith('http') && !href.includes(window?.location?.hostname || '');
  }

  getReadingLevel(fleschScore) {
    if (fleschScore >= 90) return 'Very Easy';
    if (fleschScore >= 80) return 'Easy';
    if (fleschScore >= 70) return 'Fairly Easy';
    if (fleschScore >= 60) return 'Standard';
    if (fleschScore >= 50) return 'Fairly Difficult';
    if (fleschScore >= 30) return 'Difficult';
    return 'Very Difficult';
  }
}

module.exports = ContentAnalyzer;
