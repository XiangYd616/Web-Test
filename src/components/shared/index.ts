/**
 * 共享组件统一导出
 * 避免重复实现，提高代码复用性
 */

export { default as StatCard } from './StatCard';
export { default as DataTable } from './DataTable';
export { default as Pagination } from './Pagination';

// 导出类型
export type { Column } from './DataTable';
