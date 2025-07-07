/**
 * 标准安全测试内容组件
 */

import { AlertTriangle, CheckCircle, Globe, Loader, Lock, Settings, Shield, XCircle } from 'lucide-react';
import React, { useState } from 'react';
import { AdvancedTestConfig } from '../../services/advancedTestEngine';
import { EnhancedSecurityAnalysis } from '../analysis';
import { AdvancedTestCharts } from '../charts';
import { URLInput } from '../testing';

// 数据适配器：将增强安全测试结果转换为 EnhancedSecurityAnalysis 期望的格式
const adaptSecurityResult = (result: any) => {
  if (!result) return null;

  // 转换风险等级
  const adaptRiskLevel = (risk: string) => {
    if (risk === 'critical') return 'high';
    return risk as 'low' | 'medium' | 'high';
  };

  // 保持英文 severity 值，确保颜色正确显示
  const adaptSeverity = (severity: string) => {
    const severityMap: { [key: string]: 'low' | 'medium' | 'high' | 'critical' | 'info' } = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'critical',
      'info': 'info'
    };
    return severityMap[severity] || 'info';
  };

  // 转换头部分析格式
  const adaptHeaderAnalysis = (headerAnalysis: any) => {
    if (!headerAnalysis) return {};

    const adapted: { [key: string]: { present: boolean; value: string | null; description: string } } = {};

    Object.entries(headerAnalysis).forEach(([key, value]: [string, any]) => {
      adapted[key] = {
        present: value.present || false,
        value: value.value || null,
        description: value.recommendation || value.description || ''
      };
    });

    return adapted;
  };

  return {
    securityScore: result.securityScore || 0,
    overallRisk: adaptRiskLevel(result.overallRisk || 'low'),
    checks: result.checks || {},
    vulnerabilities: (result.vulnerabilities || []).map((vuln: any) => ({
      type: vuln.type || '未知',
      severity: adaptSeverity(vuln.severity || 'low'),
      description: vuln.description || '',
      recommendation: vuln.recommendation || ''
    })),
    recommendations: result.recommendations || [],
    sslInfo: result.sslInfo ? {
      valid: result.sslInfo.valid,
      subject: result.sslInfo.subject,
      issuer: result.sslInfo.issuer,
      validFrom: result.sslInfo.validFrom,
      validTo: result.sslInfo.expiryDate,
      protocol: result.sslInfo.protocol,
      reason: result.sslInfo.reason
    } : undefined,
    headerAnalysis: adaptHeaderAnalysis(result.headerAnalysis),
    cookieAnalysis: result.cookieAnalysis,
    cspAnalysis: result.cspAnalysis
  };
};

interface SecurityTestConfig extends AdvancedTestConfig {
  checkSSL: boolean;
  checkHeaders: boolean;
  checkVulnerabilities: boolean;
  checkCookies: boolean;
  checkCSP: boolean;
  checkXSS: boolean;
  checkSQLInjection: boolean;
  checkMixedContent: boolean;
  depth: 'basic' | 'standard' | 'comprehensive';
}

// 注释掉未使用的接口，保留以备将来使用
// interface SecurityResult {
//   id: string;
//   url: string;
//   timestamp: string;
//   overallScore: number;
//   sslScore: number;
//   headersScore: number;
//   vulnerabilityScore: number;
//   cookieScore: number;
//   cspScore: number;
//   findings: SecurityFinding[];
//   recommendations: string[];
//   status: 'completed' | 'failed';
// }

// 注释掉未使用的接口，保留以备将来使用
// interface SecurityFinding {
//   type: 'ssl' | 'headers' | 'vulnerability' | 'cookie' | 'csp' | 'xss' | 'sql' | 'mixed';
//   severity: 'low' | 'medium' | 'high' | 'critical';
//   title: string;
//   description: string;
//   recommendation: string;
//   details?: any;
// }

interface StandardSecurityTestContentProps {
  onTestStart: () => void;
  onTestComplete: (result: any) => void;
  onTestError: (error: string) => void;
  testResult: any;
  testHistory: any[];
  isTestRunning: boolean;
  error: string | null;
  runTest: (config: any) => Promise<any>;
  isLoading: boolean;
  progress: number;
  testError: string | null;
}

export const StandardSecurityTestContent: React.FC<StandardSecurityTestContentProps> = ({
  onTestStart,
  onTestComplete,
  onTestError,
  testResult,
  testHistory: _testHistory, // 未使用但保留接口
  isTestRunning: _isTestRunning, // 未使用但保留接口
  error,
  runTest,
  isLoading,
  progress,
  testError
}) => {
  const [config, setConfig] = useState<SecurityTestConfig>({
    url: '',
    testType: 'security',
    device: 'desktop',
    screenshots: false,
    timeout: 30000,
    checkSSL: true,
    checkHeaders: true,
    checkVulnerabilities: true,
    checkCookies: true,
    checkCSP: true,
    checkXSS: false,
    checkSQLInjection: false,
    checkMixedContent: true,
    depth: 'standard',
    options: {}
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleRunTest = async () => {
    if (!config.url) {
      onTestError('请输入要测试的URL');
      return;
    }

    onTestStart();

    try {
      const testConfig: AdvancedTestConfig = {
        url: config.url,
        testType: 'security',
        options: {
          checkSSL: config.checkSSL,
          checkHeaders: config.checkHeaders,
          checkVulnerabilities: config.checkVulnerabilities,
          checkCookies: config.checkCookies,
          checkCSP: config.checkCSP,
          checkXSS: config.checkXSS,
          checkSQLInjection: config.checkSQLInjection,
          checkMixedContent: config.checkMixedContent,
          depth: config.depth
        },
        device: config.device,
        screenshots: config.screenshots,
        timeout: config.timeout
      };

      const result = await runTest(testConfig);

      if (result) {
        onTestComplete(result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '安全测试失败';
      onTestError(errorMessage);
    }
  };

  return (
    <div className="security-test-container space-y-8">
      {/* 配置面板 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center">
          <Shield className="mr-2 h-5 w-5" />
          标准安全测试配置
        </h3>

        {/* URL输入 */}
        <div className="mb-6">
          <URLInput
            value={config.url}
            onChange={(url) => setConfig({ ...config, url })}
            placeholder="输入要测试的网站URL"
            disabled={isLoading}
          />
        </div>

        {/* 基础配置 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {[
            { key: 'checkSSL', label: 'SSL/TLS检查', icon: Lock },
            { key: 'checkHeaders', label: '安全头检查', icon: Shield },
            { key: 'checkVulnerabilities', label: '漏洞扫描', icon: AlertTriangle },
            { key: 'checkCookies', label: 'Cookie安全', icon: CheckCircle },
            { key: 'checkCSP', label: 'CSP检查', icon: Shield },
            { key: 'checkMixedContent', label: '混合内容', icon: Globe }
          ].map(({ key, label, icon: Icon }) => (
            <label key={key} className="flex items-center space-x-2 cursor-pointer p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <input
                type="checkbox"
                checked={config[key as keyof SecurityTestConfig] as boolean}
                onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                disabled={isLoading}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Icon className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>

        {/* 高级选项切换 */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <Settings className="h-4 w-4" />
            <span>{showAdvanced ? '隐藏' : '显示'}高级选项</span>
          </button>
        </div>

        {/* 高级选项 */}
        {showAdvanced && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-2">扫描深度</label>
              <select
                value={config.depth}
                onChange={(e) => setConfig({ ...config, depth: e.target.value as any })}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                aria-label="选择扫描深度"
                title="选择扫描深度"
              >
                <option value="basic">基础扫描</option>
                <option value="standard">标准扫描</option>
                <option value="comprehensive">全面扫描</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">设备类型</label>
              <select
                value={config.device}
                onChange={(e) => setConfig({ ...config, device: e.target.value as any })}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                aria-label="选择设备类型"
                title="选择设备类型"
              >
                <option value="desktop">桌面端</option>
                <option value="mobile">移动端</option>
                <option value="tablet">平板端</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">超时时间</label>
              <select
                value={config.timeout}
                onChange={(e) => setConfig({ ...config, timeout: Number(e.target.value) })}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                aria-label="选择超时时间"
                title="选择超时时间"
              >
                <option value={15000}>15秒</option>
                <option value={30000}>30秒</option>
                <option value={60000}>60秒</option>
                <option value={120000}>120秒</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.screenshots}
                  onChange={(e) => setConfig({ ...config, screenshots: e.target.checked })}
                  disabled={isLoading}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">截图</span>
              </label>
            </div>
          </div>
        )}

        {/* 开始测试按钮 */}
        <button
          type="button"
          onClick={handleRunTest}
          disabled={isLoading || !config.url}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader className="animate-spin h-5 w-5 mr-2" />
              测试中... {Math.round(progress)}%
            </>
          ) : (
            <>
              <Shield className="mr-2 h-5 w-5" />
              开始标准安全测试
            </>
          )}
        </button>
      </div>

      {/* 错误显示 */}
      {(error || testError) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-400">{error || testError}</span>
          </div>
        </div>
      )}

      {/* 测试结果 */}
      {testResult && !isLoading && (
        <div className="space-y-6">
          {/* 安全分析 */}
          {adaptSecurityResult(testResult) && (
            <EnhancedSecurityAnalysis result={adaptSecurityResult(testResult)!} />
          )}

          {/* 图表展示 */}
          <AdvancedTestCharts results={testResult} testType="security" />
        </div>
      )}

      {/* 空状态 */}
      {!testResult && !isLoading && !error && !testError && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center text-gray-500">
            <Shield className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold mb-2">开始标准安全测试</h3>
            <p>输入URL并配置测试选项，然后点击"开始标准安全测试"按钮</p>
          </div>
        </div>
      )}
    </div>
  );
};
