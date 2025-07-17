/**
 * 统一的压力测试图表容器 - 实现空间复用和智能切换
 */

import { BarChart3, Download, GitCompare, Play, RefreshCw, Settings, Square, TrendingUp } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import EnhancedStressTestCharts from './EnhancedStressTestCharts';
import TestComparisonCharts from './TestComparisonCharts';

// 测试状态枚举
export enum TestStatus {
  IDLE = 'idle',
  STARTING = 'starting',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// 测试状态类型
export type TestStatusType = 'idle' | 'starting' | 'running' | 'completed' | 'failed';

// 统一的数据接口
interface UnifiedTestData {
  // 实时数据
  realTimeData: Array<{
    timestamp: number;
    responseTime: number;
    status: number;
    success: boolean;
    activeUsers: number;
    throughput: number;
    errorType?: string;
    connectionTime?: number;
    dnsTime?: number;
    phase?: string;
  }>;

  // 当前测试指标
  currentMetrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    currentTPS: number;
    peakTPS: number;
    errorBreakdown: Record<string, number>;
    p50ResponseTime?: number;
    p75ResponseTime?: number;
    p90ResponseTime?: number;
    p95ResponseTime?: number;
    p99ResponseTime?: number;
    p999ResponseTime?: number;
  };

  // 测试结果（完成后）
  testResult?: {
    id: string;
    name: string;
    date: string;
    url: string;
    config: any;
    metrics: any;
    timeSeriesData: any[];
  };

  // 历史测试结果
  historicalResults: any[];

  // 基线数据
  baseline?: any;
}

interface UnifiedStressTestChartsProps {
  testStatus: TestStatusType;
  testData: UnifiedTestData;
  testConfig?: {
    url: string;
    users: number;
    duration: number;
    testType: string;
  };
  height?: number;
  onExportData?: (data: any) => void;
  onSaveAsBaseline?: (data: any) => void;
}

export const UnifiedStressTestCharts: React.FC<UnifiedStressTestChartsProps> = ({
  testStatus,
  testData,
  testConfig,
  height = 500,
  onExportData,
  onSaveAsBaseline
}) => {
  // 状态管理
  const [activeView, setActiveView] = useState<'realtime' | 'results' | 'comparison'>('realtime');
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(true);
  const [chartSettings, setChartSettings] = useState({
    enableZoom: true,
    dataPointDensity: 'medium' as 'low' | 'medium' | 'high',
    refreshInterval: 1000
  });

  // 自动切换视图逻辑
  useEffect(() => {
    if (!autoSwitch) return undefined;

    switch (testStatus) {
      case TestStatus.IDLE:
      case TestStatus.STARTING:
        setActiveView('realtime');
        break;
      case TestStatus.RUNNING:
        setActiveView('realtime');
        break;
      case TestStatus.COMPLETED:
        // 延迟切换到结果视图，让用户看到最终的实时数据
        const timer = setTimeout(() => {
          setActiveView('results');
        }, 2000);
        return () => clearTimeout(timer);
      case TestStatus.FAILED:
        setActiveView('results');
        break;
      default:
        break;
    }
    return undefined;
  }, [testStatus, autoSwitch]);

  // 测试阶段定义
  const testPhases = useMemo(() => {
    if (!testConfig) return [];

    const startTime = Date.now() - (testData.realTimeData.length * 1000);
    const rampUpDuration = (testConfig.duration * 0.2) * 1000; // 20% 用于加压
    const steadyDuration = (testConfig.duration * 0.6) * 1000; // 60% 稳定负载
    const rampDownDuration = (testConfig.duration * 0.2) * 1000; // 20% 减压

    return [
      {
        name: '加压阶段',
        startTime: startTime,
        endTime: startTime + rampUpDuration,
        color: '#F59E0B',
        description: '逐步增加用户负载'
      },
      {
        name: '稳定阶段',
        startTime: startTime + rampUpDuration,
        endTime: startTime + rampUpDuration + steadyDuration,
        color: '#10B981',
        description: '维持稳定负载'
      },
      {
        name: '减压阶段',
        startTime: startTime + rampUpDuration + steadyDuration,
        endTime: startTime + rampUpDuration + steadyDuration + rampDownDuration,
        color: '#3B82F6',
        description: '逐步减少用户负载'
      }
    ];
  }, [testConfig, testData.realTimeData.length]);

  // 状态指示器
  const getStatusIndicator = () => {
    const statusConfig = {
      [TestStatus.IDLE]: { color: 'bg-gray-500', text: '待机', icon: Square },
      [TestStatus.STARTING]: { color: 'bg-yellow-500', text: '启动中', icon: RefreshCw },
      [TestStatus.RUNNING]: { color: 'bg-green-500', text: '运行中', icon: Play },
      [TestStatus.COMPLETED]: { color: 'bg-blue-500', text: '已完成', icon: BarChart3 },
      [TestStatus.FAILED]: { color: 'bg-red-500', text: '失败', icon: Square }
    };

    const config = statusConfig[testStatus];
    const Icon = config.icon;

    return (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${config.color} ${testStatus === TestStatus.RUNNING ? 'animate-pulse' : ''}`} />
        <Icon className="w-4 h-4 text-gray-300" />
        <span className="text-sm font-medium text-gray-300">{config.text}</span>
      </div>
    );
  };

  // 实时指标卡片
  const renderMetricsCards = () => {
    if (!testData.currentMetrics) return null;

    const metrics = [
      {
        label: '总请求数',
        value: testData.currentMetrics.totalRequests.toLocaleString(),
        color: 'text-blue-400'
      },
      {
        label: '成功率',
        value: `${((testData.currentMetrics.successfulRequests / testData.currentMetrics.totalRequests) * 100 || 0).toFixed(1)}%`,
        color: 'text-green-400'
      },
      {
        label: '平均响应时间',
        value: `${testData.currentMetrics.averageResponseTime}ms`,
        color: 'text-yellow-400'
      },
      {
        label: '当前TPS',
        value: testData.currentMetrics.currentTPS.toFixed(1),
        color: 'text-purple-400'
      },
      {
        label: 'P95响应时间',
        value: `${testData.currentMetrics.p95ResponseTime || 0}ms`,
        color: 'text-orange-400'
      },
      {
        label: '错误率',
        value: `${((testData.currentMetrics.failedRequests / testData.currentMetrics.totalRequests) * 100 || 0).toFixed(2)}%`,
        color: 'text-red-400'
      }
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">{metric.label}</div>
            <div className={`text-lg font-bold ${metric.color}`}>{metric.value}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 控制面板 */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-800/50 rounded-lg">
        <div className="flex items-center gap-4">
          {getStatusIndicator()}

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300">视图:</span>
            <div className="flex gap-1">
              {[
                { key: 'realtime', label: '实时监控', icon: TrendingUp, disabled: false },
                { key: 'results', label: '测试结果', icon: BarChart3, disabled: testStatus === TestStatus.IDLE },
                { key: 'comparison', label: '对比分析', icon: GitCompare, disabled: testData.historicalResults.length === 0 }
              ].map(({ key, label, icon: Icon, disabled }) => (
                <button
                  key={key}
                  onClick={() => setActiveView(key as any)}
                  disabled={disabled}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors ${activeView === key
                    ? 'bg-blue-600 text-white'
                    : disabled
                      ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={autoSwitch}
              onChange={(e) => setAutoSwitch(e.target.checked)}
              className="rounded"
            />
            自动切换
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
            className={`px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors ${showAdvancedMetrics
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            <Settings className="w-4 h-4" />
            高级指标
          </button>

          {testStatus === TestStatus.COMPLETED && onSaveAsBaseline && (
            <button
              onClick={() => onSaveAsBaseline(testData.testResult)}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
            >
              <TrendingUp className="w-4 h-4" />
              设为基线
            </button>
          )}

          {onExportData && (
            <button
              onClick={() => onExportData(testData)}
              className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          )}
        </div>
      </div>

      {/* 实时指标卡片 */}
      {(testStatus === TestStatus.RUNNING || testStatus === TestStatus.COMPLETED) && renderMetricsCards()}

      {/* 图表区域 - 空间复用 */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        {activeView === 'realtime' && (
          <EnhancedStressTestCharts
            realTimeData={testData.realTimeData}
            testResultData={testStatus === TestStatus.COMPLETED ? testData.testResult?.timeSeriesData : undefined}
            isRunning={testStatus === TestStatus.RUNNING}
            testCompleted={testStatus === TestStatus.COMPLETED}
            testPhases={testPhases}
            currentMetrics={testData.currentMetrics}
            height={height}
            enableZoom={chartSettings.enableZoom}
            dataPointDensity={chartSettings.dataPointDensity}
            showAdvancedMetrics={showAdvancedMetrics}
          />
        )}

        {activeView === 'results' && testData.testResult && (
          <EnhancedStressTestCharts
            testResultData={testData.testResult.timeSeriesData}
            isRunning={false}
            testCompleted={true}
            testPhases={testPhases}
            currentMetrics={testData.currentMetrics}
            height={height}
            enableZoom={chartSettings.enableZoom}
            dataPointDensity={chartSettings.dataPointDensity}
            showAdvancedMetrics={showAdvancedMetrics}
          />
        )}

        {activeView === 'comparison' && (
          <TestComparisonCharts
            testResults={testData.historicalResults}
            baseline={testData.baseline}
            currentTest={testData.testResult}
            height={height}
            showTimeSeriesComparison={true}
          />
        )}
      </div>

      {/* 测试阶段说明 */}
      {testStatus === TestStatus.RUNNING && testPhases.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">测试阶段</h4>
          <div className="flex flex-wrap gap-4">
            {testPhases.map((phase, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: phase.color }}
                />
                <span className="text-sm text-gray-300">{phase.name}</span>
                <span className="text-xs text-gray-500">({phase.description})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedStressTestCharts;
