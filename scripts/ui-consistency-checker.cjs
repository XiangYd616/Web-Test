#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class UIConsistencyChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.issues = [];
    this.stylePatterns = {
      colors: new Set(),
      spacing: new Set(),
      typography: new Set(),
      breakpoints: new Set()
    };
  }

  /**
   * 执行UI一致性检查
   */
  async execute() {
    console.log('🎨 开始样式和UI一致性检查...\n');

    try {
      // 1. 检查设计系统一致性
      await this.checkDesignSystemConsistency();

      // 2. 检查颜色使用一致性
      await this.checkColorConsistency();

      // 3. 检查响应式布局一致性
      await this.checkResponsiveConsistency();

      // 4. 检查组件样式一致性
      await this.checkComponentStyleConsistency();

      // 5. 检查主题实现一致性
      await this.checkThemeConsistency();

      // 6. 生成报告
      this.generateReport();

    } catch (error) {
      console.error('❌ UI一致性检查过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 检查设计系统一致性
   */
  async checkDesignSystemConsistency() {
    console.log('🎯 检查设计系统一致性...');

    const styleFiles = this.getStyleFiles();
    let inconsistencies = 0;

    // 检查是否有统一的设计系统文件
    const designSystemFiles = styleFiles.filter(file => 
      file.includes('design-system') || 
      file.includes('tokens') || 
      file.includes('variables')
    );

    if (designSystemFiles.length === 0) {
      this.addIssue('design_system', 'missing_design_system', 'project',
        '缺少统一的设计系统文件');
      inconsistencies++;
    }

    // 检查CSS变量使用
    let cssVariableUsage = 0;
    let hardcodedValues = 0;

    for (const file of styleFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 统计CSS变量使用
        const cssVarMatches = content.match(/var\(--[^)]+\)/g) || [];
        cssVariableUsage += cssVarMatches.length;

        // 统计硬编码颜色值
        const colorMatches = content.match(/#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)/g) || [];
        hardcodedValues += colorMatches.length;

        // 收集颜色值
        colorMatches.forEach(color => this.stylePatterns.colors.add(color));

        // 检查间距值
        const spacingMatches = content.match(/(?:margin|padding|gap):\s*(\d+(?:px|rem|em))/g) || [];
        spacingMatches.forEach(spacing => {
          const value = spacing.match(/(\d+(?:px|rem|em))/)[1];
          this.stylePatterns.spacing.add(value);
        });

      } catch (error) {
        console.log(`   ⚠️  无法读取样式文件: ${file}`);
      }
    }

    // 检查硬编码值比例
    const totalValues = cssVariableUsage + hardcodedValues;
    if (totalValues > 0) {
      const hardcodedRatio = hardcodedValues / totalValues;
      if (hardcodedRatio > 0.3) {
        this.addIssue('design_system', 'too_many_hardcoded_values', 'project',
          `硬编码值过多: ${Math.round(hardcodedRatio * 100)}% (${hardcodedValues}/${totalValues})`);
        inconsistencies++;
      }
    }

    console.log(`   发现 ${inconsistencies} 个设计系统问题`);
    console.log(`   CSS变量使用: ${cssVariableUsage}, 硬编码值: ${hardcodedValues}\n`);
  }

  /**
   * 检查颜色使用一致性
   */
  async checkColorConsistency() {
    console.log('🌈 检查颜色使用一致性...');

    const componentFiles = this.getComponentFiles();
    let inconsistencies = 0;

    const colorUsage = {
      primary: 0,
      secondary: 0,
      success: 0,
      warning: 0,
      error: 0,
      custom: 0
    };

    for (const file of componentFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查语义化颜色使用
        if (content.includes('primary')) colorUsage.primary++;
        if (content.includes('secondary')) colorUsage.secondary++;
        if (content.includes('success')) colorUsage.success++;
        if (content.includes('warning')) colorUsage.warning++;
        if (content.includes('error') || content.includes('danger')) colorUsage.error++;

        // 检查自定义颜色
        const customColors = content.match(/#[0-9a-fA-F]{3,6}/g) || [];
        if (customColors.length > 0) {
          colorUsage.custom++;
          
          // 检查是否使用了过多的自定义颜色
          if (customColors.length > 3) {
            this.addIssue('color_consistency', 'too_many_custom_colors', file,
              `组件中使用了过多自定义颜色: ${customColors.length}`);
            inconsistencies++;
          }
        }

        // 检查颜色对比度相关的类名或样式
        const contrastIssues = this.checkColorContrast(content);
        if (contrastIssues.length > 0) {
          contrastIssues.forEach(issue => {
            this.addIssue('color_consistency', 'potential_contrast_issue', file, issue);
            inconsistencies++;
          });
        }

      } catch (error) {
        console.log(`   ⚠️  无法读取组件文件: ${file}`);
      }
    }

    console.log(`   发现 ${inconsistencies} 个颜色一致性问题`);
    console.log(`   颜色使用分布: primary(${colorUsage.primary}), secondary(${colorUsage.secondary}), success(${colorUsage.success}), warning(${colorUsage.warning}), error(${colorUsage.error}), custom(${colorUsage.custom})\n`);
  }

  /**
   * 检查响应式布局一致性
   */
  async checkResponsiveConsistency() {
    console.log('📱 检查响应式布局一致性...');

    const styleFiles = this.getStyleFiles();
    let inconsistencies = 0;

    const breakpointPatterns = {
      mobile: new Set(),
      tablet: new Set(),
      desktop: new Set()
    };

    for (const file of styleFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 提取媒体查询断点
        const mediaQueries = content.match(/@media[^{]+/g) || [];
        
        for (const query of mediaQueries) {
          const widthMatch = query.match(/\((?:min-|max-)?width:\s*(\d+(?:px|em|rem))\)/);
          if (widthMatch) {
            const width = widthMatch[1];
            this.stylePatterns.breakpoints.add(width);
            
            // 分类断点
            const numericWidth = parseInt(width);
            if (numericWidth <= 768) {
              breakpointPatterns.mobile.add(width);
            } else if (numericWidth <= 1024) {
              breakpointPatterns.tablet.add(width);
            } else {
              breakpointPatterns.desktop.add(width);
            }
          }
        }

        // 检查响应式单位使用
        const responsiveUnits = content.match(/\d+(?:vw|vh|%|rem)/g) || [];
        const fixedUnits = content.match(/\d+px/g) || [];
        
        if (fixedUnits.length > responsiveUnits.length * 2) {
          this.addIssue('responsive_consistency', 'too_many_fixed_units', file,
            `固定单位使用过多，可能影响响应式效果: px(${fixedUnits.length}) vs responsive(${responsiveUnits.length})`);
          inconsistencies++;
        }

      } catch (error) {
        console.log(`   ⚠️  无法读取样式文件: ${file}`);
      }
    }

    // 检查断点一致性
    const totalBreakpoints = this.stylePatterns.breakpoints.size;
    if (totalBreakpoints > 6) {
      this.addIssue('responsive_consistency', 'too_many_breakpoints', 'project',
        `断点过多，可能导致维护困难: ${totalBreakpoints}个不同断点`);
      inconsistencies++;
    }

    console.log(`   发现 ${inconsistencies} 个响应式一致性问题`);
    console.log(`   断点分布: mobile(${breakpointPatterns.mobile.size}), tablet(${breakpointPatterns.tablet.size}), desktop(${breakpointPatterns.desktop.size})\n`);
  }

  /**
   * 检查组件样式一致性
   */
  async checkComponentStyleConsistency() {
    console.log('🧩 检查组件样式一致性...');

    const componentFiles = this.getComponentFiles();
    let inconsistencies = 0;

    const stylingApproaches = {
      cssModules: 0,
      styledComponents: 0,
      inlineStyles: 0,
      cssClasses: 0,
      tailwind: 0
    };

    for (const file of componentFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 检测样式方法
        if (content.includes('styles.') || content.includes('.module.css')) {
          stylingApproaches.cssModules++;
        }
        
        if (content.includes('styled.') || content.includes('styled-components')) {
          stylingApproaches.styledComponents++;
        }
        
        if (content.includes('style={{') || content.includes('style: {')) {
          stylingApproaches.inlineStyles++;
        }
        
        if (content.includes('className=') && !content.includes('styles.')) {
          stylingApproaches.cssClasses++;
        }
        
        if (content.match(/className="[^"]*(?:bg-|text-|p-|m-|flex|grid)/)) {
          stylingApproaches.tailwind++;
        }

        // 检查样式一致性问题
        const hasMultipleApproaches = [
          content.includes('styles.'),
          content.includes('styled.'),
          content.includes('style={{'),
          content.match(/className="[^"]*(?:bg-|text-|p-|m-)/)
        ].filter(Boolean).length;

        if (hasMultipleApproaches > 1) {
          this.addIssue('component_style_consistency', 'mixed_styling_approaches', file,
            '组件中混合使用多种样式方法');
          inconsistencies++;
        }

      } catch (error) {
        console.log(`   ⚠️  无法读取组件文件: ${file}`);
      }
    }

    // 检查项目级别的样式方法一致性
    const usedApproaches = Object.entries(stylingApproaches).filter(([, count]) => count > 0);
    if (usedApproaches.length > 2) {
      this.addIssue('component_style_consistency', 'too_many_styling_approaches', 'project',
        `项目中使用了过多样式方法: ${usedApproaches.map(([name]) => name).join(', ')}`);
      inconsistencies++;
    }

    console.log(`   发现 ${inconsistencies} 个组件样式一致性问题`);
    console.log(`   样式方法分布: CSS Modules(${stylingApproaches.cssModules}), Styled Components(${stylingApproaches.styledComponents}), Inline(${stylingApproaches.inlineStyles}), CSS Classes(${stylingApproaches.cssClasses}), Tailwind(${stylingApproaches.tailwind})\n`);
  }

  /**
   * 检查主题实现一致性
   */
  async checkThemeConsistency() {
    console.log('🌙 检查主题实现一致性...');

    const themeFiles = this.getThemeFiles();
    let inconsistencies = 0;

    if (themeFiles.length === 0) {
      this.addIssue('theme_consistency', 'missing_theme_system', 'project',
        '缺少主题系统实现');
      inconsistencies++;
    } else {
      for (const file of themeFiles) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          
          // 检查主题变量定义
          const themeVariables = content.match(/--[a-zA-Z-]+:/g) || [];
          if (themeVariables.length < 10) {
            this.addIssue('theme_consistency', 'insufficient_theme_variables', file,
              `主题变量定义不足: ${themeVariables.length}个`);
            inconsistencies++;
          }

          // 检查深色主题支持
          const hasDarkTheme = content.includes('dark') || content.includes('[data-theme="dark"]');
          if (!hasDarkTheme) {
            this.addIssue('theme_consistency', 'missing_dark_theme', file,
              '缺少深色主题支持');
            inconsistencies++;
          }

        } catch (error) {
          console.log(`   ⚠️  无法读取主题文件: ${file}`);
        }
      }
    }

    console.log(`   发现 ${inconsistencies} 个主题一致性问题\n`);
  }

  /**
   * 检查颜色对比度问题
   */
  checkColorContrast(content) {
    const issues = [];
    
    // 简单的对比度检查（实际项目中需要更复杂的算法）
    const lightColors = ['#fff', '#ffffff', 'white', 'rgb(255,255,255)'];
    const darkColors = ['#000', '#000000', 'black', 'rgb(0,0,0)'];
    
    for (const lightColor of lightColors) {
      if (content.includes(lightColor)) {
        for (const darkColor of darkColors) {
          if (content.includes(darkColor)) {
            // 检查是否在同一行或相近位置
            const lightIndex = content.indexOf(lightColor);
            const darkIndex = content.indexOf(darkColor);
            if (Math.abs(lightIndex - darkIndex) < 100) {
              issues.push(`可能存在对比度问题: ${lightColor} 和 ${darkColor} 使用距离过近`);
            }
          }
        }
      }
    }
    
    return issues;
  }

  /**
   * 获取样式文件
   */
  getStyleFiles() {
    return this.getAllProjectFiles().filter(file => 
      /\.(css|scss|sass|less|styl)$/.test(file)
    );
  }

  /**
   * 获取组件文件
   */
  getComponentFiles() {
    return this.getAllProjectFiles().filter(file => 
      file.includes('/components/') && /\.(tsx|jsx)$/.test(file)
    );
  }

  /**
   * 获取主题文件
   */
  getThemeFiles() {
    return this.getAllProjectFiles().filter(file => 
      file.includes('theme') || file.includes('variables') || file.includes('tokens')
    );
  }

  /**
   * 获取所有项目文件
   */
  getAllProjectFiles() {
    const files = [];
    
    const walkDir = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          if (this.shouldSkipDirectory(item)) continue;
          
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    };

    walkDir(path.join(this.projectRoot, 'frontend'));
    return files;
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', 'coverage',
      '__tests__', '.vscode', '.idea', 'temp', 'tmp', 'backup'
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  addIssue(category, type, file, message) {
    this.issues.push({
      category,
      type,
      file: typeof file === 'string' ? path.relative(this.projectRoot, file) : file,
      message,
      severity: this.getSeverity(category, type)
    });
  }

  getSeverity(category, type) {
    const severityMap = {
      design_system: { 
        missing_design_system: 'high',
        too_many_hardcoded_values: 'medium'
      },
      color_consistency: { 
        too_many_custom_colors: 'low',
        potential_contrast_issue: 'medium'
      },
      responsive_consistency: { 
        too_many_fixed_units: 'medium',
        too_many_breakpoints: 'low'
      },
      component_style_consistency: { 
        mixed_styling_approaches: 'medium',
        too_many_styling_approaches: 'high'
      },
      theme_consistency: { 
        missing_theme_system: 'medium',
        insufficient_theme_variables: 'low',
        missing_dark_theme: 'low'
      }
    };
    return severityMap[category]?.[type] || 'low';
  }

  /**
   * 生成报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'ui-consistency-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.issues.length,
        categories: {
          design_system: this.issues.filter(i => i.category === 'design_system').length,
          color_consistency: this.issues.filter(i => i.category === 'color_consistency').length,
          responsive_consistency: this.issues.filter(i => i.category === 'responsive_consistency').length,
          component_style_consistency: this.issues.filter(i => i.category === 'component_style_consistency').length,
          theme_consistency: this.issues.filter(i => i.category === 'theme_consistency').length
        }
      },
      stylePatterns: {
        colors: Array.from(this.stylePatterns.colors),
        spacing: Array.from(this.stylePatterns.spacing),
        breakpoints: Array.from(this.stylePatterns.breakpoints)
      },
      issues: this.issues.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 UI一致性检查报告:');
    console.log(`   总问题数: ${report.summary.totalIssues}`);
    console.log(`   - 设计系统问题: ${report.summary.categories.design_system}`);
    console.log(`   - 颜色一致性问题: ${report.summary.categories.color_consistency}`);
    console.log(`   - 响应式一致性问题: ${report.summary.categories.responsive_consistency}`);
    console.log(`   - 组件样式一致性问题: ${report.summary.categories.component_style_consistency}`);
    console.log(`   - 主题一致性问题: ${report.summary.categories.theme_consistency}`);
    console.log(`   样式模式统计:`);
    console.log(`   - 颜色数量: ${report.stylePatterns.colors.length}`);
    console.log(`   - 间距值数量: ${report.stylePatterns.spacing.length}`);
    console.log(`   - 断点数量: ${report.stylePatterns.breakpoints.length}`);
    console.log(`   报告已保存: ${reportPath}\n`);
  }
}

// 执行脚本
if (require.main === module) {
  const checker = new UIConsistencyChecker();
  checker.execute().catch(error => {
    console.error('❌ UI一致性检查失败:', error);
    process.exit(1);
  });
}

module.exports = UIConsistencyChecker;
