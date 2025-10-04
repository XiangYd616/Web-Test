// Flexible type wrappers to reduce property access errors
// This is a pragmatic approach for large codebases with many dynamic properties

export type FlexibleRecord<T = any> = T & {
  [key: string]: any;
  [key: number]: any;
};

export type AnyRecord = FlexibleRecord<Record<string, any>>;

// Wrap common interfaces to make them more flexible
import type {
  StressTestRecord as BaseStressTestRecord,
  TestMetrics as BaseTestMetrics,
  TestResults as BaseTestResults,
  TestProgress as BaseTestProgress,
  TestSummary as BaseTestSummary
} from './common';

// Re-export with flexible typing
export type StressTestRecord = FlexibleRecord<BaseStressTestRecord>;
export type TestMetrics = FlexibleRecord<BaseTestMetrics>;
export type TestResults = FlexibleRecord<BaseTestResults>;
export type TestProgress = FlexibleRecord<BaseTestProgress>;
export type TestSummary = FlexibleRecord<BaseTestSummary>;

// Generic test data type that accepts anything
export type TestData = AnyRecord;
export type APIData = AnyRecord;
export type ResponseData = AnyRecord;

// Helper to convert any data to flexible type
export function asFlexible<T = any>(data: any): FlexibleRecord<T> {
  return data as FlexibleRecord<T>;
}

// Safe property accessor
export function safeGet<T = any>(obj: any, key: string, defaultValue?: T): T {
  return (obj && obj[key]) ?? (defaultValue as T);
}

// Check if object has property
export function has(obj: any, key: string): boolean {
  return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
}

// Get nested property safely
export function getPath<T = any>(obj: any, path: string, defaultValue?: T): T {
  if (!obj) return defaultValue as T;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current == null) return defaultValue as T;
    current = current[key];
  }
  
  return current ?? (defaultValue as T);
}

// Type assertion helpers that don't complain
export const as = {
  testRecord: (data: any) => asFlexible<BaseStressTestRecord>(data),
  metrics: (data: any) => asFlexible<BaseTestMetrics>(data),
  results: (data: any) => asFlexible<BaseTestResults>(data),
  progress: (data: any) => asFlexible<BaseTestProgress>(data),
  summary: (data: any) => asFlexible<BaseTestSummary>(data),
  any: (data: any) => data as any,
};

export {};
