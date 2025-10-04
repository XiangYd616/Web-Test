// Enhanced TestResult type for unified testing
import { FlexibleObject } from './common';

export interface TestResult extends FlexibleObject {
  id?: string;
  testId?: string;
  type?: string;
  testType?: string;
  status?: string;
  score?: number;
  overallScore?: number;
  duration?: number;
  url?: string;
  timestamp?: string | number;
  startTime?: string | number;
  endTime?: string | number;
  message?: string;
  error?: string;
  errors?: string[];
  summary?: any;
  metrics?: any;
  results?: any;
  recommendations?: any[];
  findings?: any[];
  issues?: any[];
  scores?: any;
  tests?: any[];
  engine?: string;
  data?: any;
}

// Export as both named and default
export default TestResult;
