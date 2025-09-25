/**
 * 图像内容检测引擎
 * 提供图像安全检测、格式分析、质量评估等综合功能
 * 支持多种图像格式：JPEG, PNG, GIF, WebP, SVG, BMP等
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const ExifReader = require('exifreader');
const jsQR = require('jsqr');
const PNG = require('pngjs').PNG;

class ImageContentDetectionEngine {
    constructor(config = {}) {
        this.config = {
            // 支持的图像格式
            supportedFormats: ['jpeg', 'jpg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'],
            // 最大文件大小 (50MB)
            maxFileSize: config.maxFileSize || 50 * 1024 * 1024,
            // 质量评估阈值
            qualityThresholds: {
                excellent: 90,
                good: 70,
                fair: 50,
                poor: 30
            },
            // 安全检测配置
            security: {
                maxDimensions: config.maxDimensions || 10000,
                enableMalwareDetection: config.enableMalwareDetection || true,
                enableContentAnalysis: config.enableContentAnalysis || true
            },
            ...config
        };

        this.results = {
            analysis: {},
            security: {},
            quality: {},
            metadata: {},
            recommendations: []
        };
    }

    /**
     * 执行完整的图像内容检测
     * @param {string|Buffer} input - 图像文件路径或Buffer
     * @returns {Promise<Object>} 检测结果
     */
    async analyzeImage(input) {
        try {
            const startTime = Date.now();

            // 初始化结果
            this.resetResults();
            
            // 获取图像数据
            const imageData = await this.loadImage(input);
            
            // 并行执行各项检测
            const analyses = await Promise.allSettled([
                this.performFormatAnalysis(imageData),
                this.performSecurityAnalysis(imageData),
                this.performQualityAssessment(imageData),
                this.performMetadataExtraction(imageData),
                this.performContentAnalysis(imageData),
                this.performDimensionAnalysis(imageData),
                this.performColorAnalysis(imageData),
                this.performCompressionAnalysis(imageData),
                this.performAccessibilityAnalysis(imageData)
            ]);

            // 处理分析结果
            this.processAnalysisResults(analyses);

            // 生成综合评估和建议
            this.generateRecommendations();

            const executionTime = Date.now() - startTime;
            
            return {
                success: true,
                executionTime: `${executionTime}ms`,
                timestamp: new Date().toISOString(),
                results: this.results,
                summary: this.generateSummary()
            };

        } catch (error) {
            console.error('图像内容检测失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 加载图像数据
     */
    async loadImage(input) {
        let buffer;
        let filePath;

        if (typeof input === 'string') {
            filePath = input;

            
            /**

            
             * if功能函数

            
             * @param {Object} params - 参数对象

            
             * @returns {Promise<Object>} 返回结果

            
             */
            const stats = await fs.stat(filePath);
            
            if (stats.size > this.config.maxFileSize) {
                throw new Error(`文件大小超过限制: ${stats.size} bytes`);
            }
            
            buffer = await fs.readFile(filePath);
        } else if (Buffer.isBuffer(input)) {
            buffer = input;
        } else {
            throw new Error('不支持的输入类型');
        }

        return {
            buffer,
            filePath,
            size: buffer.length,
            hash: crypto.createHash('md5').update(buffer).digest('hex')
        };
    }

    /**
     * 格式分析
     */
    async performFormatAnalysis(imageData) {
        try {
            const image = sharp(imageData.buffer);
            const metadata = await image.metadata();
            
            const formatAnalysis = {
                format: metadata.format,
                width: metadata.width,
                height: metadata.height,
                channels: metadata.channels,
                depth: metadata.depth,
                density: metadata.density,
                hasProfile: !!metadata.icc,
                hasAlpha: metadata.hasAlpha,
                isProgressive: metadata.isProgressive || false,
                orientation: metadata.orientation || 1
            };

            // 格式兼容性检查
            const compatibility = this.checkFormatCompatibility(formatAnalysis);
            
            this.results.analysis.format = {
                ...formatAnalysis,
                compatibility,
                fileSize: imageData.size,
                fileSizeFormatted: this.formatFileSize(imageData.size),
                aspectRatio: (metadata.width / metadata.height).toFixed(2)
            };

        } catch (error) {
            this.results.analysis.format = {
                error: `格式分析失败: ${error.message}`
            };
        }
    }

    /**
     * 安全分析
     */
    async performSecurityAnalysis(imageData) {
        try {
            const securityIssues = [];
            const warnings = [];

            // 文件大小检查
            if (imageData.size > this.config.maxFileSize) {
                securityIssues.push('文件大小超过安全限制');
            }

            // 尺寸检查
            const image = sharp(imageData.buffer);
            const metadata = await image.metadata();
            
            if (metadata.width > this.config.security.maxDimensions || 
                metadata.height > this.config.security.maxDimensions) {
                securityIssues.push('图像尺寸过大，可能导致内存溢出');
            }

            // 恶意文件特征检测
            const malwareSignatures = await this.detectMalwareSignatures(imageData.buffer);
            if (malwareSignatures.length > 0) {
                securityIssues.push(`检测到可疑特征: ${malwareSignatures.join(', ')}`);
            }

            // 嵌入内容检测
            const embeddedContent = await this.detectEmbeddedContent(imageData.buffer);
            if (embeddedContent.hasEmbeddedFiles) {
                warnings.push('检测到嵌入的文件内容');
            }

            // EXIF数据隐私检查
            const privacyRisks = await this.checkPrivacyRisks(imageData.buffer);

            this.results.security = {
                riskLevel: securityIssues.length > 0 ? 'HIGH' : 
                          warnings.length > 0 ? 'MEDIUM' : 'LOW',
                issues: securityIssues,
                warnings,
                embeddedContent,
                privacyRisks,
                fileHash: imageData.hash
            };

        } catch (error) {
            this.results.security = {
                error: `安全分析失败: ${error.message}`
            };
        }
    }

    /**
     * 质量评估
     */
    async performQualityAssessment(imageData) {
        try {
            const image = sharp(imageData.buffer);
            const metadata = await image.metadata();
            
            // 基础质量指标
            const resolution = metadata.width * metadata.height;
            const aspectRatio = metadata.width / metadata.height;
            
            // 压缩质量评估
            const compressionQuality = await this.assessCompressionQuality(image, metadata);
            
            // 清晰度分析
            const sharpnessScore = await this.assessSharpness(image);
            
            // 噪点分析
            const noiseLevel = await this.assessNoiseLevel(image);
            
            // 色彩饱和度
            const colorSaturation = await this.assessColorSaturation(image);

            // 综合质量评分 (0-100)
            const qualityScore = this.calculateQualityScore({
                resolution,
                compressionQuality,
                sharpnessScore,
                noiseLevel,
                colorSaturation
            });

            this.results.quality = {
                overallScore: qualityScore,
                grade: this.getQualityGrade(qualityScore),
                metrics: {
                    resolution: {
                        total: resolution,
                        megapixels: (resolution / 1000000).toFixed(2),
                        category: this.categorizeResolution(resolution)
                    },
                    sharpness: {
                        score: sharpnessScore,
                        level: sharpnessScore > 0.7 ? 'High' : sharpnessScore > 0.4 ? 'Medium' : 'Low'
                    },
                    noise: {
                        level: noiseLevel,
                        category: noiseLevel < 0.2 ? 'Low' : noiseLevel < 0.5 ? 'Medium' : 'High'
                    },
                    colorSaturation: {
                        score: colorSaturation,
                        level: colorSaturation > 0.7 ? 'High' : colorSaturation > 0.4 ? 'Medium' : 'Low'
                    },
                    compression: compressionQuality
                }
            };

        } catch (error) {
            this.results.quality = {
                error: `质量评估失败: ${error.message}`
            };
        }
    }

    /**
     * 元数据提取
     */
    async performMetadataExtraction(imageData) {
        try {
            const metadata = {};

            // EXIF数据提取
            try {
                const exifData = ExifReader.load(imageData.buffer);
                metadata.exif = this.processExifData(exifData);
            } catch (exifError) {
                metadata.exif = { error: '无法读取EXIF数据' };
            }

            // 基础元数据
            const image = sharp(imageData.buffer);
            const basicMeta = await image.metadata();
            
            metadata.basic = {
                format: basicMeta.format,
                width: basicMeta.width,
                height: basicMeta.height,
                channels: basicMeta.channels,
                depth: basicMeta.depth,
                space: basicMeta.space,
                density: basicMeta.density,
                isProgressive: basicMeta.isProgressive
            };

            // 颜色配置文件
            if (basicMeta.icc) {
                metadata.colorProfile = {
                    present: true,
                    description: 'ICC颜色配置文件存在'
                };
            }

            this.results.metadata = metadata;

        } catch (error) {
            this.results.metadata = {
                error: `元数据提取失败: ${error.message}`
            };
        }
    }

    /**
     * 内容分析
     */
    async performContentAnalysis(imageData) {
        try {
            const contentAnalysis = {};

            // 二维码检测
            try {
                const qrResult = await this.detectQRCodes(imageData.buffer);
                contentAnalysis.qrCodes = qrResult;
            } catch (qrError) {
                contentAnalysis.qrCodes = { detected: false };
            }

            // 文本检测 (OCR - 简化版)
            contentAnalysis.textDetection = {
                hasText: false,
                note: '需要集成OCR库进行文本检测'
            };

            // 人脸检测标记
            contentAnalysis.faceDetection = {
                detected: false,
                note: '需要集成人脸检测库'
            };

            this.results.analysis.content = contentAnalysis;

        } catch (error) {
            this.results.analysis.content = {
                error: `内容分析失败: ${error.message}`
            };
        }
    }

    /**
     * 尺寸分析
     */
    async performDimensionAnalysis(imageData) {
        try {
            const image = sharp(imageData.buffer);
            const metadata = await image.metadata();
            
            const dimensionAnalysis = {
                width: metadata.width,
                height: metadata.height,
                aspectRatio: (metadata.width / metadata.height).toFixed(2),
                orientation: this.getOrientationName(metadata.orientation || 1),
                category: this.categorizeDimensions(metadata.width, metadata.height),
                suitability: this.assessDimensionSuitability(metadata.width, metadata.height)
            };

            this.results.analysis.dimensions = dimensionAnalysis;

        } catch (error) {
            this.results.analysis.dimensions = {
                error: `尺寸分析失败: ${error.message}`
            };
        }
    }

    /**
     * 颜色分析
     */
    async performColorAnalysis(imageData) {
        try {
            const image = sharp(imageData.buffer);
            
            // 获取主要颜色统计
            const { channels, histogram } = await image.stats();
            
            const colorAnalysis = {
                channels: channels.length,
                histogram: {
                    red: histogram ? histogram.red : null,
                    green: histogram ? histogram.green : null,
                    blue: histogram ? histogram.blue : null
                },
                dominantColors: await this.extractDominantColors(image),
                colorSpace: await this.analyzeColorSpace(image)
            };

            this.results.analysis.colors = colorAnalysis;

        } catch (error) {
            this.results.analysis.colors = {
                error: `颜色分析失败: ${error.message}`
            };
        }
    }

    /**
     * 压缩分析
     */
    async performCompressionAnalysis(imageData) {
        try {
            const image = sharp(imageData.buffer);
            const metadata = await image.metadata();
            
            const compressionAnalysis = {
                format: metadata.format,
                fileSize: imageData.size,
                fileSizeFormatted: this.formatFileSize(imageData.size),
                compressionRatio: await this.calculateCompressionRatio(image, metadata),
                optimization: await this.suggestOptimization(image, metadata, imageData.size)
            };

            this.results.analysis.compression = compressionAnalysis;

        } catch (error) {
            this.results.analysis.compression = {
                error: `压缩分析失败: ${error.message}`
            };
        }
    }

    /**
     * 可访问性分析
     */
    async performAccessibilityAnalysis(imageData) {
        try {
            const image = sharp(imageData.buffer);
            
            // 对比度分析
            const contrastAnalysis = await this.analyzeContrast(image);
            
            // 色盲友好性检查
            const colorBlindFriendly = await this.checkColorBlindFriendliness(image);
            
            const accessibilityAnalysis = {
                contrast: contrastAnalysis,
                colorBlindFriendly,
                recommendations: this.generateAccessibilityRecommendations(contrastAnalysis, colorBlindFriendly)
            };

            this.results.analysis.accessibility = accessibilityAnalysis;

        } catch (error) {
            this.results.analysis.accessibility = {
                error: `可访问性分析失败: ${error.message}`
            };
        }
    }

    // ===========================================
    // 辅助方法
    // ===========================================

    /**
     * 检测恶意软件特征
     */
    async detectMalwareSignatures(buffer) {
        const signatures = [];
        const bufferString = buffer.toString('hex');
        
        // 简单的恶意特征检测 (实际应用中需要更复杂的检测逻辑)
        const maliciousPatterns = [
            'script',
            'javascript',
            'vbscript',
            'onload',
            'onerror'
        ];

        for (const pattern of maliciousPatterns) {
            if (bufferString.includes(Buffer.from(pattern).toString('hex'))) {
                signatures.push(pattern);
            }
        }

        return signatures;
    }

    /**
     * 检测嵌入内容
     */
    async detectEmbeddedContent(buffer) {
        // 检测是否有嵌入的文件或隐写术
        const result = {
            hasEmbeddedFiles: false,
            suspiciousEntropy: false,
            steganographyRisk: 'LOW'
        };

        // 熵值分析
        const entropy = this.calculateEntropy(buffer);
        if (entropy > 7.5) {
            result.suspiciousEntropy = true;
            result.steganographyRisk = 'HIGH';
        }

        return result;
    }

    /**
     * 隐私风险检查
     */
    async checkPrivacyRisks(buffer) {
        const risks = [];
        
        try {
            const exifData = ExifReader.load(buffer);
            
            // GPS信息检查
            if (exifData.GPSLatitude || exifData.GPSLongitude) {
                risks.push('包含GPS位置信息');
            }
            
            // 相机信息检查
            if (exifData.Make || exifData.Model) {
                risks.push('包含设备信息');
            }
            
            // 时间戳检查
            if (exifData.DateTime) {
                risks.push('包含拍摄时间信息');
            }
            
        } catch (error) {
            // 忽略EXIF读取错误
        }

        return {
            level: risks.length > 0 ? 'MEDIUM' : 'LOW',
            risks
        };
    }

    /**
     * 二维码检测
     */
    async detectQRCodes(buffer) {
        try {
            const image = sharp(buffer);
            const { data, info } = await image
                .raw()
                .ensureAlpha()
                .toBuffer({ resolveWithObject: true });
            

            
            /**

            
             * if功能函数

            
             * @param {Object} params - 参数对象

            
             * @returns {Promise<Object>} 返回结果

            
             */
            const code = jsQR(data, info.width, info.height);
            
            if (code) {
                return {
                    detected: true,
                    data: code.data,
                    location: code.location
                };
            }
            
            return { detected: false };
        } catch (error) {
            return { 
                detected: false, 
                error: error.message 
            };
        }
    }

    /**
     * 压缩质量评估
     */
    async assessCompressionQuality(image, metadata) {
        // 基于文件格式和大小评估压缩质量
        const pixelCount = metadata.width * metadata.height;
        const bytesPerPixel = metadata.channels || 3;
        const uncompressedSize = pixelCount * bytesPerPixel;
        const compressionRatio = metadata.size ? (metadata.size / uncompressedSize) : 0.5;
        
        return {
            ratio: compressionRatio.toFixed(3),
            quality: compressionRatio > 0.8 ? 'Low' :
                    compressionRatio > 0.3 ? 'Medium' : 'High',
            efficiency: compressionRatio < 0.1 ? 'Excellent' :
                       compressionRatio < 0.3 ? 'Good' :
                       compressionRatio < 0.6 ? 'Fair' : 'Poor'
        };
    }

    /**
     * 清晰度评估
     */
    async assessSharpness(image) {
        try {
            // 使用拉普拉斯算子检测边缘
            const { data } = await image
                .grayscale()
                .raw()
                .toBuffer({ resolveWithObject: true });
            
            // 简化的清晰度计算
            let variance = 0;
            const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
            
            for (let i = 0; i < data.length; i++) {
                variance += Math.pow(data[i] - mean, 2);
            }
            
            variance /= data.length;
            
            // 归一化到 0-1 范围
            return Math.min(variance / 10000, 1);
            
        } catch (error) {
            return 0.5; // 默认中等清晰度
        }
    }

    /**
     * 噪点水平评估
     */
    async assessNoiseLevel(image) {
        try {
            const stats = await image.stats();
            // 基于标准差评估噪点
            const channelStdDev = stats.channels.map(ch => ch.stdev || 0);
            const avgStdDev = channelStdDev.reduce((sum, std) => sum + std, 0) / channelStdDev.length;
            
            // 归一化噪点水平
            return Math.min(avgStdDev / 128, 1);
            
        } catch (error) {
            return 0.3; // 默认低噪点
        }
    }

    /**
     * 色彩饱和度评估
     */
    async assessColorSaturation(image) {
        try {
            const stats = await image.stats();
            if (stats.channels.length < 3) return 0; // 灰度图像
            
            // 基于RGB通道的方差评估饱和度
            const variance = stats.channels.slice(0, 3).map(ch => ch.stdev || 0);
            const avgVariance = variance.reduce((sum, v) => sum + v, 0) / variance.length;
            
            return Math.min(avgVariance / 100, 1);
            
        } catch (error) {
            return 0.5; // 默认中等饱和度
        }
    }

    /**
     * 计算综合质量评分
     */
    calculateQualityScore(metrics) {
        const weights = {
            resolution: 0.2,
            compressionQuality: 0.25,
            sharpnessScore: 0.25,
            noiseLevel: 0.15, // 反向权重
            colorSaturation: 0.15
        };

        const score = 
            (this.categorizeResolutionScore(metrics.resolution) * weights.resolution) +
            (this.parseCompressionScore(metrics.compressionQuality) * weights.compressionQuality) +
            (metrics.sharpnessScore * 100 * weights.sharpnessScore) +
            ((1 - metrics.noiseLevel) * 100 * weights.noiseLevel) +
            (metrics.colorSaturation * 100 * weights.colorSaturation);

        return Math.round(Math.min(score, 100));
    }

    /**
     * 获取质量等级
     */
    getQualityGrade(score) {
        if (score >= this.config.qualityThresholds.excellent) return 'Excellent';
        if (score >= this.config.qualityThresholds.good) return 'Good';
        if (score >= this.config.qualityThresholds.fair) return 'Fair';
        if (score >= this.config.qualityThresholds.poor) return 'Poor';
        return 'Very Poor';
    }

    /**
     * 生成建议
     */
    generateRecommendations() {
        const recommendations = [];

        // 基于质量评估的建议
        if (this.results.quality.overallScore < 60) {
            recommendations.push({
                type: 'quality',
                level: 'high',
                message: '图像质量偏低，建议重新获取更高质量的图像'
            });
        }

        // 基于安全检查的建议
        if (this.results.security.riskLevel === 'HIGH') {
            recommendations.push({
                type: 'security',
                level: 'critical',
                message: '检测到安全风险，建议谨慎处理此图像文件'
            });
        }

        // 基于文件大小的建议
        if (this.results.analysis.compression?.optimization?.recommended) {
            recommendations.push({
                type: 'optimization',
                level: 'medium',
                message: this.results.analysis.compression.optimization.recommendation
            });
        }

        this.results.recommendations = recommendations;
    }

    /**
     * 生成分析摘要
     */
    generateSummary() {
        const format = this.results.analysis.format?.format || 'Unknown';
        const quality = this.results.quality?.grade || 'Unknown';
        const security = this.results.security?.riskLevel || 'Unknown';
        
        return {
            format,
            quality,
            security,
            recommendations: this.results.recommendations.length,
            keyFindings: this.extractKeyFindings()
        };
    }

    /**
     * 提取关键发现
     */
    extractKeyFindings() {
        const findings = [];
        
        if (this.results.analysis.content?.qrCodes?.detected) {
            findings.push('包含二维码');
        }
        
        if (this.results.security?.privacyRisks?.risks.length > 0) {
            findings.push('包含隐私敏感信息');
        }
        
        if (this.results.quality?.overallScore >= 90) {
            findings.push('图像质量优秀');
        }
        
        return findings;
    }

    // 更多辅助方法...
    resetResults() {
        this.results = {
            analysis: {},
            security: {},
            quality: {},
            metadata: {},
            recommendations: []
        };
    }

    processAnalysisResults(analyses) {
        // 处理Promise.allSettled的结果
        analyses.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Analysis ${index} failed:`, result.reason);
            }
        });
    }

    checkFormatCompatibility(format) {
        const webCompatibility = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'svg'].includes(format.format?.toLowerCase());
        return {
            web: webCompatibility,
            mobile: webCompatibility,
            print: ['jpeg', 'jpg', 'png', 'tiff'].includes(format.format?.toLowerCase())
        };
    }

    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    categorizeResolution(resolution) {
        if (resolution >= 8000000) return 'Ultra High (8MP+)';
        if (resolution >= 2000000) return 'High (2-8MP)';
        if (resolution >= 1000000) return 'Medium (1-2MP)';
        return 'Low (<1MP)';
    }

    categorizeResolutionScore(resolution) {
        if (resolution >= 8000000) return 100;
        if (resolution >= 2000000) return 80;
        if (resolution >= 1000000) return 60;
        return 40;
    }

    parseCompressionScore(compressionQuality) {

        
        /**

        
         * switch功能函数

        
         * @param {Object} params - 参数对象

        
         * @returns {Promise<Object>} 返回结果

        
         */
        if (!compressionQuality?.efficiency) return 50;
        
        switch (compressionQuality.efficiency) {
            case 'Excellent': return 100;
            case 'Good': return 80;
            case 'Fair': return 60;
            default: return 40;
        }
    }

    calculateEntropy(buffer) {
        const freq = {};
        for (let i = 0; i < buffer.length; i++) {
            freq[buffer[i]] = (freq[buffer[i]] || 0) + 1;
        }
        
        let entropy = 0;
        const length = buffer.length;
        
        for (const count of Object.values(freq)) {
            const p = count / length;
            entropy -= p * Math.log2(p);
        }
        
        return entropy;
    }

    processExifData(exifData) {
        const processed = {};
        
        // 处理常见EXIF字段
        const commonFields = [
            'Make', 'Model', 'DateTime', 'ExifImageWidth', 
            'ExifImageHeight', 'ColorSpace', 'WhiteBalance'
        ];
        
        commonFields.forEach(field => {
            if (exifData[field]) {
                processed[field] = exifData[field].description || exifData[field].value;
            }
        });
        
        return processed;
    }

    getOrientationName(orientation) {
        const orientations = {
            1: 'Normal',
            2: 'Flip horizontal',
            3: 'Rotate 180',
            4: 'Flip vertical',
            5: 'Rotate 90 CW + Flip horizontal',
            6: 'Rotate 90 CW',
            7: 'Rotate 90 CCW + Flip horizontal',
            8: 'Rotate 90 CCW'
        };
        
        return orientations[orientation] || 'Unknown';
    }

    categorizeDimensions(width, height) {
        const total = width * height;
        if (total >= 8000000) return '4K+';
        if (total >= 2000000) return 'Full HD';
        if (total >= 1000000) return 'HD';
        return 'Standard';
    }

    assessDimensionSuitability(width, height) {
        const aspectRatio = width / height;
        const suitability = {
            web: true,
            mobile: width <= 1920 && height <= 1920,
            print: width >= 1200 && height >= 1200,
            socialMedia: {
                square: Math.abs(aspectRatio - 1) < 0.1,
                landscape: aspectRatio > 1.5 && aspectRatio < 2.0,
                portrait: aspectRatio > 0.5 && aspectRatio < 0.8
            }
        };
        
        return suitability;
    }

    async extractDominantColors(image) {
        try {
            // 简化的主要颜色提取
            const { dominant } = await image.stats();
            return {
                r: Math.round(dominant.r || 0),
                g: Math.round(dominant.g || 0),
                b: Math.round(dominant.b || 0),
                hex: this.rgbToHex(Math.round(dominant.r || 0), Math.round(dominant.g || 0), Math.round(dominant.b || 0))
            };
        } catch (error) {
            return { error: '无法提取主要颜色' };
        }
    }

    async analyzeColorSpace(image) {
        try {
            const metadata = await image.metadata();
            return {
                space: metadata.space || 'srgb',
                channels: metadata.channels,
                hasProfile: !!metadata.icc
            };
        } catch (error) {
            return { error: '无法分析色彩空间' };
        }
    }

    async calculateCompressionRatio(image, metadata) {
        const pixelCount = metadata.width * metadata.height;
        const bytesPerPixel = metadata.channels || 3;
        const uncompressedSize = pixelCount * bytesPerPixel;
        const actualSize = metadata.size || 0;
        
        return {
            uncompressed: this.formatFileSize(uncompressedSize),
            compressed: this.formatFileSize(actualSize),
            ratio: actualSize > 0 ? (actualSize / uncompressedSize).toFixed(3) : '0',
            savings: actualSize > 0 ? `${(100 * (1 - actualSize / uncompressedSize)).toFixed(1)}%` : '0%'
        };
    }

    async suggestOptimization(image, metadata, currentSize) {
        const suggestions = [];
        let recommendedSize = currentSize;
        
        // 基于格式的优化建议
        if (metadata.format === 'png' && metadata.channels === 3) {
            suggestions.push('PNG格式用于照片时文件较大，建议转换为JPEG');
            recommendedSize *= 0.3; // 估算JPEG压缩后的大小
        }
        
        if (metadata.format === 'bmp' || metadata.format === 'tiff') {
            suggestions.push('建议转换为更现代的格式如WebP或JPEG');
            recommendedSize *= 0.4;
        }
        
        // 基于尺寸的优化建议
        if (metadata.width > 2000 || metadata.height > 2000) {
            suggestions.push('图像尺寸较大，如用于网络展示建议适当缩小');
        }
        
        return {
            recommended: suggestions.length > 0,
            suggestions,
            currentSize: this.formatFileSize(currentSize),
            estimatedOptimizedSize: this.formatFileSize(recommendedSize),
            potentialSavings: `${(100 * (1 - recommendedSize / currentSize)).toFixed(1)}%`,
            recommendation: suggestions.length > 0 ? suggestions.join('; ') : '当前格式和大小已较为合适'
        };
    }

    async analyzeContrast(image) {
        try {
            const stats = await image.grayscale().stats();
            const contrast = stats.channels[0].stdev / 128; // 归一化对比度
            
            return {
                value: contrast.toFixed(3),
                level: contrast > 0.3 ? 'High' : contrast > 0.15 ? 'Medium' : 'Low',
                accessibility: contrast > 0.2 ? 'Good' : 'Needs Improvement'
            };
        } catch (error) {
            return { error: '对比度分析失败' };
        }
    }

    async checkColorBlindFriendliness(image) {
        // 简化的色盲友好性检查
        try {
            const stats = await image.stats();
            const channels = stats.channels;
            
            if (channels.length < 3) {
                return {
                    friendly: true,
                    reason: '灰度图像对色盲友好'
                };
            }
            
            const redGreenDiff = Math.abs((channels[0].mean || 0) - (channels[1].mean || 0));
            const blueDiff = Math.abs((channels[2].mean || 0) - ((channels[0].mean + channels[1].mean) / 2 || 0));
            
            return {
                friendly: redGreenDiff > 30 || blueDiff > 30,
                redGreenContrast: redGreenDiff.toFixed(1),
                blueContrast: blueDiff.toFixed(1),
                recommendation: redGreenDiff < 20 ? '建议增加红绿色彩对比度' : '色彩对比度良好'
            };
        } catch (error) {
            return { error: '色盲友好性检查失败' };
        }
    }

    generateAccessibilityRecommendations(contrast, colorBlind) {
        const recommendations = [];
        
        if (contrast.level === 'Low') {
            recommendations.push('增加图像对比度以提高可读性');
        }
        
        if (!colorBlind.friendly) {
            recommendations.push('调整色彩搭配以适应色盲用户');
        }
        
        recommendations.push('为图像添加适当的替代文本(alt text)');
        
        return recommendations;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
}

module.exports = ImageContentDetectionEngine;
