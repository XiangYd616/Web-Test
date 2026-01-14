/**
 * 可选的UI增强组件
 * 为现有测试页面提供可选的UI增强功能，不强制替换现有实现
 */

import Logger from '@/utils/logger';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { ActionIcon, Icon as AppIcon } from './Icons';

// 可折叠面板属性
export interface CollapsiblePanelProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: React.ComponentType<any>;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  onToggle?: (expanded: boolean) => void;
}

// 代码块属性
export interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  copyable?: boolean;
  maxHeight?: string;
  className?: string;
}

// 统计卡片属性
export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: React.ComponentType<any>;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

// 快速操作按钮属性
export interface QuickActionProps {
  label: string;
  icon: React.ComponentType<any>;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// 全屏模式属性
export interface FullscreenWrapperProps {
  children: React.ReactNode;
  enabled?: boolean;
  onToggle?: (fullscreen: boolean) => void;
  className?: string;
}

/**
 * 可折叠面板组件
 */
export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  title,
  children,
  defaultExpanded = false,
  icon: PanelIcon,
  className = '',
  headerClassName = '',
  contentClassName = '',
  onToggle,
}) => {
  /**

   * 处理handleToggle事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    onToggle?.(newExpanded);
  };

  return (
    <div
      className={`bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden ${className}`}
    >
      {/* 头部 */}
      <button
        type="button"
        onClick={handleToggle}
        className={`
          w-full px-6 py-4 flex items-center justify-between
          hover:bg-gray-700/30 transition-colors
          ${headerClassName}
        `}
      >
        <div className="flex items-center space-x-3">
          {PanelIcon && <AppIcon icon={PanelIcon as any} size="md" color="primary" />}
          <h3 className="text-lg font-medium text-white">{title}</h3>
        </div>
        <AppIcon
          icon={expanded ? ChevronUp : ChevronDown}
          size="md"
          color="secondary"
          className="transition-transform duration-200"
        />
      </button>

      {/* 内容 */}
      <div
        className={`
        transition-all duration-300 ease-in-out overflow-hidden
        ${expanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}
      `}
      >
        <div className={`px-6 pb-6 ${contentClassName}`}>{children}</div>
      </div>
    </div>
  );
};

/**
 * 代码块组件
 */
export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'text',
  title,
  copyable = true,
  maxHeight = '400px',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Logger.error('复制失败:', error);
    }
  };

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-xl overflow-hidden ${className}`}>
      {/* 头部 */}
      {(title || copyable) && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800/50 border-b border-gray-700">
          {title && <span className="text-sm font-medium text-gray-300">{title}</span>}
          {copyable && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center space-x-2 px-3 py-1 text-sm text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <AppIcon
                icon={copied ? Check : Copy}
                size="sm"
                color={copied ? 'success' : 'current'}
              />
              <span>{copied ? '已复制' : '复制'}</span>
            </button>
          )}
        </div>
      )}

      {/* 代码内容 */}
      <div className="relative">
        <pre className="p-4 text-sm text-gray-300 overflow-auto font-mono" style={{ maxHeight }}>
          <code className={`language-${language}`}>{code}</code>
        </pre>
      </div>
    </div>
  );
};

/**
 * 统计卡片组件
 */
export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  icon: StatIcon,
  color = 'primary',
  className = '',
}) => {
  const colorStyles = {
    primary: 'border-blue-500/20 bg-blue-500/5',
    success: 'border-green-500/20 bg-green-500/5',
    warning: 'border-yellow-500/20 bg-yellow-500/5',
    error: 'border-red-500/20 bg-red-500/5',
    info: 'border-cyan-500/20 bg-cyan-500/5',
  };

  const iconColors = {
    primary: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    info: 'text-cyan-400',
  };

  return (
    <div
      className={`
      p-6 rounded-xl border backdrop-blur-sm
      ${colorStyles[color]}
      ${className}
    `}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {change && (
            <div
              className={`
              flex items-center space-x-1 mt-2 text-sm
              ${
                change.type === 'increase'
                  ? 'text-green-400'
                  : change.type === 'decrease'
                    ? 'text-red-400'
                    : 'text-gray-400'
              }
            `}
            >
              <span>
                {change.type === 'increase' ? '↗' : change.type === 'decrease' ? '↘' : '→'}
              </span>
              <span>{Math.abs(change?.value)}%</span>
            </div>
          )}
        </div>
        {StatIcon && (
          <div className={`p-3 rounded-lg bg-gray-800/50 ${iconColors[color]}`}>
            <AppIcon icon={StatIcon as any} size="lg" color="current" />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 快速操作按钮组件
 */
export const QuickAction: React.FC<QuickActionProps> = ({
  label,
  icon: ActionIconComponent,
  onClick,
  disabled = false,
  loading = false,
  variant = 'secondary',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600',
    ghost: 'bg-transparent hover:bg-gray-700/50 text-gray-400 border-gray-600',
  };

  const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        flex items-center space-x-2 border rounded-lg font-medium
        transition-all duration-200 ease-in-out
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      <AppIcon
        icon={ActionIconComponent as any}
        size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
        color="current"
        className={loading ? 'animate-spin' : ''}
      />
      <span>{label}</span>
    </button>
  );
};

/**
 * 全屏包装器组件
 */
export const FullscreenWrapper: React.FC<FullscreenWrapperProps> = ({
  children,
  enabled = false,
  onToggle,
  className = '',
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  /**

   * toggleFullscreen功能函数

   * @param {Object} params - 参数对象

   * @returns {Promise<Object>} 返回结果

   */
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    const newFullscreen = !isFullscreen;
    setIsFullscreen(newFullscreen);
    onToggle?.(newFullscreen);
  };

  useEffect(() => {
    /**
     * if功能函数
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 返回结果
     */
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`
          relative
          ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-900' : ''}
          ${className}
        `}
      >
        {/* 全屏切换按钮 */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-10 p-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg transition-colors"
          title={isFullscreen ? '退出全屏' : '进入全屏'}
        >
          <AppIcon icon={isFullscreen ? Minimize2 : Maximize2} size="md" color="secondary" />
        </button>

        {/* 内容 */}
        <div className={isFullscreen ? 'h-full overflow-auto p-6' : ''}>{children}</div>
      </div>

      {/* 全屏遮罩 */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={toggleFullscreen} />
      )}
    </>
  );
};

/**
 * 链接预览组件
 */
export const LinkPreview: React.FC<{
  url: string;
  title?: string;
  description?: string;
  className?: string;
  /**
   * 处理handleClick事件
   * @param {Object} event - 事件对象
   * @returns {Promise<void>}
   */
}> = ({ url, title, description, className = '' }) => {
  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        w-full p-4 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/50
        rounded-xl text-left transition-all duration-200
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {title && <h4 className="font-medium text-white mb-1 truncate">{title}</h4>}
          <p className="text-sm text-gray-400 truncate">{url}</p>
          {description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description}</p>}
        </div>
        <AppIcon icon={ExternalLink} size="md" color="secondary" className="ml-3 flex-shrink-0" />
      </div>
    </button>
  );
};

/**
 * 增强功能使用示例组件
 */
export const EnhancementsUsageGuide: React.FC = () => {
  const [fullscreenEnabled, setFullscreenEnabled] = useState(false);

  return (
    <div className="space-y-8 p-6 bg-gray-900 text-white">
      <h2 className="text-2xl font-bold">可选UI增强功能使用指南</h2>

      {/* 可折叠面板示例 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">可折叠面板</h3>
        <CollapsiblePanel title="高级配置选项" defaultExpanded={false}>
          <div className="space-y-4">
            <p className="text-gray-300">这里是可折叠的内容区域</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-700 rounded-lg">选项 1</div>
              <div className="p-3 bg-gray-700 rounded-lg">选项 2</div>
            </div>
          </div>
        </CollapsiblePanel>
      </div>

      {/* 代码块示例 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">代码块</h3>
        <CodeBlock
          title="API 调用示例"
          language="javascript"
          code={`const _response = await fetch('/api/test', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ url: 'https://example.com' })
});`}
        />
      </div>

      {/* 统计卡片示例 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">统计卡片</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="总测试数"
            value="1,234"
            change={{ value: 12, type: 'increase' }}
            color="primary"
          />
          <StatsCard
            title="成功率"
            value="98.5%"
            change={{ value: 2.1, type: 'increase' }}
            color="success"
          />
          <StatsCard
            title="平均响应时间"
            value="245ms"
            change={{ value: 5.3, type: 'decrease' }}
            color="warning"
          />
        </div>
      </div>

      {/* 快速操作示例 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">快速操作</h3>
        <div className="flex flex-wrap gap-3">
          <QuickAction
            label="开始测试"
            icon={ActionIcon}
            onClick={() => Logger.debug('Button clicked')}
            variant="primary"
          />
          <QuickAction
            label="导出结果"
            icon={ActionIcon}
            onClick={() => Logger.debug('Button clicked')}
            variant="secondary"
          />
          <QuickAction
            label="分享"
            icon={ActionIcon}
            onClick={() => Logger.debug('Button clicked')}
            variant="ghost"
          />
        </div>
      </div>

      {/* 全屏模式示例 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">全屏模式</h3>
        <FullscreenWrapper
          enabled={fullscreenEnabled}
          onToggle={setFullscreenEnabled}
          className="bg-gray-800 rounded-xl p-6 min-h-[200px]"
        >
          <div className="space-y-4">
            <h4 className="text-lg font-medium">全屏内容区域</h4>
            <p className="text-gray-300">
              点击右上角的全屏按钮可以进入全屏模式。在全屏模式下，按 ESC 键可以退出。
            </p>
            <button
              type="button"
              onClick={() => setFullscreenEnabled(!fullscreenEnabled)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {fullscreenEnabled ? '禁用' : '启用'}全屏功能
            </button>
          </div>
        </FullscreenWrapper>
      </div>

      {/* 链接预览示例 */}
      <div>
        <h3 className="text-lg font-semibold mb-4">链接预览</h3>
        <LinkPreview
          url="https://example.com"
          title="示例网站"
          description="这是一个示例网站的描述信息"
        />
      </div>
    </div>
  );
};

export default CollapsiblePanel;
