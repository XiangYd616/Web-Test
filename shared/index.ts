/**
 * 共享模块主导出文件
 * 统一导出所有共享的类型、常量、工具函数和接口
 */

// 导出类型定义
export * from './types';

// 导出常量定义
export * from './constants';

// 导出工具函数
export * from './utils';

// 导出接口定义（如果有）
export * from './interfaces';

// 整合默认导出
import types from './types';
import constants from './constants';
import utils from './utils';

export default {
  types,
  constants,
  utils,
};
