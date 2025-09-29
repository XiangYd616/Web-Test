/**
 * 测试工具集页面
 * 整合所有测试工具和实用功能
 */

import React, { useState } from 'react';
import { 
  Tools, 
  Database, 
  Clock, 
  FileText, 
  BarChart3, 
  Shield, 
  Search, 
  Zap,
  Globe,
  Code,
  Settings,
  ArrowRight,
  Star,
  TrendingUp,
  Target,
  Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface TestTool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  category: string;
  featured: boolean;
  status: 'available' | 'beta' | 'coming-soon';
}

const TestToolsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 测试工具定义
  const testTools: TestTool[] = [
    {
      id: 'website-test',
      name: '网站测试',
      description: '全面的网站性能、安全性和可用性测试',
      icon: Globe,
      path: '/website-test',
      category: 'testing',
      featured: true,
      status: 'available'
    },
    {
      id: 'performance-test',
      name: '性能测试',
      description: '网站加载速度、响应时间和性能优化建议',
      icon: Zap,
      path: '/performance-test',
      category: 'testing',
      featured: true,
      status: 'available'
    },
    {
      id: 'security-test',
      name: '安全测试',
      description: '网站安全漏洞扫描和安全配置检测',
      icon: Shield,
      path: '/security-test',
      category: 'testing',
      featured: true,
      status: 'available'
    },
    {
      id: 'seo-test',
      name: 'SEO测试',
      description: '搜索引擎优化分析和建议',
      icon: Search,
      path: '/seo-test',
      category: 'testing',
      featured: true,
      status: 'available'
    },
    {
      id: 'api-test',
      name: 'API测试',
      description: '接口测试、性能测试和文档生成',
      icon: Code,
      path: '/api-test',
      category: 'testing',
      featured: false,
      status: 'available'
    },
    {
      id: 'data-generator',
      name: '测试数据生成器',
      description: '生成各种类型的测试数据',
      icon: Database,
      path: '/test-data-generator',
      category: 'tools',
      featured: true,
      status: 'available'
    },
    {
      id: 'scheduled-tasks',
      name: '定时任务管理',
      description: '自动化测试调度和监控',
      icon: Clock,
      path: '/scheduled-tasks',
      category: 'automation',
      featured: true,
      status: 'available'
    },
    {
      id: 'batch-testing',
      name: '批量测试',
      description: '批量URL测试和结果对比分析',
      icon: Layers,
      path: '/batch-test',
      category: 'automation',
      featured: false,
      status: 'beta'
    },
    {
      id: 'reports',
      name: '测试报告',
      description: '生成详细的测试报告和数据可视化',
      icon: FileText,
      path: '/reports',
      category: 'reports',
      featured: false,
      status: 'available'
    },
    {
      id: 'analytics',
      name: '数据分析',
      description: '测试结果统计分析和趋势监控',
      icon: BarChart3,
      path: '/analytics',
      category: 'reports',
      featured: false,
      status: 'available'
    },
    {
      id: 'monitoring',
      name: '监控中心',
      description: '实时监控网站状态和性能指标',
      icon: TrendingUp,
      path: '/monitoring',
      category: 'monitoring',
      featured: false,
      status: 'available'
    },
    {
      id: 'test-optimization',
      name: '测试优化',
      description: '测试流程优化和最佳实践建议',
      icon: Target,
      path: '/test-optimizations',
      category: 'tools',
      featured: false,
      status: 'beta'
    }
  ];

  // 分类定义
  const categories = [
    { id: 'all', name: '全部工具', count: testTools.length },
    { id: 'testing', name: '核心测试', count: testTools.filter(t => t.category === 'testing').length },
    { id: 'tools', name: '辅助工具', count: testTools.filter(t => t.category === 'tools').length },
    { id: 'automation', name: '自动化', count: testTools.filter(t => t.category === 'automation').length },
    { id: 'reports', name: '报告分析', count: testTools.filter(t => t.category === 'reports').length },
    { id: 'monitoring', name: '监控', count: testTools.filter(t => t.category === 'monitoring').length }
  ];

  // 过滤工具
  const filteredTools = testTools.filter(tool => {
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 特色工具
  const featuredTools = testTools.filter(tool => tool.featured);

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'beta':
        return 'bg-blue-100 text-blue-800';
      case 'coming-soon':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return '可用';
      case 'beta':
        return '测试版';
      case 'coming-soon':
        return '即将推出';
      default:
        return '';
    }
  };

  // 处理工具点击
  const handleToolClick = (tool: TestTool) => {
    if (tool.status === 'coming-soon') {
      toast.info(`${tool.name} 即将推出，敬请期待！`);
      return;
    }

    // 对于beta版本给出提示
    if (tool.status === 'beta') {
      toast.info(`${tool.name} 正在测试中，可能存在不稳定因素`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Tools className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">测试工具集</h1>
                  <p className="text-sm text-gray-600">完整的网站测试工具和实用功能</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => toast.success('功能导览即将推出')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>功能导览</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 特色工具 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            特色工具
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredTools.map((tool) => (
              <Link
                key={tool.id}
                to={tool.path}
                onClick={() => handleToolClick(tool)}
                className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <tool.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {tool.name}
                      </h3>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {tool.description}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(tool.status)}`}>
                      {getStatusText(tool.status)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e?.target.value)}
              placeholder="搜索工具..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
            />
          </div>
        </div>

        {/* 工具网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <Link
              key={tool.id}
              to={tool.path}
              onClick={() => handleToolClick(tool)}
              className={`group bg-white rounded-lg shadow-sm border p-6 transition-all duration-200 ${
                tool.status === 'coming-soon'
                  ? 'opacity-75 cursor-not-allowed'
                  : 'hover:shadow-md hover:border-blue-300'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg transition-colors ${
                  tool.status === 'coming-soon'
                    ? 'bg-gray-100'
                    : 'bg-blue-100 group-hover:bg-blue-200'
                }`}>
                  <tool.icon className={`w-6 h-6 ${
                    tool.status === 'coming-soon'
                      ? 'text-gray-400'
                      : 'text-blue-600'
                  }`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-semibold transition-colors ${
                      tool.status === 'coming-soon'
                        ? 'text-gray-500'
                        : 'text-gray-900 group-hover:text-blue-600'
                    }`}>
                      {tool.name}
                    </h3>
                    {tool.status !== 'coming-soon' && (
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    )}
                  </div>
                  
                  <p className={`text-sm mb-3 ${
                    tool.status === 'coming-soon'
                      ? 'text-gray-400'
                      : 'text-gray-600'
                  }`}>
                    {tool.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(tool.status)}`}>
                      {getStatusText(tool.status)}
                    </span>
                    
                    {tool.featured && (
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* 无结果 */}
        {filteredTools.length === 0 && (
          <div className="text-center py-12">
            <Tools className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              没有找到匹配的工具
            </h3>
            <p className="text-gray-600">
              尝试调整搜索条件或选择不同的分类
            </p>
          </div>
        )}

        {/* 底部信息 */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Tools className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                持续更新
              </h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• 我们会持续添加更多实用的测试工具和功能</p>
                <p>• 所有工具都经过精心设计，确保易用性和准确性</p>
                <p>• 如果您需要特定的测试工具，请联系我们</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestToolsPage;
