import { useCallback, useRef, useState } from 'react';
import { RealSEOAnalysisEngine, SEOAnalysisResult } from '../services/realSEOAnalysisEngine';

// 临时性能指标获取函数
const getPerformanceMetrics = async (url: string, options: any) => {
  // 临时实现，返回模拟数据
  return {
    loadTime: Math.random() * 3000 + 1000,
    fcp: Math.random() * 2000 + 500,
    lcp: Math.random() * 3000 + 1000,
    cls: Math.random() * 0.3,
    fid: Math.random() * 100 + 50,
    ttfb: Math.random() * 500 + 100,
    vitals: {
      lcp: Math.random() * 3000 + 1000,
      fid: Math.random() * 100 + 50,
      cls: Math.random() * 0.3,
      fcp: Math.random() * 2000 + 500,
      ttfb: Math.random() * 500 + 100
    }
  };
};

interface SEOTestConfig {
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

interface SEOTestProgress {
  progress: number;
  currentStep: string;
  isRunning: boolean;
}

export const useRealSEOTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SEOTestProgress>({
    progress: 0,
    currentStep: '',
    isRunning: false
  });
  const [results, setResults] = useState<SEOAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seoEngineRef = useRef<RealSEOAnalysisEngine | null>(null);

  // 开始SEO测试
  const startTest = useCallback(async (config: SEOTestConfig) => {
    try {
      setIsRunning(true);
      setError(null);
      setResults(null);
      setProgress({ progress: 0, currentStep: '正在初始化...', isRunning: true });

      // 创建新的SEO分析引擎实例
      seoEngineRef.current = new RealSEOAnalysisEngine();

      // 如果需要性能检测，先获取性能指标
      let performanceData = null;
      if (config.checkPerformance) {
        setProgress({
          progress: 10,
          currentStep: '获取性能指标...',
          isRunning: true
        });

        try {
          performanceData = await getPerformanceMetrics(config.url, {
            includeVitals: true,
            includeMobile: config.checkMobileFriendly,
            device: 'both'
          });
        } catch (error) {
          console.warn('获取性能指标失败，继续SEO分析:', error);
        }
      }

      // 开始真实的SEO分析
      const analysisResult = await seoEngineRef.current.analyzeSEO(
        config.url,
        {
          keywords: config.keywords,
          checkTechnicalSEO: config.checkTechnicalSEO,
          checkContentQuality: config.checkContentQuality,
          checkAccessibility: config.checkAccessibility,
          checkPerformance: false, // 使用外部性能数据，不重复检测
          checkMobileFriendly: config.checkMobileFriendly,
          checkSocialMedia: config.checkSocialMedia,
          checkStructuredData: config.checkStructuredData,
          checkSecurity: config.checkSecurity,
          depth: config.depth,
          externalPerformanceData: performanceData // 传入外部性能数据
        },
        (progressValue: number, step: string) => {
          setProgress({
            progress: Math.max(progressValue, 20), // 确保进度不倒退
            currentStep: step,
            isRunning: true
          });
        }
      );

      setResults(analysisResult);
      setProgress({
        progress: 100,
        currentStep: '分析完成',
        isRunning: false
      });

    } catch (err: any) {
      console.error('SEO test failed:', err);
      setError(err.message || 'SEO测试失败');
      setProgress({
        progress: 0,
        currentStep: '测试失败',
        isRunning: false
      });
    } finally {
      setIsRunning(false);
    }
  }, []);

  // 停止测试
  const stopTest = useCallback(async () => {
    if (seoEngineRef.current) {
      seoEngineRef.current.stopAnalysis();
    }
    setIsRunning(false);
    setProgress({
      progress: 0,
      currentStep: '测试已停止',
      isRunning: false
    });
  }, []);

  // 重置测试
  const reset = useCallback(() => {
    setIsRunning(false);
    setProgress({ progress: 0, currentStep: '', isRunning: false });
    setResults(null);
    setError(null);
    if (seoEngineRef.current) {
      seoEngineRef.current.stopAnalysis();
    }
  }, []);

  // 获取当前步骤
  const getCurrentStep = useCallback(() => {
    return progress.currentStep;
  }, [progress.currentStep]);

  // 获取完成的步骤数
  const getCompletedStepsCount = useCallback(() => {
    return Math.floor(progress.progress / 10);
  }, [progress.progress]);

  // 获取总步骤数
  const getTotalStepsCount = useCallback(() => {
    return 10; // 固定10个步骤
  }, []);

  // 获取预估剩余时间
  const getEstimatedTimeRemaining = useCallback(() => {
    if (!isRunning || progress.progress >= 100) return 0;

    // 简单估算：假设每个步骤平均需要10秒
    const remainingSteps = (100 - progress.progress) / 10;
    return Math.ceil(remainingSteps * 10);
  }, [isRunning, progress.progress]);

  return {
    isRunning,
    progress,
    results,
    error,
    startTest,
    stopTest,
    reset,
    getCurrentStep,
    getCompletedStepsCount,
    getTotalStepsCount,
    getEstimatedTimeRemaining
  };
};
