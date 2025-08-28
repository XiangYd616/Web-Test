/**
 * 共享组件统一导出
 * 为各个独立测试页面提供共享的基础设施组件
 */

// 导出共享组件
export { TestConfigPanel } from './TestConfigPanel';
export { TestProgressBar } from './TestProgressBar';
export { TestResultsPanel } from './TestResultsPanel';

// 重新导出DataTable组件
export { DataTable } from './index.tsx';

// 导出类型定义
export type {
  ConfigField,
  ConfigSection,
  TestConfigPanelProps
} from './TestConfigPanel';

export type {
  TestProgressBarProps
} from './TestProgressBar';

export type {
  TestMetric,
  TestResultSection,
  TestResultsPanelProps
} from './TestResultsPanel';

