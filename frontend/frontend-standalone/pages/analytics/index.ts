// 📊 分析页面统一导出
export { default as Performance } from '../PerformanceTest';
export { default as Reports } from '../Reports';
export { default as SecurityReport } from '../SecurityReport';
// export { default as StressTestReport } from '../StressTestReport';
export { default as TestHistory } from '../TestHistory';

// 类型导出 - 注意：这些类型可能不存在，需要检查实际文件
// export type { AnalyticsProps } from '../Analytics';
// export type { ReportsProps } from '../Reports';
// export type { PerformanceProps } from '../Performance';
// export type { TestHistoryProps } from '../TestHistory';
// // export type { StressTestReportProps } from '../StressTestReport';
// export type { SecurityReportProps } from '../SecurityReport';

// 默认导出 - 导出 Reports 作为主要组件
export { default } from '../Reports';

