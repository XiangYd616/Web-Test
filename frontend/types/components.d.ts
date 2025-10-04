// Common Component Types

export interface TableColumn<T = any> {
  title: string;
  dataIndex?: string;
  key: string;
  width?: number;
  render?: (value: any, record: T, index: number) => any;
  sorter?: boolean | ((a: T, b: T) => number);
  filters?: Array<{ text: string; value: any }>;
  onFilter?: (value: any, record: T) => boolean;
}

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}

export interface ProgressListener {
  onProgress: (progress: any) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export interface TestRecordQuery {
  page?: number;
  pageSize?: number;
  type?: string;
  status?: string;
  from?: string | number;
  to?: string | number;
}

// Export all
export {};
