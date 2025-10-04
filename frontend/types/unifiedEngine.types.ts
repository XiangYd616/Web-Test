// Unified Engine Types
import { FlexibleObject } from './common';

export interface TestResult extends FlexibleObject {
  id: string;
  testId?: string;
  type: string;
  status: string;
  score?: number;
  duration?: number;
  timestamp: number;
  url?: string;
  message?: string;
  error?: string;
  data?: any;
}

export interface TestStatusInfo extends FlexibleObject {
  testId: string;
  status: string;
  progress: number;
  message?: string;
  timestamp: number;
  currentStep?: string;
  totalSteps?: number;
}

export interface TestConfig extends FlexibleObject {
  type: string;
  url?: string;
  options?: any;
  timeout?: number;
  retries?: number;
}

export interface TestProgress extends FlexibleObject {
  current: number;
  total: number;
  percentage: number;
  status: string;
  message?: string;
  timestamp: number;
}
