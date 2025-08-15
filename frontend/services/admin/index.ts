// 🛠️ 管理服务统一导出
export { default as adminService } from '../adminService';
export { default as settingsService } from '../system/settingsService';
export { default as systemService } from '../system/systemService';

// 类型导出
// export type { AdminService } from '../adminService'; // AdminService类没有被导出，只有实例
export type { SettingsService } from '../settingsService';
export type { SystemService } from '../systemService';

