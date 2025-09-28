/**
 * 通用配置面板组件
 * 使用TestConfigBuilder提供动态配置界面
 */

import React from 'react';
import { Settings } from 'lucide-react';
import { TestConfigSchema } from '../UniversalTestPage';
import { TestConfigBuilder } from './TestConfigBuilder';

export interface UniversalConfigPanelProps {
  config: Record<string, any>;
  schema: TestConfigSchema;
  onChange: (config: Record<string, any>) => void;
  disabled?: boolean;
  testType: string;
  title?: string;
  className?: string;
}

/**
 * 通用配置面板
 * 基于schema动态生成配置界面
 */
export const UniversalConfigPanel: React.FC<UniversalConfigPanelProps> = ({
  config,
  schema,
  onChange,
  disabled = false,
  testType,
  title = '测试配置',
  className = ''
}) => {
  return (
    <div className={`themed-bg-card rounded-lg shadow-xl border themed-border-primary p-6 ${className}`}>
      <h3 className="text-lg font-semibold themed-text-primary mb-4 flex items-center">
        <Settings className="w-5 h-5 mr-2 text-blue-400" />
        {title}
      </h3>
      
      <TestConfigBuilder
        config={config}
        schema={schema}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
};

export default UniversalConfigPanel;
