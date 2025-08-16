#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ComponentEnhancementProcessor {
  constructor() {
    this.projectRoot = process.cwd();
    this.enhancedComponents = [];
    this.fixes = [];

    // 组件增强模板
    this.enhancementTemplates = {
      propsTypes: {
        basic: `
export interface {ComponentName}Props {
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}`,

        advanced: `
export interface {ComponentName}Props {
  // 基础属性
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  
  // 事件处理
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onChange?: (value: any) => void;
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
  
  // 状态属性
  disabled?: boolean;
  loading?: boolean;
  error?: string | boolean;
  
  // 数据属性
  value?: any;
  defaultValue?: any;
  
  // 配置属性
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
  
  // 可访问性
  'aria-label'?: string;
  'aria-describedby'?: string;
  role?: string;
  tabIndex?: number;
}`
      },

      stateManagement: {
        basic: `
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);`,

        advanced: `
  const [state, setState] = useState({
    value: defaultValue,
    loading: false,
    error: null,
    touched: false,
    focused: false
  });
  
  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);`
      },

      eventHandling: {
        basic: `
  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const handleChange = useCallback((newValue: any) => {
    setValue(newValue);
    onChange?.(newValue);
  }, [onChange]);`,

        advanced: `
  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    
    try {
      onClick?.(event);
    } catch (error) {
      console.error('Click handler error:', error);
      setError('操作失败，请重试');
    }
  }, [disabled, loading, onClick]);
  
  const handleChange = useCallback((newValue: any) => {
    updateState({ value: newValue, touched: true, error: null });
    
    try {
      onChange?.(newValue);
    } catch (error) {
      console.error('Change handler error:', error);
      updateState({ error: '值更新失败' });
    }
  }, [onChange, updateState]);
  
  const handleFocus = useCallback((event: React.FocusEvent<HTMLElement>) => {
    updateState({ focused: true });
    onFocus?.(event);
  }, [onFocus, updateState]);
  
  const handleBlur = useCallback((event: React.FocusEvent<HTMLElement>) => {
    updateState({ focused: false });
    onBlur?.(event);
  }, [onBlur, updateState]);`
      },

      accessibility: {
        basic: `
  const ariaProps = {
    'aria-label': ariaLabel,
    'aria-describedby': error ? \`\${id}-error\` : undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    role: role || 'button',
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };`,

        advanced: `
  const componentId = useId();
  const errorId = \`\${componentId}-error\`;
  const descriptionId = \`\${componentId}-description\`;
  
  const ariaProps = {
    id: componentId,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': [
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    'aria-busy': loading,
    'aria-expanded': expanded,
    'aria-selected': selected,
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };`
      },

      styling: {
        basic: `
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors';
  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  };
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
  };
  const stateClasses = {
    disabled: 'opacity-50 cursor-not-allowed',
    loading: 'cursor-wait',
    error: 'border-red-500 text-red-600'
  };
  
  const componentClasses = cn(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    {
      [stateClasses.disabled]: disabled,
      [stateClasses.loading]: loading,
      [stateClasses.error]: !!error
    },
    className
  );`,

        cssModules: `
  const classes = {
    root: styles.component,
    [\`size-\${size}\`]: styles[\`size\${size.charAt(0).toUpperCase() + size.slice(1)}\`],
    [\`variant-\${variant}\`]: styles[\`variant\${variant.charAt(0).toUpperCase() + variant.slice(1)}\`],
    disabled: disabled && styles.disabled,
    loading: loading && styles.loading,
    error: error && styles.error,
    focused: focused && styles.focused
  };
  
  const componentClasses = Object.entries(classes)
    .filter(([, value]) => value)
    .map(([, value]) => value)
    .join(' ');`
      },

      performance: {
        memoization: `
  const MemoizedComponent = React.memo(Component, (prevProps, nextProps) => {
    // 自定义比较逻辑
    return (
      prevProps.value === nextProps.value &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.loading === nextProps.loading &&
      prevProps.className === nextProps.className
    );
  });`,

        callbacks: `
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => 
    debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );`,

        effects: `
  useEffect(() => {
    // 清理函数
    return () => {
      // 清理定时器、事件监听器等
    };
  }, []);
  
  useLayoutEffect(() => {
    // DOM 相关的同步操作
  }, []);`
      }
    };
  }

  /**
   * 执行组件功能增强
   */
  async execute() {
    console.log('🧩 开始组件功能增强...\n');

    try {
      // 1. 扫描需要增强的组件
      const components = await this.scanComponentsForEnhancement();

      // 2. 为每个组件添加增强功能
      for (const component of components) {
        await this.enhanceComponent(component);
      }

      // 3. 创建组件开发工具
      await this.createComponentDevTools();

      // 4. 生成增强报告
      this.generateEnhancementReport();

    } catch (error) {
      console.error('❌ 组件功能增强过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 扫描需要增强的组件
   */
  async scanComponentsForEnhancement() {
    console.log('🔍 扫描需要功能增强的组件...');

    const componentsDir = path.join(this.projectRoot, 'frontend/components');
    const components = [];

    if (fs.existsSync(componentsDir)) {
      const componentFiles = this.getFilesRecursively(componentsDir, ['.tsx', '.jsx']);

      for (const componentFile of componentFiles) {
        const analysis = await this.analyzeComponent(componentFile);
        if (analysis.needsEnhancement) {
          components.push(analysis);
        }
      }
    }

    console.log(`   发现 ${components.length} 个组件需要功能增强\n`);
    return components;
  }

  /**
   * 分析组件
   */
  async analyzeComponent(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, path.extname(filePath));

    // 检查现有功能
    const hasPropsTypes = content.includes('interface') && content.includes('Props');
    const hasStateManagement = content.includes('useState') || content.includes('useReducer');
    const hasEventHandling = content.includes('onClick') || content.includes('onChange') || content.includes('onSubmit');
    const hasAccessibility = content.includes('aria-') || content.includes('role=');
    const hasStyling = content.includes('className') || content.includes('style=') || content.includes('styled');
    const hasPerformanceOptimization = content.includes('useCallback') || content.includes('useMemo') || content.includes('React.memo');

    // 检查组件复杂度
    const complexity = this.calculateComponentComplexity(content);
    const isSimpleComponent = this.isSimpleComponent(fileName);

    // 确定需要的增强
    const enhancements = [];
    if (!hasPropsTypes && !isSimpleComponent) enhancements.push('propsTypes');
    if (!hasStateManagement && this.shouldHaveState(content, fileName)) enhancements.push('stateManagement');
    if (!hasEventHandling && this.shouldHaveEvents(content, fileName)) enhancements.push('eventHandling');
    if (!hasAccessibility) enhancements.push('accessibility');
    if (!hasStyling) enhancements.push('styling');
    if (!hasPerformanceOptimization && complexity > 50) enhancements.push('performance');

    const needsEnhancement = enhancements.length > 0 && complexity > 10;

    return {
      filePath,
      fileName,
      hasPropsTypes,
      hasStateManagement,
      hasEventHandling,
      hasAccessibility,
      hasStyling,
      hasPerformanceOptimization,
      complexity,
      isSimpleComponent,
      enhancements,
      needsEnhancement,
      content
    };
  }

  /**
   * 判断组件是否应该有状态
   */
  shouldHaveState(content, fileName) {
    const stateIndicators = [
      'input', 'form', 'modal', 'dropdown', 'toggle', 'switch',
      'accordion', 'tab', 'carousel', 'slider'
    ];
    return stateIndicators.some(indicator =>
      fileName.toLowerCase().includes(indicator) ||
      content.toLowerCase().includes(indicator)
    );
  }

  /**
   * 判断组件是否应该有事件处理
   */
  shouldHaveEvents(content, fileName) {
    const eventIndicators = [
      'button', 'input', 'form', 'click', 'change', 'submit',
      'modal', 'dropdown', 'menu', 'tab'
    ];
    return eventIndicators.some(indicator =>
      fileName.toLowerCase().includes(indicator) ||
      content.toLowerCase().includes(indicator)
    );
  }

  /**
   * 判断是否为简单组件
   */
  isSimpleComponent(fileName) {
    const simpleComponents = [
      'Icon', 'Spinner', 'Loading', 'Divider', 'Spacer',
      'Text', 'Heading', 'Label', 'Badge', 'Avatar'
    ];
    return simpleComponents.some(simple => fileName.includes(simple));
  }

  /**
   * 计算组件复杂度
   */
  calculateComponentComplexity(content) {
    let complexity = 0;

    // JSX元素数量
    const jsxElements = (content.match(/<[^\/][^>]*>/g) || []).length;
    complexity += jsxElements * 2;

    // Hook使用数量
    const hooks = (content.match(/use[A-Z][a-zA-Z]*\(/g) || []).length;
    complexity += hooks * 5;

    // 事件处理器数量
    const eventHandlers = (content.match(/on[A-Z][a-zA-Z]*=/g) || []).length;
    complexity += eventHandlers * 3;

    // 条件渲染数量
    const conditionals = (content.match(/\{.*\?.*:.*\}/g) || []).length;
    complexity += conditionals * 4;

    // 函数定义数量
    const functions = (content.match(/const\s+\w+\s*=.*=>/g) || []).length;
    complexity += functions * 3;

    return complexity;
  }

  /**
   * 增强组件
   */
  async enhanceComponent(componentInfo) {
    console.log(`🧩 增强组件: ${componentInfo.fileName} (${componentInfo.enhancements.join(', ')})`);

    let newContent = componentInfo.content;
    let modified = false;

    // 根据需要的增强功能添加相应代码
    for (const enhancement of componentInfo.enhancements) {
      switch (enhancement) {
        case 'propsTypes':
          newContent = this.addPropsTypes(newContent, componentInfo.fileName);
          modified = true;
          break;

        case 'stateManagement':
          newContent = this.addStateManagement(newContent);
          modified = true;
          break;

        case 'eventHandling':
          newContent = this.addEventHandling(newContent);
          modified = true;
          break;

        case 'accessibility':
          newContent = this.addAccessibility(newContent);
          modified = true;
          break;

        case 'styling':
          newContent = this.addStyling(newContent);
          modified = true;
          break;

        case 'performance':
          newContent = this.addPerformanceOptimization(newContent);
          modified = true;
          break;
      }
    }

    if (modified) {
      fs.writeFileSync(componentInfo.filePath, newContent);
      this.enhancedComponents.push({
        file: path.relative(this.projectRoot, componentInfo.filePath),
        enhancements: componentInfo.enhancements,
        complexity: componentInfo.complexity
      });
      this.addFix('component_enhancement', componentInfo.filePath, `添加${componentInfo.enhancements.join('、')}功能`);
    }
  }

  /**
   * 添加Props类型定义
   */
  addPropsTypes(content, componentName) {
    const propsInterface = this.enhancementTemplates.propsTypes.advanced
      .replace(/{ComponentName}/g, componentName);

    // 在import语句后添加Props接口
    const importMatch = content.match(/import.*from.*;/g);
    if (importMatch) {
      const lastImportIndex = content.lastIndexOf(importMatch[importMatch.length - 1]);
      const insertIndex = lastImportIndex + importMatch[importMatch.length - 1].length;
      content = content.slice(0, insertIndex) + '\n\n' + propsInterface + '\n' + content.slice(insertIndex);
    } else {
      content = propsInterface + '\n\n' + content;
    }

    // 更新组件函数签名
    const componentMatch = content.match(new RegExp(`const\\s+${componentName}.*=.*\\(([^)]*)\\)`));
    if (componentMatch) {
      const newSignature = `const ${componentName}: React.FC<${componentName}Props> = (props)`;
      content = content.replace(componentMatch[0], newSignature);
    }

    return content;
  }

  /**
   * 添加状态管理
   */
  addStateManagement(content) {
    const stateCode = this.enhancementTemplates.stateManagement.advanced;
    return this.insertIntoComponent(content, stateCode);
  }

  /**
   * 添加事件处理
   */
  addEventHandling(content) {
    const eventCode = this.enhancementTemplates.eventHandling.advanced;
    return this.insertIntoComponent(content, eventCode);
  }

  /**
   * 添加可访问性
   */
  addAccessibility(content) {
    const accessibilityCode = this.enhancementTemplates.accessibility.advanced;
    return this.insertIntoComponent(content, accessibilityCode);
  }

  /**
   * 添加样式
   */
  addStyling(content) {
    const stylingCode = this.enhancementTemplates.styling.basic;
    return this.insertIntoComponent(content, stylingCode);
  }

  /**
   * 添加性能优化
   */
  addPerformanceOptimization(content) {
    const performanceCode = this.enhancementTemplates.performance.callbacks;
    return this.insertIntoComponent(content, performanceCode);
  }

  /**
   * 在组件中插入代码
   */
  insertIntoComponent(content, code) {
    // 在组件函数内部的开始位置添加代码
    const componentMatch = content.match(/const\s+\w+.*=.*\([^)]*\)\s*=>\s*{/);
    if (componentMatch) {
      const insertIndex = content.indexOf(componentMatch[0]) + componentMatch[0].length;
      content = content.slice(0, insertIndex) + '\n  ' + code + content.slice(insertIndex);
    }
    return content;
  }

  /**
   * 创建组件开发工具
   */
  async createComponentDevTools() {
    console.log('🛠️ 创建组件开发工具...');

    // 创建组件测试工具
    await this.createComponentTester();

    // 创建组件文档生成器
    await this.createComponentDocGenerator();

    console.log('   ✅ 组件开发工具创建完成\n');
  }

  /**
   * 创建组件测试工具
   */
  async createComponentTester() {
    const componentTesterPath = path.join(this.projectRoot, 'frontend/utils/componentTester.tsx');

    if (!fs.existsSync(componentTesterPath)) {
      const componentTesterContent = `/**
 * 组件测试工具
 * 提供组件的可视化测试和调试功能
 */

import React, { useState } from 'react';

export interface ComponentTestProps {
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  variants?: Record<string, Record<string, any>>;
  title?: string;
}

export const ComponentTester: React.FC<ComponentTestProps> = ({
  component: Component,
  props = {},
  variants = {},
  title = 'Component Test'
}) => {
  const [selectedVariant, setSelectedVariant] = useState('default');
  const [customProps, setCustomProps] = useState(props);

  const currentProps = selectedVariant === 'default' 
    ? customProps 
    : { ...customProps, ...variants[selectedVariant] };

  return (
    <div className="p-6 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      
      {/* 变体选择器 */}
      {Object.keys(variants).length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">变体:</label>
          <select
            value={selectedVariant}
            onChange={(e) => setSelectedVariant(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="default">默认</option>
            {Object.keys(variants).map(variant => (
              <option key={variant} value={variant}>{variant}</option>
            ))}
          </select>
        </div>
      )}

      {/* 组件渲染 */}
      <div className="mb-4 p-4 border rounded bg-gray-50">
        <Component {...currentProps} />
      </div>

      {/* Props 编辑器 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Props (JSON):</label>
        <textarea
          value={JSON.stringify(currentProps, null, 2)}
          onChange={(e) => {
            try {
              setCustomProps(JSON.parse(e.target.value));
            } catch {
              // 忽略无效JSON
            }
          }}
          className="w-full h-32 p-2 border rounded font-mono text-sm"
        />
      </div>

      {/* 组件信息 */}
      <div className="text-sm text-gray-600">
        <p>组件名称: {Component.displayName || Component.name}</p>
        <p>Props 数量: {Object.keys(currentProps).length}</p>
      </div>
    </div>
  );
};

export default ComponentTester;`;

      fs.writeFileSync(componentTesterPath, componentTesterContent);
      this.addFix('component_tools', componentTesterPath, '创建组件测试工具');
    }
  }

  /**
   * 创建组件文档生成器
   */
  async createComponentDocGenerator() {
    const docGeneratorPath = path.join(this.projectRoot, 'frontend/utils/componentDocGenerator.ts');

    if (!fs.existsSync(docGeneratorPath)) {
      const docGeneratorContent = `/**
 * 组件文档生成器
 * 自动生成组件的使用文档和示例
 */

export interface ComponentDocumentation {
  name: string;
  description: string;
  props: Array<{
    name: string;
    type: string;
    required: boolean;
    defaultValue?: any;
    description?: string;
  }>;
  examples: Array<{
    title: string;
    code: string;
    description?: string;
  }>;
  accessibility: {
    ariaLabels: string[];
    keyboardSupport: string[];
    screenReaderSupport: string;
  };
}

class ComponentDocGenerator {
  /**
   * 从组件代码生成文档
   */
  generateDocumentation(componentCode: string, componentName: string): ComponentDocumentation {
    return {
      name: componentName,
      description: this.extractDescription(componentCode),
      props: this.extractProps(componentCode),
      examples: this.generateExamples(componentCode, componentName),
      accessibility: this.extractAccessibilityInfo(componentCode)
    };
  }

  /**
   * 提取组件描述
   */
  private extractDescription(code: string): string {
    const commentMatch = code.match(/\\/\\*\\*([\\s\\S]*?)\\*\\//);
    if (commentMatch) {
      return commentMatch[1]
        .replace(/\\*/g, '')
        .split('\\n')
        .map(line => line.trim())
        .filter(line => line)
        .join(' ');
    }
    return '暂无描述';
  }

  /**
   * 提取Props信息
   */
  private extractProps(code: string): Array<any> {
    const props: Array<any> = [];

    // 查找Props接口定义
    const propsInterfaceMatch = code.match(/interface\\s+\\w+Props\\s*{([\\s\\S]*?)}/);
    if (propsInterfaceMatch) {
      const propsContent = propsInterfaceMatch[1];
      const propLines = propsContent.split('\\n').filter(line => line.trim());

      for (const line of propLines) {
        const propMatch = line.match(/^\\s*(\\w+)(\\?)?:\\s*([^;]+);?/);
        if (propMatch) {
          const [, name, optional, type] = propMatch;
          props.push({
            name,
            type: type.trim(),
            required: !optional,
            description: this.extractPropDescription(line)
          });
        }
      }
    }

    return props;
  }

  /**
   * 提取属性描述
   */
  private extractPropDescription(line: string): string {
    const commentMatch = line.match(/\\/\\/\\s*(.+)$/);
    return commentMatch ? commentMatch[1].trim() : '';
  }

  /**
   * 生成使用示例
   */
  private generateExamples(code: string, componentName: string): Array<any> {
    const examples = [];

    // 基础示例
    examples.push({
      title: '基础用法',
      code: \`<\${componentName} />\`,
      description: '最简单的使用方式'
    });

    // 根据Props生成更多示例
    if (code.includes('onClick')) {
      examples.push({
        title: '带点击事件',
        code: \`<\${componentName} onClick={() => console.log('clicked')} />\`,
        description: '处理点击事件'
      });
    }

    if (code.includes('disabled')) {
      examples.push({
        title: '禁用状态',
        code: \`<\${componentName} disabled />\`,
        description: '禁用组件'
      });
    }

    if (code.includes('loading')) {
      examples.push({
        title: '加载状态',
        code: \`<\${componentName} loading />\`,
        description: '显示加载状态'
      });
    }

    return examples;
  }

  /**
   * 提取可访问性信息
   */
  private extractAccessibilityInfo(code: string): any {
    const accessibility = {
      ariaLabels: [],
      keyboardSupport: [],
      screenReaderSupport: ''
    };

    // 查找aria属性
    const ariaMatches = code.match(/aria-[\\w-]+/g);
    if (ariaMatches) {
      accessibility.ariaLabels = [...new Set(ariaMatches)];
    }

    // 检查键盘支持
    if (code.includes('onKeyDown') || code.includes('onKeyPress')) {
      accessibility.keyboardSupport.push('键盘导航');
    }
    if (code.includes('tabIndex')) {
      accessibility.keyboardSupport.push('Tab键导航');
    }

    // 屏幕阅读器支持
    if (accessibility.ariaLabels.length > 0) {
      accessibility.screenReaderSupport = '支持屏幕阅读器';
    } else {
      accessibility.screenReaderSupport = '需要改进屏幕阅读器支持';
    }

    return accessibility;
  }

  /**
   * 生成Markdown文档
   */
  generateMarkdown(doc: ComponentDocumentation): string {
    let markdown = \`# \${doc.name}

\${doc.description}

## Props

| 属性名 | 类型 | 必需 | 默认值 | 描述 |
|--------|------|------|--------|------|
\`;

    for (const prop of doc.props) {
      markdown += \`| \${prop.name} | \${prop.type} | \${prop.required ? '是' : '否'} | \${prop.defaultValue || '-'} | \${prop.description || '-'} |\\n\`;
    }

    markdown += \`
## 使用示例

\`;

    for (const example of doc.examples) {
      markdown += \`### \${example.title}

\${example.description || ''}

\\\`\\\`\\\`tsx
\${example.code}
\\\`\\\`\\\`

\`;
    }

    markdown += \`## 可访问性

### ARIA 属性
\${doc.accessibility.ariaLabels.map(label => \`- \${label}\`).join('\\n')}

### 键盘支持
\${doc.accessibility.keyboardSupport.map(support => \`- \${support}\`).join('\\n')}

### 屏幕阅读器
\${doc.accessibility.screenReaderSupport}
\`;

    return markdown;
  }
}

export const componentDocGenerator = new ComponentDocGenerator();
export default componentDocGenerator;`;

      fs.writeFileSync(docGeneratorPath, docGeneratorContent);
      this.addFix('component_tools', docGeneratorPath, '创建组件文档生成器');
    }
  }

  /**
   * 工具方法
   */
  getFilesRecursively(dir, extensions) {
    const files = [];

    if (!fs.existsSync(dir)) return files;

    const items = fs.readdirSync(dir);

    for (const item of items) {
      if (item.startsWith('.') || item === 'node_modules') continue;

      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.getFilesRecursively(fullPath, extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }

    return files;
  }

  addFix(category, filePath, description) {
    this.fixes.push({
      category,
      file: path.relative(this.projectRoot, filePath),
      description,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 生成增强报告
   */
  generateEnhancementReport() {
    const reportPath = path.join(this.projectRoot, 'component-enhancement-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalEnhancements: this.enhancedComponents.length,
        totalFixes: this.fixes.length,
        enhancementTypes: {
          propsTypes: this.enhancedComponents.filter(c => c.enhancements.includes('propsTypes')).length,
          stateManagement: this.enhancedComponents.filter(c => c.enhancements.includes('stateManagement')).length,
          eventHandling: this.enhancedComponents.filter(c => c.enhancements.includes('eventHandling')).length,
          accessibility: this.enhancedComponents.filter(c => c.enhancements.includes('accessibility')).length,
          styling: this.enhancedComponents.filter(c => c.enhancements.includes('styling')).length,
          performance: this.enhancedComponents.filter(c => c.enhancements.includes('performance')).length
        },
        averageComplexity: this.enhancedComponents.reduce((sum, c) => sum + c.complexity, 0) / this.enhancedComponents.length || 0
      },
      enhancedComponents: this.enhancedComponents,
      fixes: this.fixes,
      nextSteps: [
        '测试增强的组件功能',
        '验证可访问性改进',
        '检查性能优化效果',
        '更新组件文档',
        '添加组件单元测试'
      ]
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 组件功能增强报告:');
    console.log(`   增强组件: ${report.summary.totalEnhancements}`);
    console.log(`   总修复数: ${report.summary.totalFixes}`);
    console.log(`   平均复杂度: ${report.summary.averageComplexity.toFixed(1)}`);
    console.log(`   增强类型分布:`);
    console.log(`   - Props类型: ${report.summary.enhancementTypes.propsTypes}`);
    console.log(`   - 状态管理: ${report.summary.enhancementTypes.stateManagement}`);
    console.log(`   - 事件处理: ${report.summary.enhancementTypes.eventHandling}`);
    console.log(`   - 可访问性: ${report.summary.enhancementTypes.accessibility}`);
    console.log(`   - 样式系统: ${report.summary.enhancementTypes.styling}`);
    console.log(`   - 性能优化: ${report.summary.enhancementTypes.performance}`);
    console.log(`   报告已保存: ${reportPath}\n`);

    console.log('🎯 下一步操作:');
    report.nextSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`);
    });
  }
}

// 执行脚本
if (require.main === module) {
  const processor = new ComponentEnhancementProcessor();
  processor.execute().catch(error => {
    console.error('❌ 组件功能增强失败:', error);
    process.exit(1);
  });
}

module.exports = ComponentEnhancementProcessor;
