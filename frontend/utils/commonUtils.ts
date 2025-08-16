/**
 * 通用工具函数
 */

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString();
};

export const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes > 0) {
    
        return `${minutes
      }m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

export const generateId = (): string => {
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
