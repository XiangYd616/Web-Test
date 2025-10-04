import { useCallback, useRef, useState } from 'react';

/**

 * ��ȡgetPerformanceMetrics����

 * @param {string} id - ����ID

 * @returns {Promise<Object|null>} ��ȡ������

 */
import {SEOAnalysisResult} from '../services/realSEOAnalysisEngine';

const getPerformanceMetrics = async (url: string, options: any) => {

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

const useSEOTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SEOTestProgress>({
    progress: 0,
    currentStep: '',
    isRunning: false
  });
  const [results, setResults] = useState<SEOAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seoEngineRef = useRef<SEOAnalysisEngine | null>(null);

  // ��ʼSEO����
  const startTest = useCallback(async (config: SEOTestConfig) => {
    try {
      setIsRunning(true);
      setError(null);
      setResults(null);
      setProgress({ progress: 0, currentStep: '���ڳ�ʼ��...', isRunning: true });

      // �����µ�SEO��������ʵ��
      seoEngineRef.current = new SEOAnalysisEngine();

      // �����Ҫ���ܼ�⣬�Ȼ�ȡ����ָ��
      let performanceData = null;
      if (config.checkPerformance) {
        setProgress({
          progress: 10,
          currentStep: '��ȡ����ָ��...',
          isRunning: true
        });

        try {
          performanceData = await getPerformanceMetrics(config.url, {
            includeVitals: true,
            includeMobile: config.checkMobileFriendly,
            device: 'both'
          });
        } catch (error) {
          console.warn('��ȡ����ָ��ʧ�ܣ�����SEO����:', error);
        }
      }

      // ��ʼ��ʵ��SEO����
      const analysisResult = await seoEngineRef.current.analyzeSEO(
        config.url,
        {
          keywords: config.keywords,
          checkTechnicalSEO: config.checkTechnicalSEO,
          checkContentQuality: config.checkContentQuality,
          checkAccessibility: config.checkAccessibility,
          checkPerformance: false, // ʹ���ⲿ�������ݣ����ظ����
          checkMobileFriendly: config.checkMobileFriendly,
          checkSocialMedia: config.checkSocialMedia,
          checkStructuredData: config.checkStructuredData,
          checkSecurity: config.checkSecurity,
          depth: config.depth,
          externalPerformanceData: performanceData // �����ⲿ��������
        },
        (progressValue: number, step: string) => {
          setProgress({
            progress: Math.max(progressValue, 20), // ȷ�����Ȳ�����
            currentStep: step,
            isRunning: true
          });
        }
      );

      setResults(analysisResult);
      setProgress({
        progress: 100,
        currentStep: '�������',
        isRunning: false
      });

    } catch (err: any) {
      console.error('SEO test failed:', err);
      setError(err.message || 'SEO����ʧ��');
      setProgress({
        progress: 0,
        currentStep: '����ʧ��',
        isRunning: false
      });
    } finally {
      setIsRunning(false);
    }
  }, []);

  // ֹͣ����
  const stopTest = useCallback(async () => {
    if (seoEngineRef.current) {
      seoEngineRef.current.stopAnalysis();
    }
    setIsRunning(false);
    setProgress({
      progress: 0,
      currentStep: '������ֹͣ',
      isRunning: false
    });
  }, []);

  // ���ò���
  const reset = useCallback(() => {
    setIsRunning(false);
    setProgress({ progress: 0, currentStep: '', isRunning: false });
    setResults(null);
    setError(null);
    if (seoEngineRef.current) {
      seoEngineRef.current.stopAnalysis();
    }
  }, []);

  // ��ȡ��ǰ����
  const getCurrentStep = useCallback(() => {
    return progress.currentStep;
  }, [progress.currentStep]);

  // ��ȡ��ɵĲ�����
  const getCompletedStepsCount = useCallback(() => {
    return Math.floor(progress.progress / 10);
  }, [progress.progress]);

  // ��ȡ�ܲ�����
  const getTotalStepsCount = useCallback(() => {
    return 10; // �̶�10������
  }, []);

  // ��ȡԤ��ʣ��ʱ��
  const getEstimatedTimeRemaining = useCallback(() => {
    if (!isRunning || progress.progress >= 100) return 0;

    // �򵥹��㣺����ÿ������ƽ����Ҫ10��
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
