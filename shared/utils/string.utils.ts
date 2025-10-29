/**
 * 字符串处理工具函数
 * 提供字符串格式化、验证、转换等通用功能
 */

/**
 * 将字符串转换为驼峰命名
 * @param str 输入字符串
 * @returns 驼峰命名字符串
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^./, (char) => char.toLowerCase());
}

/**
 * 将字符串转换为帕斯卡命名（PascalCase）
 * @param str 输入字符串
 * @returns 帕斯卡命名字符串
 */
export function toPascalCase(str: string): string {
  const camelCase = toCamelCase(str);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

/**
 * 将字符串转换为短横线命名（kebab-case）
 * @param str 输入字符串
 * @returns 短横线命名字符串
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * 将字符串转换为下划线命名（snake_case）
 * @param str 输入字符串
 * @returns 下划线命名字符串
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * 将字符串转换为常量命名（CONSTANT_CASE）
 * @param str 输入字符串
 * @returns 常量命名字符串
 */
export function toConstantCase(str: string): string {
  return toSnakeCase(str).toUpperCase();
}

/**
 * 截断文本
 * @param text 文本内容
 * @param maxLength 最大长度
 * @param suffix 后缀，默认为省略号
 * @returns 截断后的文本
 */
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (!text || text.length <= maxLength) {
    return text || '';
  }
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 移除字符串两端空白
 * @param str 输入字符串
 * @returns 处理后的字符串
 */
export function trim(str: string): string {
  return str.trim();
}

/**
 * 移除所有空白字符
 * @param str 输入字符串
 * @returns 处理后的字符串
 */
export function removeWhitespace(str: string): string {
  return str.replace(/\s+/g, '');
}

/**
 * 首字母大写
 * @param str 输入字符串
 * @returns 首字母大写的字符串
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * 每个单词首字母大写
 * @param str 输入字符串
 * @returns 每个单词首字母大写的字符串
 */
export function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * 反转字符串
 * @param str 输入字符串
 * @returns 反转后的字符串
 */
export function reverse(str: string): string {
  return str.split('').reverse().join('');
}

/**
 * 判断是否为空字符串
 * @param str 输入字符串
 * @returns 是否为空
 */
export function isEmpty(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

/**
 * 判断是否包含中文
 * @param str 输入字符串
 * @returns 是否包含中文
 */
export function containsChinese(str: string): boolean {
  return /[\u4e00-\u9fa5]/.test(str);
}

/**
 * 判断是否为纯数字
 * @param str 输入字符串
 * @returns 是否为纯数字
 */
export function isNumeric(str: string): boolean {
  return /^\d+$/.test(str);
}

/**
 * 判断是否为有效邮箱
 * @param email 邮箱地址
 * @returns 是否有效
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 判断是否为有效手机号（中国）
 * @param phone 手机号
 * @returns 是否有效
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 判断是否为有效URL
 * @param url URL字符串
 * @returns 是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 生成随机字符串
 * @param length 长度
 * @param chars 字符集，默认为字母数字
 * @returns 随机字符串
 */
export function randomString(
  length: number, 
  chars: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 解析查询字符串
 * @param queryString 查询字符串
 * @returns 参数对象
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(queryString);
  
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
}

/**
 * 构建查询字符串
 * @param params 参数对象
 * @returns 查询字符串
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        searchParams.append(key, value.join(','));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  return searchParams.toString();
}

/**
 * 转义HTML字符
 * @param str 输入字符串
 * @returns 转义后的字符串
 */
export function escapeHtml(str: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };
  
  return str.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
}

/**
 * 反转义HTML字符
 * @param str 输入字符串
 * @returns 反转义后的字符串
 */
export function unescapeHtml(str: string): string {
  const unescapeMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x2F;': '/'
  };
  
  return str.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&#x2F;/g, (match) => unescapeMap[match]);
}

/**
 * 获取字符串字节长度（UTF-8）
 * @param str 输入字符串
 * @returns 字节长度
 */
export function getByteLength(str: string): number {
  let length = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      length += 1;
    } else if (code < 0x800) {
      length += 2;
    } else if (code < 0x10000) {
      length += 3;
    } else {
      length += 4;
    }
  }
  return length;
}

/**
 * 格式化模板字符串
 * @param template 模板字符串，使用 {key} 作为占位符
 * @param data 数据对象
 * @returns 格式化后的字符串
 */
export function formatTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

/**
 * 比较两个字符串的相似度
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns 相似度（0-1）
 */
export function similarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * 计算Levenshtein距离
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns 编辑距离
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// 默认导出
export default {
  toCamelCase,
  toPascalCase,
  toKebabCase,
  toSnakeCase,
  toConstantCase,
  truncate,
  trim,
  removeWhitespace,
  capitalize,
  capitalizeWords,
  reverse,
  isEmpty,
  containsChinese,
  isNumeric,
  isValidEmail,
  isValidPhone,
  isValidUrl,
  randomString,
  parseQueryString,
  buildQueryString,
  escapeHtml,
  unescapeHtml,
  getByteLength,
  formatTemplate,
  similarity
};
