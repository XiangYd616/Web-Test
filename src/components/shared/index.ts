/**
 * 共享组件统一导出
 * 避免重复实现，提高代码复用性
 */

// 从modern组件导入StatCard，避免重复实现
export { default as StatCard } from '../modern/StatCard';
export { default as DataTable } from './DataTable';
export { default as Pagination } from './Pagination';

// 导出类型
export type { StatCardProps } from '../modern/StatCard';
export type { Column } from './DataTable';

