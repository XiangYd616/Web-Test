/**
 * 时间戳转换工具
 */

export const toDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(value)) {
    return new Date(value + 'Z');
  }
  return new Date(value as string | number | Date);
};

export const toOptionalDate = (value: unknown): Date | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  return toDate(value);
};
