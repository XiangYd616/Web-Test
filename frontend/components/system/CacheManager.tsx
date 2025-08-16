import { handleAsyncError    } from '../utils/errorHandler';/**'
 * 缓存管理组件
 * 提供缓存状态监控和管理界面
 * 版本: v1.0.0
 */

import React, { useState, useEffect, useCallback    } from 'react';import { Database, Trash2, RefreshCw, BarChart3, Settings, AlertTriangle, CheckCircle, Clock, HardDrive, Zap, TrendingUp, // Activity   } from 'lucide-react';// 已修复'
import { useCache, useApiCache, useUserCache, useTempCache, useTestResultCache    } from '../../hooks/useCache';// // import type { CacheStats  } from '../../services/cacheStrategy';// 已删除 // 已删除'
// ==================== 类型定义 ====================

interface CacheManagerProps   {
  className?: string;
  showAdvanced?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface CacheTypeInfo   {
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  stats: CacheStats | null;
  operations: any;
  isLoading: boolean;
  error: string | null;
}

// ==================== 缓存统计卡片组件 ====================

const CacheStatsCard: React.FC<{
  title: string;
  stats: CacheStats | null;
  icon: React.ComponentType<any>;
  color: string;
  isLoading: boolean;
  error: string | null;
  onClear: () => void;
  onRefresh: () => void;
}> = ({ title, stats, icon: Icon, color, isLoading, error, onClear, onRefresh }) => {
  const hitRate = stats ? (stats.hitRate * 100).toFixed(1) : '0.0';
  const memoryUsage = stats ? (stats.memoryUsage / 1024 / 1024).toFixed(2) : '0.00';
  return (
    <div className= 'bg-gray-800 rounded-lg p-6 border border-gray-700'>
      <div className= 'flex items-center justify-between mb-4'>
        <div className= 'flex items-center space-x-3'>
          <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>`
            <Icon className= "w-5 h-5 text-white'    />`
          </div>
          <div>
            <h3 className= 'text-lg font-semibold text-white'>{title}</h3>
            <p className= 'text-sm text-gray-400'>缓存统计</p>
          </div>
        </div>
        
        <div className= 'flex items-center space-x-2'>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className= 'p-2 text-gray-400 hover:text-blue-400 transition-colors disabled:opacity-50';
            title= '刷新统计';
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}    />`
          </button>
          <button
            onClick={onClear}
            className= "p-2 text-gray-400 hover:text-red-400 transition-colors';'`
            title= '清空缓存';
          >
            <Trash2 className= 'w-4 h-4'    />
          </button>
        </div>
      </div>

      {error ? (
        <div className= 'bg-red-900/20 border border-red-700 rounded-lg p-3'>
          <div className= 'flex items-center space-x-2'>
            <AlertTriangle className= 'w-4 h-4 text-red-400'    />
            <span className= 'text-red-300 text-sm'>{error}</span>
          </div>
        </div>
      ) : (
        <div className= 'space-y-4'>
          {/* 命中率 */}
          <div className= 'space-y-2'>
            <div className= 'flex items-center justify-between'>
              <span className= 'text-sm text-gray-400'>命中率</span>
              <span className= 'text-sm font-medium text-white'>{hitRate}%</span>
            </div>
            <div className= 'w-full bg-gray-700 rounded-full h-2'>
              <div
                className={`h-2 rounded-full transition-all duration-300 ${`}
                  parseFloat(hitRate) > 80 ? "bg-green-500' : ''`
                  parseFloat(hitRate) > 60 ? 'bg-yellow-500' : 'bg-red-500';
                }`}`
                style={{ width: `${hitRate}%` }}`
              />
            </div>
          </div>

          {/* 统计信息网格 */}
          <div className= "grid grid-cols-2 gap-4'>`
            <div className= 'bg-gray-700/50 rounded-lg p-3'>
              <div className= 'flex items-center space-x-2 mb-1'>
                <CheckCircle className= 'w-4 h-4 text-green-400'    />
                <span className= 'text-xs text-gray-400'>命中</span>
              </div>
              <span className= 'text-lg font-semibold text-white'>
                {stats?.hits.toLocaleString() || "0'}'
              </span>
            </div>

            <div className= 'bg-gray-700/50 rounded-lg p-3'>
              <div className= 'flex items-center space-x-2 mb-1'>
                <AlertTriangle className= 'w-4 h-4 text-red-400'    />
                <span className= 'text-xs text-gray-400'>未命中</span>
              </div>
              <span className= 'text-lg font-semibold text-white'>
                {stats?.misses.toLocaleString() || "0'}'
              </span>
            </div>

            <div className= 'bg-gray-700/50 rounded-lg p-3'>
              <div className= 'flex items-center space-x-2 mb-1'>
                <Database className= 'w-4 h-4 text-blue-400'    />
                <span className= 'text-xs text-gray-400'>条目数</span>
              </div>
              <span className= 'text-lg font-semibold text-white'>
                {stats?.size.toLocaleString() || "0'}'
              </span>
            </div>

            <div className= 'bg-gray-700/50 rounded-lg p-3'>
              <div className= 'flex items-center space-x-2 mb-1'>
                <HardDrive className= 'w-4 h-4 text-purple-400'    />
                <span className= 'text-xs text-gray-400'>内存</span>
              </div>
              <span className= 'text-lg font-semibold text-white'>
                {memoryUsage}MB
              </span>
            </div>
          </div>

          {/* 操作统计 */}
          {stats && stats.operations > 0 && (
            <div className= 'bg-gray-700/30 rounded-lg p-3'>
              <div className= 'flex items-center space-x-2 mb-2'>
                <Activity className= 'w-4 h-4 text-gray-400'    />
                <span className= 'text-sm text-gray-400'>总操作数</span>
              </div>
              <span className= 'text-xl font-bold text-white'>
                {stats.operations.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== 主组件 ====================

export const CacheManager: React.FC<CacheManagerProps> = ({
  className = "','
  showAdvanced = false,
  autoRefresh = true,
  refreshInterval = 30000
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
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'settings'>("overview');'
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 各种缓存Hook
  const [memoryState, memoryOps] = useCache({ 
    cacheType: 'memory', '
    enableStats: true,
    namespace: 'memory';
  });
  
  const [localStorageState, localStorageOps] = useCache({ 
    cacheType: 'localStorage', '
    enableStats: true,
    namespace: 'localStorage';
  });
  
  const [apiState, apiOps] = useApiCache({ enableStats: true });
  const [userState, userOps] = useUserCache({ enableStats: true });
  const [tempState, tempOps] = useTempCache({ enableStats: true });
  const [testResultState, testResultOps] = useTestResultCache({ enableStats: true });

  // 缓存类型信息
  const cacheTypes: CacheTypeInfo[]  = [
    {
      name: '内存缓存','
      description: '高速内存缓存，重启后清空','
      icon: Zap,
      color: 'bg-yellow-600','
      stats: memoryState.stats,
      operations: memoryOps,
      isLoading: memoryState.isLoading,
      error: memoryState.error
    },
    {
      name: '本地存储','
      description: '持久化本地存储缓存','
      icon: HardDrive,
      color: 'bg-blue-600','
      stats: localStorageState.stats,
      operations: localStorageOps,
      isLoading: localStorageState.isLoading,
      error: localStorageState.error
    },
    {
      name: 'API缓存','
      description: 'API响应数据缓存','
      icon: Database,
      color: 'bg-green-600','
      stats: apiState.stats,
      operations: apiOps,
      isLoading: apiState.isLoading,
      error: apiState.error
    },
    {
      name: '用户缓存','
      description: '用户相关数据缓存','
      icon: Settings,
      color: 'bg-purple-600','
      stats: userState.stats,
      operations: userOps,
      isLoading: userState.isLoading,
      error: userState.error
    },
    {
      name: '临时缓存','
      description: '短期临时数据缓存','
      icon: Clock,
      color: 'bg-orange-600','
      stats: tempState.stats,
      operations: tempOps,
      isLoading: tempState.isLoading,
      error: tempState.error
    },
    {
      name: '测试结果','
      description: '测试结果数据缓存','
      icon: BarChart3,
      color: 'bg-indigo-600','
      stats: testResultState.stats,
      operations: testResultOps,
      isLoading: testResultState.isLoading,
      error: testResultState.error
    }
  ];
  // 刷新所有统计
  const refreshAllStats = useCallback(async () => {
    setRefreshTrigger(prev => prev + 1);
    
    // 触发所有缓存的统计更新
    try {
  await Promise.all([
      memoryOps.getStats(),
      localStorageOps.getStats(),
      apiOps.getStats(),
      userOps.getStats(),
      tempOps.getStats(),
      testResultOps.getStats()
    ]);
} catch (error) {
  console.error("Await error: ', error);'
  throw error;
}
  }, [memoryOps, localStorageOps, apiOps, userOps, tempOps, testResultOps]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshAllStats, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshAllStats]);

  // 初始加载
  useEffect(() => {
    refreshAllStats();
  }, [refreshAllStats]);

  // 计算总体统计
  const totalStats = cacheTypes.reduce((acc, cache) => {
    if (cache.stats) {
      acc.hits += cache.stats.hits;
      acc.misses += cache.stats.misses;
      acc.size += cache.stats.size;
      acc.memoryUsage += cache.stats.memoryUsage;
      acc.operations += cache.stats.operations || 0;
    }
    return acc;
  }, { hits: 0, misses: 0, size: 0, memoryUsage: 0, operations: 0 });

  const totalHitRate = totalStats.hits + totalStats.misses > 0 
    ? (totalStats.hits / (totalStats.hits + totalStats.misses) * 100).toFixed(1)
    : '0.0';
  return (
    <div className={`space-y-6 ${className}`}>`
      {/* 标题和控制 */}
      <div className= "flex items-center justify-between'>`
        <div>
          <h2 className= 'text-2xl font-bold text-white'>缓存管理</h2>
          <p className= 'text-gray-400'>监控和管理系统缓存状态</p>
        </div>
        
        <div className= 'flex items-center space-x-4'>
          <button
            onClick={refreshAllStats}
            className= 'flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors';
          >
            <RefreshCw className= 'w-4 h-4'    />
            <span>刷新统计</span>
          </button>
        </div>
      </div>

      {/* 总体统计 */}
      <div className= 'bg-gray-800 rounded-lg p-6 border border-gray-700'>
        <h3 className= 'text-lg font-semibold text-white mb-4'>总体统计</h3>
        
        <div className= 'grid grid-cols-2 md:grid-cols-5 gap-4'>
          <div className= 'text-center'>
            <div className= 'text-2xl font-bold text-green-400'>{totalHitRate}%</div>
            <div className= 'text-sm text-gray-400'>总命中率</div>
          </div>
          
          <div className= 'text-center'>
            <div className= 'text-2xl font-bold text-blue-400'>{totalStats.hits.toLocaleString()}</div>
            <div className= 'text-sm text-gray-400'>总命中数</div>
          </div>
          
          <div className= 'text-center'>
            <div className= 'text-2xl font-bold text-red-400'>{totalStats.misses.toLocaleString()}</div>
            <div className= 'text-sm text-gray-400'>总未命中</div>
          </div>
          
          <div className= 'text-center'>
            <div className= 'text-2xl font-bold text-purple-400'>{totalStats.size.toLocaleString()}</div>
            <div className= 'text-sm text-gray-400'>总条目数</div>
          </div>
          
          <div className= 'text-center'>
            <div className= 'text-2xl font-bold text-yellow-400'>
              {(totalStats.memoryUsage / 1024 / 1024).toFixed(2)}MB
            </div>
            <div className= 'text-sm text-gray-400'>总内存使用</div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className= 'border-b border-gray-700'>
        <nav className= 'flex space-x-8'>
          {[
            { key: 'overview', label: '概览', icon: BarChart3 },'
            { key: 'details', label: '详细信息', icon: Database },'
            { key: 'settings', label: '设置', icon: Settings }'
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${`}
                activeTab === key
                  ? "border-blue-500 text-blue-400';'`
                  : 'border-transparent text-gray-400 hover:text-gray-300';
              }`}`
            >
              <Icon className= "w-4 h-4'    />`
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 内容区域 */}
      {activeTab === 'overview' && (<div className= 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {cacheTypes.map((cache, index) => (
            <CacheStatsCard
              key={index}
              title={cache.name}
              stats={cache.stats}
              icon={cache.icon}
              color={cache.color}
              isLoading={cache.isLoading}
              error={cache.error}
              onClear={() => cache.operations.clear()}
              onRefresh={() => cache.operations.getStats()}
            />
          ))}
        </div>
      )}

      {activeTab === 'details' && (<div className= 'bg-gray-800 rounded-lg p-6 border border-gray-700'>
          <h3 className= 'text-lg font-semibold text-white mb-4'>详细缓存信息</h3>
          
          <div className= 'space-y-4'>
            {cacheTypes.map((cache, index) => (
              <div key={index} className= 'border border-gray-600 rounded-lg p-4'>
                <div className= 'flex items-center justify-between mb-3'>
                  <div className= 'flex items-center space-x-3'>
                    <div className={`w-8 h-8 rounded ${cache.color} flex items-center justify-center`}>`
                      <cache.icon className= "w-4 h-4 text-white' />`
                    </div>
                    <div>
                      <h4 className= 'font-medium text-white'>{cache.name}</h4>
                      <p className= 'text-sm text-gray-400'>{cache.description}</p>
                    </div>
                  </div>
                  
                  <div className= 'flex items-center space-x-2'>
                    <button
                      onClick={() => cache.operations.getStats()}
                      className= 'p-1 text-gray-400 hover:text-blue-400 transition-colors';
                    >
                      <RefreshCw className= 'w-4 h-4'    />
                    </button>
                    <button
                      onClick={() => cache.operations.clear()}
                      className= 'p-1 text-gray-400 hover:text-red-400 transition-colors';
                    >
                      <Trash2 className= 'w-4 h-4'    />
                    </button>
                  </div>
                </div>
                
                {cache.stats && (
                  <div className= 'grid grid-cols-4 gap-4 text-sm'>
                    <div>
                      <span className= 'text-gray-400'>命中率:</span>
                      <span className= 'ml-2 text-white'>{(cache.stats.hitRate * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className= 'text-gray-400'>条目数:</span>
                      <span className= 'ml-2 text-white'>{cache.stats.size}</span>
                    </div>
                    <div>
                      <span className= 'text-gray-400'>内存:</span>
                      <span className= 'ml-2 text-white'>{(cache.stats.memoryUsage / 1024).toFixed(1)}KB</span>
                    </div>
                    <div>
                      <span className= 'text-gray-400'>操作数:</span>
                      <span className= 'ml-2 text-white'>{cache.stats.operations || 0}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (<div className= 'bg-gray-800 rounded-lg p-6 border border-gray-700'>
          <h3 className= 'text-lg font-semibold text-white mb-4'>缓存设置</h3>
          
          <div className= 'space-y-6'>
            <div className= 'flex items-center justify-between'>
              <div>
                <h4 className= 'font-medium text-white'>自动刷新</h4>
                <p className= 'text-sm text-gray-400'>自动更新缓存统计信息</p>
              </div>
              <label className= 'relative inline-flex items-center cursor-pointer'>
                <input
                  type= 'checkbox';
                  checked={autoRefresh}
                  onChange={(e) => {
                    // 这里应该有状态更新逻辑
                    console.log('Auto refresh toggled: ', e.target.checked);'
                  }}
                  className= 'sr-only peer';
                />
                <div className= 'w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-['"] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600'></div>
              </label>
            </div>
            
            <div>
              <h4 className= 'font-medium text-white mb-2'>刷新间隔</h4>
              <select className= 'bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2'>
                <option value= '10000'>10秒</option>
                <option value= '30000' selected>30秒</option>
                <option value= '60000'>1分钟</option>
                <option value= '300000'>5分钟</option>
              </select>
            </div>
            
            <div className= 'pt-4 border-t border-gray-600'>
              <button
                onClick={() => {
                  cacheTypes.forEach(cache => cache.operations.clear());
                }}
                className= 'flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors';
              >
                <Trash2 className= 'w-4 h-4'    />
                <span>清空所有缓存</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheManager;
