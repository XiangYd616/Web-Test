/**
 * 测试引擎支持的测试类型
 * 供后端验证与路由共享使用，避免重复定义
 */

import { TestTypeValues } from '../../../shared/types/test.types';

export const TEST_TYPES = TestTypeValues;

export type TestType = (typeof TEST_TYPES)[number];
