// 🛠️ 管理页面统一导出
// 只导出实际存在的文件
export { default as DataStorage } from './DataStorage';
export { default as Settings } from './Settings';

// 类型导出 - 注释掉不存在的类型
// export type { AdminProps } from '../Admin';
// export type { UserProfileProps } from '../UserProfile';
// export type { SettingsProps } from './Settings';
// export type { SystemLogsProps } from '../SystemLogs';
// export type { SystemStatusProps } from '../SystemStatus';
// export type { DataManagementProps } from './DataManagement';
// export type { DataStorageProps } from './DataStorage';
// export type { BackupManagementProps } from '../BackupManagement';

// 默认导出 - 导出 DataStorage 作为主要组件
export { default } from './DataStorage';

