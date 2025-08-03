
import React, { useState } from 'react';
import { Shield, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import EnhancedUrlInput from './EnhancedUrlInput';
import EnhancedErrorDisplay from './EnhancedErrorDisplay';
import { createCommonErrors } from '../../utils/errorHandler';
import { URLValidationResult } from '../../utils/enhancedUrlValidator';

const SecurityTestDemo: React.FC = () => {
  const [url, setUrl] = useState('');
  const [validationResult, setValidationResult] = useState<URLValidationResult | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [showErrorDemo, setShowErrorDemo] = useState(false);

  const handleValidationChange = (valid: boolean, result?: URLValidationResult) => {
    setIsValid(valid);
    setValidationResult(result || null);
  };

  const demoErrors = [
    {
      name: '网络错误',
      error: createCommonErrors.networkError('https://example.com')
    },
    {
      name: 'URL格式错误',
      error: createCommonErrors.invalidUrl('invalid-url')
    },
    {
      name: 'SSL错误',
      error: createCommonErrors.sslError('https://expired.badssl.com')
    },
    {
      name: '超时错误',
      error: createCommonErrors.timeoutError('https://slow-website.com')
    },
    {
      name: '服务器错误',
      error: createCommonErrors.serverError('https://httpstat.us/500', 500)
    }
  ];

  const [selectedError, setSelectedError] = useState(demoErrors[0].error);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* 标题 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center">
          <Shield className="h-8 w-8 mr-3 text-blue-400" />
          安全测试功能演示
        </h1>
        <p className="text-gray-300">
          体验增强的URL验证和智能错误处理功能
        </p>
      </div>

      {/* URL验证演示 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Zap className="h-5 w-5 mr-2 text-yellow-400" />
          智能URL验证
        </h2>

        <div className="space-y-4">
          <EnhancedUrlInput
            value={url}
            onChange={setUrl}
            onValidationChange={handleValidationChange}
            placeholder="输入URL进行实时验证..."
            showSuggestions={true}
            autoFix={true}
          />

          {/* 验证状态显示 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {isValid ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                )}
                <span className="font-medium text-white">验证状态</span>
              </div>
              <p className={`text-sm ${isValid ? 'text-green-300' : 'text-red-300'}`}>
                {isValid ? '✅ URL格式正确' : '❌ URL格式有误'}
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                <span className="font-medium text-white">自动修复</span>
              </div>
              <p className="text-sm text-gray-300">
                {validationResult?.autoFixes.length || 0} 项修复建议
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-5 w-5 text-blue-400" />
                <span className="font-medium text-white">安全检查</span>
              </div>
              <p className="text-sm text-gray-300">
                {validationResult?.securityNotes.length || 0} 项安全提示
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 错误处理演示 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
          智能错误处理
        </h2>

        <div className="space-y-4">
          {/* 错误类型选择 */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              选择错误类型进行演示:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {demoErrors.map((demo, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedError(demo.error);
                    setShowErrorDemo(true);
                  }}
                  className="px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white rounded-lg text-sm transition-colors"
                >
                  {demo.name}
                </button>
              ))}
            </div>
          </div>

          {/* 错误显示演示 */}
          {showErrorDemo && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">错误处理演示</h3>
                <button
                  onClick={() => setShowErrorDemo(false)}
                  className="px-3 py-1 bg-gray-600/50 hover:bg-gray-600 text-gray-300 hover:text-white rounded text-sm transition-colors"
                >
                  关闭演示
                </button>
              </div>

              <EnhancedErrorDisplay
                error={selectedError}
                onDismiss={() => setShowErrorDemo(false)}
                onRetry={() => {
                  console.log('重试操作');
                  setShowErrorDemo(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 功能特点说明 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">✨ 功能特点</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-white mb-3">URL验证增强</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start space-x-2">
                <span className="text-green-400 mt-1">•</span>
                <span>实时格式验证和错误提示</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-400 mt-1">•</span>
                <span>自动修复常见URL格式错误</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-400 mt-1">•</span>
                <span>智能协议补全（自动添加https://）</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-400 mt-1">•</span>
                <span>安全性检查和建议</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-400 mt-1">•</span>
                <span>常用URL示例和快速应用</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium text-white mb-3">错误处理优化</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start space-x-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>智能错误分类和图标显示</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>详细的解决方案和操作步骤</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>快速操作按钮（重试、修复等）</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>相关资源链接和帮助文档</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>错误代码和详细信息展示</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">📖 使用说明</h2>
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            <strong className="text-white">1. URL验证：</strong>
            在上方输入框中输入任意URL，系统会实时验证格式并提供修复建议。
          </p>
          <p>
            <strong className="text-white">2. 自动修复：</strong>
            当检测到格式错误时，点击⚡图标可自动应用修复建议。
          </p>
          <p>
            <strong className="text-white">3. 错误演示：</strong>
            点击不同的错误类型按钮，查看相应的错误处理界面和解决方案。
          </p>
          <p>
            <strong className="text-white">4. 实际应用：</strong>
            这些功能已集成到安全测试页面中，提供更好的用户体验。
          </p>
        </div>
      </div>
    </div>
  );
};

export default SecurityTestDemo;
