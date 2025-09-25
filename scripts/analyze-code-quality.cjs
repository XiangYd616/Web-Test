/**
 * 代码质量和架构分析脚本
 * 分析代码结构、命名规范、注释质量、模块化程度等
 */

const fs = require('fs');
const path = require('path');

class CodeQualityAnalyzer {
    constructor() {
        this.results = {
            summary: {},
            files: [],
            issues: [],
            metrics: {},
            recommendations: []
        };
        this.totalLines = 0;
        this.totalFiles = 0;
        this.codeComplexity = 0;
    }

    /**
     * 分析单个文件
     */
    analyzeFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            
            const fileAnalysis = {
                path: filePath,
                lines: lines.length,
                codeLines: 0,
                commentLines: 0,
                blankLines: 0,
                functions: 0,
                classes: 0,
                complexity: 0,
                issues: [],
                score: 100
            };

            // 逐行分析
            let inMultilineComment = false;
            let currentFunction = null;
            let braceDepth = 0;
            let currentComplexity = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                const lineNumber = i + 1;

                // 空行计算
                if (line === '') {
                    fileAnalysis.blankLines++;
                    continue;
                }

                // 多行注释检测
                if (line.includes('/*')) {
                    inMultilineComment = true;
                }
                if (line.includes('*/')) {
                    inMultilineComment = false;
                    fileAnalysis.commentLines++;
                    continue;
                }
                if (inMultilineComment) {
                    fileAnalysis.commentLines++;
                    continue;
                }

                // 单行注释
                if (line.startsWith('//') || line.startsWith('*')) {
                    fileAnalysis.commentLines++;
                    continue;
                }

                // 代码行
                fileAnalysis.codeLines++;

                // 检查函数定义
                if (line.match(/function\s+\w+|=>\s*{|:\s*function/)) {
                    fileAnalysis.functions++;
                    currentFunction = line;
                    currentComplexity = 1; // 基础复杂度
                }

                // 检查类定义
                if (line.match(/class\s+\w+/)) {
                    fileAnalysis.classes++;
                }

                // 计算循环复杂度
                if (line.match(/if\s*\(|while\s*\(|for\s*\(|switch\s*\(|catch\s*\(/)) {
                    currentComplexity++;
                }
                if (line.match(/&&|\|\||case\s+.*:/)) {
                    currentComplexity++;
                }

                // 大括号深度
                braceDepth += (line.match(/{/g) || []).length;
                braceDepth -= (line.match(/}/g) || []).length;
                
                if (braceDepth < 0) braceDepth = 0;

                // 检查代码质量问题
                this.checkLineIssues(line, lineNumber, fileAnalysis);

                // 当函数结束时，记录复杂度
                if (currentFunction && braceDepth === 0 && line.includes('}')) {
                    fileAnalysis.complexity += currentComplexity;
                    if (currentComplexity > 10) {
                        fileAnalysis.issues.push({
                            line: lineNumber,
                            type: 'high_complexity',
                            message: `函数复杂度过高 (${currentComplexity})`,
                            severity: 'warning'
                        });
                    }
                    currentFunction = null;
                    currentComplexity = 0;
                }
            }

            // 计算代码质量得分
            fileAnalysis.score = this.calculateFileScore(fileAnalysis);
            
            return fileAnalysis;
        } catch (error) {
            return {
                path: filePath,
                error: error.message,
                score: 0
            };
        }
    }

    /**
     * 检查行级问题
     */
    checkLineIssues(line, lineNumber, fileAnalysis) {
        const issues = [];

        // 长行检测 (>120字符)
        if (line.length > 120) {
            issues.push({
                line: lineNumber,
                type: 'long_line',
                message: `行过长 (${line.length} 字符)`,
                severity: 'info'
            });
        }

        // 硬编码检测
        if (line.match(/'http:\/\/|'https:\/\/|"http:\/\/|"https:\/\//)) {
            issues.push({
                line: lineNumber,
                type: 'hardcoded_url',
                message: '硬编码URL',
                severity: 'warning'
            });
        }

        // 魔术数字检测 (排除常见值)
        const magicNumbers = line.match(/\b(?!0|1|2|10|100|1000)\d{3,}\b/g);
        if (magicNumbers) {
            issues.push({
                line: lineNumber,
                type: 'magic_number',
                message: `魔术数字: ${magicNumbers.join(', ')}`,
                severity: 'info'
            });
        }

        // console.log检测 (可能是调试代码)
        if (line.includes('console.log') && !line.includes('//')) {
            issues.push({
                line: lineNumber,
                type: 'console_log',
                message: '包含console.log (可能是调试代码)',
                severity: 'info'
            });
        }

        // TODO/FIXME检测
        if (line.match(/TODO|FIXME|XXX/i)) {
            issues.push({
                line: lineNumber,
                type: 'todo',
                message: '包含TODO/FIXME标记',
                severity: 'info'
            });
        }

        // 错误的等号使用
        if (line.includes(' = ') && line.includes(' == ') && !line.includes('===')) {
            issues.push({
                line: lineNumber,
                type: 'loose_equality',
                message: '建议使用严格等号 (===)',
                severity: 'warning'
            });
        }

        fileAnalysis.issues.push(...issues);
    }

    /**
     * 计算文件得分
     */
    calculateFileScore(fileAnalysis) {
        let score = 100;
        
        // 注释率检查 (期望 >15%)
        const commentRatio = fileAnalysis.commentLines / (fileAnalysis.codeLines + fileAnalysis.commentLines);
        if (commentRatio < 0.10) score -= 10;
        else if (commentRatio < 0.15) score -= 5;

        // 复杂度检查
        const avgComplexity = fileAnalysis.complexity / Math.max(fileAnalysis.functions, 1);
        if (avgComplexity > 15) score -= 20;
        else if (avgComplexity > 10) score -= 10;
        else if (avgComplexity > 5) score -= 5;

        // 问题扣分
        fileAnalysis.issues.forEach(issue => {
            switch (issue.severity) {
                case 'error': score -= 5; break;
                case 'warning': score -= 2; break;
                case 'info': score -= 0.5; break;
            }
        });

        return Math.max(0, Math.round(score));
    }

    /**
     * 递归分析目录
     */
    async analyzeDirectory(dirPath, extensions = ['.js', '.ts']) {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // 跳过一些目录
                if (['node_modules', '.git', 'logs', 'tmp', 'build', 'dist'].includes(item)) {
                    continue;
                }
                await this.analyzeDirectory(fullPath, extensions);
            } else if (stat.isFile()) {
                const ext = path.extname(item);
                if (extensions.includes(ext)) {
                    const analysis = this.analyzeFile(fullPath);
                    this.results.files.push(analysis);
                    this.totalFiles++;
                    this.totalLines += analysis.lines || 0;
                    this.codeComplexity += analysis.complexity || 0;
                }
            }
        }
    }

    /**
     * 生成总结报告
     */
    generateSummary() {
        const files = this.results.files.filter(f => !f.error);
        
        // 计算总体指标
        const totalCodeLines = files.reduce((sum, f) => sum + f.codeLines, 0);
        const totalCommentLines = files.reduce((sum, f) => sum + f.commentLines, 0);
        const totalFunctions = files.reduce((sum, f) => sum + f.functions, 0);
        const totalClasses = files.reduce((sum, f) => sum + f.classes, 0);
        const totalIssues = files.reduce((sum, f) => sum + f.issues.length, 0);
        
        // 计算平均得分
        const avgScore = files.reduce((sum, f) => sum + f.score, 0) / files.length;
        
        // 分析问题分布
        const issueTypes = {};
        files.forEach(file => {
            file.issues.forEach(issue => {
                issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
            });
        });

        this.results.summary = {
            totalFiles: this.totalFiles,
            totalLines: this.totalLines,
            totalCodeLines,
            totalCommentLines,
            totalFunctions,
            totalClasses,
            totalIssues,
            avgScore: Math.round(avgScore),
            commentRatio: Math.round((totalCommentLines / (totalCodeLines + totalCommentLines)) * 100),
            avgComplexity: Math.round(this.codeComplexity / Math.max(totalFunctions, 1) * 100) / 100,
            issueTypes
        };

        // 生成建议
        this.generateRecommendations();
    }

    /**
     * 生成建议
     */
    generateRecommendations() {
        const summary = this.results.summary;
        const recommendations = [];

        if (summary.commentRatio < 15) {
            recommendations.push('增加代码注释，目标注释率 > 15%');
        }

        if (summary.avgComplexity > 10) {
            recommendations.push('降低函数复杂度，建议每个函数复杂度 < 10');
        }

        if (summary.issueTypes.console_log > 5) {
            recommendations.push('清理调试用的console.log语句');
        }

        if (summary.issueTypes.hardcoded_url > 0) {
            recommendations.push('将硬编码的URL移至配置文件');
        }

        if (summary.issueTypes.magic_number > 10) {
            recommendations.push('为魔术数字定义常量');
        }

        if (summary.avgScore < 80) {
            recommendations.push('整体代码质量需要改进');
        }

        this.results.recommendations = recommendations;
    }

    /**
     * 运行完整分析
     */
    async runAnalysis(rootPath) {
        console.log('🔍 开始代码质量分析...');
        console.log('==========================================');
        
        await this.analyzeDirectory(rootPath);
        this.generateSummary();
        
        const summary = this.results.summary;
        
        console.log('📊 代码统计:');
        console.log(`  文件总数: ${summary.totalFiles}`);
        console.log(`  代码行数: ${summary.totalCodeLines}`);
        console.log(`  注释行数: ${summary.totalCommentLines} (${summary.commentRatio}%)`);
        console.log(`  函数总数: ${summary.totalFunctions}`);
        console.log(`  类总数: ${summary.totalClasses}`);
        
        console.log('\n📈 质量指标:');
        console.log(`  平均得分: ${summary.avgScore}/100`);
        console.log(`  注释覆盖率: ${summary.commentRatio}%`);
        console.log(`  平均复杂度: ${summary.avgComplexity}`);
        console.log(`  问题总数: ${summary.totalIssues}`);
        
        console.log('\n🔍 问题分布:');
        Object.entries(summary.issueTypes).forEach(([type, count]) => {
            const typeNames = {
                long_line: '长行',
                hardcoded_url: '硬编码URL',
                magic_number: '魔术数字',
                console_log: 'console.log',
                todo: 'TODO标记',
                loose_equality: '松散等号',
                high_complexity: '高复杂度'
            };
            console.log(`  ${typeNames[type] || type}: ${count}`);
        });
        
        if (this.results.recommendations.length > 0) {
            console.log('\n💡 改进建议:');
            this.results.recommendations.forEach(rec => {
                console.log(`  - ${rec}`);
            });
        }
        
        // 显示得分最低的文件
        const poorFiles = this.results.files
            .filter(f => !f.error && f.score < 70)
            .sort((a, b) => a.score - b.score)
            .slice(0, 5);
            
        if (poorFiles.length > 0) {
            console.log('\n⚠️  需要改进的文件:');
            poorFiles.forEach(file => {
                console.log(`  ${path.basename(file.path)}: ${file.score}/100`);
            });
        }
        
        console.log('\n==========================================');
        const overallGrade = this.getGrade(summary.avgScore);
        console.log(`🏆 总体评级: ${overallGrade} (${summary.avgScore}/100)`);
        
        return this.results;
    }

    /**
     * 获取等级
     */
    getGrade(score) {
        if (score >= 90) return 'A (优秀)';
        if (score >= 80) return 'B (良好)';
        if (score >= 70) return 'C (一般)';
        if (score >= 60) return 'D (较差)';
        return 'F (需要改进)';
    }
}

// 运行分析
if (require.main === module) {
    const analyzer = new CodeQualityAnalyzer();
    analyzer.runAnalysis(path.join(__dirname, '..', 'backend')).catch(console.error);
}

module.exports = { CodeQualityAnalyzer };
