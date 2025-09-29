/**
 * 测试配置构建器
 * 动态生成测试配置界面，解决配置UI重复的问题
 */

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import {TestConfigSchema, TestConfigField, TestConfigSection} from '../UniversalTestPage';

export interface TestConfigBuilderProps {
  config: Record<string, any>;
  schema: TestConfigSchema;
  onChange: (config: Record<string, any>) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * 测试配置构建器组件
 */
export const TestConfigBuilder: React.FC<TestConfigBuilderProps> = ({
  config,
  schema,
  onChange,
  disabled = false,
  className = ''
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(schema.sections?.filter(s => s?.defaultExpanded).map(s => s?.title) || [])
  );

  // 切换章节展开状态
  const toggleSection = useCallback((sectionTitle: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionTitle)) {
        newSet.delete(sectionTitle);
      } else {
        newSet.add(sectionTitle);
      }
      return newSet;
    });
  }, []);

  // 更新配置值
  const updateConfig = useCallback((key: string, value: unknown) => {
    const newConfig = { ...config, [key]: value };
    onChange(newConfig);
  }, [config, onChange]);

  // 检查字段依赖
  const checkFieldDependencies = useCallback((field: TestConfigField): boolean => {
    if (!field.dependencies) return true;

    return field.dependencies.every(dep => {
      const depValue = config[dep.field];
      const shouldShow = depValue === dep.value;
      return dep.action === 'show' ? shouldShow : !shouldShow;
    });
  }, [config]);

  // 渲染字段
  const renderField = useCallback((field: TestConfigField) => {
    if (!checkFieldDependencies(field)) return null;

    const value = config[field.key];
    const fieldId = `field-${field.key}`;

    return (
      <div key={field.key} className="space-y-2">
        <label htmlFor={fieldId} className="block text-sm font-medium themed-text-primary">
          {field.label}
          {field.required && <span className="text-red-400 ml-1">*</span>}
        </label>
        
        {renderFieldInput(field, value, fieldId)}
        
        {field.validation && (
          <div className="text-xs text-gray-400">
            {field.validation.map((rule, index) => (
              <div key={index}>{rule.message}</div>
            ))}
          </div>
        )}
      </div>
    );
  }, [config, checkFieldDependencies]);

  // 渲染字段输入控件
  const renderFieldInput = (field: TestConfigField, value: unknown, fieldId: string) => {
    const baseClasses = "w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400";
    
    switch (field.type) {
      case 'text':
      case 'url':
        return (
          <input
            id={fieldId}
            type={field.type}
            value={value || ''}
            onChange={(e) => updateConfig(field.key, e?.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={baseClasses}
            min={field.min}
            max={field.max}
          />
        );

      case 'number':
        return (
          <input
            id={fieldId}
            type="number"
            value={value || ''}
            onChange={(e) => updateConfig(field.key, parseInt(e?.target.value) || 0)}
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
            onChange={(e) => updateConfig(field.key, e?.target.value)}
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
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              id={fieldId}
              type="checkbox"
              checked={value || false}
              onChange={(e) => updateConfig(field.key, e?.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-300">{field.label}</span>
          </label>
        );

      case 'textarea':
        return (
          <textarea
            id={fieldId}
            value={value || ''}
            onChange={(e) => updateConfig(field.key, e?.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={`${baseClasses} h-24 resize-vertical`}
            rows={3}
          />
        );

      case 'array':
        return renderArrayField(field, value || []);

      default:
        return (
          <input
            id={fieldId}
            type="text"
            value={value || ''}
            onChange={(e) => updateConfig(field.key, e?.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={baseClasses}
          />
        );
    }
  };

  // 渲染数组字段
  const renderArrayField = (field: TestConfigField, values: unknown[]) => {
    const addItem = () => {
      const newValues = [...values, ''];
      updateConfig(field.key, newValues);
    };

    const removeItem = (index: number) => {
      const newValues = values.filter((_, i) => i !== index);
      updateConfig(field.key, newValues);
    };

    const updateItem = (index: number, value: unknown) => {
      const newValues = [...values];
      newValues[index] = value;
      updateConfig(field.key, newValues);
    };

    return (
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex space-x-2">
            <input
              type="text"
              value={value}
              onChange={(e) => updateItem(index, e?.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
              className="flex-1 px-3 py-2 bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              disabled={disabled}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          disabled={disabled}
          className="flex items-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-md transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>添加项目</span>
        </button>
      </div>
    );
  };

  // 渲染章节
  const renderSection = (section: TestConfigSection) => {
    const isExpanded = expandedSections.has(section.title);
    const sectionFields = schema.fields.filter(field => 
      section.fields.includes(field.key)
    );

    return (
      <div key={section.title} className="themed-bg-card rounded-lg border themed-border-primary">
        <button
          type="button"
          onClick={() => toggleSection(section.title)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-700/50 transition-colors"
          disabled={disabled}
        >
          <div>
            <h3 className="font-medium themed-text-primary">{section.title}</h3>
            {section.description && (
              <p className="text-sm text-gray-400 mt-1">{section.description}</p>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {isExpanded && (
          <div className="px-4 pb-4 space-y-4 border-t themed-border-secondary">
            {sectionFields.map(renderField)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {schema.sections ? (
        // 有章节的布局
        schema.sections.map(renderSection)
      ) : (
        // 简单的字段列表
        <div className="themed-bg-card rounded-lg border themed-border-primary p-4 space-y-4">
          {schema.fields.map(renderField)}
        </div>
      )}
    </div>
  );
};

export default TestConfigBuilder;
