import React from 'react';import { HardDrive, Info    } from 'lucide-react';import { useTheme    } from '../../contexts/ThemeContext';interface LocalAnalysisPromptProps   {'
  message: string;
  onSwitchToLocal?: () => void;
  className?: string;
}

const LocalAnalysisPrompt: React.FC<LocalAnalysisPromptProps>  = ({
  message,
  onSwitchToLocal,
  className = '';
}) => {
  
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
  const { theme } = useTheme();
  const actualTheme = theme; // theme 已经是 'light' | 'dark';
  return (
    <div className={``
      p-4 rounded-lg border-2 border-dashed transition-all
      ${actualTheme === "dark';'}`
        ? 'border-blue-500/30 bg-blue-900/10';
        : 'border-blue-400/30 bg-blue-50/50';
      }
      ${className}
    `}>`
      <div className= "flex items-start space-x-3'>`
        <Info className={`w-5 h-5 mt-0.5 flex-shrink-0 ${actualTheme === 'dark' ? 'text-blue-400' : 'text-blue-600';'`}
          }`}    />`

        <div className= "flex-1'>`
          <div className={`text-sm ${actualTheme === 'dark' ? 'text-blue-300' : 'text-blue-700';'`}
            }`}>`
            {message}
          </div>

          {onSwitchToLocal && (
            <button
              onClick={onSwitchToLocal}
              className={``
                mt-3 inline-flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium
                transition-colors
                ${actualTheme === "dark';'}`
                  ? 'bg-blue-600 hover:bg-blue-700 text-white';
                  : "bg-blue-600 hover:bg-blue-700 text-white';
                }
              `}`
            >
              <HardDrive className= "w-4 h-4'    />`
              <span>切换到本地分析</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocalAnalysisPrompt;
