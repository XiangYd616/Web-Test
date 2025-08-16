/**
 * 高级压力测试配置组件
 * 提供完整的压力测试配置选项
 */

import React, { useState, useEffect } from 'react';
import { Settings, Users, Clock, Zap, Shield, Globe, Database, TrendingUp, AlertTriangle, Info, ChevronDown, // ChevronUp } from 'lucide-react'; // 已修复
interface StressTestConfig {
  // 基础配置
  url: string;
  users: number;
  duration: number;
  rampUpTime: number;
  
  // 高级配置
  testType: 'load' | 'stress' | 'spike' | 'volume' | 'endurance' | 'scalability';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  timeout: number;
  thinkTime: number;
  
  // 负载模式
  loadPattern: 'constant' | 'ramp' | 'spike' | 'wave' | 'step';
  
  // 请求配置
  headers: Record<string, string>;
  body: string;
  contentType: string;
  
  // 代理配置
  proxy?: {
    enabled: boolean;
    type: 'http' | 'https' | 'socks5';
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  
  // 监控配置
  monitoring: {
    enableRealTime: boolean;
    collectMetrics: boolean;
    enableAlerts: boolean;
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      throughput: number;
    };
  };
  
  // 停止条件
  stopConditions: {
    maxErrors: number;
    maxResponseTime: number;
    minThroughput: number;
  };
}

interface StressTestConfigProps {
  config: StressTestConfig;
  onChange: (config: StressTestConfig) => void;
  onStart: () => void;
  isRunning: boolean;
  className?: string;
}

const StressTestConfig: React.FC<StressTestConfigProps> = ({
  config,
  onChange,
  onStart,
  isRunning,
  className = ''
}) => {
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => 
    debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
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
  };
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'monitoring' | 'conditions'>('basic');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 测试类型配置
  const testTypes = [
    {
      value: 'load',
      label: '负载测试',
      description: '模拟正常用户负载，验证系统在预期负载下的表现',
      icon: <Users className="w-4 h-4" />,
      color: 'text-blue-600'
    },
    {
      value: 'stress',
      label: '压力测试',
      description: '超出正常负载，找到系统的极限和瓶颈',
      icon: <Zap className="w-4 h-4" />,
      color: 'text-orange-600'
    },
    {
      value: 'spike',
      label: '峰值测试',
      description: '突然增加负载，测试系统的弹性和恢复能力',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'text-red-600'
    },
    {
      value: 'volume',
      label: '容量测试',
      description: '大量数据处理，验证系统的数据处理能力',
      icon: <Database className="w-4 h-4" />,
      color: 'text-purple-600'
    },
    {
      value: 'endurance',
      label: '耐久测试',
      description: '长时间运行，检测内存泄漏和性能衰减',
      icon: <Clock className="w-4 h-4" />,
      color: 'text-green-600'
    },
    {
      value: 'scalability',
      label: '可扩展性测试',
      description: '逐步增加负载，评估系统的扩展能力',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'text-indigo-600'
    }
  ];

  // 负载模式配置
  const loadPatterns = [
    { value: 'constant', label: '恒定负载', description: '保持固定的用户数量' },
    { value: 'ramp', label: '渐进负载', description: '逐步增加用户数量' },
    { value: 'spike', label: '突发负载', description: '快速增加到峰值' },
    { value: 'wave', label: '波浪负载', description: '周期性增减负载' },
    { value: 'step', label: '阶梯负载', description: '分阶段增加负载' }
  ];

  // 更新配置
  const updateConfig = (updates: Partial<StressTestConfig>) => {
    onChange({ ...config, ...updates });
  };

  // 预设配置
  const applyPreset = (preset: string) => {
    const presets = {
      light: {
        users: 10,
        duration: 60,
        rampUpTime: 10,
        testType: 'load' as const,
        loadPattern: 'ramp' as const
      },
      medium: {
        users: 50,
        duration: 300,
        rampUpTime: 30,
        testType: 'stress' as const,
        loadPattern: 'constant' as const
      },
      heavy: {
        users: 200,
        duration: 600,
        rampUpTime: 60,
        testType: 'stress' as const,
        loadPattern: 'spike' as const
      },
      endurance: {
        users: 30,
        duration: 3600,
        rampUpTime: 120,
        testType: 'endurance' as const,
        loadPattern: 'constant' as const
      }
    };

    if (preset in presets) {
      updateConfig(presets[preset as keyof typeof presets]);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 标题栏 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">压力测试配置</h3>
          </div>
          
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <span>{showAdvanced ? '简化配置' : '高级配置'}</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 快速预设 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2 mb-2">
          <Zap className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">快速预设</span>
        </div>
        <div className="flex space-x-2">
          {['light', 'medium', 'heavy', 'endurance'].map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              disabled={isRunning}
              className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {preset === 'light' && '轻量测试'}
              {preset === 'medium' && '中等测试'}
              {preset === 'heavy' && '重压测试'}
              {preset === 'endurance' && '耐久测试'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* 标签页导航 */}
        {showAdvanced && (
          <div className="flex space-x-1 mb-4 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'basic', label: '基础配置', icon: <Settings className="w-4 h-4" /> },
              { key: 'advanced', label: '高级选项', icon: <Zap className="w-4 h-4" /> },
              { key: 'monitoring', label: '监控设置', icon: <TrendingUp className="w-4 h-4" /> },
              { key: 'conditions', label: '停止条件', icon: <AlertTriangle className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* 基础配置 */}
        {(!showAdvanced || activeTab === 'basic') && (
          <div className="space-y-4">
            {/* 测试类型选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                测试类型
              </label>
              <div className="grid grid-cols-2 gap-2">
                {testTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => updateConfig({ testType: type.value as any })}
                    disabled={isRunning}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      config.testType === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={type.color}>{type.icon}</span>
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-gray-600">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 基础参数 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  并发用户数
                </label>
                <input
                  type="number"
                  value={config.users}
                  onChange={(e) => updateConfig({ users: parseInt(e.target.value) || 1 })}
                  disabled={isRunning}
                  min="1"
                  max="10000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  测试时长 (秒)
                </label>
                <input
                  type="number"
                  value={config.duration}
                  onChange={(e) => updateConfig({ duration: parseInt(e.target.value) || 60 })}
                  disabled={isRunning}
                  min="10"
                  max="7200"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  启动时间 (秒)
                </label>
                <input
                  type="number"
                  value={config.rampUpTime}
                  onChange={(e) => updateConfig({ rampUpTime: parseInt(e.target.value) || 0 })}
                  disabled={isRunning}
                  min="0"
                  max="600"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  请求超时 (秒)
                </label>
                <input
                  type="number"
                  value={config.timeout}
                  onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) || 10 })}
                  disabled={isRunning}
                  min="1"
                  max="300"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            {/* 负载模式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                负载模式
              </label>
              <select
                value={config.loadPattern}
                onChange={(e) => updateConfig({ loadPattern: e.target.value as any })}
                disabled={isRunning}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loadPatterns.map((pattern) => (
                  <option key={pattern.value} value={pattern.value}>
                    {pattern.label} - {pattern.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 启动按钮 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onStart}
            disabled={isRunning || !config.url}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? '测试进行中...' : '开始压力测试'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StressTestConfig;
