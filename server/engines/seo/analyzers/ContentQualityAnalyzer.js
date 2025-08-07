/**
 * 内容质量分析器
 * 本地化程度：100%
 * 高级内容质量分析，包括语义分析、内容深度、用户意图匹配等
 */

class ContentQualityAnalyzer {
  constructor() {
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
      'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs'
    ]);

    this.qualityMetrics = {
      depth: {
        shallow: 300,
        moderate: 800,
        deep: 1500
      },
      engagement: {
        minQuestions: 1,
        minLists: 1,
        minSubheadings: 3
      },
      expertise: {
        minTechnicalTerms: 5,
        minExamples: 2,
        minReferences: 1
      }
    };
  }

  /**
   * 执行高级内容质量分析
   */
  async analyze(pageData) {
    const { $ } = pageData;

    const analysis = {
      contentDepth: this.analyzeContentDepth($),
      semanticStructure: this.analyzeSemanticStructure($),
      topicalRelevance: this.analyzeTopicalRelevance($),
      userEngagement: this.analyzeUserEngagement($),
      expertiseSignals: this.analyzeExpertiseSignals($),
      contentFreshness: this.analyzeContentFreshness($),
      readabilityAdvanced: this.analyzeAdvancedReadability($),
      contentCompleteness: this.analyzeContentCompleteness($),
      emotionalTone: this.analyzeEmotionalTone($),
      actionability: this.analyzeActionability($)
    };

    // 计算综合质量评分
    analysis.overallQuality = this.calculateOverallQuality(analysis);
    analysis.qualityIssues = this.identifyQualityIssues(analysis);
    analysis.improvementSuggestions = this.generateImprovementSuggestions(analysis);

    return analysis;
  }

  /**
   * 分析内容深度
   */
  analyzeContentDepth($) {
    const text = $('body').text();
    const wordCount = this.countWords(text);
    const paragraphs = $('p').length;
    const subheadings = $('h2, h3, h4, h5, h6').length;
    const lists = $('ul, ol').length;
    const codeBlocks = $('pre, code').length;
    const quotes = $('blockquote').length;

    // 计算内容深度指标
    const avgWordsPerParagraph = paragraphs > 0 ? wordCount / paragraphs : 0;
    const structuralElements = subheadings + lists + codeBlocks + quotes;
    const depthScore = this.calculateDepthScore(wordCount, structuralElements, avgWordsPerParagraph);

    return {
      wordCount,
      paragraphs,
      subheadings,
      lists,
      codeBlocks,
      quotes,
      structuralElements,
      avgWordsPerParagraph: Math.round(avgWordsPerParagraph),
      depthLevel: this.getDepthLevel(wordCount),
      depthScore,
      hasAdequateDepth: depthScore >= 70,
      comprehensiveness: this.calculateComprehensiveness(structuralElements, wordCount)
    };
  }

  /**
   * 分析语义结构
   */
  analyzeSemanticStructure($) {
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      const $el = $(el);
      headings.push({
        level: parseInt(el.tagName.charAt(1)),
        text: $el.text().trim(),
        wordCount: this.countWords($el.text())
      });
    });

    // 分析语义层次
    const semanticFlow = this.analyzeSemanticFlow(headings);
    const topicCoverage = this.analyzeTopicCoverage($);
    const conceptDensity = this.analyzeConceptDensity($);

    return {
      headingCount: headings.length,
      semanticFlow,
      topicCoverage,
      conceptDensity,
      hasLogicalFlow: semanticFlow.isLogical,
      topicCoherence: topicCoverage.coherenceScore,
      semanticRichness: conceptDensity.richness
    };
  }

  /**
   * 分析主题相关性
   */
  analyzeTopicalRelevance($) {
    const text = $('body').text().toLowerCase();
    const title = $('title').text().toLowerCase();
    const h1 = $('h1').first().text().toLowerCase();

    // 提取关键概念
    const concepts = this.extractConcepts(text);
    const titleConcepts = this.extractConcepts(title);
    const h1Concepts = this.extractConcepts(h1);

    // 计算主题一致性
    const titleRelevance = this.calculateConceptOverlap(concepts, titleConcepts);
    const h1Relevance = this.calculateConceptOverlap(concepts, h1Concepts);
    const topicalFocus = this.calculateTopicalFocus(concepts);

    return {
      mainConcepts: concepts.slice(0, 10),
      titleRelevance,
      h1Relevance,
      topicalFocus,
      isTopicallyFocused: topicalFocus >= 0.7,
      hasStrongTheme: titleRelevance >= 0.6 && h1Relevance >= 0.6
    };
  }

  /**
   * 分析用户参与度
   */
  analyzeUserEngagement($) {
    const questions = this.countQuestions($);
    const callsToAction = this.countCallsToAction($);
    const interactiveElements = this.countInteractiveElements($);
    const personalPronouns = this.countPersonalPronouns($);
    const emotionalWords = this.countEmotionalWords($);

    const engagementScore = this.calculateEngagementScore({
      questions,
      callsToAction,
      interactiveElements,
      personalPronouns,
      emotionalWords
    });

    return {
      questions,
      callsToAction,
      interactiveElements,
      personalPronouns,
      emotionalWords,
      engagementScore,
      isEngaging: engagementScore >= 70,
      hasInteractivity: interactiveElements > 0,
      isPersonal: personalPronouns > 5
    };
  }

  /**
   * 分析专业性信号
   */
  analyzeExpertiseSignals($) {
    const technicalTerms = this.countTechnicalTerms($);
    const statistics = this.countStatistics($);
    const citations = this.countCitations($);
    const examples = this.countExamples($);
    const authorInfo = this.analyzeAuthorInfo($);
    const dateInfo = this.analyzeDateInfo($);

    const expertiseScore = this.calculateExpertiseScore({
      technicalTerms,
      statistics,
      citations,
      examples,
      hasAuthor: authorInfo.hasAuthor,
      hasDate: dateInfo.hasDate
    });

    return {
      technicalTerms,
      statistics,
      citations,
      examples,
      authorInfo,
      dateInfo,
      expertiseScore,
      showsExpertise: expertiseScore >= 70,
      hasCredibility: citations > 0 || authorInfo.hasAuthor,
      isAuthoritative: expertiseScore >= 85
    };
  }

  /**
   * 分析内容新鲜度
   */
  analyzeContentFreshness($) {
    const dateInfo = this.analyzeDateInfo($);
    const timeReferences = this.countTimeReferences($);
    const currentEvents = this.countCurrentEventReferences($);

    return {
      publishDate: dateInfo.publishDate,
      lastModified: dateInfo.lastModified,
      hasRecentDate: dateInfo.hasRecentDate,
      timeReferences,
      currentEvents,
      freshnessScore: this.calculateFreshnessScore(dateInfo, timeReferences, currentEvents),
      isTimely: dateInfo.hasRecentDate || timeReferences > 0,
      needsUpdate: !dateInfo.hasRecentDate && timeReferences === 0
    };
  }

  /**
   * 高级可读性分析
   */
  analyzeAdvancedReadability($) {
    const text = $('body').text();
    const sentences = this.getSentences(text);
    const words = this.getWords(text);

    // 计算多种可读性指标
    const fleschKincaid = this.calculateFleschKincaid(sentences, words);
    const gunningFog = this.calculateGunningFog(sentences, words);
    const smogIndex = this.calculateSMOGIndex(sentences, words);
    const sentenceVariety = this.analyzeSentenceVariety(sentences);
    const vocabularyComplexity = this.analyzeVocabularyComplexity(words);

    return {
      fleschKincaid,
      gunningFog,
      smogIndex,
      sentenceVariety,
      vocabularyComplexity,
      overallReadability: this.calculateOverallReadability(fleschKincaid, gunningFog, smogIndex),
      isAccessible: fleschKincaid.gradeLevel <= 8,
      hasGoodFlow: sentenceVariety.varietyScore >= 70
    };
  }

  /**
   * 分析内容完整性
   */
  analyzeContentCompleteness($) {
    const hasIntroduction = this.hasIntroduction($);
    const hasConclusion = this.hasConclusion($);
    const hasTableOfContents = this.hasTableOfContents($);
    const coverageScore = this.calculateCoverageScore($);
    const missingElements = this.identifyMissingElements($);

    return {
      hasIntroduction,
      hasConclusion,
      hasTableOfContents,
      coverageScore,
      missingElements,
      isComplete: coverageScore >= 80,
      hasGoodStructure: hasIntroduction && hasConclusion,
      needsMoreContent: missingElements.length > 2
    };
  }

  /**
   * 分析情感色调
   */
  analyzeEmotionalTone($) {
    const text = $('body').text().toLowerCase();
    const positiveWords = this.countPositiveWords(text);
    const negativeWords = this.countNegativeWords(text);
    const neutralWords = this.countNeutralWords(text);

    const totalEmotionalWords = positiveWords + negativeWords;
    const sentimentScore = totalEmotionalWords > 0 ?
      (positiveWords - negativeWords) / totalEmotionalWords : 0;

    return {
      positiveWords,
      negativeWords,
      neutralWords,
      sentimentScore,
      tone: this.getTone(sentimentScore),
      isPositive: sentimentScore > 0.2,
      isNegative: sentimentScore < -0.2,
      isBalanced: Math.abs(sentimentScore) <= 0.2
    };
  }

  /**
   * 分析可操作性
   */
  analyzeActionability($) {
    const actionVerbs = this.countActionVerbs($);
    const stepByStepContent = this.hasStepByStepContent($);
    const practicalExamples = this.countPracticalExamples($);
    const toolsAndResources = this.countToolsAndResources($);

    const actionabilityScore = this.calculateActionabilityScore({
      actionVerbs,
      stepByStepContent,
      practicalExamples,
      toolsAndResources
    });

    return {
      actionVerbs,
      stepByStepContent,
      practicalExamples,
      toolsAndResources,
      actionabilityScore,
      isActionable: actionabilityScore >= 70,
      isPractical: practicalExamples > 0 && toolsAndResources > 0,
      hasImplementationGuidance: stepByStepContent && actionVerbs > 10
    };
  }

  // 辅助计算方法
  calculateOverallQuality(analysis) {
    const weights = {
      contentDepth: 0.20,
      semanticStructure: 0.15,
      topicalRelevance: 0.15,
      userEngagement: 0.15,
      expertiseSignals: 0.15,
      readabilityAdvanced: 0.10,
      contentCompleteness: 0.10
    };

    let totalScore = 0;
    let totalWeight = 0;

    // 手动计算每个维度的评分
    const scores = {
      contentDepth: analysis.contentDepth.depthScore,
      semanticStructure: analysis.semanticStructure.semanticFlow.flowScore,
      topicalRelevance: analysis.topicalRelevance.topicalFocus * 100,
      userEngagement: analysis.userEngagement.engagementScore,
      expertiseSignals: analysis.expertiseSignals.expertiseScore,
      readabilityAdvanced: analysis.readabilityAdvanced.overallReadability,
      contentCompleteness: analysis.contentCompleteness.coverageScore
    };

    Object.entries(weights).forEach(([key, weight]) => {
      if (typeof scores[key] !== 'undefined' && !isNaN(scores[key])) {
        totalScore += scores[key] * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  // 添加缺失的分析方法
  countPositiveWords(text) {
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome',
      'best', 'perfect', 'outstanding', 'brilliant', 'superb', 'magnificent',
      'love', 'like', 'enjoy', 'happy', 'pleased', 'satisfied', 'delighted'
    ];

    return positiveWords.reduce((count, word) => {
      return count + (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    }, 0);
  }

  countNegativeWords(text) {
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'disappointing', 'frustrating',
      'worst', 'hate', 'dislike', 'angry', 'upset', 'sad', 'worried',
      'difficult', 'problem', 'issue', 'trouble', 'fail', 'error'
    ];

    return negativeWords.reduce((count, word) => {
      return count + (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    }, 0);
  }

  countNeutralWords(text) {
    const neutralWords = [
      'information', 'data', 'analysis', 'research', 'study', 'report',
      'method', 'process', 'system', 'approach', 'technique', 'strategy'
    ];

    return neutralWords.reduce((count, word) => {
      return count + (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    }, 0);
  }

  getTone(sentimentScore) {
    if (sentimentScore > 0.3) return 'Very Positive';
    if (sentimentScore > 0.1) return 'Positive';
    if (sentimentScore > -0.1) return 'Neutral';
    if (sentimentScore > -0.3) return 'Negative';
    return 'Very Negative';
  }

  countActionVerbs($) {
    const text = $('body').text().toLowerCase();
    const actionVerbs = [
      'create', 'build', 'make', 'develop', 'implement', 'design', 'plan',
      'start', 'begin', 'launch', 'execute', 'perform', 'achieve', 'complete',
      'improve', 'optimize', 'enhance', 'upgrade', 'update', 'modify',
      'learn', 'discover', 'explore', 'understand', 'analyze', 'evaluate'
    ];

    return actionVerbs.reduce((count, verb) => {
      return count + (text.match(new RegExp(`\\b${verb}\\b`, 'g')) || []).length;
    }, 0);
  }

  hasStepByStepContent($) {
    const text = $('body').text().toLowerCase();
    const stepIndicators = [
      'step 1', 'step 2', 'first', 'second', 'third', 'next', 'then', 'finally',
      '1.', '2.', '3.', 'firstly', 'secondly', 'lastly'
    ];

    return stepIndicators.some(indicator => text.includes(indicator));
  }

  countPracticalExamples($) {
    const text = $('body').text().toLowerCase();
    const exampleIndicators = [
      'for example', 'for instance', 'such as', 'like this', 'here\'s how',
      'let\'s say', 'imagine', 'suppose', 'consider this', 'case study'
    ];

    return exampleIndicators.reduce((count, indicator) => {
      return count + (text.includes(indicator) ? 1 : 0);
    }, 0);
  }

  countToolsAndResources($) {
    const text = $('body').text().toLowerCase();
    const resourceIndicators = [
      'tool', 'software', 'platform', 'service', 'resource', 'template',
      'framework', 'library', 'plugin', 'extension', 'app', 'website'
    ];

    return resourceIndicators.reduce((count, indicator) => {
      return count + (text.match(new RegExp(`\\b${indicator}\\b`, 'g')) || []).length;
    }, 0);
  }

  calculateActionabilityScore(metrics) {
    let score = 0;

    // 行动动词 (30%)
    if (metrics.actionVerbs >= 15) score += 30;
    else if (metrics.actionVerbs >= 8) score += 20;
    else if (metrics.actionVerbs >= 3) score += 10;

    // 步骤指导 (30%)
    if (metrics.stepByStepContent) score += 30;

    // 实际示例 (25%)
    if (metrics.practicalExamples >= 3) score += 25;
    else if (metrics.practicalExamples >= 1) score += 15;

    // 工具和资源 (15%)
    if (metrics.toolsAndResources >= 5) score += 15;
    else if (metrics.toolsAndResources >= 2) score += 10;
    else if (metrics.toolsAndResources >= 1) score += 5;

    return Math.min(100, score);
  }

  calculateComprehensiveness(structuralElements, wordCount) {
    // 基于结构元素和字数计算全面性
    const structureScore = Math.min(50, structuralElements * 5);
    const lengthScore = Math.min(50, (wordCount / 1000) * 25);

    return Math.round(structureScore + lengthScore);
  }

  calculateDepthScore(wordCount, structuralElements, avgWordsPerParagraph) {
    let score = 0;

    // 字数评分 (40%)
    if (wordCount >= this.qualityMetrics.depth.deep) score += 40;
    else if (wordCount >= this.qualityMetrics.depth.moderate) score += 30;
    else if (wordCount >= this.qualityMetrics.depth.shallow) score += 20;
    else score += 10;

    // 结构元素评分 (30%)
    if (structuralElements >= 10) score += 30;
    else if (structuralElements >= 5) score += 20;
    else if (structuralElements >= 2) score += 10;

    // 段落深度评分 (30%)
    if (avgWordsPerParagraph >= 50 && avgWordsPerParagraph <= 150) score += 30;
    else if (avgWordsPerParagraph >= 30) score += 20;
    else score += 10;

    return Math.min(100, score);
  }

  getDepthLevel(wordCount) {
    if (wordCount >= this.qualityMetrics.depth.deep) return 'Deep';
    if (wordCount >= this.qualityMetrics.depth.moderate) return 'Moderate';
    if (wordCount >= this.qualityMetrics.depth.shallow) return 'Shallow';
    return 'Surface';
  }

  // 语义分析方法
  analyzeSemanticFlow(headings) {
    let isLogical = true;
    const gaps = [];

    for (let i = 1; i < headings.length; i++) {
      const current = headings[i];
      const previous = headings[i - 1];

      if (current.level > previous.level + 1) {
        gaps.push({ from: previous.level, to: current.level, position: i });
        isLogical = false;
      }
    }

    return {
      isLogical,
      gaps,
      flowScore: isLogical ? 100 : Math.max(0, 100 - gaps.length * 20)
    };
  }

  analyzeTopicCoverage($) {
    const headings = $('h2, h3, h4, h5, h6').map((i, el) => $(el).text().trim()).get();
    const concepts = this.extractConcepts($('body').text());

    // 计算主题覆盖度
    const topicBreadth = headings.length;
    const conceptDiversity = concepts.length;
    const coherenceScore = this.calculateTopicCoherence(headings, concepts);

    return {
      topicBreadth,
      conceptDiversity,
      coherenceScore,
      hasGoodCoverage: topicBreadth >= 5 && conceptDiversity >= 15
    };
  }

  analyzeConceptDensity($) {
    const text = $('body').text();
    const words = this.getWords(text);
    const concepts = this.extractConcepts(text);

    const density = words.length > 0 ? concepts.length / words.length : 0;
    const richness = Math.min(100, density * 1000); // 标准化到0-100

    return {
      totalWords: words.length,
      uniqueConcepts: concepts.length,
      density,
      richness: Math.round(richness),
      isRich: richness >= 15
    };
  }

  // 专业性分析方法
  countTechnicalTerms($) {
    const text = $('body').text().toLowerCase();
    const technicalPatterns = [
      /\b\w+tion\b/g, // -tion endings
      /\b\w+ment\b/g, // -ment endings
      /\b\w+ness\b/g, // -ness endings
      /\b\w+ity\b/g,  // -ity endings
      /\b\w+ing\b/g   // -ing endings (filtered)
    ];

    let count = 0;
    technicalPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      count += matches.filter(word => word.length > 6).length;
    });

    return Math.min(count, 50); // 限制最大值
  }

  countStatistics($) {
    const text = $('body').text();
    const statPatterns = [
      /\d+%/g,                    // 百分比
      /\$\d+/g,                   // 金额
      /\d+,\d+/g,                 // 大数字
      /\d+\.\d+/g,                // 小数
      /\b\d+\s*(million|billion|thousand)\b/gi // 数量级
    ];

    let count = 0;
    statPatterns.forEach(pattern => {
      count += (text.match(pattern) || []).length;
    });

    return count;
  }

  countCitations($) {
    const citations = $('a[href*="doi.org"], a[href*="pubmed"], cite, .citation, .reference').length;
    const footnotes = $('sup, .footnote').length;
    const sources = $('a[href*="source"], a[href*="study"]').length;

    return citations + footnotes + sources;
  }

  countExamples($) {
    const text = $('body').text().toLowerCase();
    const exampleKeywords = ['example', 'for instance', 'such as', 'like', 'including'];

    return exampleKeywords.reduce((count, keyword) => {
      return count + (text.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
    }, 0);
  }

  analyzeAuthorInfo($) {
    const authorSelectors = ['.author', '.byline', '[rel="author"]', '.post-author'];
    const hasAuthor = authorSelectors.some(selector => $(selector).length > 0);

    const authorName = authorSelectors.map(selector => $(selector).text().trim())
      .find(text => text.length > 0) || '';

    return {
      hasAuthor,
      authorName,
      hasCredentials: authorName.includes('Dr.') || authorName.includes('PhD') || authorName.includes('MD')
    };
  }

  analyzeDateInfo($) {
    const dateSelectors = ['time', '.date', '.published', '.updated', '[datetime]'];
    const dates = [];

    dateSelectors.forEach(selector => {
      $(selector).each((i, el) => {
        const $el = $(el);
        const dateText = $el.attr('datetime') || $el.text();
        if (dateText) dates.push(dateText);
      });
    });

    const publishDate = dates[0] || null;
    const lastModified = dates.find(date => date !== publishDate) || null;
    const hasRecentDate = this.isRecentDate(publishDate);

    return {
      publishDate,
      lastModified,
      hasDate: !!publishDate,
      hasRecentDate
    };
  }

  // 可读性分析方法
  calculateFleschKincaid(sentences, words) {
    if (sentences.length === 0 || words.length === 0) {
      return { score: 0, gradeLevel: 0 };
    }

    const avgSentenceLength = words.length / sentences.length;
    const avgSyllables = this.calculateAverageSyllables(words);

    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllables);
    const gradeLevel = (0.39 * avgSentenceLength) + (11.8 * avgSyllables) - 15.59;

    return {
      score: Math.round(score),
      gradeLevel: Math.round(gradeLevel * 10) / 10
    };
  }

  calculateGunningFog(sentences, words) {
    if (sentences.length === 0 || words.length === 0) {
      return { score: 0, gradeLevel: 0 };
    }

    const avgSentenceLength = words.length / sentences.length;
    const complexWords = words.filter(word => this.countSyllables(word) >= 3).length;
    const complexWordPercentage = (complexWords / words.length) * 100;

    const gradeLevel = 0.4 * (avgSentenceLength + complexWordPercentage);

    return {
      score: Math.round(gradeLevel * 10) / 10,
      gradeLevel: Math.round(gradeLevel * 10) / 10,
      complexWordPercentage: Math.round(complexWordPercentage)
    };
  }

  calculateSMOGIndex(sentences, words) {
    if (sentences.length < 30) {
      return { score: 0, gradeLevel: 0, note: 'Insufficient text for SMOG calculation' };
    }

    const complexWords = words.filter(word => this.countSyllables(word) >= 3).length;
    const gradeLevel = 1.043 * Math.sqrt(complexWords * (30 / sentences.length)) + 3.1291;

    return {
      score: Math.round(gradeLevel * 10) / 10,
      gradeLevel: Math.round(gradeLevel * 10) / 10
    };
  }

  // 基础工具方法
  countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  getSentences(text) {
    return text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
  }

  getWords(text) {
    return text.toLowerCase().match(/\b\w+\b/g) || [];
  }

  extractConcepts(text) {
    const words = this.getWords(text);
    const concepts = words.filter(word =>
      word.length > 3 && !this.stopWords.has(word)
    );

    const frequency = {};
    concepts.forEach(concept => {
      frequency[concept] = (frequency[concept] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([concept, count]) => ({ concept, count }));
  }

  calculateConceptOverlap(concepts1, concepts2) {
    const set1 = new Set(concepts1.map(c => c.concept));
    const set2 = new Set(concepts2.map(c => c.concept));
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    return set1.size > 0 ? intersection.size / set1.size : 0;
  }

  countQuestions($) {
    const text = $('body').text();
    return (text.match(/\?/g) || []).length;
  }

  countCallsToAction($) {
    const ctaWords = ['click', 'download', 'subscribe', 'buy', 'get', 'start', 'try', 'learn'];
    const text = $('body').text().toLowerCase();
    return ctaWords.reduce((count, word) => {
      return count + (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    }, 0);
  }

  countInteractiveElements($) {
    return $('button, input, select, textarea, form').length;
  }

  // 更多分析方法
  calculateTopicalFocus(concepts) {
    if (concepts.length === 0) return 0;

    const totalOccurrences = concepts.reduce((sum, concept) => sum + concept.count, 0);
    const topConcept = concepts[0];

    return topConcept.count / totalOccurrences;
  }

  calculateTopicCoherence(headings, concepts) {
    // 简化的主题一致性计算
    const headingWords = headings.join(' ').toLowerCase().split(/\s+/);
    const conceptWords = concepts.map(c => c.concept);

    const overlap = headingWords.filter(word => conceptWords.includes(word)).length;
    return headingWords.length > 0 ? (overlap / headingWords.length) * 100 : 0;
  }

  calculateEngagementScore(metrics) {
    let score = 0;

    // 问题评分 (25%)
    if (metrics.questions >= 3) score += 25;
    else if (metrics.questions >= 1) score += 15;

    // 行动号召评分 (25%)
    if (metrics.callsToAction >= 5) score += 25;
    else if (metrics.callsToAction >= 2) score += 15;

    // 互动元素评分 (25%)
    if (metrics.interactiveElements >= 3) score += 25;
    else if (metrics.interactiveElements >= 1) score += 15;

    // 个人化表达评分 (25%)
    if (metrics.personalPronouns >= 10) score += 25;
    else if (metrics.personalPronouns >= 5) score += 15;

    return Math.min(100, score);
  }

  calculateExpertiseScore(metrics) {
    let score = 0;

    // 技术术语 (30%)
    if (metrics.technicalTerms >= 15) score += 30;
    else if (metrics.technicalTerms >= 8) score += 20;
    else if (metrics.technicalTerms >= 3) score += 10;

    // 统计数据 (25%)
    if (metrics.statistics >= 5) score += 25;
    else if (metrics.statistics >= 2) score += 15;
    else if (metrics.statistics >= 1) score += 10;

    // 引用来源 (25%)
    if (metrics.citations >= 3) score += 25;
    else if (metrics.citations >= 1) score += 15;

    // 示例 (10%)
    if (metrics.examples >= 3) score += 10;
    else if (metrics.examples >= 1) score += 5;

    // 作者信息 (10%)
    if (metrics.hasAuthor) score += 10;
    if (metrics.hasDate) score += 5;

    return Math.min(100, score);
  }

  countPersonalPronouns($) {
    const text = $('body').text().toLowerCase();
    const pronouns = ['you', 'your', 'we', 'our', 'us', 'i', 'my', 'me'];

    return pronouns.reduce((count, pronoun) => {
      return count + (text.match(new RegExp(`\\b${pronoun}\\b`, 'g')) || []).length;
    }, 0);
  }

  countEmotionalWords($) {
    const text = $('body').text().toLowerCase();
    const emotionalWords = [
      'amazing', 'awesome', 'fantastic', 'incredible', 'wonderful',
      'terrible', 'awful', 'horrible', 'disappointing', 'frustrating',
      'love', 'hate', 'excited', 'worried', 'happy', 'sad'
    ];

    return emotionalWords.reduce((count, word) => {
      return count + (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    }, 0);
  }

  countTimeReferences($) {
    const text = $('body').text().toLowerCase();
    const timeWords = ['today', 'yesterday', 'tomorrow', 'recently', 'latest', 'current', 'now', '2024', '2023'];

    return timeWords.reduce((count, word) => {
      return count + (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    }, 0);
  }

  countCurrentEventReferences($) {
    const text = $('body').text().toLowerCase();
    const currentEventWords = ['pandemic', 'covid', 'ai', 'artificial intelligence', 'climate change', 'inflation'];

    return currentEventWords.reduce((count, phrase) => {
      return count + (text.match(new RegExp(phrase, 'g')) || []).length;
    }, 0);
  }

  calculateFreshnessScore(dateInfo, timeReferences, currentEvents) {
    let score = 0;

    if (dateInfo.hasRecentDate) score += 40;
    else if (dateInfo.hasDate) score += 20;

    if (timeReferences >= 5) score += 30;
    else if (timeReferences >= 2) score += 20;
    else if (timeReferences >= 1) score += 10;

    if (currentEvents >= 2) score += 30;
    else if (currentEvents >= 1) score += 15;

    return Math.min(100, score);
  }

  analyzeSentenceVariety(sentences) {
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    const varietyScore = Math.min(100, variance * 2);

    return {
      avgLength: Math.round(avgLength),
      variance: Math.round(variance),
      varietyScore: Math.round(varietyScore),
      hasGoodVariety: varietyScore >= 50
    };
  }

  analyzeVocabularyComplexity(words) {
    const uniqueWords = new Set(words);
    const longWords = words.filter(word => word.length > 6).length;
    const complexityScore = (longWords / words.length) * 100;

    return {
      totalWords: words.length,
      uniqueWords: uniqueWords.size,
      longWords,
      complexityScore: Math.round(complexityScore),
      isComplex: complexityScore >= 15
    };
  }

  calculateOverallReadability(fleschKincaid, gunningFog, smogIndex) {
    const scores = [fleschKincaid.score, 100 - gunningFog.gradeLevel * 10, 100 - smogIndex.gradeLevel * 10];
    const validScores = scores.filter(score => !isNaN(score) && score > 0);

    return validScores.length > 0 ?
      Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length) : 0;
  }

  hasIntroduction($) {
    const firstParagraph = $('p').first().text();
    const introWords = ['introduction', 'overview', 'welcome', 'this article', 'in this'];

    return introWords.some(word => firstParagraph.toLowerCase().includes(word)) || firstParagraph.length > 100;
  }

  hasConclusion($) {
    const lastParagraph = $('p').last().text();
    const conclusionWords = ['conclusion', 'summary', 'in summary', 'to conclude', 'finally'];

    return conclusionWords.some(word => lastParagraph.toLowerCase().includes(word));
  }

  hasTableOfContents($) {
    return $('.toc, .table-of-contents, #toc').length > 0 ||
      $('a[href^="#"]').length >= 3;
  }

  calculateCoverageScore($) {
    let score = 0;

    if (this.hasIntroduction($)) score += 25;
    if (this.hasConclusion($)) score += 25;
    if ($('h2, h3').length >= 3) score += 25;
    if ($('ul, ol').length >= 1) score += 25;

    return score;
  }

  identifyMissingElements($) {
    const missing = [];

    if (!this.hasIntroduction($)) missing.push('introduction');
    if (!this.hasConclusion($)) missing.push('conclusion');
    if ($('h2, h3').length < 3) missing.push('subheadings');
    if ($('ul, ol').length === 0) missing.push('lists');
    if ($('img').length === 0) missing.push('images');

    return missing;
  }

  // 辅助工具方法
  countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    const vowels = 'aeiouy';
    let syllableCount = 0;
    let previousWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        syllableCount++;
      }
      previousWasVowel = isVowel;
    }

    if (word.endsWith('e')) syllableCount--;
    return Math.max(1, syllableCount);
  }

  calculateAverageSyllables(words) {
    const totalSyllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    return words.length > 0 ? totalSyllables / words.length : 0;
  }

  isRecentDate(dateString) {
    if (!dateString) return false;

    const date = new Date(dateString);
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));

    return date >= sixMonthsAgo;
  }

  identifyQualityIssues(analysis) {
    const issues = [];

    if (analysis.contentDepth.depthScore < 70) {
      issues.push({
        type: 'content-depth',
        severity: 'high',
        message: '内容深度不足，需要更详细的信息和更多结构化元素'
      });
    }

    if (!analysis.topicalRelevance.isTopicallyFocused) {
      issues.push({
        type: 'topical-focus',
        severity: 'medium',
        message: '主题焦点不够集中，建议围绕核心主题展开'
      });
    }

    if (!analysis.userEngagement.isEngaging) {
      issues.push({
        type: 'user-engagement',
        severity: 'medium',
        message: '用户参与度较低，建议增加互动元素和个人化表达'
      });
    }

    if (!analysis.expertiseSignals.showsExpertise) {
      issues.push({
        type: 'expertise',
        severity: 'medium',
        message: '专业性信号不足，建议增加数据、引用和技术术语'
      });
    }

    return issues;
  }

  generateImprovementSuggestions(analysis) {
    const suggestions = [];

    if (analysis.contentDepth.wordCount < this.qualityMetrics.depth.moderate) {
      suggestions.push({
        category: 'content-depth',
        priority: 'high',
        suggestion: '增加内容长度，提供更详细的信息和深入的分析',
        target: `目标字数: ${this.qualityMetrics.depth.moderate}+ 词`
      });
    }

    if (analysis.expertiseSignals.expertiseScore < 70) {
      suggestions.push({
        category: 'expertise',
        priority: 'medium',
        suggestion: '增加专业性信号，如统计数据、引用来源、技术术语等',
        target: '提升专业性评分至70+分'
      });
    }

    if (!analysis.userEngagement.isEngaging) {
      suggestions.push({
        category: 'engagement',
        priority: 'medium',
        suggestion: '增加用户参与元素，如问题、个人化表达、行动号召等',
        target: '提升参与度评分至70+分'
      });
    }

    if (!analysis.contentCompleteness.isComplete) {
      suggestions.push({
        category: 'completeness',
        priority: 'medium',
        suggestion: '完善内容结构，添加缺失的元素',
        target: `添加: ${analysis.contentCompleteness.missingElements.join(', ')}`
      });
    }

    return suggestions;
  }
}

module.exports = ContentQualityAnalyzer;
