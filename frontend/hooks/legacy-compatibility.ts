// Stub file - Legacy Compatibility
import { useState } from 'react';
import { TestResult } from '../types/test';

export const useLegacyCompatibility = () => {
  return {
    isLegacyMode: false,
    convertData: (data: any) => data,
  };
};

// Universal test hook
export const useUniversalTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [config, setConfig] = useState<any>(null);

  const runTest = async (testConfig: any) => {
    setIsRunning(true);
    setError(null);
    setConfig(testConfig);
    try {
      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      const testResult: TestResult = {
        id: Math.random().toString(36),
        testId: testConfig.id || 'test-1',
        type: testConfig.type || 'performance',
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        results: {},
      };
      setResult(testResult);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsRunning(false);
    }
  };

  const cancelTest = () => {
    setIsRunning(false);
  };

  const reset = () => {
    setIsRunning(false);
    setResult(null);
    setError(null);
    setConfig(null);
  };

  return {
    isRunning,
    result,
    error,
    config,
    runTest,
    cancelTest,
    reset,
  };
};

export default useLegacyCompatibility;
