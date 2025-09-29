/**
 * 主题颜色修复工具
 * 用于检测和修复硬编码颜色类的问题
 */

// 硬编码颜色类映射到主题变量的对照表
export const colorClassMapping = {
  // 背景色映射
  'bg-white': 'themed-bg-primary',
  'bg-gray-50': 'themed-bg-secondary',
  'bg-gray-100': 'themed-bg-secondary',
  'bg-gray-200': 'themed-bg-tertiary',
  'bg-gray-800': 'themed-bg-secondary',
  'bg-gray-900': 'themed-bg-primary',

  // 文本颜色映射
  'text-gray-900': 'themed-text-primary',
  'text-gray-800': 'themed-text-primary',
  'text-gray-700': 'themed-text-secondary',
  'text-gray-600': 'themed-text-secondary',
  'text-gray-500': 'themed-text-tertiary',
  'text-gray-400': 'themed-text-tertiary',
  'text-white': 'themed-text-primary',

  // 边框颜色映射
  'border-gray-200': 'themed-border-primary',
  'border-gray-300': 'themed-border-secondary',
  'border-gray-400': 'themed-border-tertiary',
  'border-gray-600': 'themed-border-primary',
  'border-gray-700': 'themed-border-secondary',

  // 按钮颜色映射
  'bg-blue-600': 'themed-button-primary',
  'bg-gray-600': 'themed-button-secondary',
  'hover:bg-blue-700': 'hover:themed-button-primary',
  'hover:bg-gray-700': 'hover:themed-button-secondary',
};

// 需要特殊处理的颜色类
export const _specialColorClasses = {
  // 状态颜色保持不变
  'text-red-500': 'text-red-500',
  'text-green-500': 'text-green-500',
  'text-yellow-500': 'text-yellow-500',
  'text-blue-500': 'text-blue-500',
  'bg-red-500': 'bg-red-500',
  'bg-green-500': 'bg-green-500',
  'bg-yellow-500': 'bg-yellow-500',
  'bg-blue-500': 'bg-blue-500',
};

/**
 * 检测元素中的硬编码颜色类
 */
export function detectHardcodedColors(element: Element): string[] {
  const classList = Array.from(element.classList);
  const hardcodedColors: string[] = [];

  classList.forEach(className => {
    if (colorClassMapping[className as keyof typeof colorClassMapping]) {
      hardcodedColors.push(className);
    }
  });

  return hardcodedColors;
}

/**
 * 替换硬编码颜色类为主题变量
 */
export function replaceHardcodedColors(element: Element): void {
  const hardcodedColors = detectHardcodedColors(element);

  hardcodedColors.forEach(colorClass => {
    const themeClass = colorClassMapping[colorClass as keyof typeof colorClassMapping];
    if (themeClass) {
      element.classList.remove(colorClass);
      element.classList.add(themeClass);
    }
  });
}

/**
 * 批量修复页面中的硬编码颜色
 */
export function fixPageColors(): void {
  const elements = document.querySelectorAll('*');
  elements.forEach(element => {
    replaceHardcodedColors(element);
  });
}

/**
 * 监听主题变化并自动修复颜色
 */
export function setupThemeColorWatcher(): void {
  // 监听主题变化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target as Element;
        if (target.classList.contains('dark') || target.classList.contains('light')) {
          // 主题发生变化，重新修复颜色
          setTimeout(() => fixPageColors(), 100);
        }
      }
    });
  });

  // 观察document.documentElement的class变化
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });
}

/**
 * 初始化主题颜色修复系统
 */
export function initThemeColorFixer(): void {
  // 页面加载完成后修复颜色
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixPageColors);
  } else {
    fixPageColors();
  }

  // 设置主题变化监听
  setupThemeColorWatcher();

}
