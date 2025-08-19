/**
 * 空白布局组件
 * 
 * 用于不需要导航和侧边栏的页面，如404、错误页面等
 * 
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import React from 'react';
import { Outlet } from 'react-router-dom';

const EmptyLayout: React.FC = () => {
  return <Outlet />;
};

export default EmptyLayout;
