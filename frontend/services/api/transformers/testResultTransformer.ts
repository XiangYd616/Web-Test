import type { TestResult as FrontendTestResult } from '../../../shared/types/testResult.types';

// 后端 TestResult 形状 (来自 backend/types/models.ts)
export interface BackendTestResult {
  id: number;                 // DatabaseId
  uuid: string;               // UUID
  execution_id: number;       // DatabaseId
  test_type: string;
  score?: number;
  grade?: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  summary: Record<string, any>;
  details: Record<string, any>;
  recommendations?: Record<string, any>;
  created_at: string | Date;
}

export function transformTestResult(b: BackendTestResult): FrontendTestResult {
  return {
    id: b.uuid,                              // 使用 UUID 作为前端主键
    testId: String(b.execution_id),          // 统一为 string
    type: b.test_type as any,                // TODO: 收敛成 TestType
    status: ((): any => {
      // 映射后端状态到前端枚举 (临时方案)
      // 后续可以统一标准
      switch (b.status) {
        case 'pass':
          return 'completed';
        case 'fail':
          return 'failed';
        case 'warning':
          return 'completed';
        case 'info':
          return 'completed';
        default:
          return 'completed';
      }
    })(),
    score: b.score,
    grade: b.grade,
    summary: typeof b.summary === 'string' ? b.summary : JSON.stringify(b.summary),
    details: b.details,
    recommendations: Array.isArray(b.recommendations)
      ? b.recommendations
      : undefined,
    createdAt: b.created_at,
  };
}

