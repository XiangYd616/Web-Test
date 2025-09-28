// 🛠️ 管理页面统一导出
// 导出所有管理页面组件
export { default as Admin } from './Admin';
export { default as UserManagement } from './UserManagement';
export { default as DataStorage } from './DataStorage';
export { default as Settings } from './Settings';

// 类型导出 - 注释掉不存在的类型
// export type { AdminProps } from './Admin';
// export type { UserManagementProps } from './UserManagement';
// export type { SettingsProps } from './Settings';
// export type { DataStorageProps } from './DataStorage';

// 默认导出 - 导出 Admin 作为主要组件
export { default } from './Admin';

