/**
 * Repository 聚合入口
 * 提供单例实例，供 IPC 层和其他模块直接使用
 */

export { BaseRepository } from './BaseRepository';
export {
  CollectionRepository,
  type CollectionRow,
  type CollectionFolderRow,
  type CollectionRequestRow,
} from './CollectionRepository';
export { EnvironmentRepository, type EnvironmentRow } from './EnvironmentRepository';
export { TestExecutionRepository, type TestExecutionRow } from './TestExecutionRepository';
export { TestTemplateRepository, type TestTemplateRow } from './TestTemplateRepository';
export { WorkspaceRepository, type WorkspaceRow } from './WorkspaceRepository';

// ─── 单例实例 ───

import { CollectionRepository } from './CollectionRepository';
import { EnvironmentRepository } from './EnvironmentRepository';
import { TestExecutionRepository } from './TestExecutionRepository';
import { TestTemplateRepository } from './TestTemplateRepository';
import { WorkspaceRepository } from './WorkspaceRepository';

export const workspaceRepo = new WorkspaceRepository();
export const collectionRepo = new CollectionRepository();
export const environmentRepo = new EnvironmentRepository();
export const testExecutionRepo = new TestExecutionRepository();
export const testTemplateRepo = new TestTemplateRepository();
