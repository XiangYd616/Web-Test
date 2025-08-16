#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class DesignSystemBuilder {
  constructor() {
    this.projectRoot = process.cwd();
    this.hardcodedValues = new Map();
    this.colorValues = new Set();
    this.spacingValues = new Set();
    this.fontSizes = new Set();
    this.borderRadius = new Set();
    this.shadows = new Set();
    this.fixes = [];
  }

  /**
   * 执行设计系统建立
   */
  async execute() {
    console.log('🎨 开始建立统一设计系统...\n');

    try {
      // 1. 扫描现有硬编码值
      await this.scanHardcodedValues();

      // 2. 分析设计令牌
      this.analyzeDesignTokens();

      // 3. 创建统一的设计系统
      await this.createUnifiedDesignSystem();

      // 4. 替换硬编码值
      await this.replaceHardcodedValues();

      // 5. 创建设计系统文档
      await this.createDesignSystemDocs();

      // 6. 生成修复报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 设计系统建立过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 扫描现有硬编码值
   */
  async scanHardcodedValues() {
    console.log('🔍 扫描硬编码值...');

    const files = this.getStyleAndComponentFiles();
    let totalHardcoded = 0;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const hardcoded = this.extractHardcodedValues(content, file);
        totalHardcoded += hardcoded;
      } catch (error) {
        console.log(`   ⚠️  无法读取文件: ${file}`);
      }
    }

    console.log(`   发现 ${totalHardcoded} 个硬编码值`);
    console.log(`   - 颜色值: ${this.colorValues.size}`);
    console.log(`   - 间距值: ${this.spacingValues.size}`);
    console.log(`   - 字体大小: ${this.fontSizes.size}`);
    console.log(`   - 圆角值: ${this.borderRadius.size}`);
    console.log(`   - 阴影值: ${this.shadows.size}\n`);
  }

  /**
   * 提取硬编码值
   */
  extractHardcodedValues(content, filePath) {
    let count = 0;

    // 提取颜色值
    const colorMatches = content.match(/#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/g) || [];
    colorMatches.forEach(color => {
      if (!color.includes('var(')) {
        this.colorValues.add(color);
        this.addHardcodedValue('color', color, filePath);
        count++;
      }
    });

    // 提取间距值 (margin, padding, gap)
    const spacingMatches = content.match(/(?:margin|padding|gap|top|right|bottom|left|width|height):\s*(\d+(?:px|rem|em))/g) || [];
    spacingMatches.forEach(spacing => {
      const value = spacing.match(/(\d+(?:px|rem|em))/)[1];
      if (!spacing.includes('var(')) {
        this.spacingValues.add(value);
        this.addHardcodedValue('spacing', value, filePath);
        count++;
      }
    });

    // 提取字体大小
    const fontSizeMatches = content.match(/font-size:\s*(\d+(?:px|rem|em))/g) || [];
    fontSizeMatches.forEach(fontSize => {
      const value = fontSize.match(/(\d+(?:px|rem|em))/)[1];
      if (!fontSize.includes('var(')) {
        this.fontSizes.add(value);
        this.addHardcodedValue('fontSize', value, filePath);
        count++;
      }
    });

    // 提取圆角值
    const radiusMatches = content.match(/border-radius:\s*(\d+(?:px|rem|em))/g) || [];
    radiusMatches.forEach(radius => {
      const value = radius.match(/(\d+(?:px|rem|em))/)[1];
      if (!radius.includes('var(')) {
        this.borderRadius.add(value);
        this.addHardcodedValue('borderRadius', value, filePath);
        count++;
      }
    });

    // 提取阴影值
    const shadowMatches = content.match(/box-shadow:\s*([^;]+)/g) || [];
    shadowMatches.forEach(shadow => {
      const value = shadow.replace('box-shadow:', '').trim();
      if (!shadow.includes('var(')) {
        this.shadows.add(value);
        this.addHardcodedValue('shadow', value, filePath);
        count++;
      }
    });

    return count;
  }

  /**
   * 分析设计令牌
   */
  analyzeDesignTokens() {
    console.log('📊 分析设计令牌...');

    const tokens = {
      colors: this.generateColorTokens(),
      spacing: this.generateSpacingTokens(),
      typography: this.generateTypographyTokens(),
      borderRadius: this.generateBorderRadiusTokens(),
      shadows: this.generateShadowTokens()
    };

    console.log(`   生成设计令牌:`);
    console.log(`   - 颜色令牌: ${Object.keys(tokens.colors).length}`);
    console.log(`   - 间距令牌: ${Object.keys(tokens.spacing).length}`);
    console.log(`   - 字体令牌: ${Object.keys(tokens.typography).length}`);
    console.log(`   - 圆角令牌: ${Object.keys(tokens.borderRadius).length}`);
    console.log(`   - 阴影令牌: ${Object.keys(tokens.shadows).length}\n`);

    this.designTokens = tokens;
  }

  /**
   * 生成颜色令牌
   */
  generateColorTokens() {
    const commonColors = {
      '#ffffff': '--color-white',
      '#000000': '--color-black',
      '#f9fafb': '--color-gray-50',
      '#f3f4f6': '--color-gray-100',
      '#e5e7eb': '--color-gray-200',
      '#d1d5db': '--color-gray-300',
      '#9ca3af': '--color-gray-400',
      '#6b7280': '--color-gray-500',
      '#4b5563': '--color-gray-600',
      '#374151': '--color-gray-700',
      '#1f2937': '--color-gray-800',
      '#111827': '--color-gray-900',
      '#3b82f6': '--color-primary',
      '#2563eb': '--color-primary-hover',
      '#1d4ed8': '--color-primary-active',
      '#10b981': '--color-success',
      '#059669': '--color-success-hover',
      '#ef4444': '--color-danger',
      '#dc2626': '--color-danger-hover',
      '#f59e0b': '--color-warning',
      '#d97706': '--color-warning-hover'
    };

    const tokens = {};
    this.colorValues.forEach(color => {
      if (commonColors[color.toLowerCase()]) {
        tokens[color] = commonColors[color.toLowerCase()];
      } else {
        // 为自定义颜色生成令牌名
        const tokenName = `--color-custom-${Object.keys(tokens).length + 1}`;
        tokens[color] = tokenName;
      }
    });

    return tokens;
  }

  /**
   * 生成间距令牌
   */
  generateSpacingTokens() {
    const commonSpacing = {
      '0px': '--spacing-0',
      '2px': '--spacing-0.5',
      '4px': '--spacing-1',
      '8px': '--spacing-2',
      '12px': '--spacing-3',
      '16px': '--spacing-4',
      '20px': '--spacing-5',
      '24px': '--spacing-6',
      '32px': '--spacing-8',
      '40px': '--spacing-10',
      '48px': '--spacing-12',
      '64px': '--spacing-16',
      '0.25rem': '--spacing-1',
      '0.5rem': '--spacing-2',
      '0.75rem': '--spacing-3',
      '1rem': '--spacing-4',
      '1.25rem': '--spacing-5',
      '1.5rem': '--spacing-6',
      '2rem': '--spacing-8',
      '2.5rem': '--spacing-10',
      '3rem': '--spacing-12',
      '4rem': '--spacing-16'
    };

    const tokens = {};
    this.spacingValues.forEach(spacing => {
      if (commonSpacing[spacing]) {
        tokens[spacing] = commonSpacing[spacing];
      } else {
        const tokenName = `--spacing-custom-${Object.keys(tokens).length + 1}`;
        tokens[spacing] = tokenName;
      }
    });

    return tokens;
  }

  /**
   * 生成字体令牌
   */
  generateTypographyTokens() {
    const commonFontSizes = {
      '12px': '--font-size-xs',
      '14px': '--font-size-sm',
      '16px': '--font-size-base',
      '18px': '--font-size-lg',
      '20px': '--font-size-xl',
      '24px': '--font-size-2xl',
      '30px': '--font-size-3xl',
      '36px': '--font-size-4xl',
      '0.75rem': '--font-size-xs',
      '0.875rem': '--font-size-sm',
      '1rem': '--font-size-base',
      '1.125rem': '--font-size-lg',
      '1.25rem': '--font-size-xl',
      '1.5rem': '--font-size-2xl'
    };

    const tokens = {};
    this.fontSizes.forEach(fontSize => {
      if (commonFontSizes[fontSize]) {
        tokens[fontSize] = commonFontSizes[fontSize];
      } else {
        const tokenName = `--font-size-custom-${Object.keys(tokens).length + 1}`;
        tokens[fontSize] = tokenName;
      }
    });

    return tokens;
  }

  /**
   * 生成圆角令牌
   */
  generateBorderRadiusTokens() {
    const commonRadius = {
      '0px': '--radius-none',
      '2px': '--radius-sm',
      '4px': '--radius-md',
      '6px': '--radius-lg',
      '8px': '--radius-xl',
      '12px': '--radius-2xl',
      '16px': '--radius-3xl',
      '0.125rem': '--radius-sm',
      '0.25rem': '--radius-md',
      '0.375rem': '--radius-lg',
      '0.5rem': '--radius-xl',
      '0.75rem': '--radius-2xl',
      '1rem': '--radius-3xl'
    };

    const tokens = {};
    this.borderRadius.forEach(radius => {
      if (commonRadius[radius]) {
        tokens[radius] = commonRadius[radius];
      } else {
        const tokenName = `--radius-custom-${Object.keys(tokens).length + 1}`;
        tokens[radius] = tokenName;
      }
    });

    return tokens;
  }

  /**
   * 生成阴影令牌
   */
  generateShadowTokens() {
    const commonShadows = {
      '0 1px 2px 0 rgba(0, 0, 0, 0.05)': '--shadow-sm',
      '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)': '--shadow-md',
      '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)': '--shadow-lg',
      '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)': '--shadow-xl',
      '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)': '--shadow-2xl'
    };

    const tokens = {};
    this.shadows.forEach(shadow => {
      const normalizedShadow = shadow.trim();
      if (commonShadows[normalizedShadow]) {
        tokens[shadow] = commonShadows[normalizedShadow];
      } else {
        const tokenName = `--shadow-custom-${Object.keys(tokens).length + 1}`;
        tokens[shadow] = tokenName;
      }
    });

    return tokens;
  }

  /**
   * 创建统一的设计系统
   */
  async createUnifiedDesignSystem() {
    console.log('🏗️ 创建统一设计系统...');

    // 创建主设计系统文件
    await this.createMainDesignSystemFile();

    // 创建设计令牌文件
    await this.createDesignTokensFile();

    // 创建主题配置文件
    await this.createThemeConfigFile();

    console.log('   ✅ 设计系统文件创建完成\n');
  }

  /**
   * 创建主设计系统文件
   */
  async createMainDesignSystemFile() {
    const designSystemPath = path.join(this.projectRoot, 'frontend/styles/design-system-unified.css');

    const content = `/* 统一设计系统 v2.0.0 */
/* 此文件整合了所有设计令牌和组件样式 */

@import './design-tokens-unified.css';
@import './theme-config-unified.css';

/* ===== 全局重置 ===== */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* ===== 基础样式 ===== */
body {
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
  color: var(--text-primary);
  background-color: var(--bg-primary);
  margin: 0;
  padding: 0;
}

/* ===== 工具类 ===== */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.focus-ring:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ===== 响应式工具 ===== */
@media (max-width: 640px) {
  .hidden-mobile { display: none !important; }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .hidden-tablet { display: none !important; }
}

@media (min-width: 1025px) {
  .hidden-desktop { display: none !important; }
}`;

    fs.writeFileSync(designSystemPath, content);
  }

  /**
   * 创建设计令牌文件
   */
  async createDesignTokensFile() {
    const tokensPath = path.join(this.projectRoot, 'frontend/styles/design-tokens-unified.css');

    let content = `/* 统一设计令牌 v2.0.0 */
/* 此文件包含所有设计令牌定义 */

:root {
  /* ===== 颜色令牌 ===== */
  --color-white: #ffffff;
  --color-black: #000000;

  /* 灰色系 */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;

  /* 主色调 */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-active: #1d4ed8;
  --color-primary-light: #dbeafe;
  --color-primary-dark: #1e40af;

  /* 状态颜色 */
  --color-success: #10b981;
  --color-success-hover: #059669;
  --color-success-light: #d1fae5;
  --color-success-dark: #047857;

  --color-warning: #f59e0b;
  --color-warning-hover: #d97706;
  --color-warning-light: #fef3c7;
  --color-warning-dark: #b45309;

  --color-danger: #ef4444;
  --color-danger-hover: #dc2626;
  --color-danger-light: #fee2e2;
  --color-danger-dark: #b91c1c;

  /* ===== 间距令牌 ===== */
  --spacing-0: 0px;
  --spacing-0\\.5: 2px;
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;
  --spacing-12: 48px;
  --spacing-16: 64px;
  --spacing-20: 80px;
  --spacing-24: 96px;

  /* ===== 字体令牌 ===== */
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* ===== 圆角令牌 ===== */
  --radius-none: 0px;
  --radius-sm: 0.125rem;   /* 2px */
  --radius-md: 0.25rem;    /* 4px */
  --radius-lg: 0.375rem;   /* 6px */
  --radius-xl: 0.5rem;     /* 8px */
  --radius-2xl: 0.75rem;   /* 12px */
  --radius-3xl: 1rem;      /* 16px */
  --radius-full: 9999px;

  /* ===== 阴影令牌 ===== */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-xl: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-2xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
  --shadow-none: 0 0 #0000;

  /* ===== 过渡令牌 ===== */
  --transition-fast: 150ms ease-in-out;
  --transition-normal: 300ms ease-in-out;
  --transition-slow: 500ms ease-in-out;

  /* ===== Z-index令牌 ===== */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
  --z-toast: 1080;
}`;

    fs.writeFileSync(tokensPath, content);
  }

  /**
   * 创建主题配置文件
   */
  async createThemeConfigFile() {
    const themePath = path.join(this.projectRoot, 'frontend/styles/theme-config-unified.css');

    const content = `/* 统一主题配置 v2.0.0 */
/* 此文件定义语义化的主题变量 */

:root {
  /* ===== 语义化颜色 ===== */
  --text-primary: var(--color-gray-900);
  --text-secondary: var(--color-gray-600);
  --text-tertiary: var(--color-gray-400);
  --text-inverse: var(--color-white);
  --text-muted: var(--color-gray-300);

  --bg-primary: var(--color-white);
  --bg-secondary: var(--color-gray-50);
  --bg-tertiary: var(--color-gray-100);
  --bg-overlay: rgba(0, 0, 0, 0.5);

  --border-primary: var(--color-gray-200);
  --border-secondary: var(--color-gray-300);
  --border-tertiary: var(--color-gray-400);

  /* ===== 组件特定变量 ===== */
  --button-padding-x: var(--spacing-4);
  --button-padding-y: var(--spacing-2);
  --button-border-radius: var(--radius-md);
  --button-font-weight: var(--font-weight-medium);

  --card-padding: var(--spacing-6);
  --card-border-radius: var(--radius-lg);
  --card-shadow: var(--shadow-md);
  --card-border: var(--border-primary);

  --input-padding-x: var(--spacing-3);
  --input-padding-y: var(--spacing-2);
  --input-border-radius: var(--radius-md);
  --input-border: var(--border-secondary);
  --input-focus-border: var(--color-primary);

  /* ===== 深色模式 ===== */
  --dark-text-primary: var(--color-gray-50);
  --dark-text-secondary: var(--color-gray-300);
  --dark-text-tertiary: var(--color-gray-400);
  --dark-text-inverse: var(--color-gray-900);

  --dark-bg-primary: var(--color-gray-900);
  --dark-bg-secondary: var(--color-gray-800);
  --dark-bg-tertiary: var(--color-gray-700);
  --dark-bg-overlay: rgba(0, 0, 0, 0.75);

  --dark-border-primary: var(--color-gray-700);
  --dark-border-secondary: var(--color-gray-600);
  --dark-border-tertiary: var(--color-gray-500);
}

/* 深色模式应用 */
@media (prefers-color-scheme: dark) {
  :root {
    --text-primary: var(--dark-text-primary);
    --text-secondary: var(--dark-text-secondary);
    --text-tertiary: var(--dark-text-tertiary);
    --text-inverse: var(--dark-text-inverse);

    --bg-primary: var(--dark-bg-primary);
    --bg-secondary: var(--dark-bg-secondary);
    --bg-tertiary: var(--dark-bg-tertiary);
    --bg-overlay: var(--dark-bg-overlay);

    --border-primary: var(--dark-border-primary);
    --border-secondary: var(--dark-border-secondary);
    --border-tertiary: var(--dark-border-tertiary);
  }
}

/* 手动深色模式切换 */
[data-theme="dark"] {
  --text-primary: var(--dark-text-primary);
  --text-secondary: var(--dark-text-secondary);
  --text-tertiary: var(--dark-text-tertiary);
  --text-inverse: var(--dark-text-inverse);

  --bg-primary: var(--dark-bg-primary);
  --bg-secondary: var(--dark-bg-secondary);
  --bg-tertiary: var(--dark-bg-tertiary);
  --bg-overlay: var(--dark-bg-overlay);

  --border-primary: var(--dark-border-primary);
  --border-secondary: var(--dark-border-secondary);
  --border-tertiary: var(--dark-border-tertiary);
}`;

    fs.writeFileSync(themePath, content);
  }

  /**
   * 添加硬编码值记录
   */
  addHardcodedValue(type, value, filePath) {
    const key = `${type}:${value}`;
    if (!this.hardcodedValues.has(key)) {
      this.hardcodedValues.set(key, []);
    }
    this.hardcodedValues.get(key).push(filePath);
  }

  /**
   * 获取样式和组件文件
   */
  getStyleAndComponentFiles() {
    const files = [];

    const scanDirectory = (dir, extensions) => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);
      items.forEach(item => {
        if (item.startsWith('.') || item === 'node_modules') return;

        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath, extensions);
        } else if (extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      });
    };

    // 扫描样式文件
    scanDirectory(path.join(this.projectRoot, 'frontend/styles'), ['.css', '.scss', '.sass']);

    // 扫描组件文件
    scanDirectory(path.join(this.projectRoot, 'frontend/components'), ['.tsx', '.jsx', '.ts', '.js']);

    return files;
  }

  /**
   * 替换硬编码值
   */
  async replaceHardcodedValues() {
    console.log('🔄 替换硬编码值...');

    let replacements = 0;

    // 这里只是示例，实际替换需要更复杂的逻辑
    console.log(`   计划替换 ${this.hardcodedValues.size} 个硬编码值`);
    console.log(`   ⚠️  建议手动审查替换结果\n`);

    // 实际项目中，这里应该实现具体的替换逻辑
    // 由于替换可能影响功能，建议分批进行并测试
  }

  /**
   * 创建设计系统文档
   */
  async createDesignSystemDocs() {
    console.log('📚 创建设计系统文档...');

    const docsPath = path.join(this.projectRoot, 'docs/DESIGN_SYSTEM.md');
    const content = `# 设计系统文档

## 概述

本项目采用统一的设计系统，确保界面的一致性和可维护性。

## 设计令牌

### 颜色系统
- 主色调：\`var(--color-primary)\`
- 次要色调：\`var(--color-secondary)\`
- 成功色：\`var(--color-success)\`
- 警告色：\`var(--color-warning)\`
- 危险色：\`var(--color-danger)\`

### 间距系统
- 超小：\`var(--spacing-1)\` (4px)
- 小：\`var(--spacing-2)\` (8px)
- 中：\`var(--spacing-4)\` (16px)
- 大：\`var(--spacing-6)\` (24px)
- 超大：\`var(--spacing-8)\` (32px)

### 字体系统
- 超小：\`var(--font-size-xs)\` (12px)
- 小：\`var(--font-size-sm)\` (14px)
- 基础：\`var(--font-size-base)\` (16px)
- 大：\`var(--font-size-lg)\` (18px)
- 超大：\`var(--font-size-xl)\` (20px)

## 使用指南

### 在CSS中使用
\`\`\`css
.my-component {
  color: var(--color-primary);
  padding: var(--spacing-4);
  font-size: var(--font-size-base);
}
\`\`\`

### 在组件中使用
\`\`\`tsx
<div className="text-primary p-4 text-base">
  内容
</div>
\`\`\`

## 维护指南

1. 所有新的设计值都应该添加到设计令牌中
2. 避免使用硬编码值
3. 定期审查和清理未使用的令牌
4. 保持设计系统文档的更新
`;

    fs.writeFileSync(docsPath, content);
    console.log('   ✅ 设计系统文档创建完成\n');
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'design-system-build-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalHardcodedValues: this.hardcodedValues.size,
        colorValues: this.colorValues.size,
        spacingValues: this.spacingValues.size,
        fontSizes: this.fontSizes.size,
        borderRadius: this.borderRadius.size,
        shadows: this.shadows.size,
        designTokensGenerated: this.designTokens ? Object.keys(this.designTokens).length : 0
      },
      hardcodedValues: Array.from(this.hardcodedValues.entries()).map(([key, files]) => ({
        value: key,
        files: files.map(f => path.relative(this.projectRoot, f))
      })),
      designTokens: this.designTokens,
      recommendations: [
        '建议逐步替换硬编码值为设计令牌',
        '定期审查设计系统的使用情况',
        '建立设计系统的维护流程',
        '考虑使用设计系统的自动化检查工具'
      ]
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 设计系统建立报告:');
    console.log(`   硬编码值总数: ${report.summary.totalHardcodedValues}`);
    console.log(`   - 颜色值: ${report.summary.colorValues}`);
    console.log(`   - 间距值: ${report.summary.spacingValues}`);
    console.log(`   - 字体大小: ${report.summary.fontSizes}`);
    console.log(`   - 圆角值: ${report.summary.borderRadius}`);
    console.log(`   - 阴影值: ${report.summary.shadows}`);
    console.log(`   报告已保存: ${reportPath}\n`);

    console.log('🎯 下一步建议:');
    console.log('   1. 审查生成的设计令牌');
    console.log('   2. 逐步替换硬编码值');
    console.log('   3. 更新组件使用设计系统');
    console.log('   4. 建立设计系统维护流程');
  }
}

// 执行脚本
if (require.main === module) {
  const builder = new DesignSystemBuilder();
  builder.execute().catch(error => {
    console.error('❌ 设计系统建立失败:', error);
    process.exit(1);
  });
}

module.exports = DesignSystemBuilder;
