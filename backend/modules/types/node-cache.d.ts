declare module 'node-cache' {
  type Options = {
    stdTTL?: number;
    checkperiod?: number;
    deleteOnExpire?: boolean;
    maxKeys?: number;
    useClones?: boolean;
  };

  class NodeCache {
    constructor(options?: Options);
    on(event: string, callback: () => void): void;
    get<T = unknown>(key: string): T | undefined;
    set<T = unknown>(key: string, value: T, ttl?: number): boolean;
    del(key: string): number;
    keys(): string[];
    flushAll(): void;
    close(): void;
    getStats(): Record<string, unknown>;
  }

  export default NodeCache;
}
