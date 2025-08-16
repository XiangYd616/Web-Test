
import {AlertTriangle, CheckCircle, ExternalLink, Globe, HelpCircle, RefreshCw, Zap} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {URLValidationResult, validateUrlSync} from '../../utils/urlValidator';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean, result?: URLValidationResult) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showSuggestions?: boolean;
  autoFix?: boolean;
}

const COMMON_EXAMPLES = [
  'https://www.example.com',
  'https://github.com',
  'https://www.google.com',
  'http://localhost:3000'
];

export const UrlInput: React.FC<UrlInputProps> = ({
  value,
  onChange,
  onValidationChange,
  placeholder = 'https://example.com',
  disabled = false,
  className = '',
  showSuggestions = true,
  autoFix = true
}) => {
  const [validationResult, setValidationResult] = useState<URLValidationResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // 实时验证
  const validateInput = useCallback((url: string) => {
    if (!url.trim()) {
      setValidationResult(null);
      onValidationChange?.(false);
      return;
    }

    setIsValidating(true);

    // 使用setTimeout模拟异步验证，避免阻塞UI
    setTimeout(() => {
      const result = validateUrlSync(url, {
        allowHttp: true,
        allowLocalhost: true,
        allowIP: true
      });

      setValidationResult(result);
      onValidationChange?.(result.isValid, result);
      setIsValidating(false);
    }, 100);
  }, [onValidationChange]);

  // 防抖验证
  useEffect(() => {
    const timer = setTimeout(() => {
      validateInput(value);
    }, 300);

    return () => clearTimeout(timer);
  }, [value, validateInput]);

  // 自动修复URL
  const handleAutoFix = useCallback(() => {
    if (validationResult?.correctedUrl && validationResult.correctedUrl !== value) {
      onChange(validationResult.correctedUrl);
    }
  }, [validationResult, value, onChange]);

  // 应用示例URL
  const handleApplyExample = useCallback((example: string) => {
    onChange(example);
  }, [onChange]);

  // 在浏览器中打开URL
  const handleOpenInBrowser = useCallback(() => {
    if (validationResult?.isValid && validationResult.correctedUrl) {
      window.open(validationResult.correctedUrl, '_blank', 'noopener,noreferrer');
    }
  }, [validationResult]);

  // 获取状态图标
  const getStatusIcon = useMemo(() => {
    if (isValidating) {
      return <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />;
    }

    if (!value.trim()) {
      return <Globe className="h-4 w-4 text-gray-400" />;
    }

    if (validationResult?.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }

    return <AlertTriangle className="h-4 w-4 text-red-400" />;
  }, [isValidating, value, validationResult]);

  // 获取输入框边框样式
  const getBorderStyle = useMemo(() => {
    if (!value.trim()) {
      return 'border-gray-600 focus:border-blue-500';
    }

    if (validationResult?.isValid) {
      return 'border-green-500/50 focus:border-green-500';
    }

    if (validationResult?.errors.length) {
      return 'border-red-500/50 focus:border-red-500';
    }

    return 'border-gray-600 focus:border-blue-500';
  }, [value, validationResult]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* URL输入框 */}
      <div className="relative">
        <div className="absolute left-3 sm:left-3.5 top-1/2 transform -translate-y-1/2 z-10">
          {getStatusIcon}
        </div>

        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`enhanced-url-input w-full pl-14 sm:pl-16 pr-16 sm:pr-18 py-2.5 sm:py-3 text-sm bg-gray-700/50 border ${getBorderStyle} rounded-lg text-white placeholder-gray-400 focus:ring-1 focus:ring-current transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />

        <div className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1.5">
          {/* 自动修复按钮 */}
          {autoFix && validationResult?.autoFixes.length > 0 && validationResult.correctedUrl !== value && (
            <button
              type="button"
              onClick={handleAutoFix}
              className="p-1 hover:bg-gray-600/50 rounded transition-colors"
              title="自动修复URL"
            >
              <Zap className="h-4 w-4 text-yellow-400" />
            </button>
          )}

          {/* 在浏览器中打开 */}
          {validationResult?.isValid && (
            <button
              type="button"
              onClick={handleOpenInBrowser}
              className="p-1 hover:bg-gray-600/50 rounded transition-colors"
              title="在浏览器中打开"
            >
              <ExternalLink className="h-4 w-4 text-blue-400" />
            </button>
          )}

          {/* 帮助按钮 */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 hover:bg-gray-600/50 rounded transition-colors"
            title="查看详细信息"
          >
            <HelpCircle className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* 验证结果显示 */}
      {validationResult && (
        <div className="space-y-2">
          {/* 自动修复提示 */}
          {validationResult.autoFixes.length > 0 && (
            <div className="flex items-start space-x-2 p-3 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
              <Zap className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-yellow-300 font-medium">自动修复建议</p>
                <ul className="text-xs text-yellow-200 mt-1 space-y-1">
                  {validationResult.autoFixes.map((fix, index) => (
                    <li key={index}>• {fix}</li>
                  ))}
                </ul>
                {autoFix && validationResult.correctedUrl !== value && (
                  <button
                    type="button"
                    onClick={handleAutoFix}
                    className="mt-2 px-3 py-1 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 rounded text-xs transition-colors"
                  >
                    应用修复
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {validationResult.errors.length > 0 && (
            <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-red-300 font-medium">格式错误</p>
                  <ul className="text-xs text-red-200 mt-1 space-y-1">
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 安全提示 */}
          {validationResult.securityNotes.length > 0 && (
            <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-blue-300 font-medium">安全提示</p>
                  <ul className="text-xs text-blue-200 mt-1 space-y-1">
                    {validationResult.securityNotes.map((note, index) => (
                      <li key={index}>• {note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 建议 */}
          {validationResult.suggestions.length > 0 && showDetails && (
            <div className="p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-green-300 font-medium">优化建议</p>
                  <ul className="text-xs text-green-200 mt-1 space-y-1">
                    {validationResult.suggestions.map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 常用示例 */}
      {showSuggestions && !value.trim() && (
        <div className="p-3 bg-gray-700/30 rounded-lg">
          <p className="text-sm text-gray-300 font-medium mb-2">常用示例:</p>
          <div className="flex flex-wrap gap-2">
            {COMMON_EXAMPLES.map((example, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleApplyExample(example)}
                className="px-3 py-1 bg-gray-600/50 hover:bg-gray-600 text-gray-300 hover:text-white rounded text-xs transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UrlInput;
