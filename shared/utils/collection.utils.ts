/**
 * 数组和对象处理工具函数
 * 提供集合操作、数据转换、深度操作等功能
 */

/**
 * 数组分块
 * @param array 输入数组
 * @param size 每块大小
 * @returns 分块后的二维数组
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 数组去重
 * @param array 输入数组
 * @param key 可选的对象属性键，用于对象数组去重
 * @returns 去重后的数组
 */
export function unique<T>(array: T[], key?: keyof T): T[] {
  if (key) {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }
  return [...new Set(array)];
}

/**
 * 数组扁平化
 * @param array 多维数组
 * @param depth 扁平化深度，默认为1
 * @returns 扁平化后的数组
 */
export function flatten<T>(array: any[], depth: number = 1): T[] {
  if (depth <= 0) return array;
  return array.reduce((acc, val) => {
    if (Array.isArray(val)) {
      return acc.concat(flatten(val, depth - 1));
    }
    return acc.concat(val);
  }, []);
}

/**
 * 深度扁平化
 * @param array 多维数组
 * @returns 完全扁平化的数组
 */
export function flattenDeep<T>(array: any[]): T[] {
  return array.reduce((acc, val) => {
    if (Array.isArray(val)) {
      return acc.concat(flattenDeep(val));
    }
    return acc.concat(val);
  }, []);
}

/**
 * 数组分组
 * @param array 输入数组
 * @param key 分组依据的键
 * @returns 分组后的对象
 */
export function groupBy<T>(array: T[], key: keyof T | ((item: T) => string)): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * 数组排序
 * @param array 输入数组
 * @param key 排序依据的键或比较函数
 * @param order 排序顺序，'asc'升序，'desc'降序
 * @returns 排序后的新数组
 */
export function sortBy<T>(
  array: T[],
  key: keyof T | ((item: T) => any),
  order: 'asc' | 'desc' = 'asc'
): T[] {
  const sorted = [...array].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key];
    const bVal = typeof key === 'function' ? key(b) : b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
}

/**
 * 从数组中随机选择元素
 * @param array 输入数组
 * @param count 选择数量，默认为1
 * @returns 随机选择的元素或元素数组
 */
export function sample<T>(array: T[], count: number = 1): T | T[] {
  if (count === 1) {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  const shuffled = shuffle(array);
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * 打乱数组
 * @param array 输入数组
 * @returns 打乱后的新数组
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 数组求和
 * @param array 数字数组
 * @param key 可选的对象属性键
 * @returns 总和
 */
export function sum<T>(array: T[], key?: keyof T): number {
  if (key) {
    return array.reduce((total, item) => total + Number(item[key]) || 0, 0);
  }
  return (array as unknown as number[]).reduce((total, num) => total + num, 0);
}

/**
 * 数组平均值
 * @param array 数字数组
 * @param key 可选的对象属性键
 * @returns 平均值
 */
export function average<T>(array: T[], key?: keyof T): number {
  if (array.length === 0) return 0;
  return sum(array, key) / array.length;
}

/**
 * 查找最大值
 * @param array 数组
 * @param key 可选的对象属性键
 * @returns 最大值或最大值对象
 */
export function max<T>(array: T[], key?: keyof T): T | number {
  if (array.length === 0) return 0;
  
  if (key) {
    return array.reduce((maxItem, item) => 
      Number(item[key]) > Number(maxItem[key]) ? item : maxItem
    );
  }
  
  return Math.max(...(array as unknown as number[]));
}

/**
 * 查找最小值
 * @param array 数组
 * @param key 可选的对象属性键
 * @returns 最小值或最小值对象
 */
export function min<T>(array: T[], key?: keyof T): T | number {
  if (array.length === 0) return 0;
  
  if (key) {
    return array.reduce((minItem, item) => 
      Number(item[key]) < Number(minItem[key]) ? item : minItem
    );
  }
  
  return Math.min(...(array as unknown as number[]));
}

/**
 * 数组交集
 * @param arrays 多个数组
 * @returns 交集数组
 */
export function intersection<T>(...arrays: T[][]): T[] {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return arrays[0];
  
  return arrays.reduce((acc, array) => 
    acc.filter(item => array.includes(item))
  );
}

/**
 * 数组并集
 * @param arrays 多个数组
 * @returns 并集数组
 */
export function union<T>(...arrays: T[][]): T[] {
  return unique(arrays.flat());
}

/**
 * 数组差集
 * @param array1 第一个数组
 * @param array2 第二个数组
 * @returns 差集数组（array1中有但array2中没有的元素）
 */
export function difference<T>(array1: T[], array2: T[]): T[] {
  const set2 = new Set(array2);
  return array1.filter(item => !set2.has(item));
}

/**
 * 深度克隆
 * @param obj 要克隆的对象
 * @returns 克隆后的对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  if (obj instanceof Set) {
    return new Set(Array.from(obj).map(item => deepClone(item))) as unknown as T;
  }

  if (obj instanceof Map) {
    return new Map(Array.from(obj.entries()).map(([key, val]) => [deepClone(key), deepClone(val)])) as unknown as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * 深度合并对象
 * @param target 目标对象
 * @param sources 源对象
 * @returns 合并后的对象
 */
export function deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;
  
  const source = sources.shift();
  
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: {} });
        }
        deepMerge(target[key] as object, source[key] as object);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  
  return deepMerge(target, ...sources);
}

/**
 * 判断是否为对象
 * @param item 要判断的项
 * @returns 是否为对象
 */
export function isObject(item: any): item is object {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 判断是否为空值
 * @param value 要判断的值
 * @returns 是否为空
 */
export function isEmpty(value: any): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (value instanceof Set || value instanceof Map) return value.size === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * 清理对象中的空值
 * @param obj 输入对象
 * @param removeEmpty 是否移除空值
 * @returns 清理后的对象
 */
export function cleanObject<T extends object>(obj: T, removeEmpty: boolean = true): Partial<T> {
  const cleaned: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (removeEmpty && isEmpty(value)) {
      continue;
    }
    
    if (isObject(value)) {
      const cleanedValue = cleanObject(value, removeEmpty);
      if (!removeEmpty || !isEmpty(cleanedValue)) {
        cleaned[key] = cleanedValue;
      }
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * 获取嵌套对象属性
 * @param obj 对象
 * @param path 属性路径，用点分隔
 * @param defaultValue 默认值
 * @returns 属性值
 */
export function get<T = any>(obj: any, path: string, defaultValue?: T): T {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return defaultValue as T;
    }
    current = current[key];
  }
  
  return current !== undefined ? current : defaultValue as T;
}

/**
 * 设置嵌套对象属性
 * @param obj 对象
 * @param path 属性路径，用点分隔
 * @param value 要设置的值
 * @returns 修改后的对象
 */
export function set<T extends object>(obj: T, path: string, value: any): T {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current: any = obj;
  
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[lastKey] = value;
  return obj;
}

/**
 * 选择对象的部分属性
 * @param obj 源对象
 * @param keys 要选择的键
 * @returns 包含选定属性的新对象
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * 排除对象的部分属性
 * @param obj 源对象
 * @param keys 要排除的键
 * @returns 排除指定属性的新对象
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj } as Omit<T, K>;
  keys.forEach(key => {
    delete (result as any)[key];
  });
  return result;
}

/**
 * 比较两个值是否深度相等
 * @param a 第一个值
 * @param b 第二个值
 * @returns 是否相等
 */
export function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return false;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!isEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param wait 等待时间（毫秒）
 * @param immediate 是否立即执行
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(context, args);
  };
}

/**
 * 节流函数
 * @param func 要节流的函数
 * @param limit 时间限制（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 记忆化函数
 * @param func 要记忆化的函数
 * @returns 记忆化后的函数
 */
export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map();
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// 默认导出
export default {
  chunk,
  unique,
  flatten,
  flattenDeep,
  groupBy,
  sortBy,
  sample,
  shuffle,
  sum,
  average,
  max,
  min,
  intersection,
  union,
  difference,
  deepClone,
  deepMerge,
  isObject,
  isEmpty,
  cleanObject,
  get,
  set,
  pick,
  omit,
  isEqual,
  debounce,
  throttle,
  memoize
};
