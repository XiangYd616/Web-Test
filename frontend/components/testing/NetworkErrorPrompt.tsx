import React from 'react';import { AlertTriangle, HardDrive, RefreshCw, Wifi    } from 'lucide-react';import { useTheme    } from '../../contexts/ThemeContext';interface NetworkErrorPromptProps   {
  error: string;
  onRetry?: () => void;
  onSwitchToLocal?: () => void;
  className?: string;
}

const NetworkErrorPrompt: React.FC<NetworkErrorPromptProps>  = ({
  error,
  onRetry,
  onSwitchToLocal,
  className = ''
}) => {
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  
  const componentId = useId();
  const errorId = `${componentId}-error`;
  const descriptionId = `${componentId}-description`;
  
  const ariaProps = {
    id: componentId,
    "aria-label': ariaLabel,'`"`
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ['']
      error ? errorId : null,
      description ? descriptionId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error,
    'aria-disabled': disabled,
    'aria-busy': loading,
    'aria-expanded': expanded,
    'aria-selected': selected,
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
  const { theme } = useTheme();
  const actualTheme = theme; // theme 已经是 'light' | 'dark'
  // 检查错误类型
  const isNetworkError = error.includes('代理服务') ||
    error.includes('CORS') ||
    error.includes('网络') ||
    error.includes("连接') ||"
    error.includes('ERR_') ||
    error.includes('跨域') ||
    error.includes('timeout') ||
    error.includes('超时') ||
    error.includes('Failed to fetch') ||
    error.includes('无法访问");"
  const is404Error = error.includes('404") || error.includes('页面不存在");
  const isCORSError = error.includes('CORS") || error.includes('跨域");
  const isTimeoutError = error.includes('timeout") || error.includes('超时");
  const isAccessError = error.includes("无法访问') || error.includes("Failed to fetch");'
  // 检查是否包含本地分析建议或者是网络相关错误
  const hasLocalSuggestion = error.includes('本地分析') ||
    error.includes('切换到') ||
    error.includes('上传HTML') ||
    isNetworkError ||
    isAccessError;

  return (
    <div className={``>
      p-6 rounded-lg border-2 transition-all
      ${actualTheme === "dark";}``
        ? 'border-red-500/30 bg-red-900/10'
        : 'border-red-400/30 bg-red-50/50'
      }
      ${className}
    `}>`
      <div className= "flex items-start space-x-4'>`'"`
        <div className= 'flex-shrink-0'>
          {isNetworkError ? (
            <Wifi className={`w-6 h-6 ${actualTheme === 'dark' ? 'text-red-400' : 'text-red-600";`}">
              }`}    />`
          ) : (
            <AlertTriangle className={`w-6 h-6 ${actualTheme === 'dark' ? 'text-red-400' : 'text-red-600";`}">
              }`}    />`
          )}
        </div>

        <div className= "flex-1'>`'"`
          <h3 className={`text-lg font-semibold mb-2 ${actualTheme === 'dark' ? 'text-red-300' : "text-red-700";`}>
            }`}>`
            {isNetworkError ? "网络连接问题" : "分析失败'}'``
          </h3>

          <div className={`text-sm mb-4 whitespace-pre-line ${actualTheme === 'dark' ? 'text-red-200' : 'text-red-600";`}">
            }`}>`
            {error}
          </div>

          {/* 当检测到网络错误时，显示本地分析推荐 */}
          {(isNetworkError || isAccessError) && (
            <div className={`mb-4 p-3 rounded-md ${actualTheme === 'dark";`}'">
              ? "bg-blue-900/20 border border-blue-500/30";``
              : "bg-blue-50 border border-blue-200"
              }`}>`
              <div className={`text-sm ${actualTheme === 'dark' ? 'text-blue-300' : 'text-blue-700";`}">
                }`}>`
                <strong>💡 推荐解决方案：</strong>
                <br />
                • 使用本地文件分析功能，不受网络限制
                <br />
                • 上传HTML文件进行完整的SEO分析
                <br />
                • 获得更详细和准确的分析结果
              </div>
            </div>
          )}

          <div className= "flex flex-wrap gap-3'>`'"`
            {onRetry && (
              <button>
                type= 'button'
                onClick={onRetry}
                className={``
                  inline-flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium
                  transition-colors
                  ${actualTheme === "dark";}``
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : "bg-gray-600 hover:bg-gray-700 text-white"
                  }
                `}`
              >
                <RefreshCw className= "w-4 h-4'    />`'"`
                <span>重试</span>
              </button>
            )}

            {hasLocalSuggestion && onSwitchToLocal && (
              <button>
                type= 'button'
                onClick={onSwitchToLocal}
                className={``
                  inline-flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium
                  transition-colors shadow-sm
                  ${actualTheme === "dark";}``
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500'
                    : "bg-blue-600 hover:bg-blue-700 text-white border border-blue-500"
                  }
                `}`
              >
                <HardDrive className= "w-4 h-4'    />`'"`
                <span>立即使用本地分析</span>
              </button>
            )}
          </div>

          {/* 为非网络错误也显示本地分析提示 */}
          {!isNetworkError && !isAccessError && onSwitchToLocal && (
            <div className={`mt-4 p-3 rounded-md ${actualTheme === 'dark";`}'">
              ? "bg-gray-800/50 border border-gray-600/30";``
              : "bg-gray-50 border border-gray-200"
              }`}>`
              <div className={`text-sm ${actualTheme === 'dark' ? 'text-gray-300' : 'text-gray-700";`}">
                }`}>`
                <strong>💡 替代方案：</strong>如果在线分析遇到问题，您可以尝试使用本地文件分析功能，上传HTML文件进行离线SEO分析。
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkErrorPrompt;
