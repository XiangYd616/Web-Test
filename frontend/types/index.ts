// Unified Type Re-exports
// This file re-exports types from common.d.ts and test.ts to ensure consistency

// Export from common.d.ts
export type {
  StressTestRecord,
  TestMetrics,
  TestResults,
  TestSummary,
  TestProgress,
  TestConfig,
  TestRecordQuery,
  TestHistory,
  User,
  UserProfile,
  UserPreferences,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  APIResponse,
  APIError,
  FlexibleObject,
  RealTimeMetrics,
  QueueStats,
  ProgressListener,
  SecurityTestProgress
} from './common';

// Export from test.ts
export type {
  TestType,
  TestStatus,
  TestResult,
  TestRecord
} from './test';

// Export specific test configuration types
export interface CompatibilityTestConfig {
  browsers?: string[];
  devices?: string[];
  url?: string;
  [key: string]: any;
}

export interface CompatibilityTestResult {
  browser?: string;
  device?: string;
  status?: string;
  issues?: any[];
  [key: string]: any;
}

export interface NetworkTestConfig {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  timeout?: number;
  [key: string]: any;
}

export interface NetworkTestResult {
  latency?: number;
  bandwidth?: number;
  status?: string;
  [key: string]: any;
}

export interface DatabaseTestConfig {
  connection?: string;
  queries?: string[];
  [key: string]: any;
}

export interface DatabaseTestResult {
  queryTime?: number;
  rowCount?: number;
  status?: string;
  [key: string]: any;
}

export interface DatabaseTestHook {
  runTest: () => Promise<void>;
  loading: boolean;
  error?: string | null;
  result?: DatabaseTestResult;
}

export interface NetworkTestHook {
  runTest: () => Promise<void>;
  loading: boolean;
  error?: string | null;
  result?: NetworkTestResult;
}

export interface APIEndpoint {
  id: string;
  name: string;
  url: string;
  method: string;
  [key: string]: any;
}

// Also export from common as default imports
import type * as CommonTypes from './common';
export default CommonTypes;
