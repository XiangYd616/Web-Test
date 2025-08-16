import {AlertCircle, AlertTriangle, CheckCircle, Globe, Link, Loader} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import {URLValidationResult} from '../../utils/urlValidator';

interface URLInputProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  enableReachabilityCheck?: boolean;
  onValidationChange?: (isValid: boolean, result?: URLValidationResult) => void;
}

const URLInput: React.FC<URLInputProps> = ({
  value,
  onChange,
  placeholder = "输入网站URL...",
  className = "",
  disabled = false,
  required = false,
  autoFocus = false,
  enableReachabilityCheck = false,
  onValidationChange
}) => {
  const [validationResult, setValidationResult] = useState<URLValidationResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const performValidation = useCallback(async (url: string) => {
    if (!url) {
      
        setValidationResult(null);
      onValidationChange?.(false);
      return;
      }

    setIsChecking(true);
    try {
      const result = await validateURL(url, {
        checkReachability: enableReachabilityCheck,
        timeout: 5000
      });

      setValidationResult(result);
      onValidationChange?.(result.isValid, result);
    } catch (error) {
      const errorResult: URLValidationResult = {
        isValid: false,
        originalUrl: url,
        errors: ['验证过程中发生错误'],
        warnings: [],
        suggestions: [],
        autoFixes: [],
        securityNotes: []
      };
      setValidationResult(errorResult);
      onValidationChange?.(false, errorResult);
    } finally {
      setIsChecking(false);
    }
  }, [enableReachabilityCheck, onValidationChange]);

  // 延迟验证
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (value) {
        performValidation(value);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value, performValidation]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  const handleBlur = () => {
    if (value) {
      performValidation(value);
    }
  };

  const getIconColor = () => {
    if (isChecking) return "text-blue-400";
    if (validationResult?.isValid === true) return "text-green-400";
    if (validationResult?.isValid === false) return "text-red-400";
    return "text-gray-400";
  };

  const getBorderColor = () => {
    if (validationResult?.isValid === true) return "border-green-500 focus:ring-green-500";
    if (validationResult?.isValid === false) return "border-red-500 focus:ring-red-500";
    return "border-gray-600 focus:ring-blue-500";
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="url"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          className={`
            themed-input !pl-12 !pr-12
            ${getBorderColor()}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />

        {/* 左侧图标 */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <Globe className={`w-5 h-5 ${getIconColor()}`} />
        </div>

        {/* 右侧状态图标 */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isChecking && (
            <Loader className="w-5 h-5 text-blue-400 animate-spin" />
          )}
          {!isChecking && validationResult?.isValid === true && (
            <CheckCircle className="w-5 h-5 text-green-400" />
          )}
          {!isChecking && validationResult?.isValid === false && (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          {!isChecking && !validationResult && value && (
            <Link className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* 错误信息 */}
      {validationResult?.errors && validationResult.errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {validationResult.errors.map((error, index) => (
            <div key={index} className="text-sm text-red-400 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
              {error}
            </div>
          ))}
        </div>
      )}

      {/* 警告信息 */}
      {validationResult?.warnings && validationResult.warnings.length > 0 && (
        <div className="mt-2 space-y-1">
          {validationResult.warnings.map((warning, index) => (
            <div key={index} className="text-sm text-yellow-400 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1 flex-shrink-0" />
              {warning}
            </div>
          ))}
        </div>
      )}

      {/* 建议信息 */}
      {validationResult?.suggestions && validationResult.suggestions.length > 0 && (
        <div className="mt-2 space-y-1">
          {validationResult.suggestions.map((suggestion, index) => (
            <div key={index} className="text-sm text-blue-400 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 flex-shrink-0" />
              {suggestion}
            </div>
          ))}
        </div>
      )}

      {/* 成功信息 */}
      {validationResult?.isValid === true && validationResult.errors.length === 0 && (
        <div className="mt-2 text-sm text-green-400 flex items-center">
          <CheckCircle className="w-4 h-4 mr-1" />
          URL格式正确
          {validationResult.reachable !== undefined && (
            <span className="ml-2">
              {validationResult.reachable ? '✓ 可访问' : '⚠ 可能无法访问'}
            </span>
          )}
          {validationResult.responseTime && (
            <span className="ml-2 text-xs text-gray-400">
              ({validationResult.responseTime}ms)
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default URLInput;
