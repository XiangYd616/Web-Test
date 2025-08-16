
// 🔧 整理后的图表组件导出 - 消除重复
export { default as StressTestCharts } from './StressTestCharts';
export type { default as StressTestMetrics } from './StressTestMetrics';

// 保留的专用组件
export { default as DashboardCharts } from './DashboardCharts';
export { default as TestCharts } from './TestCharts';
export { default as TestComparisonCharts } from './TestComparisonCharts';

// StressTestChart 已移动到其他文件

// 🔧 统一的图表组件别名，便于迁移
export { default as RealTimeStressChart, default as StressTestCharts } from './StressTestCharts';

