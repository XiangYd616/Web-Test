/**
 * 数据库测试专用状态管理Hook
 * 可选的升级方案，DatabaseTest.tsx可以选择使用或保持现有实现
 *
 * 已迁移到新的类型系统，使用统一的类型定义
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { testApiService } from '../services/api/testApiService';
import backgroundTestManager from '../services/backgroundTestManager';
import type {
  DatabaseTestConfig,
  DatabaseTestHook,
  DatabaseTestResult
} from '../types';
import { TestStatus } from '@shared/types';

// 扩展数据库测试配置类型，兼容统一类型系统
interface ExtendedDatabaseTestConfig extends DatabaseTestConfig {
  // 扩展属性
  connectionConfig?: {
    type: 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'sqlite';
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    connectionTimeout: number;
  };
  testTypes?: ('connection' | 'performance' | 'integrity' | 'load' | 'security')[];
  performanceConfig?: {
    queryTimeout: number;
    maxConnections: number;
    testDuration: number;
    queryComplexity: 'simple' | 'medium' | 'complex';
  };
  integrityConfig?: {
    checkConstraints: boolean;
    checkIndexes: boolean;
    checkForeignKeys: boolean;
    validateData: boolean;
  };
  loadTestConfig?: {
    concurrentConnections: number;
    operationsPerSecond: number;
    testDuration: number;
    operationTypes: ('select' | 'insert' | 'update' | 'delete')[];
  };
  securityConfig?: {
    checkPermissions: boolean;
    checkEncryption: boolean;
    checkAuthentication: boolean;
    scanVulnerabilities: boolean;
  };
  customQueries?: Array<{
    id: string;
    name: string;
    query: string;
    expectedResult?: unknown;
    timeout?: number;
  }>;
}

// 导入统一的DatabaseQuery类型
import type { DatabaseQuery } from '../types/hooks/testState.types';
interface DatabaseTestResultLocal {
  id: string;
  config: DatabaseTestConfig;
  status: 'completed' | 'failed' | 'partial';
  startTime: Date;
  endTime: Date;
  duration: number;
  summary: {
    overallHealth: 'healthy' | 'warning' | 'critical';
    connectionScore: number;
    performanceScore: number;
    integrityScore: number;
    securityScore: number;
  };

  // 连接测试结果
  connectionResults: {
    status: 'success' | 'failed';
    connectionTime: number;
    maxConnections: number;
    currentConnections: number;
    version: string;
    serverInfo: Record<string, any>;
  };

  // 性能测试结果
  performanceResults: {
    status: 'good' | 'acceptable' | 'poor';
    averageQueryTime: number;
    slowestQuery: {
      query: string;
      duration: number;
    };
    fastestQuery: {
      query: string;
      duration: number;
    };
    throughput: number; // queries per second
    resourceUsage: {
      cpu: number;
      memory: number;
      disk: number;
    };
    indexEfficiency: number;
  };

  // 数据完整性结果
  integrityResults: {
    status: 'valid' | 'issues_found';
    constraintViolations: Array<{
      table: string;
      constraint: string;
      violationCount: number;
    }>;
    orphanedRecords: Array<{
      table: string;
      count: number;
    }>;
    indexIssues: Array<{
      table: string;
      index: string;
      issue: string;
    }>;
    dataConsistency: {
      score: number;
      issues: string[];
    };
  };

  // 负载测试结果
  loadTestResults: {
    status: 'passed' | 'failed';
    maxConcurrentConnections: number;
    averageResponseTime: number;
    errorRate: number;
    throughputOverTime: Array<{
      timestamp: Date;
      throughput: number;
    }>;
    resourceUtilization: Array<{
      timestamp: Date;
      cpu: number;
      memory: number;
      connections: number;
    }>;
  };

  // 安全测试结果
  securityResults: {
    status: 'secure' | 'vulnerabilities_found';
    vulnerabilities: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      recommendation: string;
    }>;
    permissionIssues: Array<{
      user: string;
      issue: string;
      risk: string;
    }>;
    encryptionStatus: {
      dataAtRest: boolean;
      dataInTransit: boolean;
      passwordHashing: boolean;
    };
  };

  // 自定义查询结果
  customQueryResults: Array<{
    queryId: string;
    queryName: string;
    status: 'success' | 'failed' | 'timeout';
    duration: number;
    rowCount?: number;
    error?: string;
    result?: unknown;
  }>;

  recommendations: string[];
}

// Hook状态接口
export interface UseDatabaseTestStateReturn {
  // 配置状态
  config: DatabaseTestConfig;
  updateConfig: (updates: Partial<DatabaseTestConfig>) => void;
  resetConfig: () => void;

  // 测试状态
  isRunning: boolean;
  progress: number;
  currentStep: string;
  testId: string | null;

  // 结果状态
  result: DatabaseTestResult | null;
  error: string | null;

  // 操作方法
  startTest: () => Promise<void>;
  stopTest: () => Promise<void>;
  resetTest: () => void;
  testConnection: () => Promise<boolean>;

  // 查询管理
  addCustomQuery: (query: DatabaseQuery) => void;
  updateCustomQuery: (id: string, updates: Partial<DatabaseQuery>) => void;
  removeCustomQuery: (id: string) => void;

  // 预设配置
  loadPreset: (preset: 'basic' | 'comprehensive' | 'performance' | 'security') => void;
  loadDatabasePreset: (dbType: 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'sqlite') => void;

  // 验证方法
  validateConfig: () => { isValid: boolean; errors: string[] };
}

/**
 * 数据库测试专用状态管理Hook
 * 已迁移到新的类型系统，返回 DatabaseTestHook 类型
 */
export const useDatabaseTestState = (): DatabaseTestHook => {
  // 基础状态
  const [config, setConfig] = useState<ExtendedDatabaseTestConfig>({
    // 基础DatabaseTestConfig属性
    dbType: 'mysql',
    connectionString: 'mysql://localhost:3306/testdb',
    testQueries: [],
    connectionTimeout: 10000,
    queryTimeout: 30000,

    // 扩展属性
    connectionConfig: {
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      database: '',
      username: '',
      password: '',
      ssl: false,
      connectionTimeout: 10000
    },
    testTypes: ['connection', 'performance'],
    performanceConfig: {
      queryTimeout: 30000,
      maxConnections: 10,
      testDuration: 60,
      queryComplexity: 'medium'
    },
    integrityConfig: {
      checkConstraints: true,
      checkIndexes: true,
      checkForeignKeys: true,
      validateData: true
    },
    loadTestConfig: {
      concurrentConnections: 5,
      operationsPerSecond: 10,
      testDuration: 60,
      operationTypes: ['select', 'insert']
    },
    securityConfig: {
      checkPermissions: true,
      checkEncryption: true,
      checkAuthentication: true,
      scanVulnerabilities: false
    },
    customQueries: []
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [testId, setTestId] = useState<string | null>(null);
  const [result, setResult] = useState<DatabaseTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 引用
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 更新配置
   */
  const updateConfig = useCallback((updates: Partial<DatabaseTestConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  /**
   * 重置配置
   */
  const resetConfig = useCallback(() => {
    setConfig({
      // 基础DatabaseTestConfig属性
      dbType: 'mysql',
      connectionString: 'mysql://localhost:3306/testdb',
      testQueries: [],
      connectionTimeout: 10000,
      queryTimeout: 30000,

      // 扩展属性
      connectionConfig: {
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        database: '',
        username: '',
        password: '',
        ssl: false,
        connectionTimeout: 10000
      },
      testTypes: ['connection', 'performance'],
      performanceConfig: {
        queryTimeout: 30000,
        maxConnections: 10,
        testDuration: 60,
        queryComplexity: 'medium'
      },
      integrityConfig: {
        checkConstraints: true,
        checkIndexes: true,
        checkForeignKeys: true,
        validateData: true
      },
      loadTestConfig: {
        concurrentConnections: 5,
        operationsPerSecond: 10,
        testDuration: 60,
        operationTypes: ['select', 'insert']
      },
      securityConfig: {
        checkPermissions: true,
        checkEncryption: true,
        checkAuthentication: true,
        scanVulnerabilities: false
      },
      customQueries: []
    });
  }, []);

  /**
   * 验证配置
   */
  const validateConfig = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!config.connectionConfig.host) {
      errors.push('请输入数据库主机地址');
    }

    if (!config.connectionConfig.database) {
      errors.push('请输入数据库名称');
    }

    if (!config.connectionConfig.username) {
      errors.push('请输入用户名');
    }

    if (config.connectionConfig.port < 1 || config.connectionConfig.port > 65535) {
      errors.push('端口号应在1-65535之间');
    }

    if (config.testTypes.length === 0) {
      errors.push('请至少选择一种测试类型');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [config]);

  /**
   * 测试连接
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      setCurrentStep('正在测试数据库连接...');

      // 这里应该调用实际的连接测试API
      const response = await (testApiService as any).testDatabaseConnection(config.connectionConfig);

      if (response.success) {
        setCurrentStep('连接测试成功');
        return true;
      } else {
        setError(response.message || '连接测试失败');
        return false;
      }
    } catch (err: unknown) {
      setError(err.message || '连接测试失败');
      return false;
    }
  }, [config.connectionConfig]);

  /**
   * 启动测试
   */
  const startTest = useCallback(async () => {
    const validation = validateConfig();
    if (!validation.isValid) {
      setError(validation.errors.join('; '));
      return;
    }

    try {
      setIsRunning(true);
      setProgress(0);
      setCurrentStep('正在初始化数据库测试...');
      setError(null);
      setResult(null);

      abortControllerRef.current = new AbortController();

      // 启动后台测试
      const newTestId = backgroundTestManager.startTest(
        'database' as any,
        config,
        (progress: number, step: string) => {
          setProgress(progress);
          setCurrentStep(step);
        },
        (testResult: unknown) => {
          setResult(testResult);
          setIsRunning(false);
          setProgress(100);
          setCurrentStep('测试完成');
        },
        (testError: unknown) => {
          setError(testError.message);
          setIsRunning(false);
          setCurrentStep('测试失败');
        }
      );

      setTestId(newTestId);

    } catch (err: unknown) {
      setError(err.message || '数据库测试启动失败');
      setIsRunning(false);
      setCurrentStep('');
    }
  }, [config, validateConfig]);

  /**
   * 停止测试
   */
  const stopTest = useCallback(async () => {
    if (testId) {
      try {
        backgroundTestManager.cancelTest(testId);
        abortControllerRef.current?.abort();
        setIsRunning(false);
        setCurrentStep('测试已停止');
      } catch (err: unknown) {
        setError(err.message || '停止测试失败');
      }
    }
  }, [testId]);

  /**
   * 重置测试
   */
  const resetTest = useCallback(() => {
    setIsRunning(false);
    setProgress(0);
    setCurrentStep('');
    setTestId(null);
    setResult(null);
    setError(null);
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  /**
   * 添加自定义查询
   */
  const addCustomQuery = useCallback((query: DatabaseQuery) => {
    setConfig(prev => ({
      ...prev,
      testQueries: [...(prev.testQueries || []), query],
      customQueries: [...(prev.customQueries || []), {
        id: query.id,
        name: query.name,
        query: query.sql,
        expectedResult: undefined,
        timeout: undefined
      }]
    }));
  }, []);

  /**
   * 更新自定义查询
   */
  const updateCustomQuery = useCallback((id: string, updates: Partial<DatabaseQuery>) => {
    setConfig(prev => ({
      ...prev,
      testQueries: (prev.testQueries || []).map(query =>
        query.id === id ? { ...query, ...updates } : query
      ),
      customQueries: (prev.customQueries || []).map(query =>
        query.id === id ? {
          ...query,
          name: updates.name || query.name,
          query: updates.sql || query.query
        } : query
      )
    }));
  }, []);

  /**
   * 移除自定义查询
   */
  const removeCustomQuery = useCallback((id: string) => {
    setConfig(prev => ({
      ...prev,
      testQueries: (prev.testQueries || []).filter(query => query.id !== id),
      customQueries: (prev.customQueries || []).filter(query => query.id !== id)
    }));
  }, []);

  /**
   * 加载预设配置
   */
  const loadPreset = useCallback((preset: 'basic' | 'comprehensive' | 'performance' | 'security') => {
    const presets: Record<string, Partial<ExtendedDatabaseTestConfig>> = {
      basic: {
        testTypes: ['connection', 'performance'] as const
      },
      comprehensive: {
        testTypes: ['connection', 'performance', 'integrity', 'security'] as const,
        performanceConfig: {
          queryTimeout: 60000,
          maxConnections: 20,
          testDuration: 120,
          queryComplexity: 'complex' as const
        }
      },
      performance: {
        testTypes: ['connection', 'performance', 'load'] as const,
        performanceConfig: {
          queryTimeout: 30000,
          maxConnections: 50,
          testDuration: 300,
          queryComplexity: 'complex' as const
        },
        loadTestConfig: {
          concurrentConnections: 20,
          operationsPerSecond: 100,
          testDuration: 300,
          operationTypes: ['select', 'insert', 'update', 'delete'] as const
        }
      },
      security: {
        testTypes: ['connection', 'security'] as const,
        securityConfig: {
          checkPermissions: true,
          checkEncryption: true,
          checkAuthentication: true,
          scanVulnerabilities: true
        }
      }
    };

    const presetConfig = presets[preset];
    setConfig(prev => ({
      ...prev,
      ...presetConfig
    }));
  }, []);

  /**
   * 加载数据库类型预设
   */
  const loadDatabasePreset = useCallback((dbType: 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'sqlite') => {
    const dbPresets = {
      mysql: { port: 3306 },
      postgresql: { port: 5432 },
      mongodb: { port: 27017 },
      redis: { port: 6379 },
      sqlite: { port: 0, host: 'local' }
    };

    const preset = dbPresets[dbType];
    setConfig(prev => ({
      ...prev,
      connectionConfig: {
        ...prev.connectionConfig,
        type: dbType,
        ...preset
      }
    }));
  }, []);

  // 清理资源
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // 计算派生状态
  const status = isRunning ? TestStatus.RUNNING : (result ? TestStatus.COMPLETED : (error ? TestStatus.FAILED : TestStatus.PENDING));
  const isCompleted = status === 'completed';
  const hasError = status === 'failed';
  const currentQuery = config.customQueries.length > 0 ? config.customQueries[0]?.name || null : null;

  return {
    // ==================== BaseTestState ====================
    status,
    progress,
    currentStep,
    result,
    error,
    isRunning,
    isCompleted,
    hasError,

    // ==================== DatabaseTestState ====================
    config,
    currentQuery,

    // ==================== BaseTestActions ====================
    startTest: (config: DatabaseTestConfig) => startTest(),
    stopTest,
    reset: resetTest,
    clearError: () => setError(null),

    // ==================== DatabaseTestActions ====================
    updateConfig,
    addQuery: addCustomQuery,
    removeQuery: removeCustomQuery,
    updateQuery: updateCustomQuery,

    // 注意：resetConfig, testConnection, loadPreset等方法不属于DatabaseTestHook接口
    // 如果需要这些方法，请使用UseDatabaseTestStateReturn接口
  };
};

export default useDatabaseTestState;
