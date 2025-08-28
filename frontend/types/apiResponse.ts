/**
 * API响应类型定义 - 主入口文件
 * 版本: v2.0.0
 */

// 重新导出统一API响应类型
export * from './unified/apiResponse';
export * from './unified/apiResponse.types';

// 默认导出
export type { ApiResponse as default } from './unified/apiResponse.types';

