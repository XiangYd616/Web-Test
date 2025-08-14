import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Lock, Eye, EyeOff } from 'lucide-react';

interface SecurityTestConfigProps {
  config: any;
  onConfigChange: (config: any) => void;
  onSaveConfig?: (config: any) => void;
  disabled?: boolean;
}

export const SecurityTestConfig: React.FC<SecurityTestConfigProps> = ({
  config,
  onConfigChange,
  onSaveConfig,
  disabled = false
}) => {
  const [securityChecks, setSecurityChecks] = useState({
    checkSSL: config.checkSSL ?? true,
    checkHeaders: config.checkHeaders ?? true,
    checkVulnerabilities: config.checkVulnerabilities ?? true,
    checkCookies: config.checkCookies ?? true,
    checkCSP: config.checkCSP ?? true,
    checkXSS: config.checkXSS ?? false,
    checkSQLInjection: config.checkSQLInjection ?? false,
    checkMixedContent: config.checkMixedContent ?? true
  });

  const [scanSettings, setScanSettings] = useState({
    depth: config.depth || 'standard',
    timeout: config.timeout || 30000,
    userAgent: config.userAgent || 'SecurityTestBot/1.0',
    followRedirects: config.followRedirects ?? true,
    maxRedirects: config.maxRedirects || 5
  });

  const [advancedSettings, setAdvancedSettings] = useState({
    customHeaders: config.customHeaders || {},
    excludePatterns: config.excludePatterns || [],
    includeSubdomains: config.includeSubdomains ?? false,
    checkPorts: config.checkPorts || [80, 443, 8080, 8443],
    authConfig: config.authConfig || { type: 'none' }
  });

  // 更新配置
  useEffect(() => {
    const newConfig = {
      ...config,
      ...securityChecks,
      ...scanSettings,
      ...advancedSettings
    };
    onConfigChange(newConfig);
  }, [securityChecks, scanSettings, advancedSettings]);

  const handleSecurityCheckChange = (key: string, value: boolean) => {
    setSecurityChecks(prev => ({ ...prev, [key]: value }));
  };

  const handleScanSettingChange = (key: string, value: any) => {
    setScanSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleAdvancedSettingChange = (key: string, value: any) => {
    setAdvancedSettings(prev => ({ ...prev, [key]: value }));
  };

  const securityCheckOptions = [
    {
      key: 'checkSSL',
      label: 'SSL/TLS检查',
      description: '检查SSL证书有效性、加密强度和配置',
      icon: Lock,
      severity: 'high'
    },
    {
      key: 'checkHeaders',
      label: '安全头检查',
      description: '检查HSTS、CSP、X-Frame-Options等安全头',
      icon: Shield,
      severity: 'medium'
    },
    {
      key: 'checkVulnerabilities',
      label: '漏洞扫描',
      description: '扫描常见的Web应用漏洞',
      icon: AlertTriangle,
      severity: 'high'
    },
    {
      key: 'checkCookies',
      label: 'Cookie安全',
      description: '检查Cookie的安全属性设置',
      icon: Eye,
      severity: 'medium'
    },
    {
      key: 'checkCSP',
      label: '内容安全策略',
      description: '检查CSP配置和有效性',
      icon: Shield,
      severity: 'medium'
    },
    {
      key: 'checkXSS',
      label: 'XSS检测',
      description: '检测跨站脚本攻击漏洞（谨慎使用）',
      icon: AlertTriangle,
      severity: 'high',
      warning: true
    },
    {
      key: 'checkSQLInjection',
      label: 'SQL注入检测',
      description: '检测SQL注入漏洞（谨慎使用）',
      icon: AlertTriangle,
      severity: 'high',
      warning: true
    },
    {
      key: 'checkMixedContent',
      label: '混合内容检查',
      description: '检查HTTPS页面中的HTTP资源',
      icon: Lock,
      severity: 'low'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* 安全检查选项 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          安全检查项目
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {securityCheckOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <div key={option.key} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <IconComponent className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {option.label}
                        </h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(option.severity)}`}>
                          {option.severity === 'high' ? '高' : option.severity === 'medium' ? '中' : '低'}
                        </span>
                        {option.warning && (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" title="此选项可能对目标网站造成影响" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {option.description}
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={securityChecks[option.key]}
                      onChange={(e) => handleSecurityCheckChange(option.key, e.target.checked)}
                      disabled={disabled}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        {/* 警告提示 */}
        {(securityChecks.checkXSS || securityChecks.checkSQLInjection) && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">注意事项</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  您已启用了主动漏洞检测功能。请确保：
                </p>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 list-disc list-inside space-y-1">
                  <li>您有权限对目标网站进行安全测试</li>
                  <li>测试可能会在服务器日志中留下记录</li>
                  <li>建议在测试环境中进行，避免影响生产环境</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 扫描设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">扫描设置</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              扫描深度
            </label>
            <select
              value={scanSettings.depth}
              onChange={(e) => handleScanSettingChange('depth', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="basic">基础扫描</option>
              <option value="standard">标准扫描</option>
              <option value="deep">深度扫描</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              深度扫描会花费更多时间但检查更全面
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              超时时间 (毫秒)
            </label>
            <input
              type="number"
              value={scanSettings.timeout}
              onChange={(e) => handleScanSettingChange('timeout', parseInt(e.target.value))}
              disabled={disabled}
              min="5000"
              max="300000"
              step="1000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              用户代理
            </label>
            <input
              type="text"
              value={scanSettings.userAgent}
              onChange={(e) => handleScanSettingChange('userAgent', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              最大重定向次数
            </label>
            <input
              type="number"
              value={scanSettings.maxRedirects}
              onChange={(e) => handleScanSettingChange('maxRedirects', parseInt(e.target.value))}
              disabled={disabled}
              min="0"
              max="20"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={scanSettings.followRedirects}
              onChange={(e) => handleScanSettingChange('followRedirects', e.target.checked)}
              disabled={disabled}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">跟随重定向</span>
          </label>
        </div>
      </div>

      {/* 高级设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">高级设置</h3>

        <div className="space-y-4">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={advancedSettings.includeSubdomains}
                onChange={(e) => handleAdvancedSettingChange('includeSubdomains', e.target.checked)}
                disabled={disabled}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">包含子域名检查</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              检查端口 (逗号分隔)
            </label>
            <input
              type="text"
              value={advancedSettings.checkPorts.join(', ')}
              onChange={(e) => handleAdvancedSettingChange('checkPorts',
                e.target.value.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p))
              )}
              disabled={disabled}
              placeholder="80, 443, 8080, 8443"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              排除模式 (每行一个正则表达式)
            </label>
            <textarea
              value={advancedSettings.excludePatterns.join('\n')}
              onChange={(e) => handleAdvancedSettingChange('excludePatterns',
                e.target.value.split('\n').filter(p => p.trim())
              )}
              disabled={disabled}
              placeholder=".*\.pdf$\n.*\.jpg$"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityTestConfig;
