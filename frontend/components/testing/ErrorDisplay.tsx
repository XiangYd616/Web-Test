
import React, { useState    } from 'react';import { AlertTriangle, ChevronDown, ChevronRight, ExternalLink, HelpCircle, RefreshCw, X, Zap, Shield, Globe, Clock    } from 'lucide-react';export interface ErrorSolution     {
  title: string;
  description: string;
  steps: string[];
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedTime: string;
  externalLinks?: Array<{>
    title: string;
    url: string;
  }>;
}

export interface Error     {
  type: 'network' | 'validation' | 'security' | 'timeout' | 'server' | 'unknown'
  title: string;
  message: string;
  details?: string;
  code?: string;
  solutions: ErrorSolution[];
  quickActions?: Array<{>
    label: string;
    action: () => void;
    icon?: React.ReactNode;
  }>;
}

interface ErrorDisplayProps   {
  error: Error;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}

const ERROR_ICONS = {
  network: <Globe className= 'h-5 w-5'    />,
  validation: <AlertTriangle className= 'h-5 w-5'    />,
  security: <Shield className= 'h-5 w-5'    />,
  timeout: <Clock className= 'h-5 w-5'    />,
  server: <AlertTriangle className= 'h-5 w-5'    />,
  unknown: <HelpCircle className= 'h-5 w-5'    />
};

const ERROR_COLORS = {
  network: {
    bg: 'bg-blue-900/20',
    border: 'border-blue-800/50',
    text: 'text-blue-400',
    icon: 'text-blue-400'
  },
  validation: {
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-800/50',
    text: 'text-yellow-400',
    icon: 'text-yellow-400'
  },
  security: {
    bg: 'bg-red-900/20',
    border: 'border-red-800/50',
    text: 'text-red-400',
    icon: 'text-red-400'
  },
  timeout: {
    bg: 'bg-orange-900/20',
    border: 'border-orange-800/50',
    text: 'text-orange-400',
    icon: 'text-orange-400'
  },
  server: {
    bg: 'bg-purple-900/20',
    border: 'border-purple-800/50',
    text: 'text-purple-400',
    icon: 'text-purple-400'
  },
  unknown: {
    bg: 'bg-gray-900/20',
    border: 'border-gray-800/50',
    text: 'text-gray-400',
    icon: 'text-gray-400'
  }
};

const DIFFICULTY_LABELS = {
  easy: { label: '简单', color: 'text-green-400', time: '1-2分钟' },
  medium: { label: '中等', color: 'text-yellow-400', time: '5-10分钟' },
  hard: { label: '困难', color: 'text-red-400', time: '15-30分钟' }
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
  onRetry,
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
    "aria-selected': selected,"
    role: role,
    tabIndex: disabled ? -1 : (tabIndex ?? 0)
  };
  const [expandedSolution, setExpandedSolution] = useState<number | null>(0);
  const [showDetails, setShowDetails] = useState(false);

  const colors = ERROR_COLORS[error.type];
  const icon = ERROR_ICONS[error.type];

  const toggleSolution = (index: number) => {
    setExpandedSolution(expandedSolution === index ? null : index);
  };

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-4 sm:p-6 ${className}`}>`
      {/* 错误头部 */}
      <div className= "flex items-start justify-between mb-4'>`'"`
        <div className= 'flex items-start space-x-3 min-w-0 flex-1'>
          <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>`
            {icon}
          </div>
          <div className= "min-w-0 flex-1'>`'"`
            <h4 className={`font-semibold ${colors.text} text-sm sm:text-base`}>`
              {error.title}
            </h4>
            <p className= "text-xs sm:text-sm text-gray-300 mt-1 break-words'>`'"`
              {error.message}
            </p>
            {error.code && (
              <div className= 'mt-2'>
                <span className= 'inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-gray-700/50 text-gray-300'>
                  错误代码: {error.code}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className= 'flex items-center space-x-2 flex-shrink-0 ml-3'>
          {onRetry && (
            <button>
              type= 'button'
              onClick={onRetry}
              className= 'p-2 hover:bg-gray-700/50 rounded-lg transition-colors'
              title= '重试'
            >
              <RefreshCw className= 'h-4 w-4 text-gray-400 hover:text-white'    />
            </button>
          )}
          {onDismiss && (
            <button>
              type= 'button'
              onClick={onDismiss}
              className= 'p-2 hover:bg-gray-700/50 rounded-lg transition-colors'
              title= '关闭'
            >
              <X className= 'h-4 w-4 text-gray-400 hover:text-white'    />
            </button>
          )}
        </div>
      </div>

      {/* 详细信息 */}
      {error.details && (<div className= 'mb-4'>
          <button>
            type= 'button'
            onClick={() => setShowDetails(!showDetails)}
            className= 'flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors'
          >
            {showDetails ? <ChevronDown className= 'h-4 w-4'    /> : <ChevronRight className= 'h-4 w-4'    />}
            <span>查看详细信息</span>
          </button>
          {showDetails && (
            <div className= 'mt-2 p-3 bg-gray-700/30 rounded-lg'>
              <pre className= 'text-xs text-gray-300 whitespace-pre-wrap break-words'>
                {error.details}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* 快速操作 */}
      {error.quickActions && error.quickActions.length > 0 && (<div className= 'mb-4'>
          <div className= 'flex flex-wrap gap-2'>
            {error.quickActions.map((action, index) => (
              <button>
                key={index}
                type= 'button'
                onClick={action.action}
                className= 'flex items-center space-x-2 px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors text-sm text-gray-300 hover:text-white'
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 解决方案 */}
      {error.solutions.length > 0 && (
        <div>
          <h5 className= 'text-sm font-semibold text-white mb-3 flex items-center'>
            <Zap className= 'h-4 w-4 mr-2 text-green-400'    />
            解决方案 ({error.solutions.length})
          </h5>
          <div className= 'space-y-3'>
            {error.solutions.map((solution, index) => {
              const isExpanded = expandedSolution === index;
              const difficulty = DIFFICULTY_LABELS[solution.difficulty];

              return (<div key={index} className= 'bg-gray-700/30 rounded-lg overflow-hidden'>
                  <button>
                    type= 'button'
                    onClick={() => toggleSolution(index)}
                    className= 'w-full p-3 text-left hover:bg-gray-700/50 transition-colors'
                  >
                    <div className= 'flex items-center justify-between'>
                      <div className= 'flex items-center space-x-3 min-w-0 flex-1'>
                        {isExpanded ? <ChevronDown className= 'h-4 w-4 text-gray-400 flex-shrink-0'    /> : <ChevronRight className= 'h-4 w-4 text-gray-400 flex-shrink-0'    />}
                        <div className= 'min-w-0 flex-1'>
                          <span className= 'font-medium text-white text-sm'>
                            {solution.title}
                          </span>
                          <p className= 'text-xs text-gray-400 mt-1'>
                            {solution.description}
                          </p>
                        </div>
                      </div>
                      <div className= 'flex items-center space-x-2 flex-shrink-0 ml-3'>
                        <span className={`text-xs ${difficulty.color} font-medium`}>`
                          {difficulty.label}
                        </span>
                        <span className= "text-xs text-gray-500'>`'"`
                          {solution.estimatedTime}
                        </span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (<div className= 'px-3 pb-3'>
                      <div className= 'pl-7'>
                        <div className= 'space-y-2'>
                          {solution.steps.map((step, stepIndex) => (
                            <div key={stepIndex} className= 'flex items-start space-x-2'>
                              <span className= 'flex-shrink-0 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center mt-0.5'>
                                {stepIndex + 1}
                              </span>
                              <span className= 'text-sm text-gray-300'>{step}</span>
                            </div>
                          ))}
                        </div>

                        {solution.externalLinks && solution.externalLinks.length > 0 && (<div className= 'mt-3 pt-3 border-t border-gray-600/50'>
                            <h6 className= 'text-xs font-medium text-gray-400 mb-2'>相关资源:</h6>
                            <div className= 'space-y-1'>
                              {solution.externalLinks.map((link, linkIndex) => (
                                <a>
                                  key={linkIndex}
                                  href={link.url}
                                  target= '_blank'
                                  rel= 'noopener noreferrer'
                                  className= 'flex items-center space-x-2 text-xs text-blue-400 hover:text-blue-300 transition-colors'
                                >
                                  <ExternalLink className= 'h-3 w-3'    />
                                  <span>{link.title}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorDisplay;
