/**
 * 测试运行器组件
 * 统一管理各类测试的执行流程
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Square, RotateCcw, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface TestConfig {
  name: string;
  type: string;
  url: string;
  options: Record<string, any>;
}

export interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
}

export interface TestRunnerProps {
  config: TestConfig;
  onTestComplete: (result: TestResult) => void;
  onStatusChange?: (status: 'idle' | 'running' | 'completed' | 'failed') => void;
  disabled?: boolean;
  autoStart?: boolean;
}

export const TestRunner: React.FC<TestRunnerProps> = ({
  config,
  onTestComplete,
  onStatusChange,
  disabled = false,
  autoStart = false
}) => {
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [result, setResult] = useState<TestResult | null>(null);
  const [duration, setDuration] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 状态变更回调
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // 自动启动
  useEffect(() => {
    if (autoStart && status === 'idle') {
      handleStartTest();
    }
  }, [autoStart]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * 添加日志
   */
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev.slice(-19), logMessage]); // 保持最后20条日志
  }, []);

  /**
   * 更新进度
   */
  const updateProgress = useCallback((percent: number, step?: string) => {
    setProgress(Math.min(100, Math.max(0, percent)));
    if (step) {
      setCurrentStep(step);
      addLog(step);
    }
  }, [addLog]);

  /**
   * 开始计时
   */
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  /**
   * 停止计时
   */
  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * 执行测试
   */
  const executeTest = async (): Promise<TestResult> => {
    const { name, type, url, options } = config;
    
    // 创建中止控制器
    abortControllerRef.current = new AbortController();
    
    try {
      updateProgress(10, `开始 ${name} 测试...`);
      
      // 模拟测试步骤
      const steps = [
        { progress: 20, step: '初始化测试环境...' },
        { progress: 30, step: '验证目标URL...' },
        { progress: 40, step: '建立连接...' },
        { progress: 60, step: '执行测试逻辑...' },
        { progress: 80, step: '收集测试数据...' },
        { progress: 90, step: '生成测试报告...' },
      ];

      for (const { progress, step } of steps) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('测试已被取消');
        }
        
        updateProgress(progress, step);
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      }

      // 调用实际的测试API
      const response = await fetch(`/api/tests/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, options }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      updateProgress(100, '测试完成！');

      return {
        success: true,
        data,
        duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      if (error.name === 'AbortError' || error.message.includes('取消')) {
        addLog('测试已被用户取消');
        return {
          success: false,
          error: '测试已取消',
          duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
          timestamp: new Date().toISOString()
        };
      }
      
      addLog(`测试失败: ${error.message}`);
      return {
        success: false,
        error: error.message,
        duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        timestamp: new Date().toISOString()
      };
    }
  };

  /**
   * 开始测试
   */
  const handleStartTest = useCallback(async () => {
    if (status === 'running' || disabled) return;

    setStatus('running');
    setProgress(0);
    setCurrentStep('准备开始测试...');
    setResult(null);
    setDuration(0);
    setLogs([]);
    
    addLog(`开始执行 ${config.name}`);
    startTimer();

    try {
      const testResult = await executeTest();
      
      setResult(testResult);
      setStatus(testResult.success ? 'completed' : 'failed');
      
      if (testResult.success) {
        toast.success(`${config.name} 测试完成`);
        addLog('✅ 测试执行成功');
      } else {
        toast.error(`${config.name} 测试失败: ${testResult.error}`);
        addLog(`❌ 测试执行失败: ${testResult.error}`);
      }
      
      onTestComplete(testResult);
      
    } catch (error: any) {
      const failedResult: TestResult = {
        success: false,
        error: error.message,
        duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        timestamp: new Date().toISOString()
      };
      
      setResult(failedResult);
      setStatus('failed');
      toast.error(`测试异常: ${error.message}`);
      addLog(`❌ 测试异常: ${error.message}`);
      
      onTestComplete(failedResult);
    } finally {
      stopTimer();
      abortControllerRef.current = null;
    }
  }, [config, status, disabled, onTestComplete, addLog, startTimer, stopTimer]);

  /**
   * 停止测试
   */
  const handleStopTest = useCallback(() => {
    if (status !== 'running') return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setStatus('idle');
    setProgress(0);
    setCurrentStep('');
    stopTimer();
    addLog('测试已被停止');
    toast('测试已停止', { icon: '⏹️' });
  }, [status, stopTimer, addLog]);

  /**
   * 重置测试
   */
  const handleResetTest = useCallback(() => {
    if (status === 'running') return;

    setStatus('idle');
    setProgress(0);
    setCurrentStep('');
    setResult(null);
    setDuration(0);
    setLogs([]);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    stopTimer();
    addLog('测试已重置');
  }, [status, stopTimer, addLog]);

  /**
   * 获取状态图标
   */
  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      {/* 测试标题和控制按钮 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <h3 className="text-lg font-semibold text-white">{config.name}</h3>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {status === 'idle' && '待开始'}
            {status === 'running' && '运行中'}
            {status === 'completed' && '已完成'}
            {status === 'failed' && '失败'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">
            {duration > 0 && `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`}
          </span>
          
          {status === 'idle' && (
            <button
              onClick={handleStartTest}
              disabled={disabled}
              className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md text-sm transition-colors"
            >
              <Play className="h-4 w-4" />
              <span>开始</span>
            </button>
          )}
          
          {status === 'running' && (
            <button
              onClick={handleStopTest}
              className="flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
            >
              <Square className="h-4 w-4" />
              <span>停止</span>
            </button>
          )}
          
          {(status === 'completed' || status === 'failed') && (
            <button
              onClick={handleResetTest}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>重置</span>
            </button>
          )}
        </div>
      </div>

      {/* 进度条 */}
      {status === 'running' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">{currentStep}</span>
            <span className="text-sm text-gray-400">{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 测试配置 */}
      <div className="mb-4 p-3 bg-gray-900 rounded border border-gray-600">
        <h4 className="text-sm font-medium text-gray-300 mb-2">测试配置</h4>
        <div className="text-sm text-gray-400 space-y-1">
          <div><span className="text-gray-300">类型:</span> {config.type}</div>
          <div><span className="text-gray-300">目标:</span> {config.url}</div>
          {Object.entries(config.options || {}).length > 0 && (
            <div>
              <span className="text-gray-300">选项:</span>
              <pre className="mt-1 text-xs bg-gray-800 p-2 rounded overflow-auto">
                {JSON.stringify(config.options, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* 实时日志 */}
      {logs.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">执行日志</h4>
          <div className="bg-gray-900 rounded border border-gray-600 p-3 max-h-32 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="text-xs text-gray-400 font-mono">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 测试结果 */}
      {result && (
        <div className="mt-4">
          <div className={`p-4 rounded border ${result.success 
            ? 'bg-green-900/20 border-green-600/30' 
            : 'bg-red-900/20 border-red-600/30'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <h4 className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.success ? '测试成功' : '测试失败'}
              </h4>
            </div>
            
            <div className="text-sm text-gray-400">
              <div>耗时: {result.duration}秒</div>
              <div>时间: {result.timestamp && new Date(result.timestamp).toLocaleString()}</div>
              {result.error && (
                <div className="text-red-400 mt-1">错误: {result.error}</div>
              )}
            </div>

            {result.data && (
              <div className="mt-3">
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-300 hover:text-white">
                    查看详细结果
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-800 p-3 rounded overflow-auto text-gray-400">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestRunner;
