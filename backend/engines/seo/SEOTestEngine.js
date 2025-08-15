/**
 * SEO测试引擎 - 全面的SEO分析工具
 * 
 * 功能特性：
 * - 标题、元标签、图片、链接等全面分析
 * - SEO评分算法和改进建议生成
 * - 详细的SEO测试结果报告
 * - 支持移动端SEO优化检测
 * - 结构化数据分析
 * - 社交媒体标签检测
 * 
 * 版本: v1.0.0
 * 更新时间: 2024-12-19
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

// SEO测试常量
const SEO_CONSTANTS = {
    TITLE: {
        MIN_LENGTH: 10,
        MAX_LENGTH: 60,
        OPTIMAL_MIN: 30,
        OPTIMAL_MAX: 55
    },
    DESCRIPTION: {
        MIN_LENGTH: 50,
        MAX_LENGTH: 160,
        OPTIMAL_MIN: 120,
        OPTIMAL_MAX: 155
    },
    HEADINGS: {
        MAX_H1_COUNT: 1,
        MIN_H1_LENGTH: 10,
        MAX_H1_LENGTH: 70
    },
    IMAGES: {
        MAX_SIZE_WARNING: 500000, // 500KB
        MAX_SIZE_ERROR: 1000000   // 1MB
    },
    KEYWORDS: {
        MIN_DENSITY: 0.5,
        MAX_DENSITY: 3.0,
        OPTIMAL_DENSITY: 1.5
    }
};

class SEOTestEngine {
    constructor() {
        this.name = 'seo-test-engine';
        this.version = '1.0.0';
        this.axiosInstance = this.createAxiosInstance();
    }

    /**
     * 创建axios实例
     */
    createAxiosInstance() {
        return axios.create({
            timeout: 30000,
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0; +http://example.com/bot)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br'
            }
        });
    }

    /**
     * 执行SEO测试 - 主入口方法
     */
    async runSEOTest(url, config = {}) {
        const testId = this.generateTestId();
        const startTime = Date.now();

        console.log(`🔍 开始SEO测试: ${url}`);

        try {
            // 验证URL
            this.validateUrl(url);

            // 获取页面内容
            const pageData = await this.fetchPageContent(url);

            // 解析HTML
            const $ = cheerio.load(pageData.html);

            // 执行各项SEO分析
            const results = {
                testId,
                url,
                startTime: new Date(startTime).toISOString(),
                config,

                // 基础信息
                pageInfo: this.analyzePageInfo(pageData, $),

                // 核心SEO元素分析
                titleAnalysis: this.analyzeTitleTag($),
                metaAnalysis: this.analyzeMetaTags($),
                headingAnalysis: this.analyzeHeadings($),
                imageAnalysis: this.analyzeImages($, url),
                linkAnalysis: this.analyzeLinks($, url),

                // 内容分析
                contentAnalysis: this.analyzeContent($),

                // 技术SEO
                structuredDataAnalysis: this.analyzeStructuredData($),
                socialMediaAnalysis: this.analyzeSocialMediaTags($),
                mobileOptimization: this.analyzeMobileOptimization($),

                // 外部资源分析
                robotsAnalysis: await this.analyzeRobotsTxt(url),
                sitemapAnalysis: await this.analyzeSitemap(url, $),

                // 性能相关
                performanceHints: this.analyzePerformanceHints($),

                // 计算总体评分
                overallScore: 0,
                grade: 'F',

                // 生成建议
                recommendations: [],

                // 测试完成信息
                endTime: new Date().toISOString(),
                duration: Date.now() - startTime
            };

            // 计算SEO评分
            this.calculateSEOScore(results);

            // 生成改进建议
            this.generateRecommendations(results);

            console.log(`✅ SEO测试完成: ${url} (评分: ${results.overallScore})`);

            return {
                success: true,
                data: results
            };

        } catch (error) {
            console.error(`❌ SEO测试失败: ${url}`, error);

            return {
                success: false,
                error: error.message,
                data: {
                    testId,
                    url,
                    startTime: new Date(startTime).toISOString(),
                    endTime: new Date().toISOString(),
                    duration: Date.now() - startTime,
                    errorDetails: {
                        message: error.message,
                        code: error.code,
                        status: error.response?.status
                    }
                }
            };
        }
    }  /**

   * 验证URL格式
   */
    validateUrl(url) {
        try {
            new URL(url);
        } catch (error) {
            throw new Error(`无效的URL格式: ${url}`);
        }
    }

    /**
     * 获取页面内容
     */
    async fetchPageContent(url) {
        try {
            const response = await this.axiosInstance.get(url);

            return {
                html: response.data,
                headers: response.headers,
                status: response.status,
                loadTime: response.config.metadata?.endTime - response.config.metadata?.startTime || 0
            };
        } catch (error) {
            if (error.code === 'ENOTFOUND') {
                throw new Error('域名解析失败，请检查URL是否正确');
            } else if (error.code === 'ECONNREFUSED') {
                throw new Error('连接被拒绝，目标服务器可能不可用');
            } else if (error.code === 'ETIMEDOUT') {
                throw new Error('请求超时，请稍后重试');
            } else if (error.response) {
                throw new Error(`HTTP错误 ${error.response.status}: ${error.response.statusText}`);
            }
            throw error;
        }
    }

    /**
     * 分析页面基础信息
     */
    analyzePageInfo(pageData, $) {
        return {
            status: pageData.status,
            loadTime: pageData.loadTime,
            contentType: pageData.headers['content-type'] || '',
            contentLength: pageData.headers['content-length'] || 0,
            server: pageData.headers['server'] || '',
            lastModified: pageData.headers['last-modified'] || '',
            charset: this.extractCharset($),
            doctype: this.extractDoctype(pageData.html),
            htmlLang: $('html').attr('lang') || '',
            viewport: $('meta[name="viewport"]').attr('content') || ''
        };
    }

    /**
     * 分析标题标签
     */
    analyzeTitleTag($) {
        const titleElement = $('title');
        const title = titleElement.text().trim();

        const analysis = {
            present: titleElement.length > 0,
            content: title,
            length: title.length,
            isEmpty: title.length === 0,
            tooShort: title.length < SEO_CONSTANTS.TITLE.MIN_LENGTH,
            tooLong: title.length > SEO_CONSTANTS.TITLE.MAX_LENGTH,
            optimal: title.length >= SEO_CONSTANTS.TITLE.OPTIMAL_MIN &&
                title.length <= SEO_CONSTANTS.TITLE.OPTIMAL_MAX,
            issues: [],
            score: 0
        };

        // 检查问题
        if (!analysis.present) {
            analysis.issues.push('缺少title标签');
            analysis.score = 0;
        } else if (analysis.isEmpty) {
            analysis.issues.push('title标签为空');
            analysis.score = 0;
        } else if (analysis.tooShort) {
            analysis.issues.push(`标题过短 (${title.length}字符)，建议至少${SEO_CONSTANTS.TITLE.MIN_LENGTH}字符`);
            analysis.score = 30;
        } else if (analysis.tooLong) {
            analysis.issues.push(`标题过长 (${title.length}字符)，建议不超过${SEO_CONSTANTS.TITLE.MAX_LENGTH}字符`);
            analysis.score = 70;
        } else if (analysis.optimal) {
            analysis.score = 100;
        } else {
            analysis.score = 85;
        }

        // 检查重复词汇
        const words = title.toLowerCase().split(//s+/);
        const duplicates = words.filter((word, index) => words.indexOf(word) !== index);
        if (duplicates.length > 0) {
            analysis.issues.push('标题中存在重复词汇');
            analysis.score = Math.max(0, analysis.score - 10);
        }

        return analysis;
    }

    /**
     * 分析元标签
     */
    analyzeMetaTags($) {
        const description = $('meta[name="description"]').attr('content') || '';
        const keywords = $('meta[name="keywords"]').attr('content') || '';
        const robots = $('meta[name="robots"]').attr('content') || '';
        const canonical = $('link[rel="canonical"]').attr('href') || '';
        const author = $('meta[name="author"]').attr('content') || '';

        return {
            description: this.analyzeMetaDescription(description),
            keywords: this.analyzeMetaKeywords(keywords),
            robots: this.analyzeMetaRobots(robots),
            canonical: this.analyzeCanonical(canonical),
            author: {
                present: author.length > 0,
                content: author
            },
            other: this.analyzeOtherMetaTags($)
        };
    }

    /**
     * 分析meta description
     */
    analyzeMetaDescription(description) {
        const analysis = {
            present: description.length > 0,
            content: description,
            length: description.length,
            isEmpty: description.length === 0,
            tooShort: description.length < SEO_CONSTANTS.DESCRIPTION.MIN_LENGTH,
            tooLong: description.length > SEO_CONSTANTS.DESCRIPTION.MAX_LENGTH,
            optimal: description.length >= SEO_CONSTANTS.DESCRIPTION.OPTIMAL_MIN &&
                description.length <= SEO_CONSTANTS.DESCRIPTION.OPTIMAL_MAX,
            issues: [],
            score: 0
        };

        if (!analysis.present) {
            analysis.issues.push('缺少meta description');
            analysis.score = 0;
        } else if (analysis.isEmpty) {
            analysis.issues.push('meta description为空');
            analysis.score = 0;
        } else if (analysis.tooShort) {
            analysis.issues.push(`描述过短 (${description.length}字符)，建议至少${SEO_CONSTANTS.DESCRIPTION.MIN_LENGTH}字符`);
            analysis.score = 40;
        } else if (analysis.tooLong) {
            analysis.issues.push(`描述过长 (${description.length}字符)，建议不超过${SEO_CONSTANTS.DESCRIPTION.MAX_LENGTH}字符`);
            analysis.score = 75;
        } else if (analysis.optimal) {
            analysis.score = 100;
        } else {
            analysis.score = 90;
        }

        return analysis;
    }

    /**
     * 分析标题结构
     */
    analyzeHeadings($) {
        const headings = {
            h1: [],
            h2: [],
            h3: [],
            h4: [],
            h5: [],
            h6: []
        };

        // 提取所有标题
        for (let i = 1; i <= 6; i++) {
            $(`h${i}`).each((index, element) => {
                const text = $(element).text().trim();
                headings[`h${i}`].push({
                    text,
                    length: text.length,
                    position: index + 1
                });
            });
        }

        const analysis = {
            structure: headings,
            h1Count: headings.h1.length,
            totalHeadings: Object.values(headings).reduce((sum, arr) => sum + arr.length, 0),
            issues: [],
            score: 0
        };

        // 检查H1标签
        if (analysis.h1Count === 0) {
            analysis.issues.push('缺少H1标签');
            analysis.score = 0;
        } else if (analysis.h1Count > 1) {
            analysis.issues.push(`存在${analysis.h1Count}个H1标签，建议只使用一个`);
            analysis.score = 60;
        } else {
            const h1 = headings.h1[0];
            if (h1.length < SEO_CONSTANTS.HEADINGS.MIN_H1_LENGTH) {
                analysis.issues.push('H1标签内容过短');
                analysis.score = 70;
            } else if (h1.length > SEO_CONSTANTS.HEADINGS.MAX_H1_LENGTH) {
                analysis.issues.push('H1标签内容过长');
                analysis.score = 80;
            } else {
                analysis.score = 100;
            }
        }

        // 检查标题层级结构
        const hasH2 = headings.h2.length > 0;
        const hasH3 = headings.h3.length > 0;
        const hasH4 = headings.h4.length > 0;

        if (hasH3 && !hasH2) {
            analysis.issues.push('存在H3但缺少H2，标题层级不合理');
            analysis.score = Math.max(0, analysis.score - 10);
        }

        if (hasH4 && !hasH3) {
            analysis.issues.push('存在H4但缺少H3，标题层级不合理');
            analysis.score = Math.max(0, analysis.score - 10);
        }

        return analysis;
    }
    /**
      * 分析图片SEO
      */
    analyzeImages($, baseUrl) {
        const images = [];
        const analysis = {
            totalImages: 0,
            imagesWithAlt: 0,
            imagesWithoutAlt: 0,
            imagesWithEmptyAlt: 0,
            largeImages: 0,
            issues: [],
            score: 0,
            images: []
        };

        $('img').each((index, element) => {
            const $img = $(element);
            const src = $img.attr('src') || '';
            const alt = $img.attr('alt');
            const title = $img.attr('title') || '';
            const width = $img.attr('width');
            const height = $img.attr('height');

            const imageInfo = {
                src: this.resolveUrl(src, baseUrl),
                alt: alt || '',
                hasAlt: alt !== undefined,
                altLength: (alt || '').length,
                title,
                width: width ? parseInt(width) : null,
                height: height ? parseInt(height) : null,
                position: index + 1
            };

            images.push(imageInfo);
            analysis.totalImages++;

            if (imageInfo.hasAlt) {
                if (imageInfo.alt.trim() === '') {
                    analysis.imagesWithEmptyAlt++;
                } else {
                    analysis.imagesWithAlt++;
                }
            } else {
                analysis.imagesWithoutAlt++;
            }
        });

        analysis.images = images;

        // 计算评分
        if (analysis.totalImages === 0) {
            analysis.score = 100; // 没有图片不扣分
        } else {
            const altRatio = analysis.imagesWithAlt / analysis.totalImages;
            analysis.score = Math.round(altRatio * 100);

            if (analysis.imagesWithoutAlt > 0) {
                analysis.issues.push(`${analysis.imagesWithoutAlt}个图片缺少alt属性`);
            }

            if (analysis.imagesWithEmptyAlt > 0) {
                analysis.issues.push(`${analysis.imagesWithEmptyAlt}个图片的alt属性为空`);
            }
        }

        return analysis;
    }

    /**
     * 分析链接结构
     */
    analyzeLinks($, baseUrl) {
        const links = [];
        const analysis = {
            totalLinks: 0,
            internalLinks: 0,
            externalLinks: 0,
            noFollowLinks: 0,
            linksWithoutText: 0,
            issues: [],
            score: 0,
            links: []
        };

        $('a[href]').each((index, element) => {
            const $link = $(element);
            const href = $link.attr('href') || '';
            const text = $link.text().trim();
            const title = $link.attr('title') || '';
            const rel = $link.attr('rel') || '';
            const target = $link.attr('target') || '';

            const linkInfo = {
                href: this.resolveUrl(href, baseUrl),
                text,
                title,
                rel,
                target,
                hasText: text.length > 0,
                isInternal: this.isInternalLink(href, baseUrl),
                isNoFollow: rel.includes('nofollow'),
                position: index + 1
            };

            links.push(linkInfo);
            analysis.totalLinks++;

            if (linkInfo.isInternal) {
                analysis.internalLinks++;
            } else {
                analysis.externalLinks++;
            }

            if (linkInfo.isNoFollow) {
                analysis.noFollowLinks++;
            }

            if (!linkInfo.hasText) {
                analysis.linksWithoutText++;
            }
        });

        analysis.links = links;

        // 计算评分
        let score = 100;

        if (analysis.linksWithoutText > 0) {
            analysis.issues.push(`${analysis.linksWithoutText}个链接缺少锚文本`);
            score -= Math.min(30, analysis.linksWithoutText * 5);
        }

        // 检查内外链比例
        if (analysis.totalLinks > 0) {
            const externalRatio = analysis.externalLinks / analysis.totalLinks;
            if (externalRatio > 0.8) {
                analysis.issues.push('外部链接过多，建议增加内部链接');
                score -= 10;
            }
        }

        analysis.score = Math.max(0, score);
        return analysis;
    }

    /**
     * 分析页面内容
     */
    analyzeContent($) {
        const bodyText = $('body').text().replace(//s+/g, ' ').trim();
        const words = bodyText.split(//s+/).filter(word => word.length > 0);

        const analysis = {
            wordCount: words.length,
            characterCount: bodyText.length,
            paragraphCount: $('p').length,
            readabilityScore: this.calculateReadabilityScore(bodyText),
            keywordDensity: this.calculateKeywordDensity(words),
            duplicateContent: this.checkDuplicateContent($),
            contentQuality: 'poor',
            issues: [],
            score: 0
        };

        // 评估内容质量
        if (analysis.wordCount < 100) {
            analysis.contentQuality = 'poor';
            analysis.issues.push('内容过少，建议至少300词');
            analysis.score = 20;
        } else if (analysis.wordCount < 300) {
            analysis.contentQuality = 'fair';
            analysis.issues.push('内容较少，建议增加到300词以上');
            analysis.score = 60;
        } else if (analysis.wordCount < 600) {
            analysis.contentQuality = 'good';
            analysis.score = 85;
        } else {
            analysis.contentQuality = 'excellent';
            analysis.score = 100;
        }

        // 检查可读性
        if (analysis.readabilityScore < 60) {
            analysis.issues.push('内容可读性较差，建议简化句子结构');
            analysis.score = Math.max(0, analysis.score - 15);
        }

        return analysis;
    }

    /**
     * 分析结构化数据
     */
    analyzeStructuredData($) {
        const analysis = {
            jsonLd: [],
            microdata: [],
            rdfa: [],
            openGraph: {},
            twitterCard: {},
            issues: [],
            score: 0
        };

        // 检查JSON-LD
        $('script[type="application/ld+json"]').each((index, element) => {
            try {
                const data = JSON.parse($(element).html());
                analysis.jsonLd.push(data);
            } catch (error) {
                analysis.issues.push('JSON-LD格式错误');
            }
        });

        // 检查Open Graph
        $('meta[property^="og:"]').each((index, element) => {
            const property = $(element).attr('property');
            const content = $(element).attr('content');
            analysis.openGraph[property] = content;
        });

        // 检查Twitter Card
        $('meta[name^="twitter:"]').each((index, element) => {
            const name = $(element).attr('name');
            const content = $(element).attr('content');
            analysis.twitterCard[name] = content;
        });

        // 计算评分
        let score = 0;
        if (analysis.jsonLd.length > 0) score += 40;
        if (Object.keys(analysis.openGraph).length > 0) score += 30;
        if (Object.keys(analysis.twitterCard).length > 0) score += 30;

        analysis.score = score;
        return analysis;
    }

    /**
     * 分析社交媒体标签
     */
    analyzeSocialMediaTags($) {
        const openGraph = {};
        const twitterCard = {};
        const facebookMeta = {};

        // Open Graph标签
        $('meta[property^="og:"]').each((index, element) => {
            const property = $(element).attr('property').replace('og:', '');
            const content = $(element).attr('content');
            openGraph[property] = content;
        });

        // Twitter Card标签
        $('meta[name^="twitter:"]').each((index, element) => {
            const name = $(element).attr('name').replace('twitter:', '');
            const content = $(element).attr('content');
            twitterCard[name] = content;
        });

        const analysis = {
            openGraph: {
                present: Object.keys(openGraph).length > 0,
                tags: openGraph,
                complete: this.isOpenGraphComplete(openGraph),
                issues: this.validateOpenGraph(openGraph)
            },
            twitterCard: {
                present: Object.keys(twitterCard).length > 0,
                tags: twitterCard,
                complete: this.isTwitterCardComplete(twitterCard),
                issues: this.validateTwitterCard(twitterCard)
            },
            score: 0
        };

        // 计算评分
        let score = 0;
        if (analysis.openGraph.present) {
            score += analysis.openGraph.complete ? 50 : 30;
        }
        if (analysis.twitterCard.present) {
            score += analysis.twitterCard.complete ? 50 : 30;
        }

        analysis.score = score;
        return analysis;
    }

    /**
     * 分析移动端优化
     */
    analyzeMobileOptimization($) {
        const viewport = $('meta[name="viewport"]').attr('content') || '';
        const touchIcons = $('link[rel*="apple-touch-icon"], link[rel*="icon"]').length;

        const analysis = {
            viewport: {
                present: viewport.length > 0,
                content: viewport,
                responsive: viewport.includes('width=device-width'),
                scalable: !viewport.includes('user-scalable=no')
            },
            touchIcons: {
                present: touchIcons > 0,
                count: touchIcons
            },
            amp: {
                present: $('html[amp], html[⚡]').length > 0 || $('link[rel="amphtml"]').length > 0
            },
            issues: [],
            score: 0
        };

        // 计算评分
        let score = 0;

        if (analysis.viewport.present) {
            if (analysis.viewport.responsive) {
                score += 60;
            } else {
                analysis.issues.push('viewport标签未设置响应式');
                score += 30;
            }
        } else {
            analysis.issues.push('缺少viewport标签');
        }

        if (analysis.touchIcons.present) {
            score += 20;
        } else {
            analysis.issues.push('缺少移动端图标');
        }

        if (analysis.amp.present) {
            score += 20;
        }

        analysis.score = Math.min(100, score);
        return analysis;
    }  /*
*
   * 分析robots.txt
   */
    async analyzeRobotsTxt(url) {
        try {
            const baseUrl = new URL(url).origin;
            const robotsUrl = `${baseUrl}/robots.txt`;

            const response = await this.axiosInstance.get(robotsUrl);

            const analysis = {
                exists: true,
                accessible: true,
                content: response.data,
                url: robotsUrl,
                directives: this.parseRobotsDirectives(response.data),
                issues: [],
                score: 100
            };

            // 检查常见问题
            if (response.data.includes('Disallow: /')) {
                analysis.issues.push('robots.txt禁止所有爬虫访问');
                analysis.score = 0;
            }

            return analysis;
        } catch (error) {
            return {
                exists: false,
                accessible: false,
                content: '',
                url: `${new URL(url).origin}/robots.txt`,
                directives: [],
                issues: ['robots.txt文件不存在或无法访问'],
                score: 50 // 不存在不一定是问题
            };
        }
    }

    /**
     * 分析sitemap
     */
    async analyzeSitemap(url, $) {
        const analysis = {
            declared: false,
            accessible: false,
            urls: [],
            urlCount: 0,
            issues: [],
            score: 0
        };

        // 检查HTML中是否声明了sitemap
        const sitemapLinks = $('link[rel="sitemap"]');
        if (sitemapLinks.length > 0) {
            analysis.declared = true;
            const sitemapUrl = sitemapLinks.first().attr('href');

            try {
                const response = await this.axiosInstance.get(sitemapUrl);
                analysis.accessible = true;

                // 简单解析sitemap
                const urlMatches = response.data.match(/<loc>(.*?)<//loc>/g) || [];
                analysis.urls = urlMatches.map(match =>
                    match.replace(/<//?loc>/g, '').trim()
                );
                analysis.urlCount = analysis.urls.length;
                analysis.score = 100;
            } catch (error) {
                analysis.issues.push('sitemap文件无法访问');
                analysis.score = 30;
            }
        } else {
            // 尝试常见的sitemap路径
            const commonPaths = ['/sitemap.xml', '/sitemap_index.xml'];
            const baseUrl = new URL(url).origin;

            for (const path of commonPaths) {
                try {
                    const sitemapUrl = `${baseUrl}${path}`;
                    const response = await this.axiosInstance.get(sitemapUrl);

                    analysis.accessible = true;
                    const urlMatches = response.data.match(/<loc>(.*?)<//loc>/g) || [];
                    analysis.urls = urlMatches.map(match =>
                        match.replace(/<//?loc>/g, '').trim()
                    );
                    analysis.urlCount = analysis.urls.length;
                    analysis.score = 80; // 存在但未声明
                    break;
                } catch (error) {
                    continue;
                }
            }

            if (!analysis.accessible) {
                analysis.issues.push('未找到sitemap文件');
                analysis.score = 0;
            }
        }

        return analysis;
    }

    /**
     * 分析性能提示
     */
    analyzePerformanceHints($) {
        const analysis = {
            preconnect: $('link[rel="preconnect"]').length,
            prefetch: $('link[rel="prefetch"]').length,
            preload: $('link[rel="preload"]').length,
            dns_prefetch: $('link[rel="dns-prefetch"]').length,
            critical_css: this.hasCriticalCSS($),
            lazy_loading: $('img[loading="lazy"]').length,
            issues: [],
            score: 0
        };

        let score = 50; // 基础分

        if (analysis.preconnect > 0) score += 10;
        if (analysis.preload > 0) score += 10;
        if (analysis.dns_prefetch > 0) score += 10;
        if (analysis.critical_css) score += 10;
        if (analysis.lazy_loading > 0) score += 10;

        analysis.score = Math.min(100, score);
        return analysis;
    }

    /**
     * 计算SEO总体评分
     */
    calculateSEOScore(results) {
        const weights = {
            title: 0.20,
            metaDescription: 0.15,
            headings: 0.15,
            content: 0.15,
            images: 0.10,
            links: 0.10,
            structuredData: 0.05,
            socialMedia: 0.05,
            mobile: 0.05
        };

        let totalScore = 0;
        totalScore += results.titleAnalysis.score * weights.title;
        totalScore += results.metaAnalysis.description.score * weights.metaDescription;
        totalScore += results.headingAnalysis.score * weights.headings;
        totalScore += results.contentAnalysis.score * weights.content;
        totalScore += results.imageAnalysis.score * weights.images;
        totalScore += results.linkAnalysis.score * weights.links;
        totalScore += results.structuredDataAnalysis.score * weights.structuredData;
        totalScore += results.socialMediaAnalysis.score * weights.socialMedia;
        totalScore += results.mobileOptimization.score * weights.mobile;

        results.overallScore = Math.round(totalScore);
        results.grade = this.getGrade(results.overallScore);
    }

    /**
     * 生成改进建议
     */
    generateRecommendations(results) {
        const recommendations = [];

        // 标题建议
        if (results.titleAnalysis.score < 80) {
            recommendations.push({
                category: 'title',
                priority: 'high',
                title: '优化页面标题',
                description: results.titleAnalysis.issues.join('; '),
                impact: '提升搜索引擎排名和点击率'
            });
        }

        // 描述建议
        if (results.metaAnalysis.description.score < 80) {
            recommendations.push({
                category: 'meta',
                priority: 'high',
                title: '优化meta描述',
                description: results.metaAnalysis.description.issues.join('; '),
                impact: '提升搜索结果点击率'
            });
        }

        // 标题结构建议
        if (results.headingAnalysis.score < 80) {
            recommendations.push({
                category: 'headings',
                priority: 'medium',
                title: '优化标题结构',
                description: results.headingAnalysis.issues.join('; '),
                impact: '改善内容结构和可读性'
            });
        }

        // 图片建议
        if (results.imageAnalysis.score < 80) {
            recommendations.push({
                category: 'images',
                priority: 'medium',
                title: '优化图片SEO',
                description: results.imageAnalysis.issues.join('; '),
                impact: '提升图片搜索排名和可访问性'
            });
        }

        // 内容建议
        if (results.contentAnalysis.score < 80) {
            recommendations.push({
                category: 'content',
                priority: 'medium',
                title: '改善内容质量',
                description: results.contentAnalysis.issues.join('; '),
                impact: '提升用户体验和搜索排名'
            });
        }

        // 结构化数据建议
        if (results.structuredDataAnalysis.score < 50) {
            recommendations.push({
                category: 'structured-data',
                priority: 'low',
                title: '添加结构化数据',
                description: '使用JSON-LD格式添加结构化数据标记',
                impact: '提升搜索结果展示效果'
            });
        }

        // 社交媒体建议
        if (results.socialMediaAnalysis.score < 50) {
            recommendations.push({
                category: 'social',
                priority: 'low',
                title: '添加社交媒体标签',
                description: '添加Open Graph和Twitter Card标签',
                impact: '改善社交媒体分享效果'
            });
        }

        // 移动端建议
        if (results.mobileOptimization.score < 80) {
            recommendations.push({
                category: 'mobile',
                priority: 'high',
                title: '优化移动端体验',
                description: results.mobileOptimization.issues.join('; '),
                impact: '提升移动端搜索排名'
            });
        }

        results.recommendations = recommendations;
    }

    // 辅助方法
    generateTestId() {
        return `seo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    extractCharset($) {
        const charset = $('meta[charset]').attr('charset') ||
            $('meta[http-equiv="Content-Type"]').attr('content');
        return charset || 'unknown';
    }

    extractDoctype(html) {
        const doctypeMatch = html.match(/<!DOCTYPE[^>]*>/i);
        return doctypeMatch ? doctypeMatch[0] : '';
    }

    resolveUrl(url, baseUrl) {
        try {
            return new URL(url, baseUrl).href;
        } catch {
            return url;
        }
    }

    isInternalLink(href, baseUrl) {
        try {
            const linkUrl = new URL(href, baseUrl);
            const baseUrlObj = new URL(baseUrl);
            return linkUrl.hostname === baseUrlObj.hostname;
        } catch {
            return href.startsWith('/') || !href.includes('://');
        }
    }

    calculateReadabilityScore(text) {
        // 简化的可读性评分算法
        const sentences = text.split(/[.!?]+/).length;
        const words = text.split(//s+/).length;
        const avgWordsPerSentence = words / sentences;

        if (avgWordsPerSentence < 15) return 90;
        if (avgWordsPerSentence < 20) return 75;
        if (avgWordsPerSentence < 25) return 60;
        return 40;
    }

    calculateKeywordDensity(words) {
        const wordCount = {};
        const totalWords = words.length;

        words.forEach(word => {
            const cleanWord = word.toLowerCase().replace(/[^/w]/g, '');
            if (cleanWord.length > 2) {
                wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
            }
        });

        const density = {};
        Object.entries(wordCount).forEach(([word, count]) => {
            if (count > 1) {
                density[word] = ((count / totalWords) * 100).toFixed(2);
            }
        });

        return density;
    }

    checkDuplicateContent($) {
        // 简单的重复内容检测
        const paragraphs = $('p').map((i, el) => $(el).text().trim()).get();
        const uniqueParagraphs = [...new Set(paragraphs)];
        return paragraphs.length !== uniqueParagraphs.length;
    }

    parseRobotsDirectives(content) {
        const lines = content.split('/n');
        const directives = [];

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [directive, value] = trimmed.split(':').map(s => s.trim());
                if (directive && value) {
                    directives.push({ directive, value });
                }
            }
        });

        return directives;
    }

    isOpenGraphComplete(og) {
        const required = ['title', 'description', 'image', 'url'];
        return required.every(prop => og[prop]);
    }

    isTwitterCardComplete(twitter) {
        const hasCard = twitter.card;
        const hasTitle = twitter.title;
        const hasDescription = twitter.description;
        return hasCard && hasTitle && hasDescription;
    }

    validateOpenGraph(og) {
        const issues = [];
        if (!og.title) issues.push('缺少og:title');
        if (!og.description) issues.push('缺少og:description');
        if (!og.image) issues.push('缺少og:image');
        if (!og.url) issues.push('缺少og:url');
        return issues;
    }

    validateTwitterCard(twitter) {
        const issues = [];
        if (!twitter.card) issues.push('缺少twitter:card');
        if (!twitter.title) issues.push('缺少twitter:title');
        if (!twitter.description) issues.push('缺少twitter:description');
        return issues;
    }

    hasCriticalCSS($) {
        return $('style').length > 0 || $('link[rel="stylesheet"][media="print"]').length > 0;
    }

    getGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    analyzeMetaKeywords(keywords) {
        return {
            present: keywords.length > 0,
            content: keywords,
            count: keywords ? keywords.split(',').length : 0,
            deprecated: true // meta keywords已被弃用
        };
    }

    analyzeMetaRobots(robots) {
        return {
            present: robots.length > 0,
            content: robots,
            noindex: robots.includes('noindex'),
            nofollow: robots.includes('nofollow')
        };
    }

    analyzeCanonical(canonical) {
        return {
            present: canonical.length > 0,
            url: canonical,
            valid: canonical.length > 0 && canonical.startsWith('http')
        };
    }

    analyzeOtherMetaTags($) {
        const tags = {};
        $('meta[name]').each((i, el) => {
            const name = $(el).attr('name');
            const content = $(el).attr('content');
            if (!['description', 'keywords', 'robots', 'author'].includes(name)) {
                tags[name] = content;
            }
        });
        return tags;
    }
}

module.exports = SEOTestEngine;