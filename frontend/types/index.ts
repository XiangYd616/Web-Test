// Unified Type Re-exports
// This file re-exports types from common.d.ts to ensure consistency

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
  AuthResponse
} from './common';

// Also export from common as default imports
import type * as CommonTypes from './common';
export default CommonTypes;
