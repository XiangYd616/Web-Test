/**
 * useUnifiedTestEngine.ts - 核心功能模块
 * 
 * 文件路径: frontend\hooks\useUnifiedTestEngine.ts
 * 创建时间: 2025-09-25
 */

import React, { useState, useCallback, useRef } from 'react';
import { TestConfig, TestResult } from '../types';

export interface UnifiedTestEngine {
  startTest: (config: TestConfig) => Promise<void>;
  stopTest: () => void;
  isRunning: boolean;
  progress: number;
  results: TestResult[];
  currentTest: string | null;
  error: string | null;
}

export const useUnifiedTestEngine = (): UnifiedTestEngine => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startTest = useCallback(async (config: TestConfig) => {
    try {
      setIsRunning(true);
      setProgress(0);
      setResults([]);
      setError(null);
      setCurrentTest('正在初始化...');
      
      // 创建中止控制器
      abortControllerRef.current = new AbortController();
      
      // 模拟测试过程
      const testSteps = [
        '网站连通性测试',
        '性能测试',
        '安全性扫描',
        'SEO分析',
        'API测试',
        '生成报告'
      ];


        /**

         * if功能函数

         * @param {Object} params - 参数对象

         * @returns {Promise<Object>} 返回结果

         */
      for (let i = 0; i < testSteps.length; i++) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('测试已被取消');
        }
        
        setCurrentTest(testSteps[i]);
        setProgress((i + 1) / testSteps.length * 100);
        
        // 模拟测试延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 添加模拟结果
        const result: TestResult = {
          id: `test-${i}`,
          type: testSteps[i],
          status: Math.random() > 0.2 ? 'passed' : 'failed',
          score: Math.floor(Math.random() * 40 + 60),
          message: `${testSteps[i]}完成`,
          timestamp: Date.now(),
          details: {
            duration: Math.floor(Math.random() * 1000 + 500),
            url: config.url || 'https://example.com'
          }
        };
        
        setResults(prev => [...prev, result]);
      }
      
      setCurrentTest('测试完成');
    } catch (err) {
      setError(err instanceof Error ? err.message : '测试过程中发生错误');
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
      abortControllerRef.current = null;
    }
  }, []);

  const stopTest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
    setCurrentTest(null);
  }, []);

  return {
    startTest,
    stopTest,
    isRunning,
    progress,
    results,
    currentTest,
    error
  };
};

// 测试结果分析 Hook
export const useTestResultAnalysis = (results: TestResult[]) => {
  const [analysis, setAnalysis] = useState({
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    averageScore: 0,
    recommendations: [] as string[]
  });

  React.useEffect(() => {
    if (results.length === 0) {
      setAnalysis({
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        averageScore: 0,
        recommendations: []
      });
      return;
    }

    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'passed').length;
    const failedTests = totalTests - passedTests;
    const averageScore = results.reduce((acc, r) => acc + r.score, 0) / totalTests;
    
    const recommendations: string[] = [];
    if (averageScore < 60) {
      recommendations.push('整体测试分数偏低，建议优化网站性能');
    }
    if (failedTests > totalTests * 0.3) {
      recommendations.push('失败测试较多，请检查网站配置');
    }
    if (results.some(r => r.type === 'security' && r.status === 'failed')) {
      recommendations.push('发现安全问题，建议立即修复');
    }
    
    setAnalysis({
      totalTests,
      passedTests,
      failedTests,
      averageScore,
      recommendations
    });
  }, [results]);

  return analysis;
};

export default useUnifiedTestEngine;
