#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ResponsiveLayoutOptimizer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixes = [];
    this.breakpointIssues = [];
    
    // 标准断点定义
    this.standardBreakpoints = {
      'mobile': '640px',
      'tablet': '1024px',
      'laptop': '1440px',
      'desktop': '1920px',
      'large': '2560px'
    };

    // 标准断点媒体查询
    this.standardMediaQueries = {
      'mobile': '@media (max-width: 640px)',
      'tablet': '@media (min-width: 641px) and (max-width: 1024px)',
      'laptop': '@media (min-width: 1025px) and (max-width: 1440px)',
      'desktop': '@media (min-width: 1441px) and (max-width: 1920px)',
      'large': '@media (min-width: 1921px)'
    };

    // 需要替换的固定单位模式
    this.fixedUnitPatterns = {
      // 间距相关属性
      spacing: /(?:margin|padding|gap|top|right|bottom|left):\s*(\d+)px/g,
      // 字体大小
      fontSize: /font-size:\s*(\d+)px/g,
      // 宽度和高度（小于等于100px的）
      dimensions: /(?:width|height|min-width|min-height|max-width|max-height):\s*(\d{1,2})px/g,
      // 边框圆角
      borderRadius: /border-radius:\s*(\d+)px/g
    };
  }

  /**
   * 执行响应式布局优化
   */
  async execute() {
    console.log('📱 开始响应式布局优化...\n');

    try {
      // 1. 分析现有断点使用情况
      await this.analyzeBreakpoints();

      // 2. 统一断点定义
      await this.unifyBreakpoints();

      // 3. 替换固定单位为响应式单位
      await this.replaceFixedUnits();

      // 4. 优化媒体查询
      await this.optimizeMediaQueries();

      // 5. 创建响应式工具类
      await this.createResponsiveUtilities();

      // 6. 生成修复报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 响应式布局优化过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 分析现有断点使用情况
   */
  async analyzeBreakpoints() {
    console.log('🔍 分析现有断点使用情况...');

    const styleFiles = this.getStyleFiles();
    const breakpointUsage = new Map();

    for (const file of styleFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 提取媒体查询
        const mediaQueries = content.match(/@media[^{]+/g) || [];
        
        for (const query of mediaQueries) {
          const widthMatch = query.match(/\((?:min-|max-)?width:\s*(\d+(?:px|em|rem))\)/);
          if (widthMatch) {
            const width = widthMatch[1];
            if (!breakpointUsage.has(width)) {
              breakpointUsage.set(width, []);
            }
            breakpointUsage.get(width).push(path.relative(this.projectRoot, file));
          }
        }

      } catch (error) {
        console.log(`   ⚠️  无法读取文件: ${file}`);
      }
    }

    console.log(`   发现 ${breakpointUsage.size} 个不同的断点值`);
    
    // 记录非标准断点
    for (const [breakpoint, files] of breakpointUsage.entries()) {
      const isStandard = Object.values(this.standardBreakpoints).includes(breakpoint);
      if (!isStandard) {
        this.breakpointIssues.push({
          breakpoint,
          files,
          suggestion: this.suggestStandardBreakpoint(breakpoint)
        });
      }
    }

    console.log(`   发现 ${this.breakpointIssues.length} 个非标准断点\n`);
  }

  /**
   * 统一断点定义
   */
  async unifyBreakpoints() {
    console.log('📐 统一断点定义...');

    // 创建统一的断点定义文件
    const breakpointsPath = path.join(this.projectRoot, 'frontend/styles/breakpoints.css');
    
    const breakpointsContent = `/* 统一断点定义 v2.0.0 */
/* 此文件定义了项目中使用的所有标准断点 */

:root {
  /* 断点变量 */
  --breakpoint-mobile: ${this.standardBreakpoints.mobile};
  --breakpoint-tablet: ${this.standardBreakpoints.tablet};
  --breakpoint-laptop: ${this.standardBreakpoints.laptop};
  --breakpoint-desktop: ${this.standardBreakpoints.desktop};
  --breakpoint-large: ${this.standardBreakpoints.large};
}

/* 标准媒体查询 */
${Object.entries(this.standardMediaQueries).map(([name, query]) => 
  `/* ${name.charAt(0).toUpperCase() + name.slice(1)} */\n${query} {\n  /* ${name} styles here */\n}`
).join('\n\n')}

/* 响应式容器 */
.container-responsive {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-4);
}

${this.standardMediaQueries.mobile} {
  .container-responsive {
    padding: 0 var(--spacing-2);
  }
}

${this.standardMediaQueries.tablet} {
  .container-responsive {
    padding: 0 var(--spacing-6);
  }
}

${this.standardMediaQueries.laptop} {
  .container-responsive {
    max-width: 1400px;
    padding: 0 var(--spacing-8);
  }
}

${this.standardMediaQueries.desktop} {
  .container-responsive {
    max-width: 1600px;
  }
}

${this.standardMediaQueries.large} {
  .container-responsive {
    max-width: 1800px;
  }
}`;

    fs.writeFileSync(breakpointsPath, breakpointsContent);
    this.addFix('breakpoint_unification', breakpointsPath, '创建统一断点定义文件');

    console.log('   ✅ 创建统一断点定义文件\n');
  }

  /**
   * 替换固定单位为响应式单位
   */
  async replaceFixedUnits() {
    console.log('🔄 替换固定单位为响应式单位...');

    const styleFiles = this.getStyleFiles();
    let totalReplacements = 0;

    for (const file of styleFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        let newContent = content;
        let fileReplacements = 0;

        // 替换间距固定单位
        newContent = newContent.replace(this.fixedUnitPatterns.spacing, (match, value) => {
          const numValue = parseInt(value);
          if (numValue <= 64) { // 只替换小的间距值
            const remValue = (numValue / 16).toFixed(2);
            fileReplacements++;
            return match.replace(`${value}px`, `${remValue}rem`);
          }
          return match;
        });

        // 替换字体大小固定单位
        newContent = newContent.replace(this.fixedUnitPatterns.fontSize, (match, value) => {
          const numValue = parseInt(value);
          if (numValue >= 12 && numValue <= 48) { // 常见字体大小范围
            const remValue = (numValue / 16).toFixed(3);
            fileReplacements++;
            return match.replace(`${value}px`, `${remValue}rem`);
          }
          return match;
        });

        // 替换小尺寸的宽高固定单位
        newContent = newContent.replace(this.fixedUnitPatterns.dimensions, (match, value) => {
          const numValue = parseInt(value);
          if (numValue <= 100) {
            const remValue = (numValue / 16).toFixed(2);
            fileReplacements++;
            return match.replace(`${value}px`, `${remValue}rem`);
          }
          return match;
        });

        // 替换边框圆角固定单位
        newContent = newContent.replace(this.fixedUnitPatterns.borderRadius, (match, value) => {
          const numValue = parseInt(value);
          if (numValue <= 32) {
            const remValue = (numValue / 16).toFixed(3);
            fileReplacements++;
            return match.replace(`${value}px`, `${remValue}rem`);
          }
          return match;
        });

        if (fileReplacements > 0) {
          fs.writeFileSync(file, newContent);
          this.addFix('fixed_unit_replacement', file, `替换了 ${fileReplacements} 个固定单位`);
          totalReplacements += fileReplacements;
        }

      } catch (error) {
        console.log(`   ⚠️  无法处理文件: ${file}`);
      }
    }

    console.log(`   ✅ 替换了 ${totalReplacements} 个固定单位\n`);
  }

  /**
   * 优化媒体查询
   */
  async optimizeMediaQueries() {
    console.log('📺 优化媒体查询...');

    const styleFiles = this.getStyleFiles();
    let optimizations = 0;

    for (const file of styleFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        let newContent = content;
        let fileOptimizations = 0;

        // 替换常见的非标准断点
        const commonReplacements = {
          '@media (max-width: 768px)': this.standardMediaQueries.mobile,
          '@media (max-width: 767px)': this.standardMediaQueries.mobile,
          '@media (min-width: 768px)': this.standardMediaQueries.tablet,
          '@media (min-width: 1025px)': this.standardMediaQueries.laptop,
          '@media (min-width: 1200px)': this.standardMediaQueries.desktop,
          '@media (min-width: 1440px)': this.standardMediaQueries.desktop
        };

        for (const [oldQuery, newQuery] of Object.entries(commonReplacements)) {
          if (newContent.includes(oldQuery)) {
            newContent = newContent.replace(new RegExp(oldQuery.replace(/[()]/g, '\\$&'), 'g'), newQuery);
            fileOptimizations++;
          }
        }

        if (fileOptimizations > 0) {
          fs.writeFileSync(file, newContent);
          this.addFix('media_query_optimization', file, `优化了 ${fileOptimizations} 个媒体查询`);
          optimizations += fileOptimizations;
        }

      } catch (error) {
        console.log(`   ⚠️  无法处理文件: ${file}`);
      }
    }

    console.log(`   ✅ 优化了 ${optimizations} 个媒体查询\n`);
  }

  /**
   * 创建响应式工具类
   */
  async createResponsiveUtilities() {
    console.log('🛠️ 创建响应式工具类...');

    const utilitiesPath = path.join(this.projectRoot, 'frontend/styles/responsive-utilities.css');
    
    const utilitiesContent = `/* 响应式工具类 v2.0.0 */
/* 此文件提供常用的响应式工具类 */

/* 显示/隐藏工具 */
.show-mobile { display: block; }
.show-tablet { display: none; }
.show-laptop { display: none; }
.show-desktop { display: none; }

.hide-mobile { display: none; }
.hide-tablet { display: block; }
.hide-laptop { display: block; }
.hide-desktop { display: block; }

${this.standardMediaQueries.tablet} {
  .show-mobile { display: none; }
  .show-tablet { display: block; }
  .hide-mobile { display: block; }
  .hide-tablet { display: none; }
}

${this.standardMediaQueries.laptop} {
  .show-mobile { display: none; }
  .show-tablet { display: none; }
  .show-laptop { display: block; }
  .hide-mobile { display: block; }
  .hide-tablet { display: block; }
  .hide-laptop { display: none; }
}

${this.standardMediaQueries.desktop} {
  .show-mobile { display: none; }
  .show-tablet { display: none; }
  .show-laptop { display: none; }
  .show-desktop { display: block; }
  .hide-mobile { display: block; }
  .hide-tablet { display: block; }
  .hide-laptop { display: block; }
  .hide-desktop { display: none; }
}

/* 响应式文字大小 */
.text-responsive {
  font-size: 1rem;
}

${this.standardMediaQueries.mobile} {
  .text-responsive { font-size: 0.875rem; }
}

${this.standardMediaQueries.tablet} {
  .text-responsive { font-size: 1rem; }
}

${this.standardMediaQueries.laptop} {
  .text-responsive { font-size: 1.125rem; }
}

${this.standardMediaQueries.desktop} {
  .text-responsive { font-size: 1.25rem; }
}

/* 响应式间距 */
.spacing-responsive {
  padding: 1rem;
}

${this.standardMediaQueries.mobile} {
  .spacing-responsive { padding: 0.5rem; }
}

${this.standardMediaQueries.tablet} {
  .spacing-responsive { padding: 1rem; }
}

${this.standardMediaQueries.laptop} {
  .spacing-responsive { padding: 1.5rem; }
}

${this.standardMediaQueries.desktop} {
  .spacing-responsive { padding: 2rem; }
}

/* 响应式网格 */
.grid-responsive {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

${this.standardMediaQueries.tablet} {
  .grid-responsive {
    grid-template-columns: repeat(2, 1fr);
  }
}

${this.standardMediaQueries.laptop} {
  .grid-responsive {
    grid-template-columns: repeat(3, 1fr);
  }
}

${this.standardMediaQueries.desktop} {
  .grid-responsive {
    grid-template-columns: repeat(4, 1fr);
  }
}`;

    fs.writeFileSync(utilitiesPath, utilitiesContent);
    this.addFix('responsive_utilities', utilitiesPath, '创建响应式工具类文件');

    console.log('   ✅ 创建响应式工具类文件\n');
  }

  /**
   * 建议标准断点
   */
  suggestStandardBreakpoint(breakpoint) {
    const numValue = parseInt(breakpoint);
    
    if (numValue <= 640) return this.standardBreakpoints.mobile;
    if (numValue <= 1024) return this.standardBreakpoints.tablet;
    if (numValue <= 1440) return this.standardBreakpoints.laptop;
    if (numValue <= 1920) return this.standardBreakpoints.desktop;
    return this.standardBreakpoints.large;
  }

  /**
   * 获取样式文件
   */
  getStyleFiles() {
    const files = [];
    this.walkDirectory(path.join(this.projectRoot, 'frontend/styles'), files, ['.css', '.scss', '.sass']);
    return files;
  }

  /**
   * 遍历目录
   */
  walkDirectory(dir, files, extensions) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      if (item.startsWith('.') || item === 'node_modules') return;
      
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.walkDirectory(fullPath, files, extensions);
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    });
  }

  /**
   * 添加修复记录
   */
  addFix(category, filePath, description) {
    this.fixes.push({
      category,
      file: path.relative(this.projectRoot, filePath),
      description,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'responsive-optimization-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFixes: this.fixes.length,
        breakpointIssues: this.breakpointIssues.length,
        categories: {
          breakpoint_unification: this.fixes.filter(f => f.category === 'breakpoint_unification').length,
          fixed_unit_replacement: this.fixes.filter(f => f.category === 'fixed_unit_replacement').length,
          media_query_optimization: this.fixes.filter(f => f.category === 'media_query_optimization').length,
          responsive_utilities: this.fixes.filter(f => f.category === 'responsive_utilities').length
        }
      },
      standardBreakpoints: this.standardBreakpoints,
      breakpointIssues: this.breakpointIssues,
      fixes: this.fixes,
      recommendations: [
        '使用新创建的响应式工具类来简化开发',
        '定期检查和清理未使用的媒体查询',
        '优先使用rem单位而不是px单位',
        '考虑使用CSS Grid和Flexbox进行布局',
        '测试不同设备和屏幕尺寸的显示效果'
      ]
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 响应式布局优化报告:');
    console.log(`   总修复数: ${report.summary.totalFixes}`);
    console.log(`   断点问题: ${report.summary.breakpointIssues}`);
    console.log(`   修复分类:`);
    console.log(`   - 断点统一: ${report.summary.categories.breakpoint_unification}`);
    console.log(`   - 固定单位替换: ${report.summary.categories.fixed_unit_replacement}`);
    console.log(`   - 媒体查询优化: ${report.summary.categories.media_query_optimization}`);
    console.log(`   - 响应式工具: ${report.summary.categories.responsive_utilities}`);
    console.log(`   报告已保存: ${reportPath}\n`);

    if (this.breakpointIssues.length > 0) {
      console.log('📋 非标准断点问题:');
      this.breakpointIssues.forEach(({ breakpoint, files, suggestion }) => {
        console.log(`   ${breakpoint} -> 建议使用 ${suggestion}`);
        console.log(`     使用文件: ${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''}`);
      });
    }

    console.log('\n🎯 后续步骤:');
    console.log('   1. 在主CSS文件中导入新的断点和工具类');
    console.log('   2. 测试不同屏幕尺寸的显示效果');
    console.log('   3. 逐步迁移使用新的响应式工具类');
    console.log('   4. 建立响应式设计的代码审查流程');
  }
}

// 执行脚本
if (require.main === module) {
  const optimizer = new ResponsiveLayoutOptimizer();
  optimizer.execute().catch(error => {
    console.error('❌ 响应式布局优化失败:', error);
    process.exit(1);
  });
}

module.exports = ResponsiveLayoutOptimizer;
