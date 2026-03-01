/**
 * dataModels.types.ts - 数据模型类型定义
 */

import { BaseModel } from './models.types';

export interface DataRecord extends BaseModel {
  name: string;
  type: string;
  data: any;
  metadata?: Record<string, any>;
}

export interface DataCollection {
  id: string;
  name: string;
  description?: string;
  records: DataRecord[];
  count: number;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file' | 'stream';
  connection: any;
  config?: Record<string, any>;
}

