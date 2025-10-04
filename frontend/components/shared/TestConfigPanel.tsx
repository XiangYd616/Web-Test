/**
 * 共享测试配置面板组件
 * 为各个独立测试页面提供通用的配置界面基础设施
 * 支持自定义字段和验证规则
 */

import React, { ReactNode } from 'react';
import { Settings, AlertCircle } from 'lucide-react';

export interface ConfigField {
  key: string;
  type: 'text' | 'url' | 'number' | 'select' | 'checkbox' | 'textarea';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string | number; label: string }>;
  min?: number;
  max?: number;
  description?: string;
  validation?: (value: any) => string | null;
}

export interface ConfigSection {
  title: string;
  description?: string;
  fields: ConfigField[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface TestConfigPanelProps {
  title?: string;
  config: Record<string, any>;
  sections: ConfigSection[];
  onChange: (key: string, value: any) => void;
  disabled?: boolean;
  errors?: string[];
  children?: ReactNode;
  className?: string;
}

/**
 * 共享测试配置面板
 * 提供统一的配置界面，支持各种字段类型和验证
 */
export const TestConfigPanel: React.FC<TestConfigPanelProps> = ({
  title = '测试配置',
  config,
  sections,
  onChange,
  disabled = false,
  errors = [],
  children,
  className = ''
}) => {
  // 渲染字段
  const renderField = (field: ConfigField) => {
    const value = config[field.key];
    const fieldId = `field-${field.key}`;
    const hasError = errors?.some(error => error.includes(field.label));

    const baseInputClasses = `w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 ${
      hasError ? 'border-red-500' : 'border-gray-600 dark:border-gray-700'
    }`;

    return (
      <div key={field.key} className="space-y-2">
        <label htmlFor={fieldId} className="block text-sm font-medium themed-text-primary">
          {field.label}
          {field.required && <span className="text-red-400 ml-1">*</span>}
        </label>
        
        {renderFieldInput(field, value, fieldId, baseInputClasses)}
        
        {field.description && (
          <p className="text-xs text-gray-400">{field.description}</p>
        )}
        
        {/* 字段特定验证错误 */}
        {field.validation && value && (
          (() => {
            const validationError = field.validation(value);
            return validationError ? (
              <p className="text-xs text-red-400 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {validationError}
              </p>
            ) : null;
          })()
        )}
      </div>
    );
  };

  // 渲染字段输入控件
  const renderFieldInput = (field: ConfigField, value: unknown, fieldId: string, baseClasses: string) => {
    switch (field.type) {
      case 'text':
      case 'url':
        return (
          <input
            id={fieldId}
            type={field.type}
            value={value || ''}
            onChange={(e) => onChange(field.key, e?.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={baseClasses}
          />
        );

      case 'number':
        return (
          <input
            id={fieldId}
            type="number"
            value={value || ''}
            onChange={(e) => onChange(field.key, parseInt(e?.target.value) || 0)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={baseClasses}
            min={field.min}
            max={field.max}
          />
        );

      case 'select':
        return (
          <select
            id={fieldId}
            value={value || ''}
            onChange={(e) => onChange(field.key, e?.target.value)}
            disabled={disabled}
            className={baseClasses}
          >
            <option value="">请选择...</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <input
              id={fieldId}
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(field.key, e?.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor={fieldId} className="text-sm text-gray-300 cursor-pointer">
              {field.description || '启用此选项'}
            </label>
          </div>
        );

      case 'textarea':
        return (
          <textarea
            id={fieldId}
            value={value || ''}
            onChange={(e) => onChange(field.key, e?.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={`${baseClasses} h-24 resize-vertical`}
            rows={3}
          />
        );

      default:
        return (
          <input
            id={fieldId}
            type="text"
            value={value || ''}
            onChange={(e) => onChange(field.key, e?.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={baseClasses}
          />
        );
    }
  };

  // 渲染配置章节
  const renderSection = (section: ConfigSection, index: number) => {
    return (
      <div key={index} className="space-y-4">
        <div>
          <h4 className="text-md font-medium themed-text-primary">{section.title}</h4>
          {section.description && (
            <p className="text-sm text-gray-400 mt-1">{section.description}</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {section.fields.map(renderField)}
        </div>
      </div>
    );
  };

  return (
    <div className={`themed-bg-card rounded-lg shadow-xl border themed-border-primary p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold themed-text-primary flex items-center">
          <Settings className="w-5 h-5 mr-2 text-blue-400" />
          {title}
        </h3>
      </div>

      {/* 全局错误显示 */}
      {errors?.length > 0 && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center space-x-2 text-red-400 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">配置错误</span>
          </div>
          <ul className="text-red-300 text-sm space-y-1">
            {errors?.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 配置章节 */}
      <div className="space-y-8">
        {sections.map(renderSection)}
      </div>

      {/* 自定义内容 */}
      {children && (
        <div className="mt-6 pt-6 border-t themed-border-secondary">
          {children}
        </div>
      )}
    </div>
  );
};

export default TestConfigPanel;
