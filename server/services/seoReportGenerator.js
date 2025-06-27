const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * SEO报告生成器
 * 支持生成PDF、HTML、JSON格式的SEO分析报告
 */
class SEOReportGenerator {
  constructor() {
    this.name = 'SEO Report Generator';
    this.version = '1.0.0';
  }

  /**
   * 生成SEO报告
   */
  async generateReport(seoResults, format = 'pdf', options = {}) {
    switch (format.toLowerCase()) {
      case 'pdf':
        return await this.generatePDFReport(seoResults, options);
      case 'html':
        return await this.generateHTMLReport(seoResults, options);
      case 'json':
        return await this.generateJSONReport(seoResults, options);
      case 'csv':
        return await this.generateCSVReport(seoResults, options);
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }
  }

  /**
   * 生成PDF报告
   */
  async generatePDFReport(seoResults, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const filename = `seo-report-${Date.now()}.pdf`;
        const filepath = path.join(__dirname, '../exports', filename);

        // 确保导出目录存在
        const exportDir = path.dirname(filepath);
        if (!fs.existsSync(exportDir)) {
          fs.mkdirSync(exportDir, { recursive: true });
        }

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // 报告标题
        doc.fontSize(24).text('SEO分析报告', { align: 'center' });
        doc.moveDown();

        // 基本信息
        doc.fontSize(16).text('网站信息', { underline: true });
        doc.fontSize(12);
        doc.text(`URL: ${seoResults.url}`);
        doc.text(`分析时间: ${new Date(seoResults.timestamp).toLocaleString('zh-CN')}`);
        doc.text(`总体评分: ${seoResults.overallScore}/100 (${seoResults.scoreGrade || 'N/A'})`);
        doc.moveDown();

        // 分数概览
        doc.fontSize(16).text('评分概览', { underline: true });
        doc.fontSize(12);
        
        const scores = seoResults.scores || {};
        const scoreCategories = {
          technical: '技术SEO',
          content: '内容质量',
          onPage: '页面SEO',
          performance: '性能优化',
          mobile: '移动友好',
          social: '社交媒体',
          coreWebVitals: 'Core Web Vitals',
          pageExperience: '页面体验'
        };

        Object.entries(scoreCategories).forEach(([key, label]) => {
          const score = scores[key] || 0;
          const status = score >= 80 ? '优秀' : score >= 60 ? '良好' : '需要改进';
          doc.text(`${label}: ${score}/100 (${status})`);
        });
        doc.moveDown();

        // 主要问题
        if (seoResults.issues && seoResults.issues.length > 0) {
          doc.fontSize(16).text('主要问题', { underline: true });
          doc.fontSize(12);
          
          seoResults.issues.slice(0, 10).forEach((issue, index) => {
            const severity = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
            doc.text(`${index + 1}. ${severity} ${issue.message}`);
          });
          doc.moveDown();
        }

        // 优化建议
        if (seoResults.recommendations && seoResults.recommendations.length > 0) {
          doc.fontSize(16).text('优化建议', { underline: true });
          doc.fontSize(12);
          
          seoResults.recommendations.slice(0, 8).forEach((rec, index) => {
            const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
            doc.text(`${index + 1}. ${priority} ${rec.title}`);
            doc.fontSize(10).text(`   ${rec.description}`, { indent: 20 });
            doc.fontSize(12);
          });
          doc.moveDown();
        }

        // 关键词分析
        if (seoResults.keywords && Object.keys(seoResults.keywords.density || {}).length > 0) {
          doc.fontSize(16).text('关键词分析', { underline: true });
          doc.fontSize(12);
          
          Object.entries(seoResults.keywords.density).forEach(([keyword, data]) => {
            const status = data.status === 'optimal' ? '✅' : data.status === 'high' ? '⚠️' : data.status === 'low' ? '📉' : '❌';
            doc.text(`${keyword}: ${data.density.toFixed(1)}% (${data.count}次) ${status}`);
          });
          doc.moveDown();
        }

        // 技术细节
        doc.fontSize(16).text('技术细节', { underline: true });
        doc.fontSize(12);
        doc.text(`页面大小: ${Math.round(seoResults.metadata.pageSize / 1024)}KB`);
        doc.text(`加载时间: ${seoResults.metadata.loadTime}ms`);
        doc.text(`HTTP状态码: ${seoResults.pageInfo.statusCode}`);
        doc.moveDown();

        // 页脚
        doc.fontSize(10).text('本报告由Test Web SEO分析工具生成', { align: 'center' });
        doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          resolve({
            success: true,
            filename: filename,
            filepath: filepath,
            size: fs.statSync(filepath).size
          });
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 生成HTML报告
   */
  async generateHTMLReport(seoResults, options = {}) {
    const filename = `seo-report-${Date.now()}.html`;
    const filepath = path.join(__dirname, '../exports', filename);

    // 确保导出目录存在
    const exportDir = path.dirname(filepath);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const htmlContent = this.generateHTMLContent(seoResults);
    
    fs.writeFileSync(filepath, htmlContent, 'utf8');

    return {
      success: true,
      filename: filename,
      filepath: filepath,
      size: fs.statSync(filepath).size
    };
  }

  /**
   * 生成HTML内容
   */
  generateHTMLContent(seoResults) {
    const scores = seoResults.scores || {};
    const scoreCategories = {
      technical: '技术SEO',
      content: '内容质量',
      onPage: '页面SEO',
      performance: '性能优化',
      mobile: '移动友好',
      social: '社交媒体',
      coreWebVitals: 'Core Web Vitals',
      pageExperience: '页面体验'
    };

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SEO分析报告 - ${seoResults.url}</title>
    <style>
        body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .score-circle { display: inline-block; width: 120px; height: 120px; border-radius: 50%; background: conic-gradient(#4CAF50 ${seoResults.overallScore * 3.6}deg, #e0e0e0 0deg); position: relative; margin: 20px; }
        .score-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px; font-weight: bold; }
        .section { margin: 30px 0; }
        .section h2 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
        .score-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .score-item { background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #4CAF50; }
        .score-bar { width: 100%; height: 20px; background: #e0e0e0; border-radius: 10px; overflow: hidden; margin-top: 5px; }
        .score-fill { height: 100%; background: linear-gradient(90deg, #ff4444, #ffaa00, #4CAF50); transition: width 0.3s; }
        .issue { padding: 10px; margin: 5px 0; border-radius: 5px; }
        .issue.high { background: #ffebee; border-left: 4px solid #f44336; }
        .issue.medium { background: #fff3e0; border-left: 4px solid #ff9800; }
        .issue.low { background: #e8f5e8; border-left: 4px solid #4CAF50; }
        .recommendation { background: #e3f2fd; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #2196F3; }
        .keyword-item { display: inline-block; background: #f0f0f0; padding: 5px 10px; margin: 3px; border-radius: 15px; font-size: 12px; }
        .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>SEO分析报告</h1>
            <p><strong>网站:</strong> ${seoResults.url}</p>
            <p><strong>分析时间:</strong> ${new Date(seoResults.timestamp).toLocaleString('zh-CN')}</p>
            <div class="score-circle">
                <div class="score-text">${seoResults.overallScore}</div>
            </div>
            <p><strong>总体评分:</strong> ${seoResults.overallScore}/100 (${seoResults.scoreGrade || 'N/A'})</p>
        </div>

        <div class="section">
            <h2>评分详情</h2>
            <div class="score-grid">
                ${Object.entries(scoreCategories).map(([key, label]) => {
                  const score = scores[key] || 0;
                  const color = score >= 80 ? '#4CAF50' : score >= 60 ? '#ff9800' : '#f44336';
                  return `
                    <div class="score-item">
                        <h3>${label}</h3>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${score}%; background: ${color};"></div>
                        </div>
                        <p>${score}/100</p>
                    </div>
                  `;
                }).join('')}
            </div>
        </div>

        ${seoResults.issues && seoResults.issues.length > 0 ? `
        <div class="section">
            <h2>发现的问题</h2>
            ${seoResults.issues.slice(0, 10).map(issue => `
                <div class="issue ${issue.severity}">
                    <strong>${issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢'} ${issue.message}</strong>
                    ${issue.impact ? `<p>影响: ${issue.impact}</p>` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}

        ${seoResults.recommendations && seoResults.recommendations.length > 0 ? `
        <div class="section">
            <h2>优化建议</h2>
            ${seoResults.recommendations.slice(0, 8).map(rec => `
                <div class="recommendation">
                    <h3>${rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'} ${rec.title}</h3>
                    <p>${rec.description}</p>
                    ${rec.actionItems ? `
                        <ul>
                            ${rec.actionItems.slice(0, 3).map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}

        ${seoResults.keywords && Object.keys(seoResults.keywords.density || {}).length > 0 ? `
        <div class="section">
            <h2>关键词分析</h2>
            ${Object.entries(seoResults.keywords.density).map(([keyword, data]) => `
                <div class="keyword-item">
                    ${keyword}: ${data.density.toFixed(1)}% (${data.count}次) 
                    ${data.status === 'optimal' ? '✅' : data.status === 'high' ? '⚠️' : data.status === 'low' ? '📉' : '❌'}
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="section">
            <h2>技术信息</h2>
            <p><strong>页面大小:</strong> ${Math.round(seoResults.metadata.pageSize / 1024)}KB</p>
            <p><strong>加载时间:</strong> ${seoResults.metadata.loadTime}ms</p>
            <p><strong>HTTP状态码:</strong> ${seoResults.pageInfo.statusCode}</p>
        </div>

        <div class="footer">
            <p>本报告由Test Web SEO分析工具生成</p>
            <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * 生成JSON报告
   */
  async generateJSONReport(seoResults, options = {}) {
    const filename = `seo-report-${Date.now()}.json`;
    const filepath = path.join(__dirname, '../exports', filename);

    // 确保导出目录存在
    const exportDir = path.dirname(filepath);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const jsonContent = JSON.stringify(seoResults, null, 2);
    
    fs.writeFileSync(filepath, jsonContent, 'utf8');

    return {
      success: true,
      filename: filename,
      filepath: filepath,
      size: fs.statSync(filepath).size
    };
  }

  /**
   * 生成CSV报告
   */
  async generateCSVReport(seoResults, options = {}) {
    const filename = `seo-report-${Date.now()}.csv`;
    const filepath = path.join(__dirname, '../exports', filename);

    // 确保导出目录存在
    const exportDir = path.dirname(filepath);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const csvContent = this.generateCSVContent(seoResults);
    
    fs.writeFileSync(filepath, csvContent, 'utf8');

    return {
      success: true,
      filename: filename,
      filepath: filepath,
      size: fs.statSync(filepath).size
    };
  }

  /**
   * 生成CSV内容
   */
  generateCSVContent(seoResults) {
    const lines = [];
    
    // 标题行
    lines.push('类别,项目,分数,状态,描述');
    
    // 基本信息
    lines.push(`基本信息,URL,,"",${seoResults.url}`);
    lines.push(`基本信息,总体评分,${seoResults.overallScore},"${seoResults.scoreGrade || 'N/A'}",${seoResults.scoreDescription || ''}`);
    lines.push(`基本信息,分析时间,,"",${new Date(seoResults.timestamp).toLocaleString('zh-CN')}`);
    
    // 各项分数
    const scores = seoResults.scores || {};
    const scoreCategories = {
      technical: '技术SEO',
      content: '内容质量',
      onPage: '页面SEO',
      performance: '性能优化',
      mobile: '移动友好',
      social: '社交媒体',
      coreWebVitals: 'Core Web Vitals',
      pageExperience: '页面体验'
    };

    Object.entries(scoreCategories).forEach(([key, label]) => {
      const score = scores[key] || 0;
      const status = score >= 80 ? '优秀' : score >= 60 ? '良好' : '需要改进';
      lines.push(`评分,${label},${score},"${status}",""`);
    });

    // 问题
    if (seoResults.issues && seoResults.issues.length > 0) {
      seoResults.issues.forEach(issue => {
        lines.push(`问题,${issue.category || '未分类'},,"${issue.severity}","${issue.message}"`);
      });
    }

    // 建议
    if (seoResults.recommendations && seoResults.recommendations.length > 0) {
      seoResults.recommendations.forEach(rec => {
        lines.push(`建议,${rec.category},,"${rec.priority}","${rec.title}: ${rec.description}"`);
      });
    }

    return lines.join('\n');
  }
}

module.exports = { SEOReportGenerator };
