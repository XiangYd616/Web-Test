/**
 * project.types.ts - 项目类型定义
 */

import { BaseModel } from './models.types';

export interface Project extends BaseModel {
  name: string;
  description?: string;
  owner: string;
  members?: string[];
  settings?: ProjectSettings;
  status: 'active' | 'archived' | 'deleted';
}

export interface ProjectSettings {
  testConfig?: any;
  notifications?: boolean;
  integrations?: string[];
  [key: string]: any;
}

export interface ProjectMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
}

