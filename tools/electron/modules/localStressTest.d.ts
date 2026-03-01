import { EventEmitter } from 'events';

declare class LocalStressTestEngine extends EventEmitter {
  constructor();
  start(
    config: Record<string, unknown>
  ): Promise<{ success: boolean; testId?: string; error?: string }>;
  stop(): Promise<{ success: boolean; error?: string }>;
  getStatus(): { isRunning: boolean; testId: string | null; progress: number };
  getSystemUsage(): {
    cpu: number;
    memory: { total: number; used: number; free: number };
    loadAverage: number[];
  };
}

export default LocalStressTestEngine;
