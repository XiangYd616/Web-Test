/**
 * 迁移进度跟踪组件
 * 展示类型系统迁移的进度和状态
 * 
 * 这是一个开发工具组件，用于：
 * 1. 跟踪迁移进度
 * 2. 显示迁移状态
 * 3. 提供迁移指导
 * 4. 展示最佳实践
 */

import { useState } from 'react';
import type { FC } from 'react';
import { CheckCircle, Clock, AlertCircle, FileText, Code, Database, Layers } from 'lucide-react';
import type {
  BaseComponentProps,
  ComponentSize,
  ComponentColor
} from '../../types';

// 迁移项目类型
type MigrationItemType = 'hook' | 'component' | 'service' | 'type';

// 迁移状态
type MigrationStatus = 'completed' | 'in-progress' | 'pending' | 'blocked';

// 迁移项目接口
interface MigrationItem {
  id: string;
  name: string;
  type: MigrationItemType;
  status: MigrationStatus;
  progress: number;
  description: string;
  filePath: string;
  linesOfCode: number;
  typesRemoved: number;
  typesAdded: number;
  lastUpdated: string;
  blockers?: string[];
  notes?: string;
}

// 组件Props
interface MigrationProgressProps extends BaseComponentProps {
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 组件尺寸 */
  size?: ComponentSize;
  /** 是否可交互 */
  interactive?: boolean;
}

// 迁移数据
const MIGRATION_DATA: MigrationItem[] = [
  // Hook迁移
  {
    id: 'hook-api-test',
    name: 'useAPITestState',
    type: 'hook',
    status: 'completed',
    progress: 100,
    description: 'API测试状态管理Hook',
    filePath: 'frontend/hooks/useAPITestState.ts',
    linesOfCode: 180,
    typesRemoved: 22,
    typesAdded: 8,
    lastUpdated: '2024-01-15',
    notes: '完全迁移到统一类型系统'
  },
  {
    id: 'hook-compatibility',
    name: 'useCompatibilityTestState',
    type: 'hook',
    status: 'completed',
    progress: 100,
    description: '兼容性测试状态管理Hook',
    filePath: 'frontend/hooks/useCompatibilityTestState.ts',
    linesOfCode: 220,
    typesRemoved: 18,
    typesAdded: 6,
    lastUpdated: '2024-01-15',
    notes: '使用统一的CompatibilityTestHook类型'
  },
  {
    id: 'hook-database',
    name: 'useDatabaseTestState',
    type: 'hook',
    status: 'completed',
    progress: 100,
    description: '数据库测试状态管理Hook',
    filePath: 'frontend/hooks/useDatabaseTestState.ts',
    linesOfCode: 250,
    typesRemoved: 35,
    typesAdded: 7,
    lastUpdated: '2024-01-15',
    notes: '完整的类型安全支持'
  },
  {
    id: 'hook-network',
    name: 'useNetworkTestState',
    type: 'hook',
    status: 'completed',
    progress: 100,
    description: '网络测试状态管理Hook',
    filePath: 'frontend/hooks/useNetworkTestState.ts',
    linesOfCode: 200,
    typesRemoved: 20,
    typesAdded: 7,
    lastUpdated: '2024-01-15',
    notes: '使用统一的NetworkTestHook类型'
  },
  {
    id: 'hook-ux',
    name: 'useUXTestState',
    type: 'hook',
    status: 'completed',
    progress: 100,
    description: 'UX测试状态管理Hook',
    filePath: 'frontend/hooks/useUXTestState.ts',
    linesOfCode: 280,
    typesRemoved: 25,
    typesAdded: 9,
    lastUpdated: '2024-01-15',
    notes: '完整的UX测试类型支持'
  },
  {
    id: 'hook-unified',
    name: 'useUnifiedTestState',
    type: 'hook',
    status: 'in-progress',
    progress: 60,
    description: '统一测试状态管理Hook',
    filePath: 'frontend/hooks/useUnifiedTestState.ts',
    linesOfCode: 350,
    typesRemoved: 15,
    typesAdded: 5,
    lastUpdated: '2024-01-15',
    notes: '部分导入已更新，需要完成类型替换'
  },
  {
    id: 'hook-test-engine',
    name: 'useTestEngine',
    type: 'hook',
    status: 'in-progress',
    progress: 40,
    description: '测试引擎Hook',
    filePath: 'frontend/hooks/useTestEngine.ts',
    linesOfCode: 150,
    typesRemoved: 8,
    typesAdded: 3,
    lastUpdated: '2024-01-15',
    notes: '导入已清理，需要添加统一类型'
  },

  // 组件迁移
  {
    id: 'component-stress-test',
    name: 'StressTest',
    type: 'component',
    status: 'in-progress',
    progress: 20,
    description: '压力测试核心组件',
    filePath: 'frontend/pages/StressTest.tsx',
    linesOfCode: 6163,
    typesRemoved: 0,
    typesAdded: 9,
    lastUpdated: '2024-01-15',
    notes: '大型文件，需要渐进式迁移',
    blockers: ['文件过大', '复杂的本地类型定义']
  },
  {
    id: 'component-api-test',
    name: 'APITest',
    type: 'component',
    status: 'in-progress',
    progress: 30,
    description: 'API测试核心组件',
    filePath: 'frontend/pages/APITest.tsx',
    linesOfCode: 1800,
    typesRemoved: 0,
    typesAdded: 10,
    lastUpdated: '2024-01-15',
    notes: '导入已添加，需要更新组件逻辑'
  },
  {
    id: 'component-seo-test',
    name: 'SEOTest',
    type: 'component',
    status: 'in-progress',
    progress: 50,
    description: 'SEO测试组件',
    filePath: 'frontend/pages/SEOTest.tsx',
    linesOfCode: 1203,
    typesRemoved: 5,
    typesAdded: 8,
    lastUpdated: '2024-01-15',
    notes: '部分类型已更新，需要完成状态迁移'
  },
  {
    id: 'component-compatibility',
    name: 'CompatibilityTest',
    type: 'component',
    status: 'in-progress',
    progress: 40,
    description: '兼容性测试组件',
    filePath: 'frontend/pages/CompatibilityTest.tsx',
    linesOfCode: 1562,
    typesRemoved: 3,
    typesAdded: 12,
    lastUpdated: '2024-01-15',
    notes: '导入已更新，正在迁移本地类型'
  },
  {
    id: 'component-modern-test',
    name: 'ModernTestPage',
    type: 'component',
    status: 'completed',
    progress: 100,
    description: '现代化测试页面示例',
    filePath: 'frontend/pages/ModernTestPage.tsx',
    linesOfCode: 300,
    typesRemoved: 0,
    typesAdded: 15,
    lastUpdated: '2024-01-15',
    notes: '100%使用新类型系统的最佳实践示例'
  },

  // 服务迁移
  {
    id: 'service-test-api',
    name: 'testApiService',
    type: 'service',
    status: 'completed',
    progress: 100,
    description: '测试API服务',
    filePath: 'frontend/services/api/testApiService.ts',
    linesOfCode: 400,
    typesRemoved: 0,
    typesAdded: 6,
    lastUpdated: '2024-01-15',
    notes: '实现TestApiClient接口'
  },
  {
    id: 'service-background-manager',
    name: 'backgroundTestManager',
    type: 'service',
    status: 'completed',
    progress: 100,
    description: '后台测试管理器',
    filePath: 'frontend/services/backgroundTestManager.ts',
    linesOfCode: 300,
    typesRemoved: 8,
    typesAdded: 6,
    lastUpdated: '2024-01-15',
    notes: '更新TestInfo接口使用统一类型'
  },
  {
    id: 'service-adapter',
    name: 'backgroundTestManagerAdapter',
    type: 'service',
    status: 'completed',
    progress: 100,
    description: '后台测试管理适配器',
    filePath: 'frontend/services/api/managers/backgroundTestManagerAdapter.ts',
    linesOfCode: 500,
    typesRemoved: 20,
    typesAdded: 8,
    lastUpdated: '2024-01-15',
    notes: '完整的适配器模式实现'
  },

  // 类型系统
  {
    id: 'types-system',
    name: '统一类型系统',
    type: 'type',
    status: 'completed',
    progress: 100,
    description: '完整的TypeScript类型定义',
    filePath: 'frontend/types/',
    linesOfCode: 1200,
    typesRemoved: 0,
    typesAdded: 180,
    lastUpdated: '2024-01-15',
    notes: '180+个类型定义，覆盖所有领域'
  }
];

/**
 * 迁移进度跟踪组件
 */
export const MigrationProgress: React.FC<MigrationProgressProps> = ({
  showDetails = true,
  size = 'md',
  interactive = true,
  className = '',
  'data-testid': testId = 'migration-progress',
  ...props
}) => {
  const [selectedType, setSelectedType] = useState<MigrationItemType | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // 计算统计数据
  const stats = {
    total: MIGRATION_DATA.length,
    completed: MIGRATION_DATA.filter(item => item.status === 'completed').length,
    inProgress: MIGRATION_DATA.filter(item => item.status === 'in-progress').length,
    pending: MIGRATION_DATA.filter(item => item.status === 'pending').length,
    blocked: MIGRATION_DATA.filter(item => item.status === 'blocked').length,
    totalLinesOfCode: MIGRATION_DATA.reduce((sum, item) => sum + item.linesOfCode, 0),
    totalTypesRemoved: MIGRATION_DATA.reduce((sum, item) => sum + item.typesRemoved, 0),
    totalTypesAdded: MIGRATION_DATA.reduce((sum, item) => sum + item.typesAdded, 0),
    overallProgress: Math.round(MIGRATION_DATA.reduce((sum, item) => sum + item.progress, 0) / MIGRATION_DATA.length)
  };

  // 按类型分组
  const groupedData = {
    hook: MIGRATION_DATA.filter(item => item.type === 'hook'),
    component: MIGRATION_DATA.filter(item => item.type === 'component'),
    service: MIGRATION_DATA.filter(item => item.type === 'service'),
    type: MIGRATION_DATA.filter(item => item.type === 'type')
  };

  // 过滤数据
  const filteredData = selectedType === 'all' ? MIGRATION_DATA : groupedData[selectedType];

  // 获取状态图标
  const getStatusIcon = (status: MigrationStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-500" />;
      case 'blocked':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  // 获取类型图标
  const getTypeIcon = (type: MigrationItemType) => {
    switch (type) {
      case 'hook':
        return <Code className="w-4 h-4" />;
      case 'component':
        return <Layers className="w-4 h-4" />;
      case 'service':
        return <Database className="w-4 h-4" />;
      case 'type':
        return <FileText className="w-4 h-4" />;
    }
  };

  // 获取进度条颜色
  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  return (
    <div 
      className={`bg-gray-900 border border-gray-700 rounded-xl p-6 ${className}`}
      data-testid={testId}
      {...props}
    >
      {/* 头部 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">类型系统迁移进度</h2>
        <p className="text-gray-400">
          Test-Web项目统一类型系统迁移状态跟踪
        </p>
      </div>

      {/* 总体统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-400">{stats.overallProgress}%</div>
          <div className="text-sm text-gray-400">总体进度</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-400">{stats.completed}/{stats.total}</div>
          <div className="text-sm text-gray-400">已完成</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-400">{stats.totalTypesRemoved}</div>
          <div className="text-sm text-gray-400">移除类型</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-2xl font-bold text-cyan-400">{stats.totalTypesAdded}</div>
          <div className="text-sm text-gray-400">新增类型</div>
        </div>
      </div>

      {/* 类型过滤器 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'hook', 'component', 'service', 'type'] as const).map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`
              px-3 py-1 rounded-lg text-sm font-medium transition-colors
              ${selectedType === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
            `}
          >
            {type === 'all' ? '全部' : 
             type === 'hook' ? 'Hook' :
             type === 'component' ? '组件' :
             type === 'service' ? '服务' : '类型'}
            <span className="ml-1 text-xs opacity-75">
              ({type === 'all' ? stats.total : groupedData[type as MigrationItemType]?.length || 0})
            </span>
          </button>
        ))}
      </div>

      {/* 迁移项目列表 */}
      <div className="space-y-3">
        {filteredData.map(item => (
          <div
            key={item.id}
            className={`
              bg-gray-800 border border-gray-700 rounded-lg p-4 transition-all
              ${interactive ? 'hover:border-gray-600 cursor-pointer' : ''}
              ${selectedItem === item.id ? 'border-blue-500 bg-blue-500/5' : ''}
            `}
            onClick={() => interactive && setSelectedItem(selectedItem === item.id ? null : item.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                {getStatusIcon(item.status)}
                {getTypeIcon(item.type)}
                <div>
                  <h3 className="font-semibold text-white">{item.name}</h3>
                  <p className="text-sm text-gray-400">{item.description}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-white">{item.progress}%</div>
                <div className="text-xs text-gray-400">{item.linesOfCode} 行</div>
              </div>
            </div>

            {/* 进度条 */}
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(item.progress)}`}
                style={{ width: `${item.progress}%` }}
              />
            </div>

            {/* 详细信息 */}
            {showDetails && selectedItem === item.id && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><span className="text-gray-400">文件路径:</span> <code className="text-blue-400">{item.filePath}</code></p>
                    <p><span className="text-gray-400">最后更新:</span> {item.lastUpdated}</p>
                    <p><span className="text-gray-400">移除类型:</span> <span className="text-red-400">{item.typesRemoved}</span></p>
                    <p><span className="text-gray-400">新增类型:</span> <span className="text-green-400">{item.typesAdded}</span></p>
                  </div>
                  <div>
                    {item.notes && (
                      <p><span className="text-gray-400">备注:</span> {item.notes}</p>
                    )}
                    {item.blockers && item.blockers.length > 0 && (
                      <div>
                        <span className="text-gray-400">阻塞因素:</span>
                        <ul className="list-disc list-inside text-red-400 mt-1">
                          {item.blockers.map((blocker, index) => (
                            <li key={index}>{blocker}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 底部总结 */}
      <div className="mt-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <h3 className="font-semibold text-white mb-2">迁移总结</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400">总代码行数: <span className="text-white">{stats.totalLinesOfCode.toLocaleString()}</span></p>
            <p className="text-gray-400">已完成项目: <span className="text-green-400">{stats.completed}</span></p>
          </div>
          <div>
            <p className="text-gray-400">进行中项目: <span className="text-blue-400">{stats.inProgress}</span></p>
            <p className="text-gray-400">待处理项目: <span className="text-gray-400">{stats.pending}</span></p>
          </div>
          <div>
            <p className="text-gray-400">阻塞项目: <span className="text-red-400">{stats.blocked}</span></p>
            <p className="text-gray-400">类型净增长: <span className="text-cyan-400">+{stats.totalTypesAdded - stats.totalTypesRemoved}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationProgress;
