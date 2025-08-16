import {AlertCircle, CheckCircle, ExternalLink, Globe, Zap} from 'lucide-react';
import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import {cn} from '../../utils/cn';
import {Input} from './Input';

// URL输入组件的接口
interface URLInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** 输入值 */
  value: string;
  /** 值变化回调 */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** 是否启用URL验证 */
  enableValidation?: boolean;
  /** 是否显示协议建议 */
  showProtocolSuggestion?: boolean;
  /** 是否自动添加协议 */
  autoAddProtocol?: boolean;
  /** 验证回调 */
  onValidationChange?: (isValid: boolean, url?: string) => void;
  /** 组件尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示外部链接按钮 */
  showExternalLink?: boolean;
  /** 是否显示自动修复按钮 */
  showAutoFix?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const URLInput = forwardRef<HTMLInputElement, URLInputProps>(({
  value = '',
  onChange,
  enableValidation = true,
  showProtocolSuggestion = true,
  autoAddProtocol = true,
  onValidationChange,
  size = 'md',
  showExternalLink = true,
  showAutoFix = true,
  placeholder = '输入要进行压力测试的网站URL...',
  className,
  disabled,
  ...props
}, ref) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [suggestion, setSuggestion] = useState<string>('');
  const [correctedUrl, setCorrectedUrl] = useState<string>('');

  // URL验证函数
  const validateURL = useCallback((url: string) => {
    if (!url.trim()) {
      setIsValid(null);
      setSuggestion('');
      setCorrectedUrl('');
      onValidationChange?.(false);
      return;
    }

    try {
      // 尝试自动添加协议
      let testUrl = url;
      let needsProtocol = false;

      if (!url.match(/^https?:\/\//)) {
        testUrl = `https://${url}`;
        needsProtocol = true;
      }

      // 验证URL格式
      const urlObj = new URL(testUrl);

      // 检查是否是有效的域名格式
      if (urlObj.hostname && urlObj.hostname.includes('.')) {
        setIsValid(true);
        setCorrectedUrl(testUrl);

        if (needsProtocol && showProtocolSuggestion) {
          setSuggestion(`建议使用完整URL: ${testUrl}`);
        } else {
          setSuggestion('');
        }

        onValidationChange?.(true, testUrl);
      } else {
        throw new Error('Invalid hostname');
      }
    } catch {
      setIsValid(false);
      setCorrectedUrl('');

      if (showProtocolSuggestion && !url.match(/^https?:\/\//)) {
        const suggestedUrl = `https://${url}`;
        setSuggestion(`尝试添加协议: ${suggestedUrl}`);
        setCorrectedUrl(suggestedUrl);
      } else {
        setSuggestion('请输入有效的URL格式（如：https://example.com）');
      }

      onValidationChange?.(false);
    }
  }, [autoAddProtocol, showProtocolSuggestion, onValidationChange]);

  // 防抖验证
  useEffect(() => {
    if (!enableValidation) return undefined;

    const timer = setTimeout(() => {
      validateURL(value);
    }, 300);

    return () => clearTimeout(timer);
  }, [value, enableValidation, validateURL]);

  // 应用建议的URL
  const applySuggestion = useCallback(() => {
    if (correctedUrl) {
      const syntheticEvent = {
        target: { value: correctedUrl }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  }, [correctedUrl, onChange]);

  // 在新窗口打开URL
  const openInNewTab = useCallback(() => {
    if (isValid && (correctedUrl || value)) {
      const urlToOpen = correctedUrl || value;
      window.open(urlToOpen, '_blank', 'noopener,noreferrer');
    }
  }, [isValid, correctedUrl, value]);

  // 确定右侧图标
  const getRightIcon = () => {
    const icons = [];

    // 验证状态图标
    if (enableValidation && isValid !== null) {
      if (isValid) {
        icons.push(
          <CheckCircle key="check" className="w-4 h-4 text-green-400" />
        );
      } else {
        icons.push(
          <AlertCircle key="alert" className="w-4 h-4 text-red-400" />
        );
      }
    }

    // 自动修复按钮
    if (showAutoFix && suggestion && correctedUrl && correctedUrl !== value && !disabled) {
      icons.push(
        <button
          key="fix"
          type="button"
          onClick={applySuggestion}
          className="p-1 hover:bg-gray-600/50 rounded transition-colors"
          title="自动修复URL"
        >
          <Zap className="w-4 h-4 text-yellow-400" />
        </button>
      );
    }

    // 外部链接按钮
    if (showExternalLink && isValid && !disabled) {
      icons.push(
        <button
          key="external"
          type="button"
          onClick={openInNewTab}
          className="p-1 hover:bg-gray-600/50 rounded transition-colors"
          title="在新窗口打开"
        >
          <ExternalLink className="w-4 h-4 text-blue-400" />
        </button>
      );
    }

    if (icons.length === 0) return undefined;
    if (icons.length === 1) return icons[0];

    return (
      <div className="flex items-center space-x-1">
        {icons}
      </div>
    );
  };

  // 确定状态属性
  const getStatusProps = () => {
    if (!enableValidation || isValid === null) {
      return {};
    }

    if (isValid) {
      return {
        success: 'URL格式正确'
      };
    } else {
      return {
        error: 'URL格式无效'
      };
    }
  };

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div className="w-full">
        <Input
          ref={ref}
          type="url"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          leftIcon={<Globe className="w-4 h-4 text-gray-400" />}
          rightIcon={getRightIcon()}
          size={size}
          disabled={disabled}
          className="w-full"
          {...getStatusProps()}
          {...props}
        />
      </div>

      {/* 建议提示 */}
      {suggestion && enableValidation && (
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="text-sm text-blue-300 break-words">{suggestion}</span>
          </div>
          {correctedUrl && correctedUrl !== value && (
            <button
              type="button"
              onClick={applySuggestion}
              className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm rounded transition-colors flex-shrink-0 w-full sm:w-auto text-center"
            >
              应用
            </button>
          )}
        </div>
      )}
    </div>
  );
});

URLInput.displayName = 'URLInput';

export default URLInput;
