/**
 * 时间戳转换工具
 */

export const toDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value as string | number | Date);
};

export const toOptionalDate = (value: unknown): Date | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  return toDate(value);
};
