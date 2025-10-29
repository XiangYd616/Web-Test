/**
 * 数据可视化Hook
 * 提供数据管理、实时更新、缓存等功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ==================== 类型定义 ====================

export interface DataPoint {
  [key: string]: any;
  timestamp?: number;
  value?: number;
  label?: string;
}

export interface ChartMetrics {
  totalPoints: number;
  avgValue: number;
  maxValue: number;
  minValue: number;
  trend: 'up' | 'down' | 'stable';
}

export interface VisualizationConfig {
  realtime?: boolean;
  refreshInterval?: number;
  maxDataPoints?: number;
  cacheKey?: string;
  autoSave?: boolean;
  onDataUpdate?: (data: DataPoint[]) => void;
}

// ==================== 数据处理工具函数 ====================

const calculateMetrics = (data: DataPoint[]): ChartMetrics => {
  if (!data.length) {
    return {
      totalPoints: 0,
      avgValue: 0,
      maxValue: 0,
      minValue: 0,
      trend: 'stable'
    };
  }

  const values = data.map(d => d.value || 0).filter(v => typeof v === 'number');
  const totalPoints = data.length;
  const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  // 计算趋势（基于最近10个数据点）
  const recentData = values.slice(-10);
  const firstHalf = recentData.slice(0, Math.floor(recentData.length / 2));
  const secondHalf = recentData.slice(Math.floor(recentData.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
  
  const trend = secondAvg > firstAvg * 1.05 ? 'up' : 
                secondAvg < firstAvg * 0.95 ? 'down' : 'stable';

  return {
    totalPoints,
    avgValue: Math.round(avgValue * 100) / 100,
    maxValue,
    minValue,
    trend
  };
};

const filterDataByTimeRange = (
  data: DataPoint[], 
  timeRange: '1h' | '24h' | '7d' | '30d' | 'all'
): DataPoint[] => {
  if (timeRange === 'all') return data;

  const now = Date.now();
  const timeRanges = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };

  const cutoffTime = now - timeRanges[timeRange];
  return data.filter(point => (point.timestamp || 0) >= cutoffTime);
};

const aggregateDataByInterval = (
  data: DataPoint[], 
  interval: 'minute' | 'hour' | 'day'
): DataPoint[] => {
  if (!data.length) return [];

  const intervalMs = {
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000
  };

  const groupedData = new Map<number, DataPoint[]>();
  
  data.forEach(point => {
    const timestamp = point.timestamp || Date.now();
    const intervalKey = Math.floor(timestamp / intervalMs[interval]) * intervalMs[interval];
    
    if (!groupedData.has(intervalKey)) {
      groupedData.set(intervalKey, []);
    }
    groupedData.get(intervalKey)!.push(point);
  });

  return Array.from(groupedData.entries()).map(([timestamp, points]) => ({
    timestamp,
    label: new Date(timestamp).toLocaleString(),
    value: points.reduce((sum, p) => sum + (p.value || 0), 0) / points.length,
    count: points.length
  })).sort((a, b) => a.timestamp - b.timestamp);
};

// ==================== 主Hook ====================

export const useDataVisualization = (
  initialData: DataPoint[] = [],
  config: VisualizationConfig = {}
) => {
  const {
    realtime = false,
    refreshInterval = 3000,
    maxDataPoints = 100,
    cacheKey,
    autoSave = true,
    onDataUpdate
  } = config;

  const [data, setData] = useState<DataPoint[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ChartMetrics>(calculateMetrics(initialData));
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d' | 'all'>('24h');
  const [aggregationLevel, setAggregationLevel] = useState<'minute' | 'hour' | 'day'>('hour');

  const intervalRef = useRef<NodeJS.Timeout>();
  const dataHistoryRef = useRef<DataPoint[]>(initialData);

  // ==================== 数据管理函数 ====================

  const addDataPoint = useCallback((point: DataPoint) => {
    const newPoint = {
      ...point,
      timestamp: point.timestamp || Date.now()
    };

    setData(prevData => {
      const updatedData = [...prevData, newPoint];
      
      // 限制数据点数量
      if (updatedData.length > maxDataPoints) {
        updatedData.shift();
      }
      
      dataHistoryRef.current = updatedData;
      onDataUpdate?.(updatedData);
      
      return updatedData;
    });
  }, [maxDataPoints, onDataUpdate]);

  const addBatchData = useCallback((points: DataPoint[]) => {
    const newPoints = points.map(point => ({
      ...point,
      timestamp: point.timestamp || Date.now()
    }));

    setData(prevData => {
      const updatedData = [...prevData, ...newPoints];
      
      // 限制数据点数量
      while (updatedData.length > maxDataPoints) {
        updatedData.shift();
      }
      
      dataHistoryRef.current = updatedData;
      onDataUpdate?.(updatedData);
      
      return updatedData;
    });
  }, [maxDataPoints, onDataUpdate]);

  const clearData = useCallback(() => {
    setData([]);
    dataHistoryRef.current = [];
    setError(null);
  }, []);

  const updateDataPoint = useCallback((index: number, updates: Partial<DataPoint>) => {
    setData(prevData => {
      const updatedData = [...prevData];
      if (index >= 0 && index < updatedData.length) {
        updatedData[index] = { ...updatedData[index], ...updates };
      }
      return updatedData;
    });
  }, []);

  const removeDataPoint = useCallback((index: number) => {
    setData(prevData => {
      const updatedData = [...prevData];
      if (index >= 0 && index < updatedData.length) {
        updatedData.splice(index, 1);
      }
      return updatedData;
    });
  }, []);

  // ==================== 数据过滤和聚合 ====================

  const filteredData = useCallback(() => {
    const timeFiltered = filterDataByTimeRange(data, timeRange);
    return aggregateDataByInterval(timeFiltered, aggregationLevel);
  }, [data, timeRange, aggregationLevel]);

  const getDataByTimeRange = useCallback((range: typeof timeRange) => {
    return filterDataByTimeRange(data, range);
  }, [data]);

  const getAggregatedData = useCallback((interval: typeof aggregationLevel) => {
    return aggregateDataByInterval(data, interval);
  }, [data]);

  // ==================== 缓存管理 ====================

  const saveToCache = useCallback(() => {
    if (!cacheKey || !autoSave) return;
    
    try {
      const cacheData = {
        data: dataHistoryRef.current,
        timestamp: Date.now(),
        metrics: calculateMetrics(dataHistoryRef.current)
      };
      localStorage.setItem(`chart_data_${cacheKey}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save chart data to cache:', error);
    }
  }, [cacheKey, autoSave]);

  const loadFromCache = useCallback(() => {
    if (!cacheKey) return false;
    
    try {
      const cachedData = localStorage.getItem(`chart_data_${cacheKey}`);
      if (cachedData) {
        const { data: savedData } = JSON.parse(cachedData);
        if (Array.isArray(savedData)) {
          setData(savedData);
          dataHistoryRef.current = savedData;
          return true;
        }
      }
    } catch (error) {
      console.warn('Failed to load chart data from cache:', error);
    }
    return false;
  }, [cacheKey]);

  const clearCache = useCallback(() => {
    if (!cacheKey) return;
    localStorage.removeItem(`chart_data_${cacheKey}`);
  }, [cacheKey]);

  // ==================== 实时数据更新 ====================

  const startRealTimeUpdates = useCallback(() => {
    if (!realtime) return;

    intervalRef.current = setInterval(() => {
      // 模拟实时数据
      const newPoint: DataPoint = {
        timestamp: Date.now(),
        value: Math.random() * 100,
        label: new Date().toLocaleTimeString()
      };
      
      addDataPoint(newPoint);
    }, refreshInterval);
  }, [realtime, refreshInterval, addDataPoint]);

  const stopRealTimeUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  // ==================== 数据导出和导入 ====================

  const exportData = useCallback((format: 'json' | 'csv' = 'json') => {
    const exportData = filteredData();
    
    if (format === 'csv') {
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => 
            JSON.stringify(row[header] || '')
          ).join(',')
        )
      ].join('\n');
      
      return csvContent;
    }
    
    return JSON.stringify(exportData, null, 2);
  }, [filteredData]);

  const importData = useCallback((importedData: string, format: 'json' | 'csv' = 'json') => {
    try {
      let parsedData: DataPoint[];
      
      if (format === 'csv') {
        const lines = importedData.split('\n');
        const headers = lines[0].split(',');
        parsedData = lines.slice(1).map(line => {
          const values = line.split(',');
          const point: DataPoint = {};
          headers.forEach((header, index) => {
            const value = values[index]?.replace(/"/g, '');
            point[header] = isNaN(Number(value)) ? value : Number(value);
          });
          return point;
        });
      } else {
        parsedData = JSON.parse(importedData);
      }
      
      if (Array.isArray(parsedData)) {
        setData(parsedData);
        dataHistoryRef.current = parsedData;
        setError(null);
        return true;
      }
      
      throw new Error('Invalid data format');
    } catch (error) {
      setError('Failed to import data: ' + (error as Error).message);
      return false;
    }
  }, []);

  // ==================== 副作用管理 ====================

  // 计算指标
  useEffect(() => {
    setMetrics(calculateMetrics(data));
  }, [data]);

  // 缓存管理
  useEffect(() => {
    if (cacheKey && data.length > 0) {
      saveToCache();
    }
  }, [data, saveToCache, cacheKey]);

  // 加载缓存数据
  useEffect(() => {
    if (cacheKey && initialData.length === 0) {
      loadFromCache();
    }
  }, [cacheKey, initialData.length, loadFromCache]);

  // 实时更新管理
  useEffect(() => {
    if (realtime) {
      startRealTimeUpdates();
    } else {
      stopRealTimeUpdates();
    }

    return () => {
      stopRealTimeUpdates();
    };
  }, [realtime, startRealTimeUpdates, stopRealTimeUpdates]);

  // ==================== 返回值 ====================

  return {
    // 数据状态
    data: filteredData(),
    rawData: data,
    loading,
    error,
    metrics,
    
    // 配置状态
    timeRange,
    aggregationLevel,
    isRealTime: realtime && !!intervalRef.current,
    
    // 数据操作
    addDataPoint,
    addBatchData,
    clearData,
    updateDataPoint,
    removeDataPoint,
    
    // 数据查询
    getDataByTimeRange,
    getAggregatedData,
    
    // 配置控制
    setTimeRange,
    setAggregationLevel,
    
    // 实时控制
    startRealTimeUpdates,
    stopRealTimeUpdates,
    
    // 缓存操作
    saveToCache,
    loadFromCache,
    clearCache,
    
    // 导入导出
    exportData,
    importData,
    
    // 工具函数
    refreshData: () => setData([...dataHistoryRef.current]),
    resetToInitial: () => {
      setData(initialData);
      dataHistoryRef.current = initialData;
      setError(null);
    }
  };
};

// ==================== 特定用途的Hook ====================

/**
 * 性能监控数据Hook
 */
export const usePerformanceVisualization = (config?: VisualizationConfig) => {
  const visualizationHook = useDataVisualization([], {
    ...config,
    realtime: true,
    refreshInterval: 5000,
    maxDataPoints: 50
  });

  const addPerformanceMetric = useCallback((
    metric: 'responseTime' | 'throughput' | 'errorRate' | 'cpuUsage',
    value: number
  ) => {
    visualizationHook.addDataPoint({
      timestamp: Date.now(),
      value,
      label: new Date().toLocaleTimeString(),
      metric,
      type: 'performance'
    });
  }, [visualizationHook]);

  return {
    ...visualizationHook,
    addPerformanceMetric
  };
};

/**
 * 测试结果数据Hook
 */
export const useTestResultVisualization = (config?: VisualizationConfig) => {
  const visualizationHook = useDataVisualization([], {
    ...config,
    maxDataPoints: 200
  });

  const addTestResult = useCallback((
    testType: string,
    score: number,
    duration: number,
    status: 'success' | 'failed' | 'warning'
  ) => {
    visualizationHook.addDataPoint({
      timestamp: Date.now(),
      value: score,
      label: new Date().toLocaleString(),
      testType,
      duration,
      status,
      type: 'test_result'
    });
  }, [visualizationHook]);

  return {
    ...visualizationHook,
    addTestResult
  };
};

export default useDataVisualization;
