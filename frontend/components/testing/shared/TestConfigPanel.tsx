/**
 * 可选的统一测试配置面板
 * 各个测试页面可以选择使用，不强制替换现有实现
 */

import React from 'react';
import type { ReactNode, FC } from 'react';
import { Settings, Globe, Clock, Zap, Shield, AlertCircle } from 'lucide-react';

// 基础配置接口
export interface BaseTestConfig {
  url: string;
  timeout?: number;
  [key: string]: any;
}

// 配置面板属性
export interface TestConfigPanelProps {
  config: BaseTestConfig;
  onConfigChange: (config: BaseTestConfig) => void;
  testType: string;
  disabled?: boolean;
  children?: React.ReactNode;
  customFields?: React.ReactNode;
  showAdvanced?: boolean;
  onAdvancedToggle?: () => void;
}

/**
 * 可选的统一测试配置面板组件
 * 提供基础的URL和超时配置，支持自定义扩展
 */
export const TestConfigPanel: React.FC<TestConfigPanelProps> = ({
  config,
  onConfigChange,
  testType,
  disabled = false,
  children,
  customFields,
  showAdvanced = false,
  onAdvancedToggle
}) => {
  /**
   * 更新配置
   */
  const updateConfig = (updates: Partial<BaseTestConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  /**
   * 验证URL格式
   */
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
      {/* 面板标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">测试配置</h3>
            <p className="text-gray-400 text-sm">配置{testType}测试参数</p>
          </div>
        </div>

        {/* 高级选项切换 */}
        {onAdvancedToggle && (
          <button
            onClick={onAdvancedToggle}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            {showAdvanced ? '隐藏高级选项' : '显示高级选项'}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* URL输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Globe className="w-4 h-4 inline mr-2" />
            测试URL
          </label>
          <div className="relative">
            <input
              type="url"
              value={config.url}
              onChange={(e) => updateConfig({ url: e.target.value })}
              placeholder="https://example.com"
              disabled={disabled}
              className={`w-full px-4 py-3 bg-gray-900/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                config.url && !isValidUrl(config.url)
                  ? 'border-red-500/50 focus:ring-red-500/50'
                  : 'border-gray-600 focus:ring-blue-500/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            
            {/* URL验证状态 */}
            {config.url && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {isValidUrl(config.url) ? (
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            )}
          </div>
          
          {/* URL错误提示 */}
          {config.url && !isValidUrl(config.url) && (
            <p className="mt-1 text-sm text-red-400">请输入有效的URL格式</p>
          )}
        </div>

        {/* 超时设置 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Clock className="w-4 h-4 inline mr-2" />
            超时时间（秒）
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={(config.timeout || 60) / 1000}
              onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) * 1000 })}
              disabled={disabled}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="10"
                max="300"
                value={(config.timeout || 60) / 1000}
                onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) * 1000 })}
                disabled={disabled}
                className="w-16 px-2 py-1 bg-gray-900/50 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-sm">秒</span>
            </div>
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>10秒</span>
            <span>5分钟</span>
          </div>
        </div>

        {/* 自定义字段区域 */}
        {customFields && (
          <div className="border-t border-gray-700/50 pt-6">
            {customFields}
          </div>
        )}

        {/* 高级选项 */}
        {showAdvanced && (
          <div className="border-t border-gray-700/50 pt-6">
            <div className="flex items-center space-x-2 mb-4">
              <Zap className="w-4 h-4 text-yellow-400" />
              <h4 className="text-sm font-medium text-gray-300">高级选项</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 用户代理 */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  用户代理
                </label>
                <select
                  value={config.userAgent || 'default'}
                  onChange={(e) => updateConfig({ userAgent: e.target.value === 'default' ? undefined : e.target.value })}
                  disabled={disabled}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="default">默认</option>
                  <option value="chrome">Chrome 桌面版</option>
                  <option value="firefox">Firefox 桌面版</option>
                  <option value="safari">Safari 桌面版</option>
                  <option value="mobile">移动设备</option>
                  <option value="bot">搜索引擎爬虫</option>
                </select>
              </div>

              {/* 重试次数 */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  重试次数
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={config.retries || 0}
                  onChange={(e) => updateConfig({ retries: parseInt(e.target.value) })}
                  disabled={disabled}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 安全选项 */}
            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-3">
                <Shield className="w-4 h-4 text-green-400" />
                <h5 className="text-sm font-medium text-gray-400">安全选项</h5>
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={config.validateSSL !== false}
                    onChange={(e) => updateConfig({ validateSSL: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">验证SSL证书</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={config.followRedirects !== false}
                    onChange={(e) => updateConfig({ followRedirects: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">跟随重定向</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 子组件内容 */}
        {children && (
          <div className="border-t border-gray-700/50 pt-6">
            {children}
          </div>
        )}
      </div>

      {/* 配置摘要 */}
      <div className="mt-6 p-4 bg-gray-900/30 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-400">URL:</span>
            <span className="text-white font-mono text-xs">
              {config.url || '未设置'}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400">超时:</span>
            <span className="text-white">
              {((config.timeout || 60000) / 1000)}秒
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestConfigPanel;
