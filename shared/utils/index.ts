/**
 * 共享工具函数导出
 * 统一导出所有工具函数模块
 */

// 导出字符串处理工具
// 避免重复导出，只导出默认导出
export { default as stringUtils } from './string.utils';

// 导出集合处理工具
export { default as collectionUtils } from './collection.utils';

// 整合导出常用工具函数
import stringUtils from './string.utils';
import collectionUtils from './collection.utils';

// 默认导出所有工具
export default {
  ...stringUtils,
  ...collectionUtils,
};
