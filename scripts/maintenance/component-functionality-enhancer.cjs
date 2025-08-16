#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ComponentFunctionalityEnhancer {
  constructor() {
    this.projectRoot = process.cwd();
    this.enhancedComponents = [];
    this.fixes = [];

    // 组件功能增强配置
    this.enhancementConfig = {
      // 组件类型和对应的功能模板
      componentTypes: {
        ui: {
          requiredFeatures: ['propsTypes', 'accessibility', 'styling', 'variants'],
          businessLogic: ['stateManagement', 'eventHandling']
        },
        form: {
          requiredFeatures: ['propsTypes', 'validation', 'errorHandling', 'accessibility'],
          businessLogic: ['formState', 'validation', 'submission']
        },
        data: {
          requiredFeatures: ['propsTypes', 'loading', 'errorHandling', 'virtualization'],
          businessLogic: ['dataFetching', 'filtering', 'sorting', 'pagination']
        },
        layout: {
          requiredFeatures: ['propsTypes', 'responsive', 'accessibility', 'theming'],
          businessLogic: ['layoutManagement', 'breakpoints']
        },
        interactive: {
          requiredFeatures: ['propsTypes', 'eventHandling', 'accessibility', 'animation'],
          businessLogic: ['userInteraction', 'stateTransitions']
        }
      },

      // 通用功能模板
      commonFeatures: {
        propsTypes: {
          basic: 'interface Props with className, children, style',
          advanced: 'interface Props with full type definitions, generics, and documentation'
        },
        accessibility: {
          basic: 'aria-label, role, tabIndex',
          advanced: 'full ARIA support, keyboard navigation, screen reader compatibility'
        },
        styling: {
          basic: 'className support, basic CSS',
          advanced: 'theme support, variants, responsive design'
        },
        stateManagement: {
          basic: 'useState for local state',
          advanced: 'useReducer, context, persistent state'
        }
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

      // 2. 为每个组件添加功能增强
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
        // 排除页面级组件
        if (!this.isPageLevelComponent(componentFile)) {
          const analysis = await this.analyzeComponentImplementation(componentFile);
          if (analysis.needsEnhancement) {
            components.push(analysis);
          }
        }
      }
    }

    console.log(`   发现 ${components.length} 个组件需要功能增强\n`);
    return components;
  }

  /**
   * 分析组件实现
   */
  async analyzeComponentImplementation(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, path.extname(filePath));

    // 确定组件类型
    const componentType = this.determineComponentType(fileName, filePath, content);

    // 检查现有功能
    const currentFeatures = this.analyzeCurrentFeatures(content);

    // 确定需要的功能
    const requiredFeatures = this.enhancementConfig.componentTypes[componentType]?.requiredFeatures || [];
    const missingFeatures = requiredFeatures.filter(feature => !currentFeatures.includes(feature));

    // 检查代码质量
    const qualityMetrics = this.analyzeCodeQuality(content);
    const complexity = this.calculateComponentComplexity(content);

    const needsEnhancement = missingFeatures.length > 0 || qualityMetrics.score < 70 || complexity < 20;

    return {
      filePath,
      fileName,
      componentType,
      currentFeatures,
      missingFeatures,
      qualityMetrics,
      complexity,
      needsEnhancement,
      content
    };
  }

  /**
   * 确定组件类型
   */
  determineComponentType(fileName, filePath, content) {
    const lowerFileName = fileName.toLowerCase();
    const lowerPath = filePath.toLowerCase();

    // 表单组件
    if (lowerFileName.includes('form') || lowerFileName.includes('input') ||
      lowerFileName.includes('field') || lowerFileName.includes('select') ||
      content.includes('onSubmit') || content.includes('validation')) {
      return 'form';
    }

    // 数据组件
    if (lowerFileName.includes('table') || lowerFileName.includes('list') ||
      lowerFileName.includes('grid') || lowerFileName.includes('data') ||
      content.includes('virtualization') || content.includes('pagination')) {
      return 'data';
    }

    // 布局组件
    if (lowerFileName.includes('layout') || lowerFileName.includes('container') ||
      lowerFileName.includes('wrapper') || lowerFileName.includes('grid') ||
      lowerPath.includes('layout')) {
      return 'layout';
    }

    // 交互组件
    if (lowerFileName.includes('modal') || lowerFileName.includes('dialog') ||
      lowerFileName.includes('dropdown') || lowerFileName.includes('menu') ||
      lowerFileName.includes('tooltip') || lowerFileName.includes('popover')) {
      return 'interactive';
    }

    // 默认为UI组件
    return 'ui';
  }

  /**
   * 分析当前功能
   */
  analyzeCurrentFeatures(content) {
    const features = [];

    // 检查Props类型定义
    if (/interface.*Props|type.*Props/.test(content)) {
      features.push('propsTypes');
    }

    // 检查可访问性
    if (/aria-|role=|tabIndex/.test(content)) {
      features.push('accessibility');
    }

    // 检查样式支持
    if (/className|styled|css|theme/.test(content)) {
      features.push('styling');
    }

    // 检查状态管理
    if (/useState|useReducer|useContext/.test(content)) {
      features.push('stateManagement');
    }

    // 检查事件处理
    if (/onClick|onChange|onSubmit|onFocus|onBlur/.test(content)) {
      features.push('eventHandling');
    }

    // 检查表单验证
    if (/validation|validate|error|yup|joi/.test(content)) {
      features.push('validation');
    }

    // 检查错误处理
    if (/try.*catch|error|Error/.test(content)) {
      features.push('errorHandling');
    }

    // 检查加载状态
    if (/loading|Loading|spinner|skeleton/.test(content)) {
      features.push('loading');
    }

    // 检查变体支持
    if (/variant|size|color|type.*=/.test(content)) {
      features.push('variants');
    }

    // 检查响应式设计
    if (/responsive|breakpoint|mobile|tablet|desktop/.test(content)) {
      features.push('responsive');
    }

    return features;
  }

  /**
   * 分析代码质量
   */
  analyzeCodeQuality(content) {
    let score = 0;
    const metrics = {};

    // TypeScript使用 (20分)
    if (/interface|type\s+\w+\s*=|:\s*\w+/.test(content)) {
      score += 20;
      metrics.typescript = true;
    }

    // Props类型定义 (15分)
    if (/interface.*Props|type.*Props/.test(content)) {
      score += 15;
      metrics.propsTypes = true;
    }

    // 可访问性 (15分)
    if (/aria-|role=|tabIndex/.test(content)) {
      score += 15;
      metrics.accessibility = true;
    }

    // 错误处理 (10分)
    if (/try.*catch|error|Error/.test(content)) {
      score += 10;
      metrics.errorHandling = true;
    }

    // 性能优化 (15分)
    if (/useCallback|useMemo|React\.memo/.test(content)) {
      score += 15;
      metrics.performance = true;
    }

    // 测试友好 (10分)
    if (/data-testid|test|spec/.test(content)) {
      score += 10;
      metrics.testable = true;
    }

    // 文档注释 (10分)
    if (/\/\*\*[\s\S]*?\*\//.test(content)) {
      score += 10;
      metrics.documented = true;
    }

    // 代码风格 (5分)
    if (this.checkCodeStyle(content)) {
      score += 5;
      metrics.codeStyle = true;
    }

    return { score, metrics };
  }

  /**
   * 检查代码风格
   */
  checkCodeStyle(content) {
    // 检查一致的缩进
    const lines = content.split('\n');
    const indentedLines = lines.filter(line => line.match(/^\s+/));
    if (indentedLines.length === 0) return true;

    // 检查是否使用一致的缩进（空格或制表符）
    const usesSpaces = indentedLines.some(line => line.startsWith('  '));
    const usesTabs = indentedLines.some(line => line.startsWith('\t'));

    return !(usesSpaces && usesTabs);
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

    // Props数量
    const props = (content.match(/\w+\s*:\s*[^,}]+/g) || []).length;
    complexity += props * 2;

    // 条件渲染数量
    const conditionals = (content.match(/\{.*\?.*:.*\}/g) || []).length;
    complexity += conditionals * 4;

    // 事件处理器数量
    const eventHandlers = (content.match(/on[A-Z][a-zA-Z]*=/g) || []).length;
    complexity += eventHandlers * 3;

    return complexity;
  }

  /**
   * 增强组件
   */
  async enhanceComponent(componentInfo) {
    console.log(`🧩 增强组件: ${componentInfo.fileName} (类型: ${componentInfo.componentType})`);

    let newContent = componentInfo.content;
    let modified = false;

    // 根据缺失功能添加相应代码
    for (const missingFeature of componentInfo.missingFeatures) {
      switch (missingFeature) {
        case 'propsTypes':
          newContent = this.addPropsTypes(newContent, componentInfo.fileName);
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

        case 'stateManagement':
          newContent = this.addStateManagement(newContent);
          modified = true;
          break;

        case 'eventHandling':
          newContent = this.addEventHandling(newContent);
          modified = true;
          break;

        case 'validation':
          newContent = this.addValidation(newContent);
          modified = true;
          break;

        case 'errorHandling':
          newContent = this.addErrorHandling(newContent);
          modified = true;
          break;

        case 'loading':
          newContent = this.addLoadingStates(newContent);
          modified = true;
          break;

        case 'variants':
          newContent = this.addVariants(newContent);
          modified = true;
          break;
      }
    }

    // 添加性能优化
    if (!componentInfo.currentFeatures.includes('performance')) {
      newContent = this.addPerformanceOptimizations(newContent);
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(componentInfo.filePath, newContent);
      this.enhancedComponents.push({
        file: path.relative(this.projectRoot, componentInfo.filePath),
        componentType: componentInfo.componentType,
        enhancements: componentInfo.missingFeatures,
        qualityScore: componentInfo.qualityMetrics.score,
        complexity: componentInfo.complexity
      });
      this.addFix('component_enhancement', componentInfo.filePath, `增强${componentInfo.componentType}组件功能`);
    }
  }

  /**
   * 工具方法
   */
  isPageLevelComponent(filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    const dirPath = path.dirname(filePath);

    // 检查文件路径是否包含页面相关目录
    const pageDirectories = ['pages', 'views', 'screens', 'routes'];
    const isInPageDirectory = pageDirectories.some(dir => dirPath.includes(dir));

    if (isInPageDirectory) {
      return true;
    }

    // 检查文件名模式
    const pagePatterns = [
      /Page$/,
      /View$/,
      /Screen$/,
      /Dashboard$/,
      /Home$/,
      /Login$/,
      /Register$/,
      /Profile$/,
      /Settings$/,
      /Test.*$/,
      /Report.*$/,
      /Management$/,
      /Admin$/
    ];

    return pagePatterns.some(pattern => pattern.test(fileName));
  }

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
   * 添加Props类型定义
   */
  addPropsTypes(content, componentName) {
    const propsInterface = `
interface ${componentName}Props {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onChange?: (value: any) => void;
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
  'data-testid'?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  role?: string;
  tabIndex?: number;
}`;

    // 在import语句后添加Props接口
    const importMatch = content.match(/import.*from.*['"];?\s*\n/g);
    if (importMatch) {
      const lastImportIndex = content.lastIndexOf(importMatch[importMatch.length - 1]);
      const insertIndex = lastImportIndex + importMatch[importMatch.length - 1].length;
      content = content.slice(0, insertIndex) + '\n' + propsInterface + '\n' + content.slice(insertIndex);
    } else {
      content = propsInterface + '\n\n' + content;
    }

    // 更新组件函数签名
    const componentFunctionMatch = content.match(/const\s+(\w+).*=.*\([^)]*\)\s*=>/);
    if (componentFunctionMatch) {
      const newSignature = `const ${componentFunctionMatch[1]}: React.FC<${componentName}Props> = (props) =>`;
      content = content.replace(componentFunctionMatch[0], newSignature);
    }

    return content;
  }

  /**
   * 添加可访问性支持
   */
  addAccessibility(content) {
    const accessibilityCode = `
  // 可访问性支持
  const {
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    role,
    tabIndex = 0,
    'data-testid': testId
  } = props;

  const accessibilityProps = {
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    role,
    tabIndex: disabled ? -1 : tabIndex,
    'data-testid': testId
  };

  // 键盘导航支持
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.(event as any);
    }
  }, [onClick]);`;

    return this.insertIntoComponent(content, accessibilityCode);
  }

  /**
   * 添加样式支持
   */
  addStyling(content) {
    const stylingCode = `
  // 样式和主题支持
  const {
    className = '',
    style,
    variant = 'primary',
    size = 'medium'
  } = props;

  const baseClasses = 'component-base';
  const variantClasses = \`component--\${variant}\`;
  const sizeClasses = \`component--\${size}\`;
  const stateClasses = [
    disabled && 'component--disabled',
    loading && 'component--loading'
  ].filter(Boolean).join(' ');

  const combinedClassName = [
    baseClasses,
    variantClasses,
    sizeClasses,
    stateClasses,
    className
  ].filter(Boolean).join(' ');`;

    return this.insertIntoComponent(content, stylingCode);
  }

  /**
   * 添加状态管理
   */
  addStateManagement(content) {
    const stateCode = `
  // 状态管理
  const [internalState, setInternalState] = useState({
    focused: false,
    hovered: false,
    pressed: false
  });

  const updateState = useCallback((updates: Partial<typeof internalState>) => {
    setInternalState(prev => ({ ...prev, ...updates }));
  }, []);

  // 焦点状态管理
  const handleFocus = useCallback((event: React.FocusEvent<HTMLElement>) => {
    updateState({ focused: true });
    onFocus?.(event);
  }, [onFocus, updateState]);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLElement>) => {
    updateState({ focused: false });
    onBlur?.(event);
  }, [onBlur, updateState]);`;

    return this.insertIntoComponent(content, stateCode);
  }

  /**
   * 添加事件处理
   */
  addEventHandling(content) {
    const eventCode = `
  // 事件处理
  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }

    updateState({ pressed: true });
    onClick?.(event);

    // 重置按压状态
    setTimeout(() => {
      updateState({ pressed: false });
    }, 150);
  }, [disabled, loading, onClick, updateState]);

  const handleMouseEnter = useCallback(() => {
    if (!disabled) {
      updateState({ hovered: true });
    }
  }, [disabled, updateState]);

  const handleMouseLeave = useCallback(() => {
    updateState({ hovered: false, pressed: false });
  }, [updateState]);`;

    return this.insertIntoComponent(content, eventCode);
  }

  /**
   * 添加验证支持
   */
  addValidation(content) {
    const validationCode = `
  // 验证支持
  const [validationError, setValidationError] = useState<string | null>(null);

  const validate = useCallback((value: any) => {
    // 基础验证逻辑
    if (props.required && (!value || value.toString().trim() === '')) {
      setValidationError('此字段为必填项');
      return false;
    }

    if (props.minLength && value.toString().length < props.minLength) {
      setValidationError(\`最少需要 \${props.minLength} 个字符\`);
      return false;
    }

    if (props.maxLength && value.toString().length > props.maxLength) {
      setValidationError(\`最多允许 \${props.maxLength} 个字符\`);
      return false;
    }

    if (props.pattern && !props.pattern.test(value.toString())) {
      setValidationError('格式不正确');
      return false;
    }

    setValidationError(null);
    return true;
  }, [props.required, props.minLength, props.maxLength, props.pattern]);

  const handleChange = useCallback((value: any) => {
    if (validate(value)) {
      onChange?.(value);
    }
  }, [validate, onChange]);`;

    return this.insertIntoComponent(content, validationCode);
  }

  /**
   * 添加错误处理
   */
  addErrorHandling(content) {
    const errorCode = `
  // 错误处理
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((err: Error | string) => {
    const errorMessage = typeof err === 'string' ? err : err.message;
    setError(errorMessage);

    // 可选：发送错误报告
    if (process.env.NODE_ENV === 'production') {
      console.error('Component error:', errorMessage);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 错误边界效果
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000); // 5秒后自动清除错误

      return () => clearTimeout(timer);
    }
  }, [error, clearError]);`;

    return this.insertIntoComponent(content, errorCode);
  }

  /**
   * 添加加载状态
   */
  addLoadingStates(content) {
    const loadingCode = `
  // 加载状态管理
  const [isLoading, setIsLoading] = useState(loading || false);

  useEffect(() => {
    setIsLoading(loading || false);
  }, [loading]);

  const withLoading = useCallback(async (asyncOperation: () => Promise<any>) => {
    try {
      setIsLoading(true);
      const result = await asyncOperation();
      return result;
    } catch (err) {
      handleError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);`;

    return this.insertIntoComponent(content, loadingCode);
  }

  /**
   * 添加变体支持
   */
  addVariants(content) {
    const variantsCode = `
  // 变体和主题支持
  const variantStyles = useMemo(() => {
    const styles = {
      primary: {
        backgroundColor: '#007bff',
        color: '#ffffff',
        border: '1px solid #007bff'
      },
      secondary: {
        backgroundColor: '#6c757d',
        color: '#ffffff',
        border: '1px solid #6c757d'
      },
      outline: {
        backgroundColor: 'transparent',
        color: '#007bff',
        border: '1px solid #007bff'
      }
    };

    return styles[variant] || styles.primary;
  }, [variant]);

  const sizeStyles = useMemo(() => {
    const styles = {
      small: {
        padding: '0.25rem 0.5rem',
        fontSize: '0.875rem'
      },
      medium: {
        padding: '0.5rem 1rem',
        fontSize: '1rem'
      },
      large: {
        padding: '0.75rem 1.5rem',
        fontSize: '1.125rem'
      }
    };

    return styles[size] || styles.medium;
  }, [size]);

  const computedStyle = useMemo(() => ({
    ...variantStyles,
    ...sizeStyles,
    ...style
  }), [variantStyles, sizeStyles, style]);`;

    return this.insertIntoComponent(content, variantsCode);
  }

  /**
   * 添加性能优化
   */
  addPerformanceOptimizations(content) {
    const performanceCode = `
  // 性能优化
  const memoizedProps = useMemo(() => ({
    className: combinedClassName,
    style: computedStyle,
    disabled,
    'aria-label': ariaLabel,
    'data-testid': testId
  }), [combinedClassName, computedStyle, disabled, ariaLabel, testId]);`;

    // 在组件末尾添加React.memo包装
    if (!content.includes('React.memo')) {
      content = content.replace(
        /export default (\w+);?$/,
        'export default React.memo($1);'
      );
    }

    return this.insertIntoComponent(content, performanceCode);
  }

  /**
   * 创建组件开发工具
   */
  async createComponentDevTools() {
    console.log('🛠️ 创建组件开发工具...');

    // 创建组件类型生成器
    await this.createComponentTypeGenerator();

    // 创建组件测试工具
    await this.createComponentTestGenerator();

    console.log('   ✅ 组件开发工具创建完成\n');
  }

  /**
   * 创建组件类型生成器
   */
  async createComponentTypeGenerator() {
    const typeGeneratorPath = path.join(this.projectRoot, 'frontend/utils/componentTypeGenerator.ts');

    // 确保目录存在
    const utilsDir = path.dirname(typeGeneratorPath);
    if (!fs.existsSync(utilsDir)) {
      fs.mkdirSync(utilsDir, { recursive: true });
    }

    if (!fs.existsSync(typeGeneratorPath)) {
      const typeGeneratorContent = `/**
 * 组件类型生成器
 * 自动生成组件的TypeScript类型定义
 */

export interface ComponentTypeOptions {
  name: string;
  type: 'ui' | 'form' | 'data' | 'layout' | 'interactive';
  hasChildren: boolean;
  hasVariants: boolean;
  hasEvents: boolean;
  customProps?: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
}

export class ComponentTypeGenerator {
  generateTypes(options: ComponentTypeOptions): string {
    const {
      name,
      type,
      hasChildren,
      hasVariants,
      hasEvents,
      customProps = []
    } = options;

    const baseProps = this.generateBaseProps(hasChildren);
    const variantProps = hasVariants ? this.generateVariantProps() : '';
    const eventProps = hasEvents ? this.generateEventProps(type) : '';
    const customPropsStr = this.generateCustomProps(customProps);

    return \`/**
 * \${name} 组件的 Props 类型定义
 */
export interface \${name}Props {
\${baseProps}
\${variantProps}
\${eventProps}
\${customPropsStr}
}

/**
 * \${name} 组件的默认 Props
 */
export const default\${name}Props: Partial<\${name}Props> = {
  disabled: false,
  loading: false,
\${hasVariants ? '  variant: \'primary\',\n  size: \'medium\',' : ''}
};

/**
 * \${name} 组件的 Ref 类型
 */
export type \${name}Ref = HTMLElement;\`;
  }

  private generateBaseProps(hasChildren: boolean): string {
    const props = [
      '  className?: string;',
      '  style?: React.CSSProperties;',
      '  disabled?: boolean;',
      '  loading?: boolean;',
      '  \'data-testid\'?: string;',
      '  \'aria-label\'?: string;',
      '  \'aria-describedby\'?: string;',
      '  role?: string;',
      '  tabIndex?: number;'
    ];

    if (hasChildren) {
      props.unshift('  children?: React.ReactNode;');
    }

    return props.join('\\n');
  }

  private generateVariantProps(): string {
    return \`  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';\`;
  }

  private generateEventProps(type: string): string {
    const commonEvents = [
      '  onClick?: (event: React.MouseEvent<HTMLElement>) => void;',
      '  onFocus?: (event: React.FocusEvent<HTMLElement>) => void;',
      '  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;'
    ];

    switch (type) {
      case 'form':
        return [...commonEvents,
          '  onChange?: (value: any) => void;',
          '  onSubmit?: (event: React.FormEvent) => void;',
          '  onValidate?: (value: any) => boolean | string;'
        ].join('\\n');

      case 'interactive':
        return [...commonEvents,
          '  onOpen?: () => void;',
          '  onClose?: () => void;',
          '  onToggle?: (isOpen: boolean) => void;'
        ].join('\\n');

      default:
        return commonEvents.join('\\n');
    }
  }

  private generateCustomProps(customProps: Array<any>): string {
    return customProps.map(prop => {
      const optional = prop.required ? '' : '?';
      const comment = prop.description ? \` // \${prop.description}\` : '';
      return \`  \${prop.name}\${optional}: \${prop.type};\${comment}\`;
    }).join('\\n');
  }
}

export const componentTypeGenerator = new ComponentTypeGenerator();
export default componentTypeGenerator;`;

      fs.writeFileSync(typeGeneratorPath, typeGeneratorContent);
      this.addFix('component_tools', typeGeneratorPath, '创建组件类型生成器');
    }
  }

  /**
   * 创建组件测试生成器
   */
  async createComponentTestGenerator() {
    const testGeneratorPath = path.join(this.projectRoot, 'frontend/utils/componentTestGenerator.ts');

    if (!fs.existsSync(testGeneratorPath)) {
      const testGeneratorContent = `/**
 * 组件测试生成器
 * 自动生成组件的单元测试
 */

export interface ComponentTestOptions {
  name: string;
  type: 'ui' | 'form' | 'data' | 'layout' | 'interactive';
  hasProps: boolean;
  hasEvents: boolean;
  hasState: boolean;
  hasAsyncOperations: boolean;
}

export class ComponentTestGenerator {
  generateTest(options: ComponentTestOptions): string {
    const {
      name,
      type,
      hasProps,
      hasEvents,
      hasState,
      hasAsyncOperations
    } = options;

    const imports = this.generateImports(hasAsyncOperations);
    const basicTests = this.generateBasicTests(name);
    const propTests = hasProps ? this.generatePropTests(name) : '';
    const eventTests = hasEvents ? this.generateEventTests(name) : '';
    const stateTests = hasState ? this.generateStateTests(name) : '';
    const asyncTests = hasAsyncOperations ? this.generateAsyncTests(name) : '';

    return \`\${imports}

describe('\${name}', () => {
\${basicTests}

\${propTests}

\${eventTests}

\${stateTests}

\${asyncTests}
});\`;
  }

  private generateImports(hasAsyncOperations: boolean): string {
    const imports = [
      "import React from 'react';",
      "import { render, screen, fireEvent } from '@testing-library/react';",
      "import '@testing-library/jest-dom';"
    ];

    if (hasAsyncOperations) {
      imports.push("import { waitFor } from '@testing-library/react';");
    }

    return imports.join('\\n');
  }

  private generateBasicTests(name: string): string {
    return \`  it('renders without crashing', () => {
    render(<\${name} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-class';
    render(<\${name} className={customClass} />);
    expect(screen.getByRole('button')).toHaveClass(customClass);
  });

  it('handles disabled state', () => {
    render(<\${name} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });\`;
  }

  private generatePropTests(name: string): string {
    return \`  describe('Props', () => {
    it('renders with different variants', () => {
      const { rerender } = render(<\${name} variant="primary" />);
      expect(screen.getByRole('button')).toHaveClass('component--primary');

      rerender(<\${name} variant="secondary" />);
      expect(screen.getByRole('button')).toHaveClass('component--secondary');
    });

    it('renders with different sizes', () => {
      const { rerender } = render(<\${name} size="small" />);
      expect(screen.getByRole('button')).toHaveClass('component--small');

      rerender(<\${name} size="large" />);
      expect(screen.getByRole('button')).toHaveClass('component--large');
    });
  });\`;
  }

  private generateEventTests(name: string): string {
    return \`  describe('Events', () => {
    it('handles click events', () => {
      const handleClick = jest.fn();
      render(<\${name} onClick={handleClick} />);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard events', () => {
      const handleClick = jest.fn();
      render(<\${name} onClick={handleClick} />);

      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not trigger events when disabled', () => {
      const handleClick = jest.fn();
      render(<\${name} onClick={handleClick} disabled />);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });\`;
  }

  private generateStateTests(name: string): string {
    return \`  describe('State Management', () => {
    it('manages focus state', () => {
      render(<\${name} />);
      const button = screen.getByRole('button');

      fireEvent.focus(button);
      expect(button).toHaveFocus();

      fireEvent.blur(button);
      expect(button).not.toHaveFocus();
    });

    it('manages hover state', () => {
      render(<\${name} />);
      const button = screen.getByRole('button');

      fireEvent.mouseEnter(button);
      // Test hover state changes

      fireEvent.mouseLeave(button);
      // Test hover state reset
    });
  });\`;
  }

  private generateAsyncTests(name: string): string {
    return \`  describe('Async Operations', () => {
    it('handles loading state', async () => {
      const asyncOperation = jest.fn().mockResolvedValue('success');
      render(<\${name} onClick={asyncOperation} />);

      fireEvent.click(screen.getByRole('button'));

      // Should show loading state
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');

      await waitFor(() => {
        expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
      });
    });

    it('handles async errors', async () => {
      const asyncOperation = jest.fn().mockRejectedValue(new Error('Test error'));
      render(<\${name} onClick={asyncOperation} />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });
    });
  });\`;
  }
}

export const componentTestGenerator = new ComponentTestGenerator();
export default componentTestGenerator;`;

      fs.writeFileSync(testGeneratorPath, testGeneratorContent);
      this.addFix('component_tools', testGeneratorPath, '创建组件测试生成器');
    }
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
        componentTypes: {
          ui: this.enhancedComponents.filter(c => c.componentType === 'ui').length,
          form: this.enhancedComponents.filter(c => c.componentType === 'form').length,
          data: this.enhancedComponents.filter(c => c.componentType === 'data').length,
          layout: this.enhancedComponents.filter(c => c.componentType === 'layout').length,
          interactive: this.enhancedComponents.filter(c => c.componentType === 'interactive').length
        },
        averageQualityScore: this.enhancedComponents.reduce((sum, c) => sum + c.qualityScore, 0) / this.enhancedComponents.length || 0,
        averageComplexity: this.enhancedComponents.reduce((sum, c) => sum + c.complexity, 0) / this.enhancedComponents.length || 0
      },
      enhancedComponents: this.enhancedComponents,
      fixes: this.fixes,
      nextSteps: [
        '测试增强的组件功能',
        '验证可访问性改进',
        '检查性能优化效果',
        '添加组件单元测试',
        '更新组件文档'
      ]
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 组件功能增强报告:');
    console.log(`   增强组件: ${report.summary.totalEnhancements}`);
    console.log(`   总修复数: ${report.summary.totalFixes}`);
    console.log(`   平均质量评分: ${report.summary.averageQualityScore.toFixed(1)}`);
    console.log(`   平均复杂度: ${report.summary.averageComplexity.toFixed(1)}`);
    console.log(`   组件类型分布:`);
    console.log(`   - UI: ${report.summary.componentTypes.ui}`);
    console.log(`   - Form: ${report.summary.componentTypes.form}`);
    console.log(`   - Data: ${report.summary.componentTypes.data}`);
    console.log(`   - Layout: ${report.summary.componentTypes.layout}`);
    console.log(`   - Interactive: ${report.summary.componentTypes.interactive}`);
    console.log(`   报告已保存: ${reportPath}\n`);

    console.log('🎯 下一步操作:');
    report.nextSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`);
    });
  }

  addFix(category, filePath, description) {
    this.fixes.push({
      category,
      file: path.relative(this.projectRoot, filePath),
      description,
      timestamp: new Date().toISOString()
    });
  }
}

// 执行脚本
if (require.main === module) {
  const enhancer = new ComponentFunctionalityEnhancer();
  enhancer.execute().catch(error => {
    console.error('❌ 组件功能增强失败:', error);
    process.exit(1);
  });
}

module.exports = ComponentFunctionalityEnhancer;
