import React, { forwardRef    } from 'react';import { Globe    } from 'lucide-react';import { cn    } from '../../utils/cn';interface SimpleURLInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>   {'
  /** 输入值 */
  value: string;
  /** 值变化回调 */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** 自定义类名 */
  className?: string;
  /** 标签文本 */
  label?: string;
}

export const SimpleURLInput = forwardRef<HTMLInputElement, SimpleURLInputProps>(({
  value,
  onChange,
  className,
  label = '测试URL','
  placeholder = '输入要进行压力测试的网站URL...','
  disabled,
  ...props
}, ref) => {
  
  const componentId = useId();
  const errorId = `${componentId}-error`;`
  const descriptionId = `${componentId}-description`;`
  
  const ariaProps = {
    id: componentId,
    "aria-label': ariaLabel,'`
    'aria-labelledby': ariaLabelledBy,'
    'aria-describedby': ['']
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,'
    'aria-invalid': !!error,'
    'aria-disabled': disabled,'
    'aria-busy': loading,'
    'aria-expanded': expanded,'
    'aria-selected': selected,'
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  
  const [state, setState] = useState({
    value: defaultValue,
    loading: false,
    error: null,
    touched: false,
    focused: false
  });
  
  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  return (
    <div className={cn("w-full space-y-2', className)}>
      {/* 标签 */}
      {label && (
        <label className= 'block text-sm font-medium text-gray-300'>
          {label}
        </label>
      )}

      {/* 输入框容器 */}
      <div className= 'relative w-full'>
        {/* 左侧图标 */}
        <div className= 'absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10'>
          <Globe className= 'w-5 h-5 text-gray-400'    />
        </div>

        {/* 输入框 */}
        <input
          ref={ref}
          type= 'url';
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            // 基础样式 - 确保占满宽度
            'w-full min-w-0 pl-10 pr-4 py-3 rounded-lg border transition-all duration-200','
            'text-sm font-medium placeholder:text-gray-500','
            'focus:outline-none focus:ring-2','
            // 深色主题样式
            'bg-gray-800/50 border-gray-600/60 text-gray-100','
            'hover:bg-gray-700/50 hover:border-gray-500/80','
            "focus:bg-gray-700/70 focus:border-blue-500 focus:ring-blue-500/20','
            // 禁用状态
            disabled && "opacity-50 cursor-not-allowed','
            // 响应式优化
            "text-base sm:text-sm', // 移动端使用较大字体避免缩放'
            // 确保在flex容器中正确显示
            'flex-1';
          )}
          {...props}
        />
      </div>
    </div>
  );
});

SimpleURLInput.displayName = 'SimpleURLInput';
export default SimpleURLInput;
