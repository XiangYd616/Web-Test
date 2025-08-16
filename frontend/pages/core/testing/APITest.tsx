/**
 * API测试页面 - 使用统一的测试组件
 */

import React from 'react';
import { TestType } from '../../../types/testConfig';
import { TestPage } from '../TestPage';

const APITest: React.FC = () => {
  return <TestPage testType={TestType.API} />;
};

export default APITest;
