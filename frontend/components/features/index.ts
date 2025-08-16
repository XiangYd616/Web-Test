/**
 * 业务组件统一导出
 * 提供重构后的业务组件，支持多种测试类型的统一界面
 */

// 核心业务组件
// export { default as DataExporter } from './DataExporter'; // 已修复'
// export { default as MonitorDashboard } from './MonitorDashboard'; // 已修复'
// export { default as ResultViewer } from './ResultViewer'; // 已修复'
// export { default as TestRunner } from './TestRunner'; // 已修复'
// 类型定义导出
export type {
    TestConfig,
    TestResult,
    // TestRunnerProps, TestType
} from './TestRunner'; // 已修复'
export type {
    ResultDetails,
    // ResultViewerProps
} from './ResultViewer'; // 已修复'
export type {
    Alert,
    // MonitorDashboardProps, MonitorStats, MonitorTarget
} from './MonitorDashboard'; // 已修复'
export type {
    // DataExporterProps, ExportConfig, ExportDataType, ExportFormat, ExportTask
} from './DataExporter'; // 已修复'