// Type assertion and guard helpers

export function asTestRecord(data: any): import('../types/common').StressTestRecord {
  return data as any;
}

export function asTestMetrics(data: any): import('../types/common').TestMetrics {
  return data as any;
}

export function asTestResults(data: any): import('../types/common').TestResults {
  return data as any;
}

export function hasProperty<K extends string>(
  obj: any,
  key: K
): obj is Record<K, any> {
  return obj && typeof obj === 'object' && key in obj;
}

export function hasProperties<K extends string>(
  obj: any,
  keys: K[]
): obj is Record<K, any> {
  return obj && typeof obj === 'object' && keys.every(key => key in obj);
}

export function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isArray<T = any>(value: any): value is T[] {
  return Array.isArray(value);
}

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

// Safe property access
export function getProp<T = any>(obj: any, path: string, defaultValue?: T): T {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return defaultValue as T;
    }
  }
  
  return result as T;
}

// Safe method call
export function safeCall<T = any>(obj: any, method: string, ...args: any[]): T | undefined {
  if (obj && typeof obj[method] === 'function') {
    return obj[method](...args);
  }
  return undefined;
}
