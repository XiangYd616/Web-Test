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

  const runTest = async (config: any) => {
    setIsRunning(true);
    setError(null);
    try {
      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      const testResult: TestResult = {
        id: Math.random().toString(36),
        testId: config.id || 'test-1',
        type: config.type || 'performance',
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
  };

  return {
    isRunning,
    result,
    error,
    runTest,
    cancelTest,
    reset,
  };
};

export default useLegacyCompatibility;
