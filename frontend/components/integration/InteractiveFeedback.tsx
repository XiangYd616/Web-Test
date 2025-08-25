import { Fragment, useEffect, useState } from 'react';
import type { ReactNode, ComponentType, FC } from 'react';

import { Check, Copy, Download, Share2, Heart, ThumbsUp, ThumbsDown, Star, Bookmark, BookmarkCheck, Eye, EyeOff, Volume2, VolumeX, Zap, Sparkles, Target, TrendingUp, Award, Gift } from 'lucide-react';

// 按钮状态反馈组件
export const ButtonFeedback: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  feedback?: 'success' | 'error' | 'copied' | 'saved';
  feedbackDuration?: number;
  className?: string;
}> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  feedback,
  feedbackDuration = 2000,
  className = ''
}) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    if (feedback) {
      setShowFeedback(true);
      const timer = setTimeout(() => setShowFeedback(false), feedbackDuration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [feedback, feedbackDuration]);

  const getVariantClasses = () => {
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
      success: 'bg-green-600 hover:bg-green-700 text-white',
      warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      danger: 'bg-red-600 hover:bg-red-700 text-white'
    };
    return variants[variant];
  };

  const getSizeClasses = () => {
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };
    return sizes[size];
  };

  const getFeedbackIcon = () => {
    switch (feedback) {
      case 'success':
        return <Check className="w-4 h-4" />;
      case 'copied':
        return <Copy className="w-4 h-4" />;
      case 'saved':
        return <BookmarkCheck className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const handleClick = () => {
    if (!disabled && !loading) {
      setIsPressed(true);
      setTimeout(() => setIsPressed(false), 150);
      onClick?.();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        relative inline-flex items-center justify-center font-medium rounded-lg
        transition-all duration-200 ease-in-out
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg active:scale-95'}
        ${isPressed ? 'scale-95' : ''}
        ${loading ? 'cursor-wait' : ''}
        ${className}
      `}
    >
      {showFeedback ? (
        <div className="flex items-center space-x-2">
          {getFeedbackIcon()}
          <span>
            {feedback === 'success' && '成功!'}
            {feedback === 'error' && '失败!'}
            {feedback === 'copied' && '已复制!'}
            {feedback === 'saved' && '已保存!'}
          </span>
        </div>
      ) : (
        <>
          {loading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          )}
          {children}
        </>
      )}
    </button>
  );
};

// 复制到剪贴板组件
export const CopyToClipboard: React.FC<{
  text: string;
  children?: React.ReactNode;
  className?: string;
}> = ({ text, children, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`
        inline-flex items-center space-x-2 px-3 py-1.5 text-sm
        bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg
        transition-colors duration-200
        ${className}
      `}
    >
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
      <span>{copied ? '已复制' : children || '复制'}</span>
    </button>
  );
};

// 点赞/收藏组件
export const LikeButton: React.FC<{
  liked?: boolean;
  count?: number;
  onToggle?: (liked: boolean) => void;
  variant?: 'heart' | 'thumbs' | 'star';
  className?: string;
}> = ({ liked = false, count, onToggle, variant = 'heart', className = '' }) => {
  const [isLiked, setIsLiked] = useState(liked);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsLiked(!isLiked);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
    onToggle?.(!isLiked);
  };

  const getIcon = () => {
    switch (variant) {
      case 'heart':
        return <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />;
      case 'thumbs':
        return <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-blue-500 text-blue-500' : 'text-gray-400'}`} />;
      case 'star':
        return <Star className={`w-5 h-5 ${isLiked ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`} />;
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`
        inline-flex items-center space-x-2 px-3 py-2 rounded-lg
        transition-all duration-200 hover:bg-gray-100
        ${isAnimating ? 'scale-110' : ''}
        ${className}
      `}
    >
      <div className={isAnimating ? 'animate-bounce' : ''}>
        {getIcon()}
      </div>
      {count !== undefined && (
        <span className="text-sm text-gray-600">{count + (isLiked && !liked ? 1 : 0)}</span>
      )}
    </button>
  );
};

// 进度指示器组件
export const ProgressIndicator: React.FC<{
  steps: string[];
  currentStep: number;
  completedSteps?: number[];
  className?: string;
}> = ({ steps, currentStep, completedSteps = [], className = '' }) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex flex-col items-center">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                transition-all duration-300
                ${
                  completedSteps.includes(index)
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                    ? 'bg-blue-500 text-white animate-pulse'
                    : index < currentStep
                    ? 'bg-blue-200 text-blue-700'
                    : 'bg-gray-200 text-gray-500'
                }
              `}
            >
              {completedSteps.includes(index) ? (
                <Check className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </div>
            <span className="text-xs text-gray-600 mt-2 text-center max-w-20">{step}</span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`
                flex-1 h-0.5 mx-2 transition-all duration-300
                ${
                  index < currentStep || completedSteps.includes(index)
                    ? 'bg-blue-500'
                    : 'bg-gray-200'
                }
              `}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// 评分组件
export const RatingComponent: React.FC<{
  rating: number;
  maxRating?: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ rating, maxRating = 5, onRate, readonly = false, size = 'md', className = '' }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {Array.from({ length: maxRating }, (_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= (hoverRating || rating);

        return (
          <button
            key={index}
            type="button"
            onClick={() => !readonly && onRate?.(starValue)}
            onMouseEnter={() => !readonly && setHoverRating(starValue)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            disabled={readonly}
            className={`
              transition-all duration-200
              ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
            `}
            title={`评分 ${starValue} 星`}
            aria-label={`评分 ${starValue} 星`}
          >
            <Star
              className={`
                ${sizeClasses[size]}
                ${isFilled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                transition-colors duration-200
              `}
            />
          </button>
        );
      })}
    </div>
  );
};

// 成就徽章组件
export const AchievementBadge: React.FC<{
  title: string;
  description?: string;
  icon?: React.ComponentType<any>;
  color?: 'gold' | 'silver' | 'bronze' | 'blue' | 'green';
  unlocked?: boolean;
  className?: string;
}> = ({ title, description, icon: Icon = Award, color = 'gold', unlocked = true, className = '' }) => {
  const colorClasses = {
    gold: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
    silver: 'bg-gradient-to-r from-gray-300 to-gray-500 text-white',
    bronze: 'bg-gradient-to-r from-orange-400 to-orange-600 text-white',
    blue: 'bg-gradient-to-r from-blue-400 to-blue-600 text-white',
    green: 'bg-gradient-to-r from-green-400 to-green-600 text-white'
  };

  return (
    <div
      className={`
        relative inline-flex items-center space-x-3 px-4 py-3 rounded-lg
        ${unlocked ? colorClasses[color] : 'bg-gray-200 text-gray-500'}
        transition-all duration-300 hover:shadow-lg
        ${unlocked ? 'hover:scale-105' : ''}
        ${className}
      `}
    >
      {unlocked && (
        <div className="absolute -top-1 -right-1">
          <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
        </div>
      )}
      <Icon className="w-6 h-6" />
      <div>
        <h3 className="font-medium">{title}</h3>
        {description && <p className="text-sm opacity-90">{description}</p>}
      </div>
    </div>
  );
};

// 工具提示组件
export const Tooltip: React.FC<{
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}> = ({ content, children, position = 'top', className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`
            absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded
            whitespace-nowrap transition-opacity duration-200
            ${positionClasses[position]}
          `}
        >
          {content}
        </div>
      )}
    </div>
  );
};

// 浮动操作按钮
export const FloatingActionButton: React.FC<{
  icon: React.ComponentType<any>;
  onClick: () => void;
  tooltip?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  color?: 'blue' | 'green' | 'red' | 'purple';
  className?: string;
}> = ({ icon: Icon, onClick, tooltip, position = 'bottom-right', color = 'blue', className = '' }) => {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    red: 'bg-red-600 hover:bg-red-700',
    purple: 'bg-purple-600 hover:bg-purple-700'
  };

  const button = (
    <button
      type="button"
      onClick={onClick}
      className={`
        fixed z-50 w-14 h-14 rounded-full text-white shadow-lg
        flex items-center justify-center
        transition-all duration-300 hover:shadow-xl hover:scale-110
        ${positionClasses[position]}
        ${colorClasses[color]}
        ${className}
      `}
      title={tooltip || "浮动操作按钮"}
      aria-label={tooltip || "浮动操作按钮"}
    >
      <Icon className="w-6 h-6" />
    </button>
  );

  return tooltip ? (
    <Tooltip content={tooltip} position="left">
      {button}
    </Tooltip>
  ) : (
    button
  );
};

// 反馈收集组件
export const FeedbackCollector: React.FC<{
  onSubmit: (feedback: { rating: number; comment: string; type: string }) => void;
  className?: string;
}> = ({ onSubmit, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [type, setType] = useState('general');

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit({ rating, comment, type });
      setIsOpen(false);
      setRating(0);
      setComment('');
      setType('general');
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`
          inline-flex items-center space-x-2 px-3 py-2 text-sm
          bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200
          transition-colors duration-200
          ${className}
        `}
      >
        <Heart className="w-4 h-4" />
        <span>反馈</span>
      </button>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-lg ${className}`}>
      <h3 className="font-medium text-gray-900 mb-3">您的反馈</h3>

      <div className="mb-3">
        <label className="block text-sm text-gray-700 mb-2">评分</label>
        <RatingComponent rating={rating} onRate={setRating} />
      </div>

      <div className="mb-3">
        <label className="block text-sm text-gray-700 mb-2">类型</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          title="选择反馈类型"
          aria-label="选择反馈类型"
        >
          <option value="general">一般反馈</option>
          <option value="bug">错误报告</option>
          <option value="feature">功能建议</option>
          <option value="performance">性能问题</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-700 mb-2">详细说明</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="请描述您的反馈..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={rating === 0}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          提交
        </button>
      </div>
    </div>
  );
};
