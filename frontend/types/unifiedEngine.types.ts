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

export interface UnifiedTestConfig extends TestConfig {
  id?: string;
  name?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

export interface UnifiedTestResult extends TestResult {
  id: string;
  testId: string;
  type: string;
  status: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  url?: string;
  results?: any;
  metrics?: Record<string, any>;
  score?: number;
  grade?: string;
  summary?: string;
  errors?: string[];
  recommendations?: Array<{
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    action: string;
  }>;
}
