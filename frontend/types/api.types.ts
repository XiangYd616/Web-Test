/**
 * @file API 响应类型定义（前端适配层）
 */

/**
 * 标准 API 响应结构
 * @note 这是一个前端适配层类型，用于简化处理，与后端 @shared/types/apiResponse.types.ts 中的类型不完全一致
 */
export type StandardResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
};
