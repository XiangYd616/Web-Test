import { useCallback, useRef, useState } from 'react';
import { RealSEOAnalysisEngine, SEOAnalysisResult } from '../services/realSEOAnalysisEngine';

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

      // 开始真实的SEO分析
      const analysisResult = await seoEngineRef.current.analyzeSEO(
        config.url,
        {
          keywords: config.keywords,
          checkTechnicalSEO: config.checkTechnicalSEO,
          checkContentQuality: config.checkContentQuality,
          checkAccessibility: config.checkAccessibility,
          checkPerformance: config.checkPerformance,
          checkMobileFriendly: config.checkMobileFriendly,
          checkSocialMedia: config.checkSocialMedia,
          checkStructuredData: config.checkStructuredData,
          checkSecurity: config.checkSecurity,
          depth: config.depth
        },
        (progressValue: number, step: string) => {
          setProgress({
            progress: progressValue,
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
