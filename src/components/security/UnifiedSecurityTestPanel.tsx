/**
 * 统一安全测试面板 - 重新设计的安全测试界面
 * 提供直观的配置选项和实时的测试进度
 */

import {
  AlertTriangle,
  Award,
  CheckCircle,
  Eye,
  FileText,
  Globe,
  Lock,
  Network,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Target,
  Zap
} from 'lucide-react';
import React, { useCallback, useState } from 'react';
import {
  SecurityTestConfig,
  SecurityTestResult,
  TestProgress,
  unifiedSecurityEngine
} from '../../services/unifiedSecurityEngine';

interface UnifiedSecurityTestPanelProps {
  onTestStart?: () => void;
  onTestProgress?: (progress: TestProgress) => void;
  onTestComplete?: (result: SecurityTestResult) => void;
  onTestError?: (error: string) => void;
}

export const UnifiedSecurityTestPanel: React.FC<UnifiedSecurityTestPanelProps> = ({
  onTestStart,
  onTestProgress,
  onTestComplete,
  onTestError
}) => {
  // 状态管理
  const [config, setConfig] = useState<SecurityTestConfig>({
    url: '',
    depth: 'standard',
    timeout: 30000,
    concurrent: true,
    retries: 2,
    modules: {
      ssl: { enabled: true, checkCertificate: true, checkProtocols: true },
      headers: { enabled: true, checkSecurity: true, checkCSP: true },
      vulnerabilities: { enabled: true, checkXSS: true, checkSQLInjection: true },
      cookies: { enabled: true, checkSecure: true, checkHttpOnly: true },
      content: { enabled: true, checkMixedContent: true, checkSensitiveData: true },
      network: { enabled: false, checkDNS: true },
      compliance: { enabled: true, standards: ['OWASP'] }
    }
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);

  // 预设配置
  const presetConfigs = unifiedSecurityEngine.getPresetConfigs();

  // 模块配置选项
  const moduleOptions = [
    {
      key: 'ssl',
      name: 'SSL/TLS 安全',
      icon: <Lock className="h-5 w-5" />,
      description: '检查SSL证书、协议和加密配置',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      key: 'headers',
      name: '安全头检查',
      icon: <Shield className="h-5 w-5" />,
      description: '分析HTTP安全头和CSP配置',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      key: 'vulnerabilities',
      name: '漏洞扫描',
      icon: <Target className="h-5 w-5" />,
      description: '检测XSS、SQL注入等常见漏洞',
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    },
    {
      key: 'cookies',
      name: 'Cookie 安全',
      icon: <Eye className="h-5 w-5" />,
      description: '检查Cookie安全属性配置',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
      key: 'content',
      name: '内容安全',
      icon: <FileText className="h-5 w-5" />,
      description: '检查混合内容和敏感信息泄露',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    },
    {
      key: 'network',
      name: '网络安全',
      icon: <Network className="h-5 w-5" />,
      description: '检查DNS配置和网络服务',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20'
    },
    {
      key: 'compliance',
      name: '合规检查',
      icon: <Award className="h-5 w-5" />,
      description: '检查OWASP、NIST等标准合规性',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20'
    }
  ];

  // 处理URL变化
  const handleUrlChange = useCallback((url: string) => {
    setConfig(prev => ({ ...prev, url }));
    setError(null);
  }, []);

  // 应用预设配置
  const applyPreset = useCallback((presetName: string) => {
    const preset = presetConfigs[presetName];
    if (preset) {
      setConfig(prev => ({
        ...prev,
        ...preset,
        url: prev.url // 保持当前URL
      }));
    }
  }, [presetConfigs]);

  // 切换模块启用状态
  const toggleModule = useCallback((moduleKey: string) => {
    setConfig(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [moduleKey]: {
          ...prev.modules[moduleKey as keyof typeof prev.modules],
          enabled: !prev.modules[moduleKey as keyof typeof prev.modules]?.enabled
        }
      }
    }));
  }, []);

  // 运行测试
  const runTest = useCallback(async () => {
    if (!config.url) {
      setError('请输入要测试的URL');
      return;
    }

    setIsRunning(true);
    setError(null);
    setProgress(null);
    onTestStart?.();

    try {
      const result = await unifiedSecurityEngine.runSecurityTest(
        config,
        (progressData) => {
          setProgress(progressData);
          onTestProgress?.(progressData);
        }
      );

      onTestComplete?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '测试失败';
      setError(errorMessage);
      onTestError?.(errorMessage);
    } finally {
      setIsRunning(false);
      setProgress(null);
      setCurrentTestId(null);
    }
  }, [config, onTestStart, onTestProgress, onTestComplete, onTestError]);

  // 停止测试
  const stopTest = useCallback(() => {
    if (currentTestId) {
      unifiedSecurityEngine.cancelTest(currentTestId);
      setIsRunning(false);
      setProgress(null);
      setCurrentTestId(null);
    }
  }, [currentTestId]);

  return (
    <div className="unified-security-test-panel space-y-4 sm:space-y-6">
      {/* 头部 - 响应式优化 */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm flex-shrink-0">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">🛡️ 统一安全测试</h2>
              <p className="text-blue-100 mt-1 text-sm sm:text-base">全面的网站安全检测和分析平台</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-sm text-blue-200">新一代安全引擎</div>
            <div className="text-xs text-blue-300">智能 • 全面 • 精准</div>
          </div>
        </div>
      </div>

      {/* URL 输入 - 响应式优化 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          🌐 目标网站URL
        </label>
        <div className="relative">
          <Globe className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="url"
            value={config.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://example.com"
            disabled={isRunning}
            className="w-full pl-10 sm:pl-12 pr-10 sm:pr-4 py-3 sm:py-4 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
          />
          {config.url && (
            <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          )}
        </div>
      </div>

      {/* 快速预设 - 响应式优化 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center">
          <Zap className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-yellow-500" />
          快速预设
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Object.entries(presetConfigs).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              disabled={isRunning}
              className="p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/20 dark:hover:to-blue-800/20 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1 sm:gap-0">
                <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                  {key === 'quick' ? '⚡ 快速扫描' :
                    key === 'standard' ? '🛡️ 标准扫描' :
                      '🔍 全面扫描'}
                </span>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {key === 'quick' ? '1-2分钟' :
                    key === 'standard' ? '3-5分钟' :
                      '5-10分钟'}
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {key === 'quick' ? '基础安全检查，快速发现主要问题' :
                  key === 'standard' ? '全面安全检测，平衡速度和深度' :
                    '深度安全分析，包含所有检测模块'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 模块配置 - 响应式优化 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center">
          <Settings className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-gray-600" />
          检测模块配置
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {moduleOptions.map((module) => {
            const isEnabled = config.modules[module.key as keyof typeof config.modules]?.enabled;
            return (
              <div
                key={module.key}
                className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${isEnabled
                  ? `${module.bgColor} border-current ${module.color}`
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500'
                  }`}
                onClick={() => !isRunning && toggleModule(module.key)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg ${isEnabled ? 'bg-white/50' : 'bg-gray-200 dark:bg-gray-600'}`}>
                    {React.cloneElement(module.icon, {
                      className: `h-5 w-5 ${isEnabled ? module.color : 'text-gray-400'}`
                    })}
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isEnabled
                    ? 'bg-current border-current text-white'
                    : 'border-gray-300 dark:border-gray-600'
                    }`}>
                    {isEnabled && <CheckCircle className="h-3 w-3" />}
                  </div>
                </div>
                <h4 className={`font-semibold mb-1 ${isEnabled ? module.color : 'text-gray-500'}`}>
                  {module.name}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {module.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 控制按钮 - 响应式优化 */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          type="button"
          onClick={runTest}
          disabled={isRunning || !config.url}
          className="flex-1 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl transition-all duration-300 flex items-center justify-center shadow-2xl hover:shadow-blue-500/25 disabled:shadow-none transform hover:scale-[1.02] disabled:scale-100 text-sm sm:text-base"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent mr-2 sm:mr-3"></div>
              <span>正在扫描...</span>
            </>
          ) : (
            <>
              <Play className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5" />
              <span>🚀 开始安全测试</span>
            </>
          )}
        </button>

        {isRunning && (
          <button
            type="button"
            onClick={stopTest}
            className="px-4 sm:px-6 py-3 sm:py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl sm:rounded-2xl transition-all duration-200 flex items-center justify-center text-sm sm:text-base"
          >
            <Pause className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            停止
          </button>
        )}

        <button
          type="button"
          onClick={() => setConfig(prev => ({ ...prev, url: '' }))}
          disabled={isRunning}
          className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-semibold rounded-xl sm:rounded-2xl transition-all duration-200 flex items-center justify-center text-sm sm:text-base"
        >
          <RotateCcw className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          重置
        </button>
      </div>

      {/* 进度显示 */}
      {progress && (
        <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 border-2 border-blue-200 dark:border-blue-700">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 sm:gap-0">
            <div className="flex items-center space-x-3">
              <div className="animate-spin h-5 w-5 sm:h-6 sm:w-6 border-2 border-blue-500 border-t-transparent rounded-full flex-shrink-0"></div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-gray-900 dark:text-white block">
                  {progress.phase === 'initializing' ? '🔧 初始化中' :
                    progress.phase === 'scanning' ? '🔍 扫描中' :
                      progress.phase === 'analyzing' ? '📊 分析中' :
                        progress.phase === 'reporting' ? '📝 生成报告' :
                          '✅ 完成'}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {progress.currentModule} - {progress.currentCheck}
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(progress.progress)}%
              </div>
              {progress.estimatedTimeRemaining && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  剩余 {Math.round(progress.estimatedTimeRemaining / 1000)} 秒
                </div>
              )}
            </div>
          </div>

          <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 rounded-full transition-all duration-700 ease-out shadow-lg"
              style={{ width: `${Math.min(progress.progress, 100)}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent animate-pulse"></div>
            </div>
          </div>

          {progress.statistics && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-center">
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-2 sm:p-3">
                <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {progress.statistics.totalChecks || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">总检查项</div>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-2 sm:p-3">
                <div className="text-base sm:text-lg font-bold text-green-600">
                  {progress.statistics.passedChecks || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">通过</div>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-2 sm:p-3">
                <div className="text-base sm:text-lg font-bold text-red-600">
                  {progress.statistics.failedChecks || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">失败</div>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-2 sm:p-3">
                <div className="text-base sm:text-lg font-bold text-yellow-600">
                  {progress.statistics.warningChecks || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">警告</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 错误显示 - 响应式优化 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-3 sm:p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h4 className="font-semibold text-red-800 dark:text-red-400 text-sm sm:text-base">测试失败</h4>
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 mt-1 break-words">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 状态提示 - 响应式优化 */}
      {!config.url ? (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-xl p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
            请输入要测试的URL地址
          </p>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 rounded-xl p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-green-800 dark:text-green-200 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            配置完成，准备开始安全测试
          </p>
        </div>
      )}
    </div>
  );
};
