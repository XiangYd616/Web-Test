
// 🔧 整理后的图表组件导出 - 消除重复
export { default as EnhancedStressTestCharts } from './EnhancedStressTestCharts';
export type { default as StressTestMetrics } from './StressTestMetrics';

// 保留的专用组件
export { default as AdvancedTestCharts } from './AdvancedTestCharts';
export { default as EnhancedDashboardCharts } from './EnhancedDashboardCharts';
export { default as TestComparisonCharts } from './TestComparisonCharts';

// 从 SimpleCharts 导出特定组件（保留向后兼容）
export {
    AdvancedStressTestChart
} from './SimpleCharts';

// 🔧 统一的图表组件别名，便于迁移
export { default as RealTimeStressChart, default as UnifiedStressTestCharts } from './EnhancedStressTestCharts';

