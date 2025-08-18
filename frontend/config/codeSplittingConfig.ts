/**
 * 代码分割配置实施
 * 应用动态导入和懒加载策略
 */

import { lazy    } from 'react';import { dynamicImport    } from '../utils/dynamicImport';// 懒加载页面组件配置
export const lazyPageComponents = {
  // 核心页面
  Home: lazy(() => dynamicImport(() => import('../pages/Home'))),
  Dashboard: lazy(() => dynamicImport(() => import('../pages/Dashboard'))),
  // 认证页面
  Login: lazy(() => dynamicImport(() => import('../pages/core/auth/Login'))),
  Register: lazy(() => dynamicImport(() => import('../pages/core/auth/Register'))),
  // 测试页面
  PerformanceTest: lazy(() => dynamicImport(() => import('../pages/core/testing/PerformanceTest'))),
  StressTest: lazy(() => dynamicImport(() => import('../pages/core/testing/StressTest'))),
  ApiTest: lazy(() => dynamicImport(() => import('../pages/core/testing/ApiTest'))),
  SeoTest: lazy(() => dynamicImport(() => import('../pages/core/testing/SeoTest'))),
  SecurityTest: lazy(() => dynamicImport(() => import('../pages/core/testing/SecurityTest'))),
  // 管理页面
  TestManagement: lazy(() => dynamicImport(() => import('../pages/core/management/TestManagement'))),
  DataManagement: lazy(() => dynamicImport(() => import('../pages/core/management/DataManagement'))),
  UserManagement: lazy(() => dynamicImport(() => import('../pages/core/management/UserManagement'))),
  // 结果页面
  TestResults: lazy(() => dynamicImport(() => import('../pages/core/results/TestResults'))),
  Analytics: lazy(() => dynamicImport(() => import('../pages/core/analytics/Analytics'))),
  Reports: lazy(() => dynamicImport(() => import('../pages/core/reports/Reports'))),
  // 用户页面
  Profile: lazy(() => dynamicImport(() => import('../pages/core/user/Profile'))),
  Settings: lazy(() => dynamicImport(() => import('../pages/core/settings/Settings')))
};

// 懒加载组件配置
export const lazyUIComponents = {
  // 图表组件
  Chart: lazy(() => dynamicImport(() => import('../components/ui/Chart'))),
  DataTable: lazy(() => dynamicImport(() => import('../components/ui/DataTable'))),
  // 复杂组件
  CodeEditor: lazy(() => dynamicImport(() => import('../components/ui/CodeEditor'))),
  FileUploader: lazy(() => dynamicImport(() => import('../components/ui/FileUploader'))),
  // 模态框和弹窗
  Modal: lazy(() => dynamicImport(() => import('../components/ui/Modal'))),
  Drawer: lazy(() => dynamicImport(() => import('../components/ui/Drawer'))),
  // 虚拟滚动组件
  VirtualScroll: lazy(() => dynamicImport(() => import('../components/ui/VirtualScroll'))),
  VirtualTable: lazy(() => dynamicImport(() => import('../components/ui/VirtualTable')))
};

// 预加载策略配置
export const preloadingStrategy = {
  // 立即预加载的组件
  immediate: ['Home', 'Dashboard'],
  // 用户交互时预加载
  onInteraction: ['Login', 'Register'],
  // 空闲时预加载
  onIdle: ['Profile', 'Settings'],
  // 按需加载
  onDemand: ['TestManagement', 'DataManagement', 'UserManagement']
};

// 实施预加载策略
export const implementPreloadingStrategy = () => {
  // 立即预加载
  preloadingStrategy.immediate.forEach(componentName => {
    if (lazyPageComponents[componentName]) {
      lazyPageComponents[componentName]();
    }
  });
  
  // 空闲时预加载
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadingStrategy.onIdle.forEach(componentName => {
        if (lazyPageComponents[componentName]) {
          lazyPageComponents[componentName]();
        }
      });
    });
  }
};

export default {
  lazyPageComponents,
  lazyUIComponents,
  preloadingStrategy,
  implementPreloadingStrategy
};