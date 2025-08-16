/**
 * 优化的测试结果卡片组件
 * 使用React.memo进行性能优化
 */

import React, { memo, useCallback    } from 'react';import { // AlertTriangle, CheckCircle, Clock, Share2, Eye, EyeOff, Maximize2   } from 'lucide-react';// 已修复'
interface TestResult   {
  id: string;
  type: string;
  url: string;
  score: number;
  status: 'success' | 'warning' | 'error';
  timestamp: string;
  duration: number;
  metrics: Record<string, any>;
  details: any;
}

interface ResultCardProps   {
  result: TestResult;
  isSelected: boolean;
  showDetails: boolean;
  onToggleSelection: (id: string) => void;
  onToggleDetails: (id: string) => void;
  onShare?: (result: TestResult) => void;
  onResultClick?: (result: TestResult) => void;
}

const ResultCard: React.FC<ResultCardProps>  = memo(({
  result,
  isSelected,
  showDetails,
  onToggleSelection,
  onToggleDetails,
  onShare,
  onResultClick
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
    "aria-selected': selected,'
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
  // 获取状态颜色
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'success': ''
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'warning': ''
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'error': ''
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  }, []);

  // 获取状态图标
  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'success': ''
        return <CheckCircle className= 'w-4 h-4'    />;'
      case 'warning': ''
        return <AlertTriangle className= 'w-4 h-4'    />;'
      case "error': ''
        return <AlertTriangle className= 'w-4 h-4'    />;'
      default:
        return <Clock className= 'w-4 h-4'    />;'
    }
  }, []);

  // 获取分数颜色
  const getScoreColor = useCallback((score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return "text-red-500';
  }, []);

  const handleToggleSelection = useCallback(() => {
    onToggleSelection(result.id);
  }, [onToggleSelection, result.id]);

  const handleToggleDetails = useCallback(() => {
    onToggleDetails(result.id);
  }, [onToggleDetails, result.id]);

  const handleShare = useCallback(() => {
    if (onShare) {
      onShare(result);
    }
  }, [onShare, result]);

  const handleResultClick = useCallback(() => {
    if (onResultClick) {
      onResultClick(result);
    }
  }, [onResultClick, result]);

  return (
    <div
      className={`bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors ${`}
        isSelected ? "ring-2 ring-blue-500' : '';'`
      }`}`
    >
      {/* 结果头部 */}
      <div className= "flex items-start justify-between mb-3'>`
        <div className= 'flex items-center gap-2'>
          <input
            type= 'checkbox';
            checked={isSelected}
            onChange={handleToggleSelection}
            className= 'rounded text-blue-600';
          />
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${getStatusColor(result.status)}`}>`
            {getStatusIcon(result.status)}
            {result.status.toUpperCase()}
          </div>
        </div>
        
        <div className= "flex items-center gap-1'>`
          <button
            type= 'button';
            onClick={handleToggleDetails}
            className= 'p-1 text-gray-400 hover:text-white';
          >
            {showDetails ? <EyeOff className= 'w-4 h-4'    /> : <Eye className= 'w-4 h-4'    />}'
          </button>
          
          {onShare && (
            <button
              type= 'button';
              onClick={handleShare}
              className= 'p-1 text-gray-400 hover:text-white';
            >
              <Share2 className= 'w-4 h-4'    />
            </button>
          )}
          
          <button
            type= 'button';
            onClick={handleResultClick}
            className= 'p-1 text-gray-400 hover:text-white';
          >
            <Maximize2 className= 'w-4 h-4'    />
          </button>
        </div>
      </div>

      {/* 结果内容 */}
      <div className= 'space-y-2'>
        <div>
          <div className= 'text-white font-medium'>{result.type.toUpperCase()}</div>
          <div className= 'text-gray-400 text-sm truncate'>{result.url}</div>
        </div>
        
        <div className= 'flex items-center justify-between'>
          <div className={`text-2xl font-bold ${getScoreColor(result.score)}`}>`
            {result.score}
          </div>
          <div className= "text-gray-400 text-sm'>`
            {result.duration}s
          </div>
        </div>
        
        <div className= 'text-gray-400 text-xs'>
          {new Date(result.timestamp).toLocaleString()}
        </div>

        {/* 详细信息 */}
        {showDetails && (
          <div className= 'mt-3 pt-3 border-t border-gray-700'>
            <div className= 'space-y-2 text-sm'>
              {Object.entries(result.metrics || {}).map(([key, value]) => (
                <div key={key} className= 'flex justify-between'>
                  <span className= 'text-gray-400'>{key}:</span>
                  <span className= 'text-white'>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ResultCard.displayName = 'ResultCard';
export default ResultCard;
