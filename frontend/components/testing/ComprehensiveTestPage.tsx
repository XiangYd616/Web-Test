/**
 * 通用测试页面组件
 * 解决各测试工具重复耦合问题的核心组件
 */

import { LucideIcon } from 'lucide-react';
import React, { ReactNode } from 'react';
import { useUniversalTest } from '../../hooks/legacy-compatibility';
import { TestConfigPanel as UniversalConfigPanel } from './shared/TestConfigPanel';

export interface TestTypeConfig {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  defaultConfig: Record<string, any>;
  configSchema: TestConfigSchema;
  resultSchema: TestResultSchema;
}

export interface TestConfigSchema {
  fields: TestConfigField[];
  sections?: TestConfigSection[];
  validation?: ValidationRule[];
}

export interface TestConfigField {
  key: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea' | 'url' | 'array';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  validation?: ValidationRule[];
  dependencies?: FieldDependency[];
}

export interface TestConfigSection {
  title: string;
  description?: string;
  fields: string[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: unknown, config: Record<string, any>) => boolean;
}

export interface FieldDependency {
  field: string;
  value: any;
  action: 'show' | 'hide' | 'enable' | 'disable';
}

export interface TestResultSchema {
  sections: ResultSection[];
  charts?: ChartConfig[];
  metrics?: MetricConfig[];
}

export interface ResultSection {
  key: string;
  title: string;
  type: 'table' | 'cards' | 'text' | 'chart' | 'custom';
  renderer?: (data: any) => ReactNode;
}

export interface ChartConfig {
  key: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  dataKey: string;
}

export interface MetricConfig {
  key: string;
  label: string;
  format: 'number' | 'percentage' | 'time' | 'bytes';
  color?: string;
}

export interface ComprehensiveTestPageProps {
  testType: TestTypeConfig;
  className?: string;
  onTestComplete?: (result: any) => void;
  onConfigChange?: (config: any) => void;
  customActions?: ReactNode;
  showHistory?: boolean;
}

/**
 * 通用测试页面组件
 * 提供统一的测试页面结构和功能
 */
export const ComprehensiveTestPage: React.FC<ComprehensiveTestPageProps> = ({
  testType,
  className = '',
  onTestComplete,
  onConfigChange,
  customActions,
  showHistory = true,
}) => {
  const {
    config,
    updateConfig,
    isRunning,
    progress,
    currentStep,
    result,
    error,
    startTest,
    stopTest,
    resetTest,
    validateConfig,
  } = useUniversalTest(testType.id, testType.defaultConfig);

  // 处理配置变更
  const handleConfigChange = (newConfig: any) => {
    // 使用updateConfig方法更新整个配置对象
    updateConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  // 处理测试完成
  const _handleTestComplete = (testResult: any) => {
    onTestComplete?.(testResult);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 测试配置面板 */}
      <UniversalConfigPanel
        config={config}
        schema={testType.configSchema}
        onChange={handleConfigChange}
        disabled={isRunning}
        testType={testType.id}
      />

      {/* 测试进度显示 */}
      {(isRunning || progress > 0) && (
        <div className="themed-bg-card rounded-lg border themed-border-primary p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium themed-text-primary">测试进度</span>
            <span className="text-sm text-gray-400">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-400">{currentStep}</p>
        </div>
      )}

      {/* 测试结果显示 */}
      {result && (
        <div className="themed-bg-card rounded-lg border themed-border-primary p-4">
          <h4 className="font-medium themed-text-primary mb-3">测试结果</h4>
          <pre className="text-sm text-gray-300 bg-gray-800 p-3 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
          <button
            type="button"
            onClick={startTest}
            className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
          >
            重新测试
          </button>
        </div>
      )}

      {/* 错误显示 */}
      {error && (
        <div className="themed-bg-card rounded-lg border border-red-500 p-4">
          <div className="flex items-center space-x-2 text-red-400 mb-2">
            <span className="font-medium">测试失败</span>
          </div>
          <p className="text-red-300 text-sm">{error.message || String(error)}</p>
        </div>
      )}

      {/* 自定义操作 */}
      {customActions && <div className="themed-bg-card rounded-lg p-4">{customActions}</div>}

      {/* 测试操作按钮 */}
      <div className="themed-bg-card rounded-lg border themed-border-primary p-4">
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={startTest}
            disabled={isRunning || !validateConfig(config).isValid}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <testType.icon className="w-4 h-4" />
            <span>{isRunning ? '测试中...' : '开始测试'}</span>
          </button>

          {isRunning && (
            <button
              type="button"
              onClick={stopTest}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              停止测试
            </button>
          )}

          <button
            type="button"
            onClick={resetTest}
            disabled={isRunning}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            重置
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveTestPage;
