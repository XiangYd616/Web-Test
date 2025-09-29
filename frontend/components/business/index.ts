/**
 * 业务组件统一导出
 * 提供重构后的业务组件，支持多种测试类型的统一界面
 */

// 核心业务组件
export { default as DataExporter } from './DataExporter';
export { default as MonitorDashboard } from './MonitorDashboard';
export { default as ResultViewer } from './ResultViewer';
export { LegacyTestRunner as TestRunner } from './LegacyTestRunner';

// 类型定义导出
export type {
    TestConfig,
    TestResult,
    TestRunnerProps, TestType
} from './LegacyTestRunner';

export type {
    ResultDetails,
    ResultViewerProps
} from './ResultViewer';

export type {
    Alert,
    MonitorDashboardProps, MonitorStats, MonitorTarget
} from './MonitorDashboard';

export type {
    DataExporterProps, ExportConfig, ExportDataType, ExportFormat, ExportTask
} from './DataExporter';
