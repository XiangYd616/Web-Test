// 🛠️ 管理页面统一导出
// 只导出实际存在的文件
export { default as DataStorage } from './DataStorage';
export { default as Settings } from './Settings';

// 从父目录导出主要管理页面 - 所有管理功能都在Admin内部
export { default as Admin } from '../Admin';

// 类型导出 - 注释掉不存在的类型
// export type { AdminProps } from '../Admin';
// export type { UserProfileProps } from '../UserProfile';
// export type { SettingsProps } from './Settings';
// export type { SystemLogsProps } from '../SystemLogs';
// export type { SystemStatusProps } from '../SystemStatus';
// export type { DataManagementProps } from './DataManagement';
// export type { DataStorageProps } from './DataStorage';
// export type { BackupManagementProps } from '../BackupManagement';
