/**
 * useUnifiedSEOTest.ts - 核心功能模块
 * 
 * 文件路径: frontend\hooks\useUnifiedSEOTest.ts
 * 创建时间: 2025-09-25
 */

import { useCallback, useRef, useState } from 'react';
import { LocalSEOAnalysisEngine, LocalSEOConfig } from '../services/localSEOAnalysisEngine';
import { SEOAnalysisResult } from '../services/realSEOAnalysisEngine';
import { useSEOTest } from './useSEOTest';

export type SEOTestMode = 'online' | 'local';

interface OnlineSEOConfig {
  url: string;
  keywords?: string;
  checkTechnicalSEO?: boolean;
  checkContentQuality?: boolean;
  checkAccessibility?: boolean;
  checkPerformance?: boolean;
  checkMobileFriendly?: boolean;
  checkSocialMedia?: boolean;
  checkStructuredData?: boolean;
  checkSecurity?: boolean;
  depth?: 'basic' | 'standard' | 'comprehensive';
}

interface UnifiedSEOTestConfig {
  mode: SEOTestMode;
  online?: OnlineSEOConfig;
  local?: LocalSEOConfig;
}

interface SEOTestProgress {
  progress: number;
  currentStep: string;
  isRunning: boolean;
}

export const useUnifiedSEOTest = () => {
  const [currentMode, setCurrentMode] = useState<SEOTestMode>('online');
  const [localProgress, setLocalProgress] = useState<SEOTestProgress>({
    progress: 0,
    currentStep: '',
    isRunning: false
  });
  const [localResults, setLocalResults] = useState<SEOAnalysisResult | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const localEngineRef = useRef<LocalSEOAnalysisEngine | null>(null);

  // 使用现有的在线SEO测试hook
  const {
    isRunning: onlineIsRunning,
    progress: onlineProgress,
    results: onlineResults,
    error: onlineError,
    startTest: startOnlineTest,
    stopTest: stopOnlineTest
  } = useSEOTest();

  // 统一的状态获取
  const isRunning = currentMode === 'online' ? onlineIsRunning : localProgress.isRunning;
  const progress = currentMode === 'online' ? onlineProgress : localProgress;
  const results = currentMode === 'online' ? onlineResults : localResults;
  const error = currentMode === 'online' ? onlineError : localError;

  // 开始统一测试
  const startTest = useCallback(async (config: UnifiedSEOTestConfig) => {
    setCurrentMode(config.mode);

    if (config.mode === 'online' && config.online) {
      // 清除本地测试状态
      setLocalResults(null);
      setLocalError(null);
      setLocalProgress({ progress: 0, currentStep: '', isRunning: false });

      // 启动在线测试
      return startOnlineTest(config.online);
    } else if (config.mode === 'local' && config.local) {
      // 清除在线测试状态（通过停止在线测试）
      if (onlineIsRunning) {
        await stopOnlineTest();
      }

      // 启动本地测试
      return startLocalTest(config.local);
    } else {
      throw new Error('无效的测试配置');
    }
  }, [startOnlineTest, stopOnlineTest, onlineIsRunning]);

  // 开始本地测试
  const startLocalTest = useCallback(async (config: LocalSEOConfig) => {
    try {
      setLocalError(null);
      setLocalResults(null);
      setLocalProgress({ progress: 0, currentStep: '正在初始化本地分析...', isRunning: true });

      // 创建本地SEO分析引擎实例
      localEngineRef.current = new LocalSEOAnalysisEngine();

      // 开始本地SEO分析
      const analysisResult = await localEngineRef.current.analyzeLocalFiles(
        config,
        (progressValue: number, step: string) => {
          setLocalProgress({
            progress: progressValue,
            currentStep: step,
            isRunning: true
          });
        }
      );

      setLocalResults(analysisResult);
      setLocalProgress({
        progress: 100,
        currentStep: '本地分析完成',
        isRunning: false
      });

    } catch (error) {
      console.error('Local SEO analysis failed:', error);
      setLocalError(error instanceof Error ? error.message : '本地SEO分析失败');
      setLocalProgress({
        progress: 0,
        currentStep: '分析失败',
        isRunning: false
      });
      throw error;
    }
  }, []);

  // 停止测试
  const stopTest = useCallback(async () => {
    if (currentMode === 'online') {
      return stopOnlineTest();
    } else {
      // 停止本地测试
      if (localEngineRef.current) {
        localEngineRef.current.stopAnalysis();
        localEngineRef.current = null;
      }
      setLocalProgress({ progress: 0, currentStep: '', isRunning: false });
    }
  }, [currentMode, stopOnlineTest]);

  // 切换测试模式
  const switchMode = useCallback(async (mode: SEOTestMode) => {
    if (mode !== currentMode) {
      // 停止当前测试
      await stopTest();

      // 清除状态
      if (mode === 'online') {
        setLocalResults(null);
        setLocalError(null);
        setLocalProgress({ progress: 0, currentStep: '', isRunning: false });
      }

      setCurrentMode(mode);
    }
  }, [currentMode, stopTest]);

  // 重置所有状态
  const resetAll = useCallback(async () => {
    await stopTest();
    setLocalResults(null);
    setLocalError(null);
    setLocalProgress({ progress: 0, currentStep: '', isRunning: false });
    setCurrentMode('online');
  }, [stopTest]);

  return {
    // 当前状态
    currentMode,
    isRunning,
    progress,
    results,
    error,

    // 操作方法
    startTest,
    stopTest,
    switchMode,
    resetAll,

    // 分离的状态（用于调试或特殊需求）
    online: {
      isRunning: onlineIsRunning,
      progress: onlineProgress,
      results: onlineResults,
      error: onlineError
    },
    local: {
      isRunning: localProgress.isRunning,
      progress: localProgress,
      results: localResults,
      error: localError
    }
  };
};
