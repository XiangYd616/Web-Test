/**
 * SecurityTestPanel.tsx - React���
 * 
 * �ļ�·��: frontend\components\security\SecurityTestPanel.tsx
 * ����ʱ��: 2025-09-25
 */


import { AlertTriangle, Award, Eye, FileText, Lock, Network, Settings, Shield, Target, Zap } from 'lucide-react';
import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import {SecurityTestConfig, SecurityScanResult, securityEngine} from '../../services/securityEngine';
import { createCommonErrors, createError } from '../../utils/errorHandler';
import { URLValidationResult } from '../../utils/urlValidator';
import { URLInput } from '../ui/URLInput';
import {EnhancedError} from './ErrorDisplay';

// Local type definitions
interface SecurityTestProgress {
  percentage: number;
  currentStep?: string;
  message?: string;
  securityScore?: number;
  vulnerabilities?: SecurityScanResult[];
  threatLevel?: string;
}

interface SecurityTestResult {
  id: string;
  url: string;
  timestamp: string;
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  grade: string;
  duration: number;
  findings: SecurityScanResult[];
}




interface UnifiedSecurityTestPanelProps {
  onTestStart?: () => void;
  onTestProgress?: (progress: SecurityTestProgress) => void;
  onTestComplete?: (result: SecurityTestResult) => void;
  onTestError?: (error: string) => void;
}

export interface UnifiedSecurityTestPanelRef {
  startTest: () => void;
  canStartTest: () => boolean;
  getConfig: () => SecurityTestConfig;
}

export const SecurityTestPanel = forwardRef<UnifiedSecurityTestPanelRef, UnifiedSecurityTestPanelProps>(({
  onTestStart,
  onTestProgress,
  onTestComplete,
  onTestError
}, ref) => {
  // ״̬����
  const [config, setConfig] = useState<SecurityTestConfig>({
    url: '',
    depth: 'standard',
    timeout: Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 30000,
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
  const [progress, setProgress] = useState<SecurityTestProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enhancedError, setEnhancedError] = useState<EnhancedError | null>(null);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [urlValidation, setUrlValidation] = useState<URLValidationResult | null>(null);
  const [isUrlValid, setIsUrlValid] = useState(false);

  // Ԥ������
  const presetConfigs = securityEngine.getPresetConfigs();

  // ģ������ѡ��
  const moduleOptions = [
    {
      key: 'ssl',
      name: 'SSL/TLS ��ȫ',
      icon: <Lock className="h-5 w-5" />,
      description: '���SSL֤�顢Э��ͼ�������',
      color: 'text-green-400',
      bgColor: 'bg-gradient-to-br from-green-500/20 to-green-600/30',
      borderColor: 'border-green-400/50'
    },
    {
      key: 'headers',
      name: '��ȫͷ���',
      icon: <Shield className="h-5 w-5" />,
      description: '����HTTP��ȫͷ��CSP����',
      color: 'text-blue-400',
      bgColor: 'bg-gradient-to-br from-blue-500/20 to-blue-600/30',
      borderColor: 'border-blue-400/50'
    },
    {
      key: 'vulnerabilities',
      name: '©��ɨ��',
      icon: <Target className="h-5 w-5" />,
      description: '���XSS��SQLע��ȳ���©��',
      color: 'text-red-400',
      bgColor: 'bg-gradient-to-br from-red-500/20 to-red-600/30',
      borderColor: 'border-red-400/50'
    },
    {
      key: 'cookies',
      name: 'Cookie ��ȫ',
      icon: <Eye className="h-5 w-5" />,
      description: '���Cookie��ȫ��������',
      color: 'text-purple-400',
      bgColor: 'bg-gradient-to-br from-purple-500/20 to-purple-600/30',
      borderColor: 'border-purple-400/50'
    },
    {
      key: 'content',
      name: '���ݰ�ȫ',
      icon: <FileText className="h-5 w-5" />,
      description: '��������ݺ������Ϣй¶',
      color: 'text-orange-400',
      bgColor: 'bg-gradient-to-br from-orange-500/20 to-orange-600/30',
      borderColor: 'border-orange-400/50'
    },
    {
      key: 'network',
      name: '���簲ȫ',
      icon: <Network className="h-5 w-5" />,
      description: '���DNS���ú��������',
      color: 'text-indigo-400',
      bgColor: 'bg-gradient-to-br from-indigo-500/20 to-indigo-600/30',
      borderColor: 'border-indigo-400/50'
    },
    {
      key: 'compliance',
      name: '�Ϲ���',
      icon: <Award className="h-5 w-5" />,
      description: '���OWASP��NIST�ȱ�׼�Ϲ���',
      color: 'text-teal-400',
      bgColor: 'bg-gradient-to-br from-teal-500/20 to-teal-600/30',
      borderColor: 'border-teal-400/50'
    }
  ];

  // ����URL�仯
  const handleUrlChange = useCallback((url: string) => {
    setConfig(prev => ({ ...prev, url }));
    setError(null);
    setEnhancedError(null);
  }, []);

  // ����URL��֤���
  const handleUrlValidation = useCallback((isValid: boolean, result?: URLValidationResult) => {
    setIsUrlValid(isValid);
    setUrlValidation(result || null);

    if (!isValid && result?.errors.length) {
      const urlError = createCommonErrors.invalidUrl(config.url);
      setEnhancedError(urlError);
    } else {
      setEnhancedError(null);
    }
  }, [config.url]);

  // Ӧ��Ԥ������
  const applyPreset = useCallback((presetName: string) => {
    const preset = presetConfigs[presetName];
    if (preset) {
      setConfig(prev => ({
        ...prev,
        ...preset,
        url: prev.url // ���ֵ�ǰURL
      }));
    }
  }, [presetConfigs]);

  // 切换模块启用状态
  const toggleModule = useCallback((moduleKey: string) => {
    setConfig(prev => {
      const modules = prev.modules || {};
      const currentModule = modules[moduleKey as keyof typeof modules];
      return {
        ...prev,
        modules: {
          ...modules,
          [moduleKey]: {
            ...currentModule,
            enabled: !currentModule?.enabled
          }
        }
      };
    });
  }, []);

  // ���в���
  const runTest = useCallback(async () => {
    if (!config.url) {
      const urlError = createCommonErrors.invalidUrl();
      setEnhancedError(urlError);
      return;
    }

    if (!isUrlValid) {
      const urlError = createCommonErrors.invalidUrl(config.url);
      setEnhancedError(urlError);
      return;
    }

    setIsRunning(true);
    setError(null);
    setEnhancedError(null);
    setProgress(null);
    onTestStart?.();

    try {
      const result = await securityEngine.runSecurityTest(
        config,
        (progressData) => {
          setProgress(progressData as any);
          onTestProgress?.(progressData as any);
        }
      );

      onTestComplete?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '����ʧ��';

      // ������ǿ����
      const enhancedErr = createError(err instanceof Error ? err : new Error(errorMessage), {
        url: config.url,
        operation: 'security_test',
        timestamp: Date.now()
      });

      setEnhancedError(enhancedErr);
      setError(errorMessage);
      onTestError?.(errorMessage);
    } finally {
      setIsRunning(false);
      setProgress(null);
      setCurrentTestId(null);
    }
  }, [config, isUrlValid, onTestStart, onTestProgress, onTestComplete, onTestError]);

  // ֹͣ����
  const _stopTest = useCallback(() => {
    if (currentTestId) {
      securityEngine.cancelTest(currentTestId);
      setIsRunning(false);
      setProgress(null);
      setCurrentTestId(null);
    }
  }, [currentTestId]);

  // ��¶��������ķ���
  useImperativeHandle(ref, () => ({
    startTest: runTest,
    canStartTest: () => !!config.url && isUrlValid && !isRunning,
    getConfig: () => config
  }), [runTest, config.url, isUrlValid, isRunning, config]);

  return (
    <div className="unified-security-test-panel space-y-3 fade-in-up compact-layout">
      {/* URL ���� - ��ǿ�� */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
        <URLInput
          value={config.url}
          onChange={(e) => handleUrlChange(e?.target.value)}
          onValidationChange={(isValid) => handleUrlValidation(isValid)}
          placeholder="������Ҫ���Ե���վURL�����磺https://example.com"
          disabled={isRunning}
          enableValidation={true}
          showProtocolSuggestion={true}
          autoAddProtocol={true}
        />
      </div>

      {/* ����Ԥ�� - ��ǿ�ɶ��� */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
        <h3 className="text-base font-bold text-white mb-3 flex items-center">
          <Zap className="h-4 w-4 mr-2 text-yellow-400" />
          ����Ԥ��
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(presetConfigs).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              disabled={isRunning}
              className="bg-gray-700/30 hover:bg-gray-600/50 border border-gray-600 hover:border-gray-500 p-3 rounded-lg text-left group disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1 sm:gap-0">
                <span className="font-bold text-white text-sm">
                  {key === 'quick' ? '? ����ɨ��' :
                    key === 'standard' ? '??? ��׼ɨ��' :
                      '?? ȫ��ɨ��'}
                </span>
                <div className="text-xs text-gray-300 font-medium bg-gray-600/50 px-2 py-0.5 rounded">
                  {key === 'quick' ? '1-2����' :
                    key === 'standard' ? '3-5����' :
                      '5-10����'}
                </div>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                {key === 'quick' ? '������ȫ��飬���ٷ�����Ҫ����' :
                  key === 'standard' ? 'ȫ�氲ȫ��⣬ƽ���ٶȺ����' :
                    '��Ȱ�ȫ�������������м��ģ��'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ģ������ - ��ǿ�ɶ��� */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4">
        <h3 className="text-base font-bold text-white mb-3 flex items-center">
          <Settings className="h-4 w-4 mr-2 text-gray-300" />
          ���ģ������
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {moduleOptions.map((module) => {
            const modules = config.modules || {};
            const isEnabled = modules[module.key as keyof typeof modules]?.enabled;
            return (
              <div
                key={module.key}
                className={`group relative p-3 rounded-lg border transition-all duration-300 overflow-hidden ${isRunning
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer hover:shadow-md'
                  } ${isEnabled
                    ? `${module.bgColor} ${module.borderColor} ${module.color} shadow-md ring-1 ring-current/20 ${!isRunning ? 'hover:shadow-lg hover:ring-current/30' : ''}`
                    : `bg-gray-700/40 border-gray-600/60 text-gray-400 ${!isRunning ? 'hover:bg-gray-700/60 hover:border-gray-600/80' : ''}`
                  }`}
                onClick={() => !isRunning && toggleModule(module.key)}
              >
                {/* ѡ��״ָ̬ʾ�� */}
                {isEnabled && (
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-current rounded-t-xl opacity-80`}></div>
                )}
                <div className="flex items-start justify-between mb-1.5">
                  <div className={`p-1.5 rounded-md transition-all duration-200 ${isEnabled
                    ? 'bg-white/30 backdrop-blur-sm shadow-md border border-white/20'
                    : 'bg-gray-600/50 hover:bg-gray-600'
                    }`}>
                    {React.cloneElement(module.icon, {
                      className: `h-4 w-4 transition-colors duration-200 ${isEnabled ? module.color : 'text-gray-400'}`
                    })}
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 ${isEnabled
                    ? 'bg-current border-current text-white shadow-md ring-1 ring-white/20'
                    : 'border-gray-600/70 hover:border-gray-500'
                    }`}>
                    {isEnabled && (
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
                <h4 className={`font-bold mb-2 text-sm transition-colors duration-200 ${isEnabled ? 'text-white drop-shadow-sm' : 'text-gray-400 group-hover:text-gray-300'
                  }`}>
                  {module.name}
                </h4>
                <p className={`text-xs leading-relaxed transition-colors duration-200 ${isEnabled ? 'text-white/95 drop-shadow-sm' : 'text-gray-400 group-hover:text-gray-300'
                  }`}>
                  {module.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ������ʾ - ��ǿ�ɶ��� */}
      {progress && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4 sm:gap-0">
            <div className="flex items-center space-x-4">
              <div className="animate-spin h-6 w-6 sm:h-7 sm:w-7 border-3 border-blue-500 border-t-transparent rounded-full flex-shrink-0"></div>
              <div className="min-w-0">
                <span className="text-base sm:text-lg font-bold text-white block mb-1">
                  {progress.phase === 'initializing' ? '?? ��ʼ����' :
                    progress.phase === 'scanning' ? '?? ɨ����' :
                      progress.phase === 'analyzing' ? '?? ������' :
                        progress.phase === 'reporting' ? '?? ���ɱ���' :
                          '? ���'}
                </span>
                <p className="text-sm text-gray-300 font-medium">
                  {progress.currentModule} - {progress.currentCheck}
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-2xl sm:text-3xl font-bold text-blue-400 mb-1">
                {Math.round(progress.progress)}%
              </div>
              {progress.estimatedTimeRemaining && (
                <div className="text-sm text-gray-300 font-medium">
                  ʣ�� {Math.round(progress.estimatedTimeRemaining / 1000)} ��
                </div>
              )}
            </div>
          </div>

          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="h-2 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress.progress, 100)}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent animate-pulse"></div>
            </div>
          </div>

          {progress.statistics && (
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
              <div className="bg-gray-700/30 rounded-lg p-3 sm:p-4 border border-gray-600/50">
                <div className="text-lg sm:text-xl font-bold text-white mb-1">
                  {progress.statistics.totalChecks || 0}
                </div>
                <div className="text-sm text-gray-300 font-medium">�ܼ����</div>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-3 sm:p-4 border border-gray-600/50">
                <div className="text-lg sm:text-xl font-bold text-green-400 mb-1">
                  {progress.statistics.passedChecks || 0}
                </div>
                <div className="text-sm text-gray-300 font-medium">ͨ��</div>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-3 sm:p-4 border border-gray-600/50">
                <div className="text-lg sm:text-xl font-bold text-red-400 mb-1">
                  {progress.statistics.failedChecks || 0}
                </div>
                <div className="text-sm text-gray-300 font-medium">ʧ��</div>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-3 sm:p-4 border border-gray-600/50">
                <div className="text-lg sm:text-xl font-bold text-yellow-400 mb-1">
                  {progress.statistics.warningChecks || 0}
                </div>
                <div className="text-sm text-gray-300 font-medium">����</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ��ǿ������ʾ */}
      {enhancedError && (
        <ErrorDisplay
          error={enhancedError}
          onDismiss={() => setEnhancedError(null)}
          onRetry={() => {
            setEnhancedError(null);
            runTest();
          }}
        />
      )}

      {/* �򵥴�����ʾ�������ݣ� */}
      {error && !enhancedError && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-3 sm:p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h4 className="font-semibold text-red-400 text-sm sm:text-base">����ʧ��</h4>
              <p className="text-xs sm:text-sm text-red-300 mt-1 break-words">{error}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});

SecurityTestPanel.displayName = 'SecurityTestPanel';



