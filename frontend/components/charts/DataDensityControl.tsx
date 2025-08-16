import { BarChart3, Info, Settings, TrendingUp, Zap } from 'lucide-react';
import React, { useCallback, useState } from 'react';

interface DataDensityControlProps {
  totalDataPoints: number;
  currentDataPoints: number;
  maxDataPoints: number;
  samplingStrategy: 'uniform' | 'adaptive' | 'importance';
  enableOptimization: boolean;
  onMaxDataPointsChange: (value: number) => void;
  onSamplingStrategyChange: (strategy: 'uniform' | 'adaptive' | 'importance') => void;
  onOptimizationToggle: (enabled: boolean) => void;
  performanceStats?: {
    renderTime: number;
    compressionRatio: number;
    cacheHit: boolean;
  };
}

const DataDensityControl: React.FC<DataDensityControlProps> = ({
  totalDataPoints,
  currentDataPoints,
  maxDataPoints,
  samplingStrategy,
  enableOptimization,
  onMaxDataPointsChange,
  onSamplingStrategyChange,
  onOptimizationToggle,
  performanceStats
}) => {
  
  // 性能优化
  const memoizedProps = useMemo(() => ({
    className: combinedClassName,
    style: computedStyle,
    disabled,
    'aria-label': ariaLabel,
    'data-testid': testId
  }), [combinedClassName, computedStyle, disabled, ariaLabel, testId]);
  
  // 错误处理
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((err: Error | string) => {
    const errorMessage = typeof err === 'string' ? err : err.message;
    setError(errorMessage);

    // 可选：发送错误报告
    if (process.env.NODE_ENV === 'production') {
      console.error('Component error:', errorMessage);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 错误边界效果
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000); // 5秒后自动清除错误

      return () => clearTimeout(timer);
    }
  }, [error, clearError]);
  
  // 加载状态管理
  const [isLoading, setIsLoading] = useState(loading || false);

  useEffect(() => {
    setIsLoading(loading || false);
  }, [loading]);

  const withLoading = useCallback(async (asyncOperation: () => Promise<any>) => {
    try {
      setIsLoading(true);
      const result = await asyncOperation();
      return result;
    } catch (err) {
      handleError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);
  const [isExpanded, setIsExpanded] = useState(false);

  const compressionRatio = totalDataPoints > 0 ? totalDataPoints / currentDataPoints : 1;

  const getPerformanceLevel = useCallback(() => {
    if (currentDataPoints <= 500) return { level: 'excellent', color: 'text-green-400', icon: Zap };
    if (currentDataPoints <= 1000) return { level: 'good', color: 'text-blue-400', icon: TrendingUp };
    if (currentDataPoints <= 2000) return { level: 'fair', color: 'text-yellow-400', icon: BarChart3 };
    return { level: 'poor', color: 'text-red-400', icon: Settings };
  }, [currentDataPoints]);

  const performance = getPerformanceLevel();
  const PerformanceIcon = performance.icon;

  const presetConfigs = [
    { name: '高性能', maxPoints: 500, strategy: 'adaptive' as const, description: '最佳性能，适合实时监控' },
    { name: '平衡', maxPoints: 1000, strategy: 'adaptive' as const, description: '性能与细节的平衡' },
    { name: '详细', maxPoints: 2000, strategy: 'importance' as const, description: '更多细节，适合分析' },
    { name: '完整', maxPoints: 5000, strategy: 'uniform' as const, description: '最大细节，可能影响性能' }
  ];

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50">
      {/* 主控制面板 */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PerformanceIcon className={`w-5 h-5 ${performance.color}`} />
            <div>
              <div className="text-white font-medium">数据密度控制</div>
              <div className="text-xs text-gray-400">
                {currentDataPoints.toLocaleString()} / {totalDataPoints.toLocaleString()} 数据点
                {compressionRatio > 1 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-600/20 text-blue-300 rounded text-xs">
                    {compressionRatio.toFixed(1)}x 压缩
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 性能状态指示器 */}
            <div className={`px-2 py-1 rounded text-xs font-medium ${performance.level === 'excellent' ? 'bg-green-500/20 text-green-300' :
              performance.level === 'good' ? 'bg-blue-500/20 text-blue-300' :
                performance.level === 'fair' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-red-500/20 text-red-300'
              }`}>
              {performance.level === 'excellent' ? '优秀' :
                performance.level === 'good' ? '良好' :
                  performance.level === 'fair' ? '一般' : '需优化'}
            </div>

            {/* 优化开关 */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableOptimization}
                onChange={(e) => onOptimizationToggle(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-300">启用优化</span>
            </label>

            {/* 展开按钮 */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="展开高级设置"
            >
              <Settings className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>

        {/* 快速预设 */}
        <div className="mt-3 flex gap-2 flex-wrap">
          {presetConfigs.map((preset) => (
            <button
              type="button"
              key={preset.name}
              onClick={() => {
                onMaxDataPointsChange(preset.maxPoints);
                onSamplingStrategyChange(preset.strategy);
              }}
              className={`px-3 py-1 rounded text-xs transition-colors ${maxDataPoints === preset.maxPoints && samplingStrategy === preset.strategy
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* 高级设置 */}
      {isExpanded && (
        <div className="border-t border-gray-700/50 p-4 space-y-4">
          {/* 最大数据点设置 */}
          <div>
            <label htmlFor="max-data-points" className="block text-sm font-medium text-gray-300 mb-2">
              最大数据点: {maxDataPoints.toLocaleString()}
            </label>
            <input
              id="max-data-points"
              type="range"
              min="100"
              max="5000"
              step="100"
              value={maxDataPoints}
              onChange={(e) => onMaxDataPointsChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              aria-label={`最大数据点设置，当前值: ${maxDataPoints.toLocaleString()}`}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>100</span>
              <span>2500</span>
              <span>5000</span>
            </div>
          </div>

          {/* 采样策略 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">采样策略</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'uniform', label: '均匀采样', desc: '等间距选择数据点' },
                { value: 'adaptive', label: '自适应', desc: '保留重要变化点' },
                { value: 'importance', label: '重要性', desc: '基于数据特征选择' }
              ].map((strategy) => (
                <button
                  type="button"
                  key={strategy.value}
                  onClick={() => onSamplingStrategyChange(strategy.value as any)}
                  className={`p-2 rounded text-xs transition-colors ${samplingStrategy === strategy.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  title={strategy.desc}
                >
                  {strategy.label}
                </button>
              ))}
            </div>
          </div>

          {/* 性能统计 */}
          {performanceStats && (
            <div className="bg-gray-900/50 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-gray-300">性能统计</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-gray-500">渲染时间</div>
                  <div className="text-white font-medium">
                    {performanceStats.renderTime.toFixed(1)}ms
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">压缩比</div>
                  <div className="text-white font-medium">
                    {performanceStats.compressionRatio.toFixed(1)}x
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">缓存</div>
                  <div className={`font-medium ${performanceStats.cacheHit ? 'text-green-400' : 'text-gray-400'
                    }`}>
                    {performanceStats.cacheHit ? '命中' : '未命中'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 建议 */}
          {currentDataPoints > 2000 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-yellow-400 mt-0.5" />
                <div className="text-xs">
                  <div className="text-yellow-400 font-medium">性能建议</div>
                  <div className="text-gray-300 mt-1">
                    当前数据点较多，建议启用优化或减少最大数据点数以提升性能。
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(DataDensityControl);
