/**
 * 测试工具中心
 * 统一的测试工具入口和管理界面
 */

import React from 'react';
import {Link} from 'react-router-dom';
import { 
  Zap, Monitor, Server, Gauge, Shield, 
  // Search, Activity, User, Globe 
} from 'lucide-react'; // 已修复
const TestToolsHub: React.FC = () => {
  const testTools = [
    { id: 'api', name: 'API测试', icon: Zap, path: '/testing/api', color: 'blue' },
    { id: 'compatibility', name: '兼容性测试', icon: Monitor, path: '/testing/compatibility', color: 'green' },
    { id: 'infrastructure', name: '基础设施测试', icon: Server, path: '/testing/infrastructure', color: 'purple' },
    { id: 'performance', name: '性能测试', icon: Gauge, path: '/testing/performance', color: 'orange' },
    { id: 'security', name: '安全测试', icon: Shield, path: '/testing/security', color: 'red' },
    { id: 'seo', name: 'SEO测试', icon: Search, path: '/testing/seo', color: 'indigo' },
    { id: 'stress', name: '压力测试', icon: Activity, path: '/testing/stress', color: 'pink' },
    { id: 'ux', name: 'UX测试', icon: User, path: '/testing/ux', color: 'teal' },
    { id: 'website', name: '网站测试', icon: Globe, path: '/testing/website', color: 'cyan' }
  ];

  return (
    <div className="test-tools-hub max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          测试工具中心
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          选择需要的测试工具来检测和优化您的网站
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testTools.map(tool => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.id}
              to={tool.path}
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg bg-${tool.color}-100 dark:bg-${tool.color}-900`}>
                  <Icon className={`w-6 h-6 text-${tool.color}-600 dark:text-${tool.color}-400`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {tool.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    点击开始测试
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default TestToolsHub;