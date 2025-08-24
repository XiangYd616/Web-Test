/**
 * 可选的统一测试组件导出
 * 各个测试页面可以选择性使用这些组件，不强制替换现有实现
 */

// 导出组件
export { TestConfigPanel } from './TestConfigPanel';
export { TestProgressDisplay } from './TestProgressDisplay';
export { TestResultsViewer } from './TestResultsViewer';

// 导出类型
export type { BaseTestConfig } from './TestConfigPanel';
export type { TestStatus, QueueStats } from './TestProgressDisplay';
export type { TestResult } from './TestResultsViewer';

// 导出组件属性类型
export type { TestConfigPanelProps } from './TestConfigPanel';
export type { TestProgressDisplayProps } from './TestProgressDisplay';
export type { TestResultsViewerProps } from './TestResultsViewer';
