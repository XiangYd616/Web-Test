#!/usr/bin/env node

/**
 * 创建缺失文件工具
 * 根据导入语句创建缺失的文件和组件
 */

const fs = require('fs');
const path = require('path');

class MissingFileCreator {
  constructor() {
    this.projectRoot = process.cwd();
    this.dryRun = process.argv.includes('--dry-run');
    this.createdFiles = [];
    this.stats = {
      filesCreated: 0,
      componentsCreated: 0,
      routingFilesCreated: 0
    };
  }

  async execute() {
    console.log('🏗️ 开始创建缺失文件...');
    console.log(`模式: ${this.dryRun ? '预览模式' : '实际创建'}`);
    console.log('==================================================');

    try {
      // 1. 创建缺失的路由文件
      await this.createRoutingFiles();

      // 2. 创建缺失的组件文件
      await this.createMissingComponents();

      // 3. 创建缺失的服务文件
      await this.createMissingServices();

      // 4. 生成创建报告
      await this.generateReport();

    } catch (error) {
      console.error('❌ 创建缺失文件过程中出现错误:', error.message);
      process.exit(1);
    }
  }

  async createRoutingFiles() {
    console.log('\n🛣️ 创建路由文件...');

    // 创建AppRoutes组件
    const appRoutesPath = path.join(this.projectRoot, 'frontend/components/routing/AppRoutes.tsx');
    if (!fs.existsSync(appRoutesPath)) {
      await this.createAppRoutes(appRoutesPath);
    }

    // 创建路由配置
    const routeConfigPath = path.join(this.projectRoot, 'frontend/components/routing/routeConfig.ts');
    if (!fs.existsSync(routeConfigPath)) {
      await this.createRouteConfig(routeConfigPath);
    }

    // 创建路由index文件
    const routingIndexPath = path.join(this.projectRoot, 'frontend/components/routing/index.ts');
    if (!fs.existsSync(routingIndexPath)) {
      await this.createRoutingIndex(routingIndexPath);
    }
  }

  async createAppRoutes(filePath) {
    const content = `import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ProtectedRoute } from '../auth/ProtectedRoute';

// Lazy load pages
const Dashboard = React.lazy(() => import('../../pages/core/dashboard/ModernDashboard'));
const Login = React.lazy(() => import('../../pages/core/auth/Login'));
const Register = React.lazy(() => import('../../pages/core/auth/Register'));
const APITest = React.lazy(() => import('../../pages/core/testing/APITest'));
const SecurityTest = React.lazy(() => import('../../pages/core/testing/SecurityTest'));
const StressTest = React.lazy(() => import('../../pages/core/testing/StressTest'));
const Settings = React.lazy(() => import('../../pages/management/settings/Settings'));
const UserProfile = React.lazy(() => import('../../pages/user/profile/UserProfile'));

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        
        {/* Testing routes */}
        <Route path="/test/api" element={<ProtectedRoute><APITest /></ProtectedRoute>} />
        <Route path="/test/security" element={<ProtectedRoute><SecurityTest /></ProtectedRoute>} />
        <Route path="/test/stress" element={<ProtectedRoute><StressTest /></ProtectedRoute>} />
        
        {/* Management routes */}
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        
        {/* User routes */}
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
`;

    await this.createFile(filePath, content, 'AppRoutes组件');
    this.stats.routingFilesCreated++;
  }

  async createRouteConfig(filePath) {
    const content = `export interface RouteConfig {
  path: string;
  component: string;
  title: string;
  protected: boolean;
  roles?: string[];
}

export const routeConfig: RouteConfig[] = [
  {
    path: '/',
    component: 'Dashboard',
    title: '仪表板',
    protected: true
  },
  {
    path: '/dashboard',
    component: 'Dashboard',
    title: '仪表板',
    protected: true
  },
  {
    path: '/login',
    component: 'Login',
    title: '登录',
    protected: false
  },
  {
    path: '/register',
    component: 'Register',
    title: '注册',
    protected: false
  },
  {
    path: '/test/api',
    component: 'APITest',
    title: 'API测试',
    protected: true
  },
  {
    path: '/test/security',
    component: 'SecurityTest',
    title: '安全测试',
    protected: true
  },
  {
    path: '/test/stress',
    component: 'StressTest',
    title: '压力测试',
    protected: true
  },
  {
    path: '/settings',
    component: 'Settings',
    title: '设置',
    protected: true,
    roles: ['admin', 'user']
  },
  {
    path: '/profile',
    component: 'UserProfile',
    title: '用户资料',
    protected: true
  }
];

export default routeConfig;
`;

    await this.createFile(filePath, content, '路由配置');
    this.stats.routingFilesCreated++;
  }

  async createRoutingIndex(filePath) {
    const content = `// Routing components and utilities
export { default as AppRoutes } from './AppRoutes';
export { default as routeConfig } from './routeConfig';
export type { RouteConfig } from './routeConfig';
`;

    await this.createFile(filePath, content, '路由index文件');
    this.stats.routingFilesCreated++;
  }

  async createMissingComponents() {
    console.log('\n🧩 创建缺失组件...');

    // 创建缺失的UI组件
    await this.createUIComponents();

    // 创建缺失的测试组件
    await this.createTestingComponents();

    // 创建缺失的功能组件
    await this.createFeatureComponents();
  }

  async createUIComponents() {
    const uiComponents = [
      {
        name: 'LoadingSpinner',
        path: 'frontend/components/ui/LoadingSpinner.tsx',
        content: this.getLoadingSpinnerContent()
      },
      {
        name: 'ProgressBar',
        path: 'frontend/components/ui/ProgressBar.tsx',
        content: this.getProgressBarContent()
      }
    ];

    for (const component of uiComponents) {
      const filePath = path.join(this.projectRoot, component.path);
      if (!fs.existsSync(filePath)) {
        await this.createFile(filePath, component.content, `${component.name}组件`);
        this.stats.componentsCreated++;
      }
    }
  }

  getLoadingSpinnerContent() {
    return `import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  className = '' 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className={\`flex items-center justify-center \${className}\`}>
      <div 
        className={\`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 \${sizeClasses[size]}\`}
      />
    </div>
  );
};

export { LoadingSpinner };
export default LoadingSpinner;
`;
  }

  getProgressBarContent() {
    return `import React from 'react';

interface ProgressBarProps {
  progress: number;
  className?: string;
  showPercentage?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  className = '', 
  showPercentage = true 
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={\`w-full \${className}\`}>
      <div className="flex justify-between items-center mb-1">
        {showPercentage && (
          <span className="text-sm font-medium text-gray-700">
            {\`\${Math.round(clampedProgress)}%\`}
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: \`\${clampedProgress}%\` }}
        />
      </div>
    </div>
  );
};

export { ProgressBar };
export default ProgressBar;
`;
  }

  async createTestingComponents() {
    const testingComponents = [
      {
        name: 'URLInput',
        path: 'frontend/components/testing/URLInput.tsx',
        content: this.getURLInputContent()
      },
      {
        name: 'BaseTestPage',
        path: 'frontend/components/testing/BaseTestPage.tsx',
        content: this.getBaseTestPageContent()
      }
    ];

    for (const component of testingComponents) {
      const filePath = path.join(this.projectRoot, component.path);
      if (!fs.existsSync(filePath)) {
        await this.createFile(filePath, component.content, `${component.name}组件`);
        this.stats.componentsCreated++;
      }
    }

    // 创建testing组件的index文件
    const testingIndexPath = path.join(this.projectRoot, 'frontend/components/testing/index.ts');
    if (!fs.existsSync(testingIndexPath)) {
      const indexContent = `// Testing components
export { default as URLInput } from './URLInput';
export { default as BaseTestPage } from './BaseTestPage';
export { default as StressTestDetailModal } from './StressTestDetailModal';
export { default as StressTestHistory } from './StressTestHistory';
export { default as UnifiedTestInterface } from './UnifiedTestInterface';
export { default as UnifiedTestPageWithHistory } from './UnifiedTestPageWithHistory';
`;
      await this.createFile(testingIndexPath, indexContent, 'Testing组件index文件');
    }
  }

  getURLInputContent() {
    return `import React, { useState } from 'react';

interface URLInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSubmit?: () => void;
}

const URLInput: React.FC<URLInputProps> = ({
  value,
  onChange,
  placeholder = '请输入URL...',
  className = '',
  onSubmit
}) => {
  const [isValid, setIsValid] = useState(true);

  const validateURL = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsValid(newValue === '' || validateURL(newValue));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSubmit && isValid) {
      onSubmit();
    }
  };

  return (
    <div className={\`\${className}\`}>
      <input
        type="url"
        value={value}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        className={\`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 \${
          !isValid ? 'border-red-500' : 'border-gray-300'
        }\`}
      />
      {!isValid && (
        <p className="mt-1 text-sm text-red-600">请输入有效的URL</p>
      )}
    </div>
  );
};

export { URLInput };
export default URLInput;
`;
  }

  getBaseTestPageContent() {
    return `import React, { ReactNode } from 'react';

interface BaseTestPageProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

const BaseTestPage: React.FC<BaseTestPageProps> = ({
  title,
  description,
  children,
  className = ''
}) => {
  return (
    <div className={\`min-h-screen bg-gray-50 \${className}\`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-2 text-lg text-gray-600">{description}</p>
          )}
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export { BaseTestPage };
export default BaseTestPage;
`;
  }

  async createFeatureComponents() {
    // 创建数据管理组件
    const dataManagementPath = path.join(this.projectRoot, 'frontend/components/data/DataManagement.tsx');
    if (!fs.existsSync(dataManagementPath)) {
      const content = `import React from 'react';

interface DataManagementProps {
  className?: string;
}

const DataManagement: React.FC<DataManagementProps> = ({ className = '' }) => {
  return (
    <div className={\`\${className}\`}>
      <h2 className="text-xl font-semibold mb-4">数据管理</h2>
      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium">数据导入</h3>
          <p className="text-gray-600">导入外部数据到系统</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium">数据导出</h3>
          <p className="text-gray-600">导出系统数据</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium">数据清理</h3>
          <p className="text-gray-600">清理和优化数据</p>
        </div>
      </div>
    </div>
  );
};

export { DataManagement };
export default DataManagement;
`;
      await this.createFile(dataManagementPath, content, 'DataManagement组件');
      this.stats.componentsCreated++;
    }

    // 创建现代图表组件
    const modernChartPath = path.join(this.projectRoot, 'frontend/components/modern/ModernChart.tsx');
    if (!fs.existsSync(modernChartPath)) {
      const content = `import React from 'react';

interface ModernChartProps {
  data: any[];
  type: 'line' | 'bar' | 'pie';
  className?: string;
}

const ModernChart: React.FC<ModernChartProps> = ({ data, type, className = '' }) => {
  return (
    <div className={\`\${className}\`}>
      <div className="p-4 border rounded-lg bg-white">
        <h3 className="text-lg font-medium mb-4">现代图表 ({type})</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
          <p className="text-gray-500">图表组件 - 数据点: {data.length}</p>
        </div>
      </div>
    </div>
  );
};

export { ModernChart };
export default ModernChart;
`;
      await this.createFile(modernChartPath, content, 'ModernChart组件');
      this.stats.componentsCreated++;
    }
  }

  async createMissingServices() {
    console.log('\n🔧 创建缺失服务...');

    // 创建backgroundTestManager服务
    const backgroundTestManagerPath = path.join(this.projectRoot, 'frontend/services/backgroundTestManager.ts');
    if (!fs.existsSync(backgroundTestManagerPath)) {
      const content = `class BackgroundTestManager {
  private runningTests: Map<string, any> = new Map();

  async startTest(testId: string, config: any): Promise<void> {
    console.log('Starting background test:', testId);
    this.runningTests.set(testId, { status: 'running', config });
  }

  async stopTest(testId: string): Promise<void> {
    console.log('Stopping background test:', testId);
    this.runningTests.delete(testId);
  }

  getTestStatus(testId: string): any {
    return this.runningTests.get(testId) || { status: 'not_found' };
  }

  getAllRunningTests(): any[] {
    return Array.from(this.runningTests.entries()).map(([id, test]) => ({
      id,
      ...test
    }));
  }
}

const backgroundTestManager = new BackgroundTestManager();
export default backgroundTestManager;
`;
      await this.createFile(backgroundTestManagerPath, content, 'BackgroundTestManager服务');
    }

    // 创建useUserStats hook
    const useUserStatsPath = path.join(this.projectRoot, 'frontend/hooks/useUserStats.ts');
    if (!fs.existsSync(useUserStatsPath)) {
      const content = `import { useState, useEffect } from 'react';

interface UserStats {
  testsRun: number;
  successRate: number;
  averageResponseTime: number;
  lastTestDate: string | null;
}

export const useUserStats = () => {
  const [stats, setStats] = useState<UserStats>({
    testsRun: 0,
    successRate: 0,
    averageResponseTime: 0,
    lastTestDate: null
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000));

        setStats({
          testsRun: 42,
          successRate: 95.5,
          averageResponseTime: 250,
          lastTestDate: new Date().toISOString()
        });
      } catch (err) {
        setError('Failed to fetch user stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
};
`;
      await this.createFile(useUserStatsPath, content, 'useUserStats hook');
    }
  }

  async generateReport() {
    console.log('\n📊 生成创建报告...');

    const reportPath = path.join(this.projectRoot, 'docs/reports/MISSING_FILES_CREATION_REPORT.md');

    const report = `# 缺失文件创建报告

**创建时间**: ${new Date().toISOString()}
**创建模式**: ${this.dryRun ? '预览模式' : '实际创建'}
**创建文件**: ${this.stats.filesCreated}个

## 📊 创建统计

- **路由文件**: ${this.stats.routingFilesCreated}个
- **组件文件**: ${this.stats.componentsCreated}个
- **总计文件**: ${this.stats.filesCreated}个

## 🏗️ 创建详情

${this.createdFiles.map((file, index) => `
${index + 1}. **${file.description}**
   - 路径: \`${file.path}\`
`).join('\n')}

## 🎯 创建效果

- ✅ 创建了${this.stats.filesCreated}个缺失文件
- ✅ 解决了路由组件缺失问题
- ✅ 补充了基础UI组件
- ✅ 添加了测试相关组件
- ✅ 完善了服务和工具函数

## 📋 后续建议

1. **验证功能**: 测试新创建的组件和服务
2. **完善实现**: 根据实际需求完善组件功能
3. **添加测试**: 为新组件添加单元测试
4. **文档更新**: 更新相关文档

---
*此报告由缺失文件创建工具自动生成*
`;

    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`  📄 创建报告已生成: ${reportPath}`);

    // 输出摘要
    console.log('\n📊 缺失文件创建结果摘要:');
    console.log(`- 创建文件: ${this.stats.filesCreated}个`);
    console.log(`- 路由文件: ${this.stats.routingFilesCreated}个`);
    console.log(`- 组件文件: ${this.stats.componentsCreated}个`);
    console.log(`- 创建模式: ${this.dryRun ? '预览模式' : '实际创建'}`);

    if (this.stats.filesCreated === 0) {
      console.log('\n🎉 所有必要文件都存在！');
    } else {
      console.log(`\n✅ 成功创建了 ${this.stats.filesCreated} 个缺失文件！`);
    }
  }

  async createFile(filePath, content, description) {
    const dir = path.dirname(filePath);

    // 确保目录存在
    if (!fs.existsSync(dir)) {
      if (!this.dryRun) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    if (!this.dryRun) {
      fs.writeFileSync(filePath, content, 'utf8');
    }

    this.createdFiles.push({
      path: path.relative(this.projectRoot, filePath),
      description
    });

    this.stats.filesCreated++;
    console.log(`    ✅ 创建 ${description}: ${path.relative(this.projectRoot, filePath)}`);
  }
}

// 执行缺失文件创建
if (require.main === module) {
  const creator = new MissingFileCreator();
  creator.execute().catch(console.error);
}

module.exports = MissingFileCreator;
