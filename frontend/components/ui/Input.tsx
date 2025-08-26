import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import type { forwardRef, useState, ReactNode } from 'react';
import { cn } from '../../utils/cn';

// 基础Input组件
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

const inputSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base'
};

const inputVariants = {
  default: [
    'bg-gray-700/50 border-gray-600/60',
    'hover:border-gray-500/80 hover:bg-gray-600/50',
    'focus:border-blue-500 focus:bg-gray-700/70 focus:ring-2 focus:ring-blue-500/20'
  ].join(' '),

  filled: [
    'bg-gray-700 border-gray-700',
    'hover:bg-gray-600 hover:border-gray-600',
    'focus:border-blue-500 focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20'
  ].join(' '),

  outlined: [
    'bg-transparent border-gray-600',
    'hover:border-gray-500',
    'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
  ].join(' ')
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  description,
  error,
  success,
  variant = 'default',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  className,
  disabled,
  ...props
}, ref) => {
  const hasError = !!error;
  const hasSuccess = !!success;
  const isDisabled = disabled || loading;

  return (
    <div className="w-full">
      {/* 标签 */}
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {/* 输入框容器 */}
      <div className="relative">
        {/* 左侧图标 */}
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}

        {/* 输入框 */}
        <input
          ref={ref}
          className={cn(
            // 基础样式
            'w-full rounded-lg border transition-all duration-200',
            'text-white placeholder-gray-400',
            'focus:outline-none focus:ring-offset-2 focus:ring-offset-gray-900',
            // 尺寸
            inputSizes[size],
            // 变体
            inputVariants[variant],
            // 图标间距
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            // 状态样式
            hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            hasSuccess && 'border-green-500 focus:border-green-500 focus:ring-green-500/20',
            // 禁用状态
            isDisabled && 'opacity-50 cursor-not-allowed bg-gray-800/50',
            className
          )}
          disabled={isDisabled}
          {...props}
        />

        {/* 右侧图标或状态图标 */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {loading && (
            <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {hasError && <AlertCircle className="h-4 w-4 text-red-400" />}
          {hasSuccess && <CheckCircle className="h-4 w-4 text-green-400" />}
          {rightIcon && !loading && !hasError && !hasSuccess && (
            <span className="text-gray-400">{rightIcon}</span>
          )}
        </div>
      </div>

      {/* 描述文本 */}
      {description && !error && !success && (
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      )}

      {/* 错误信息 */}
      {error && (
        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}

      {/* 成功信息 */}
      {success && (
        <p className="mt-1 text-xs text-green-400 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {success}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// 密码输入组件
interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {
  showToggle?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(({
  showToggle = true,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    <Input
      ref={ref}
      type={showPassword ? 'text' : 'password'}
      rightIcon={
        showToggle ? (
          <button
            type="button"
            onClick={togglePassword}
            className="text-gray-400 hover:text-white transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : undefined
      }
      {...props}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';

// 搜索输入组件
interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  onSearch?: (value: string) => void;
  onClear?: () => void;
  showClearButton?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({
  onSearch,
  onClear,
  showClearButton = true,
  ...props
}, ref) => {
  const [value, setValue] = React.useState(props.value || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    props.onChange?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch?.(value as string);
    }
    props.onKeyDown?.(e);
  };

  const handleClear = () => {
    setValue('');
    onClear?.();
  };

  return (
    <Input
      ref={ref}
      type="search"
      leftIcon={
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
      rightIcon={
        showClearButton && value ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-gray-400 hover:text-white transition-colors"
            tabIndex={-1}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : undefined
      }
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';

// 数字输入组件
interface NumberInputProps extends Omit<InputProps, 'type'> {
  min?: number;
  max?: number;
  step?: number;
  showControls?: boolean;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(({
  min,
  max,
  step = 1,
  showControls = true,
  ...props
}, ref) => {
  const [value, setValue] = React.useState(props.value || '');

  const handleIncrement = () => {
    const currentValue = parseFloat(value as string) || 0;
    const newValue = currentValue + step;
    if (max === undefined || newValue <= max) {
      setValue(newValue.toString());
    }
  };

  const handleDecrement = () => {
    const currentValue = parseFloat(value as string) || 0;
    const newValue = currentValue - step;
    if (min === undefined || newValue >= min) {
      setValue(newValue.toString());
    }
  };

  return (
    <Input
      ref={ref}
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        props.onChange?.(e);
      }}
      rightIcon={
        showControls ? (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={handleIncrement}
              className="text-gray-400 hover:text-white transition-colors text-xs leading-none"
              tabIndex={-1}
            >
              ▲
            </button>
            <button
              type="button"
              onClick={handleDecrement}
              className="text-gray-400 hover:text-white transition-colors text-xs leading-none"
              tabIndex={-1}
            >
              ▼
            </button>
          </div>
        ) : undefined
      }
      {...props}
    />
  );
});

NumberInput.displayName = 'NumberInput';

// Textarea组件
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  variant?: 'default' | 'filled' | 'outlined';
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  description,
  error,
  success,
  variant = 'default',
  resize = 'vertical',
  className,
  disabled,
  ...props
}, ref) => {
  const hasError = !!error;
  const hasSuccess = !!success;

  return (
    <div className="w-full">
      {/* 标签 */}
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {/* 文本域 */}
      <textarea
        ref={ref}
        className={cn(
          // 基础样式
          'w-full rounded-lg border transition-all duration-200',
          'text-white placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
          'px-3 py-2 text-sm min-h-[80px]',
          // 变体
          inputVariants[variant],
          // 状态样式
          hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          hasSuccess && 'border-green-500 focus:border-green-500 focus:ring-green-500/20',
          // 禁用状态
          disabled && 'opacity-50 cursor-not-allowed bg-gray-800/50',
          // 调整大小
          {
            'resize-none': resize === 'none',
            'resize-y': resize === 'vertical',
            'resize-x': resize === 'horizontal',
            'resize': resize === 'both'
          },
          className
        )}
        disabled={disabled}
        {...props}
      />

      {/* 描述文本 */}
      {description && !error && !success && (
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      )}

      {/* 错误信息 */}
      {error && (
        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}

      {/* 成功信息 */}
      {success && (
        <p className="mt-1 text-xs text-green-400 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {success}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

// Select组件
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  description,
  error,
  success,
  variant = 'default',
  size = 'md',
  options,
  placeholder,
  className,
  disabled,
  ...props
}, ref) => {
  const hasError = !!error;
  const hasSuccess = !!success;

  return (
    <div className="w-full">
      {/* 标签 */}
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {/* 选择框容器 */}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            // 基础样式
            'w-full rounded-lg border transition-all duration-200 appearance-none',
            'text-white bg-gray-700/50',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
            // 尺寸
            inputSizes[size],
            // 变体
            inputVariants[variant],
            // 状态样式
            hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            hasSuccess && 'border-green-500 focus:border-green-500 focus:ring-green-500/20',
            // 禁用状态
            disabled && 'opacity-50 cursor-not-allowed bg-gray-800/50',
            // 右侧图标空间
            'pr-10',
            className
          )}
          disabled={disabled}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="bg-gray-700 text-white"
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* 下拉箭头 */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          {hasError && <AlertCircle className="h-4 w-4 text-red-400" />}
          {hasSuccess && <CheckCircle className="h-4 w-4 text-green-400" />}
          {!hasError && !hasSuccess && (
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {/* 描述文本 */}
      {description && !error && !success && (
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      )}

      {/* 错误信息 */}
      {error && (
        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}

      {/* 成功信息 */}
      {success && (
        <p className="mt-1 text-xs text-green-400 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {success}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
