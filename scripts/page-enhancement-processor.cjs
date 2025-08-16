#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class PageEnhancementProcessor {
  constructor() {
    this.projectRoot = process.cwd();
    this.enhancedPages = [];
    this.fixes = [];

    // 页面增强模板
    this.enhancementTemplates = {
      loadingStates: {
        spinner: `
  if (state.isLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }`,
        skeleton: `
  if (state.isLoading || loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }`,
        table: `
  if (state.isLoading || loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex space-x-4 p-4 border rounded">
            <div className="rounded-full bg-gray-200 h-10 w-10"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }`
      },

      errorHandling: {
        standard: `
  if (state.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">操作失败</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{state.error.message}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-100 px-2 py-1 text-sm text-red-800 rounded hover:bg-red-200"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }`,
        inline: `
  {state.error && (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      <strong className="font-bold">错误: </strong>
      <span className="block sm:inline">{state.error.message}</span>
    </div>
  )}`,
        toast: `
  useEffect(() => {
    if (state.error) {
      // 显示错误提示
      console.error('操作失败:', state.error.message);
      // 这里可以集成toast通知系统
    }
  }, [state.error]);`
      },

      formValidation: {
        basic: `
  const [formErrors, setFormErrors] = useState({});
  
  const validateForm = (data) => {
    const errors = {};
    
    // 基础验证规则
    if (!data.name || data.name.trim() === '') {
      errors.name = '名称不能为空';
    }
    
    if (!data.email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.email)) {
      errors.email = '请输入有效的邮箱地址';
    }
    
    return errors;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm(formData);
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    // 提交表单
    await submitForm(formData);
  };`,
        advanced: `
  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  const validationRules = {
    required: (value) => value && value.trim() !== '',
    email: (value) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value),
    minLength: (min) => (value) => value && value.length >= min,
    maxLength: (max) => (value) => value && value.length <= max,
    number: (value) => !isNaN(value) && value !== '',
    url: (value) => /^https?:\\/\\/.+/.test(value)
  };
  
  const validateField = (name, value, rules) => {
    for (const rule of rules) {
      if (typeof rule === 'function' && !rule(value)) {
        return rule.message || \`\${name} 验证失败\`;
      }
      if (typeof rule === 'object' && !validationRules[rule.type](rule.param)(value)) {
        return rule.message || \`\${name} 验证失败\`;
      }
    }
    return null;
  };`
      },

      userInteraction: {
        confirmDialog: `
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  
  const handleConfirmAction = (action, message) => {
    setConfirmAction({ action, message });
    setShowConfirmDialog(true);
  };
  
  const executeConfirmedAction = async () => {
    if (confirmAction) {
      await confirmAction.action();
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };`,
        buttonStates: `
  const [buttonStates, setButtonStates] = useState({});
  
  const setButtonLoading = (buttonId, loading) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonId]: { ...prev[buttonId], loading }
    }));
  };
  
  const setButtonDisabled = (buttonId, disabled) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonId]: { ...prev[buttonId], disabled }
    }));
  };`,
        feedback: `
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  
  const showFeedback = (type, message, duration = 3000) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, duration);
  };
  
  useEffect(() => {
    if (state.error) {
      showFeedback('error', state.error.message);
    }
  }, [state.error]);`
      }
    };
  }

  /**
   * 执行页面功能增强
   */
  async execute() {
    console.log('🎨 开始页面功能增强...\n');

    try {
      // 1. 扫描需要增强的页面
      const pages = await this.scanPagesForEnhancement();

      // 2. 为每个页面添加增强功能
      for (const page of pages) {
        await this.enhancePage(page);
      }

      // 3. 创建通用UI组件
      await this.createCommonUIComponents();

      // 4. 生成增强报告
      this.generateEnhancementReport();

    } catch (error) {
      console.error('❌ 页面功能增强过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 扫描需要增强的页面
   */
  async scanPagesForEnhancement() {
    console.log('📄 扫描需要功能增强的页面...');

    const pagesDir = path.join(this.projectRoot, 'frontend/pages');
    const pages = [];

    if (fs.existsSync(pagesDir)) {
      const pageFiles = this.getFilesRecursively(pagesDir, ['.tsx', '.jsx']);

      for (const pageFile of pageFiles) {
        const analysis = await this.analyzePage(pageFile);
        if (analysis.needsEnhancement) {
          pages.push(analysis);
        }
      }
    }

    console.log(`   发现 ${pages.length} 个页面需要功能增强\n`);
    return pages;
  }

  /**
   * 分析页面是否需要增强
   */
  async analyzePage(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, path.extname(filePath));

    // 检查现有功能
    const hasLoadingState = content.includes('loading') || content.includes('Loading') || content.includes('isLoading');
    const hasErrorHandling = content.includes('error') && content.includes('Error');
    const hasFormValidation = content.includes('validation') || content.includes('validate');
    const hasUserFeedback = content.includes('toast') || content.includes('feedback') || content.includes('alert');

    // 确定页面类型和需要的增强
    const pageType = this.determinePageType(fileName, content);
    const enhancements = this.determineNeededEnhancements(pageType, {
      hasLoadingState,
      hasErrorHandling,
      hasFormValidation,
      hasUserFeedback
    });

    const needsEnhancement = enhancements.length > 0;

    return {
      filePath,
      fileName,
      pageType,
      hasLoadingState,
      hasErrorHandling,
      hasFormValidation,
      hasUserFeedback,
      enhancements,
      needsEnhancement,
      content
    };
  }

  /**
   * 确定页面类型
   */
  determinePageType(fileName, content) {
    if (/login|register|auth/i.test(fileName)) return 'form';
    if (/test|stress|performance/i.test(fileName)) return 'interactive';
    if (/data|table|list|management/i.test(fileName)) return 'datatable';
    if (/result|report|detail|analytics/i.test(fileName)) return 'display';
    if (/config|setting|profile/i.test(fileName)) return 'form';
    if (/dashboard|home/i.test(fileName)) return 'dashboard';

    // 根据内容判断
    if (content.includes('form') || content.includes('input')) return 'form';
    if (content.includes('table') || content.includes('list')) return 'datatable';

    return 'display';
  }

  /**
   * 确定需要的增强功能
   */
  determineNeededEnhancements(pageType, currentFeatures) {
    const enhancements = [];

    // 所有页面都需要的基础增强
    if (!currentFeatures.hasLoadingState) {
      enhancements.push('loadingState');
    }
    if (!currentFeatures.hasErrorHandling) {
      enhancements.push('errorHandling');
    }

    // 根据页面类型添加特定增强
    switch (pageType) {
      case 'form':
        if (!currentFeatures.hasFormValidation) {
          enhancements.push('formValidation');
        }
        enhancements.push('userFeedback');
        break;

      case 'interactive':
        enhancements.push('buttonStates');
        enhancements.push('confirmDialog');
        enhancements.push('userFeedback');
        break;

      case 'datatable':
        enhancements.push('tableLoading');
        enhancements.push('confirmDialog');
        break;

      case 'dashboard':
        enhancements.push('skeletonLoading');
        enhancements.push('userFeedback');
        break;

      default:
        enhancements.push('userFeedback');
    }

    return enhancements;
  }

  /**
   * 增强页面功能
   */
  async enhancePage(pageInfo) {
    console.log(`🎨 增强页面: ${pageInfo.fileName} (${pageInfo.enhancements.join(', ')})`);

    let newContent = pageInfo.content;
    let modified = false;

    // 添加必要的导入
    newContent = this.addRequiredImports(newContent, pageInfo.enhancements);

    // 根据需要的增强功能添加相应代码
    for (const enhancement of pageInfo.enhancements) {
      switch (enhancement) {
        case 'loadingState':
          newContent = this.addLoadingState(newContent, pageInfo.pageType);
          modified = true;
          break;

        case 'errorHandling':
          newContent = this.addErrorHandling(newContent);
          modified = true;
          break;

        case 'formValidation':
          newContent = this.addFormValidation(newContent);
          modified = true;
          break;

        case 'userFeedback':
          newContent = this.addUserFeedback(newContent);
          modified = true;
          break;

        case 'buttonStates':
          newContent = this.addButtonStates(newContent);
          modified = true;
          break;

        case 'confirmDialog':
          newContent = this.addConfirmDialog(newContent);
          modified = true;
          break;

        case 'tableLoading':
          newContent = this.addTableLoading(newContent);
          modified = true;
          break;

        case 'skeletonLoading':
          newContent = this.addSkeletonLoading(newContent);
          modified = true;
          break;
      }
    }

    if (modified) {
      fs.writeFileSync(pageInfo.filePath, newContent);
      this.enhancedPages.push({
        file: path.relative(this.projectRoot, pageInfo.filePath),
        pageType: pageInfo.pageType,
        enhancements: pageInfo.enhancements
      });
      this.addFix('page_enhancement', pageInfo.filePath, `添加${pageInfo.enhancements.join('、')}功能`);
    }
  }

  /**
   * 添加必要的导入
   */
  addRequiredImports(content, enhancements) {
    const imports = [];

    if (enhancements.includes('formValidation') || enhancements.includes('userFeedback')) {
      if (!content.includes('useState')) {
        imports.push('useState');
      }
      if (!content.includes('useEffect')) {
        imports.push('useEffect');
      }
    }

    if (imports.length > 0) {
      // 查找现有的React导入
      const reactImportMatch = content.match(/import React.*from 'react';/);
      if (reactImportMatch) {
        const existingImport = reactImportMatch[0];
        const newImport = existingImport.replace(
          /import React(.*?)from 'react';/,
          `import React, { ${imports.join(', ')} } from 'react';`
        );
        content = content.replace(existingImport, newImport);
      } else {
        content = `import React, { ${imports.join(', ')} } from 'react';\n` + content;
      }
    }

    return content;
  }

  /**
   * 添加加载状态
   */
  addLoadingState(content, pageType) {
    let template;

    switch (pageType) {
      case 'datatable':
        template = this.enhancementTemplates.loadingStates.table;
        break;
      case 'dashboard':
        template = this.enhancementTemplates.loadingStates.skeleton;
        break;
      default:
        template = this.enhancementTemplates.loadingStates.spinner;
    }

    return this.insertBeforeReturn(content, template);
  }

  /**
   * 添加错误处理
   */
  addErrorHandling(content) {
    const template = this.enhancementTemplates.errorHandling.standard;
    return this.insertBeforeReturn(content, template);
  }

  /**
   * 添加表单验证
   */
  addFormValidation(content) {
    const template = this.enhancementTemplates.formValidation.basic;
    return this.insertIntoComponent(content, template);
  }

  /**
   * 添加用户反馈
   */
  addUserFeedback(content) {
    const template = this.enhancementTemplates.userInteraction.feedback;
    return this.insertIntoComponent(content, template);
  }

  /**
   * 添加按钮状态
   */
  addButtonStates(content) {
    const template = this.enhancementTemplates.userInteraction.buttonStates;
    return this.insertIntoComponent(content, template);
  }

  /**
   * 添加确认对话框
   */
  addConfirmDialog(content) {
    const template = this.enhancementTemplates.userInteraction.confirmDialog;
    return this.insertIntoComponent(content, template);
  }

  /**
   * 添加表格加载
   */
  addTableLoading(content) {
    const template = this.enhancementTemplates.loadingStates.table;
    return this.insertBeforeReturn(content, template);
  }

  /**
   * 添加骨架屏加载
   */
  addSkeletonLoading(content) {
    const template = this.enhancementTemplates.loadingStates.skeleton;
    return this.insertBeforeReturn(content, template);
  }

  /**
   * 工具方法 - 在return语句前插入代码
   */
  insertBeforeReturn(content, code) {
    const returnMatch = content.match(/return\s*\(/);
    if (returnMatch) {
      const insertIndex = content.indexOf(returnMatch[0]);
      content = content.slice(0, insertIndex) + code + '\n\n  ' + content.slice(insertIndex);
    }
    return content;
  }

  /**
   * 工具方法 - 在组件内部插入代码
   */
  insertIntoComponent(content, code) {
    // 在组件函数内部的开始位置添加代码
    const componentMatch = content.match(/const\s+\w+.*=.*\(\)\s*=>\s*{/);
    if (componentMatch) {
      const insertIndex = content.indexOf(componentMatch[0]) + componentMatch[0].length;
      content = content.slice(0, insertIndex) + '\n  ' + code + content.slice(insertIndex);
    }
    return content;
  }

  /**
   * 创建通用UI组件
   */
  async createCommonUIComponents() {
    console.log('🧩 创建通用UI组件...');

    // 创建加载组件
    await this.createLoadingComponent();

    // 创建错误组件
    await this.createErrorComponent();

    // 创建确认对话框组件
    await this.createConfirmDialogComponent();

    console.log('   ✅ 通用UI组件创建完成\n');
  }

  /**
   * 创建加载组件
   */
  async createLoadingComponent() {
    const loadingComponentPath = path.join(this.projectRoot, 'frontend/components/ui/Loading.tsx');

    if (!fs.existsSync(loadingComponentPath)) {
      const loadingComponentContent = `/**
 * 通用加载组件
 * 提供多种加载状态显示
 */

import React from 'react';

export interface LoadingProps {
  type?: 'spinner' | 'skeleton' | 'table';
  size?: 'small' | 'medium' | 'large';
  message?: string;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  type = 'spinner',
  size = 'medium',
  message = '加载中...',
  className = ''
}) => {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  if (type === 'spinner') {
    return (
      <div className={\`flex justify-center items-center h-64 \${className}\`}>
        <div className={\`animate-spin rounded-full border-b-2 border-blue-500 \${sizeClasses[size]}\`}></div>
        <span className="ml-3 text-gray-600">{message}</span>
      </div>
    );
  }

  if (type === 'skeleton') {
    return (
      <div className={\`space-y-4 p-6 \${className}\`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={\`space-y-4 \${className}\`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex space-x-4 p-4 border rounded">
            <div className="rounded-full bg-gray-200 h-10 w-10"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export default Loading;`;

      fs.writeFileSync(loadingComponentPath, loadingComponentContent);
      this.addFix('ui_component', loadingComponentPath, '创建通用加载组件');
    }
  }

  /**
   * 创建错误组件
   */
  async createErrorComponent() {
    const errorComponentPath = path.join(this.projectRoot, 'frontend/components/ui/ErrorDisplay.tsx');

    if (!fs.existsSync(errorComponentPath)) {
      const errorComponentContent = `/**
 * 通用错误显示组件
 * 提供统一的错误信息展示
 */

import React from 'react';

export interface ErrorDisplayProps {
  error: Error | string;
  onRetry?: () => void;
  className?: string;
  type?: 'standard' | 'inline' | 'minimal';
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  className = '',
  type = 'standard'
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;

  if (type === 'inline') {
    return (
      <div className={\`bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 \${className}\`}>
        <strong className="font-bold">错误: </strong>
        <span className="block sm:inline">{errorMessage}</span>
      </div>
    );
  }

  if (type === 'minimal') {
    return (
      <div className={\`text-red-600 text-sm \${className}\`}>
        {errorMessage}
      </div>
    );
  }

  return (
    <div className={\`bg-red-50 border border-red-200 rounded-md p-4 \${className}\`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">操作失败</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{errorMessage}</p>
          </div>
          {onRetry && (
            <div className="mt-4">
              <button
                onClick={onRetry}
                className="bg-red-100 px-2 py-1 text-sm text-red-800 rounded hover:bg-red-200"
              >
                重试
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;`;

      fs.writeFileSync(errorComponentPath, errorComponentContent);
      this.addFix('ui_component', errorComponentPath, '创建通用错误显示组件');
    }
  }

  /**
   * 创建确认对话框组件
   */
  async createConfirmDialogComponent() {
    const confirmDialogPath = path.join(this.projectRoot, 'frontend/components/ui/ConfirmDialog.tsx');

    if (!fs.existsSync(confirmDialogPath)) {
      const confirmDialogContent = `/**
 * 通用确认对话框组件
 * 提供统一的确认操作界面
 */

import React from 'react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  type = 'info'
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      icon: 'text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    info: {
      icon: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  };

  const currentStyle = typeStyles[type];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <div className={\`mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100\`}>
            <svg className={\`h-6 w-6 \${currentStyle.icon}\`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">{title}</h3>
          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-gray-500">{message}</p>
          </div>
          <div className="items-center px-4 py-3">
            <button
              onClick={onConfirm}
              className={\`px-4 py-2 \${currentStyle.button} text-base font-medium rounded-md w-full shadow-sm mr-2 mb-2\`}
            >
              {confirmText}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;`;

      fs.writeFileSync(confirmDialogPath, confirmDialogContent);
      this.addFix('ui_component', confirmDialogPath, '创建通用确认对话框组件');
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
    const reportPath = path.join(this.projectRoot, 'page-enhancement-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalEnhancements: this.enhancedPages.length,
        totalFixes: this.fixes.length,
        enhancementTypes: {
          loadingState: this.enhancedPages.filter(p => p.enhancements.includes('loadingState')).length,
          errorHandling: this.enhancedPages.filter(p => p.enhancements.includes('errorHandling')).length,
          formValidation: this.enhancedPages.filter(p => p.enhancements.includes('formValidation')).length,
          userFeedback: this.enhancedPages.filter(p => p.enhancements.includes('userFeedback')).length,
          buttonStates: this.enhancedPages.filter(p => p.enhancements.includes('buttonStates')).length,
          confirmDialog: this.enhancedPages.filter(p => p.enhancements.includes('confirmDialog')).length
        }
      },
      enhancedPages: this.enhancedPages,
      fixes: this.fixes,
      nextSteps: [
        '测试页面增强功能',
        '验证用户体验改善',
        '检查响应式设计',
        '添加无障碍功能',
        '优化性能和交互'
      ]
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 页面功能增强报告:');
    console.log(`   增强页面: ${report.summary.totalEnhancements}`);
    console.log(`   总修复数: ${report.summary.totalFixes}`);
    console.log(`   增强类型分布:`);
    console.log(`   - 加载状态: ${report.summary.enhancementTypes.loadingState}`);
    console.log(`   - 错误处理: ${report.summary.enhancementTypes.errorHandling}`);
    console.log(`   - 表单验证: ${report.summary.enhancementTypes.formValidation}`);
    console.log(`   - 用户反馈: ${report.summary.enhancementTypes.userFeedback}`);
    console.log(`   - 按钮状态: ${report.summary.enhancementTypes.buttonStates}`);
    console.log(`   - 确认对话框: ${report.summary.enhancementTypes.confirmDialog}`);
    console.log(`   报告已保存: ${reportPath}\n`);

    console.log('🎯 下一步操作:');
    report.nextSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`);
    });
  }
}

// 执行脚本
if (require.main === module) {
  const processor = new PageEnhancementProcessor();
  processor.execute().catch(error => {
    console.error('❌ 页面功能增强失败:', error);
    process.exit(1);
  });
}

module.exports = PageEnhancementProcessor;
