// Event handling types

export interface BaseEvent {
  type: string;
  timestamp: number;
  data?: any;
}

export interface TestEvent extends BaseEvent {
  testId?: string;
  status?: string;
  progress?: number;
  result?: any;
}

export interface ErrorEvent extends BaseEvent {
  error: Error | string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  context?: any;
}

export type EventListener<T extends BaseEvent = BaseEvent> = (event: T) => void | Promise<void>;

export interface EventEmitter {
  on: (event: string, listener: EventListener) => void;
  off: (event: string, listener: EventListener) => void;
  emit: (event: string, data?: any) => void;
}
