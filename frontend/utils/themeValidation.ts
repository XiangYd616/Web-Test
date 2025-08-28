/**
 * 主题验证工具
 * 用于验证主题颜色是否正确应用
 */

// 硬编码颜色类检测规则
const HARDCODED_COLOR_PATTERNS = [
  /bg-gray-\d+/g,
  /text-gray-\d+/g,
  /border-gray-\d+/g,
  /bg-white/g,
  /text-white/g,
  /bg-black/g,
  /text-black/g,
];

// 应该使用的主题类
const THEME_CLASSES = [
  'themed-bg-primary',
  'themed-bg-secondary', 
  'themed-bg-tertiary',
  'themed-text-primary',
  'themed-text-secondary',
  'themed-text-tertiary',
  'themed-border-primary',
  'themed-border-secondary',
  'themed-card',
  'themed-button-primary',
  'themed-button-secondary',
];

/**
 * 检测页面中的硬编码颜色
 */
export function detectHardcodedColorsInPage(): {
  elements: Array<{
    element: Element;
    hardcodedClasses: string[];
    suggestions: string[];
  }>;
  summary: {
    totalElements: number;
    elementsWithIssues: number;
    totalIssues: number;
  };
} {
  const elements = document.querySelectorAll('*');
  const results: Array<{
    element: Element;
    hardcodedClasses: string[];
    suggestions: string[];
  }> = [];

  elements.forEach(element => {
    const classList = Array.from(element.classList);
    const hardcodedClasses: string[] = [];
    const suggestions: string[] = [];

    classList.forEach(className => {
      // 检测硬编码颜色类
      if (HARDCODED_COLOR_PATTERNS.some(pattern => pattern.test(className))) {
        hardcodedClasses.push(className);
        
        // 提供建议
        if (className.includes('bg-gray') || className === 'bg-white') {
          suggestions.push('使用 themed-bg-primary, themed-bg-secondary 或 themed-bg-tertiary');
        } else if (className.includes('text-gray') || className === 'text-white') {
          suggestions.push('使用 themed-text-primary, themed-text-secondary 或 themed-text-tertiary');
        } else if (className.includes('border-gray')) {
          suggestions.push('使用 themed-border-primary 或 themed-border-secondary');
        }
      }
    });

    if (hardcodedClasses.length > 0) {
      results.push({
        element,
        hardcodedClasses,
        suggestions
      });
    }
  });

  return {
    elements: results,
    summary: {
      totalElements: elements.length,
      elementsWithIssues: results.length,
      totalIssues: results.reduce((sum, item) => sum + item.hardcodedClasses.length, 0)
    }
  };
}

/**
 * 验证主题切换是否正常工作
 */
export function validateThemeToggle(): Promise<{
  success: boolean;
  issues: string[];
  details: {
    lightThemeApplied: boolean;
    darkThemeApplied: boolean;
    cssVariablesUpdated: boolean;
    classesApplied: boolean;
  };
}> {
  return new Promise((resolve) => {
    const issues: string[] = [];
    const details = {
      lightThemeApplied: false,
      darkThemeApplied: false,
      cssVariablesUpdated: false,
      classesApplied: false
    };

    // 获取当前主题
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    
    // 检查CSS变量是否存在
    const computedStyle = getComputedStyle(document.documentElement);
    const bgPrimary = computedStyle.getPropertyValue('--bg-primary');
    const textPrimary = computedStyle.getPropertyValue('--text-primary');
    
    if (bgPrimary && textPrimary) {
      details.cssVariablesUpdated = true;
    } else {
      issues.push('CSS变量未正确设置');
    }

    // 检查主题类是否应用
    const hasThemeClasses = THEME_CLASSES.some(className => 
      document.querySelector(`.${className}`)
    );
    
    if (hasThemeClasses) {
      details.classesApplied = true;
    } else {
      issues.push('主题类未正确应用');
    }

    // 检查主题状态
    if (currentTheme === 'dark') {
      details.darkThemeApplied = true;
    } else {
      details.lightThemeApplied = true;
    }

    const success = issues.length === 0;
    
    resolve({
      success,
      issues,
      details
    });
  });
}

/**
 * 生成主题修复报告
 */
export function generateThemeReport(): {
  timestamp: string;
  colorIssues: ReturnType<typeof detectHardcodedColorsInPage>;
  themeValidation: Promise<ReturnType<typeof validateThemeToggle>>;
  recommendations: string[];
} {
  const colorIssues = detectHardcodedColorsInPage();
  const themeValidation = validateThemeToggle();
  
  const recommendations: string[] = [];
  
  if (colorIssues.summary.elementsWithIssues > 0) {
    recommendations.push(`发现 ${colorIssues.summary.elementsWithIssues} 个元素使用硬编码颜色，建议替换为主题变量`);
  }
  
  if (colorIssues.summary.totalIssues > 10) {
    recommendations.push('建议使用自动化工具批量修复硬编码颜色');
  }
  
  recommendations.push('定期运行主题验证确保颜色一致性');
  recommendations.push('在开发过程中优先使用主题类而非硬编码颜色');

  return {
    timestamp: new Date().toISOString(),
    colorIssues,
    themeValidation,
    recommendations
  };
}

/**
 * 在控制台输出主题报告
 */
export async function logThemeReport(): Promise<void> {
  console.group('🎨 主题颜色验证报告');
  
  const report = generateThemeReport();
  const validation = await report.themeValidation;
  
  console.log('📊 颜色问题统计:', report.colorIssues.summary);
  console.log('✅ 主题验证结果:', validation);
  
  if (report.colorIssues.summary.elementsWithIssues > 0) {
    console.group('🔍 发现的问题元素:');
    report.colorIssues.elements.slice(0, 5).forEach((item, index) => {
      console.log(`${index + 1}.`, item.element, {
        hardcodedClasses: item.hardcodedClasses,
        suggestions: item.suggestions
      });
    });
    console.groupEnd();
  }
  
  console.log('💡 建议:', report.recommendations);
  console.groupEnd();
}

/**
 * 初始化主题验证
 */
export function initThemeValidation(): void {
  // 在开发环境下自动运行验证
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      logThemeReport();
    }, 2000);
  }
  
  // 添加全局方法供调试使用
  (window as any).validateTheme = logThemeReport;
  (window as any).detectColors = detectHardcodedColorsInPage;
  
  console.log('🎨 主题验证工具已初始化，使用 validateTheme() 运行验证');
}
