/**
 * 测试模板管理页面
 * 为高级用户提供测试模板创建、管理和复用功能
 */

import React, { useState, useEffect } from 'react';
import {Plus, Search, Copy, Edit, Play, Star, User, Upload, BookOpen, Code, Zap, Shield, Globe, Database, MoreVertical} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TestTemplate {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'security' | 'api' | 'ui' | 'compatibility' | 'stress' | 'seo';
  type: 'standard' | 'custom' | 'advanced';
  author: string;
  authorId: string;
  isPublic: boolean;
  isFavorite: boolean;
  usageCount: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
  lastUsed: string;
  tags: string[];
  configuration: {
    [key: string]: unknown;
  };
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    defaultValue?: unknown;
    description: string;
  }>;
}

const TestTemplates: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TestTemplate | null>(null);

  // 模拟数据加载
  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockTemplates: TestTemplate[] = [
        {
          id: '1',
          name: 'Web应用性能基准测试',
          description: '标准的Web应用性能测试模板，包括页面加载时间、资源大小、响应时间等核心指标',
          category: 'performance',
          type: 'standard',
          author: '系统管理�?,
          authorId: 'admin',
          isPublic: true,
          isFavorite: true,
          usageCount: 156,
          rating: 4.8,
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: '2024-09-01T00:00:00Z',
          lastUsed: '2025-09-16T10:30:00Z',
          tags: ['性能', '基准测试', 'Web', '标准'],
          configuration: {
            timeout: Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 30000,
            retries: 3,
            concurrency: 5,
            metrics: ['loading_time', 'first_contentful_paint', 'largest_contentful_paint']
          },
          parameters: [
            {
              name: 'targetUrl',
              type: 'string',
              required: true,
              description: '目标测试URL'
            },
            {
              name: 'testDuration',
              type: 'number',
              required: false,
              defaultValue: 60,
              description: '测试持续时间（秒�?
            }
          ]
        },
        {
          id: '2',
          name: 'OWASP安全扫描套件',
          description: 'OWASP Top 10安全漏洞检测模板，全面检查SQL注入、XSS、CSRF等常见安全问�?,
          category: 'security',
          type: 'advanced',
          author: '安全团队',
          authorId: 'security-team',
          isPublic: true,
          isFavorite: false,
          usageCount: 89,
          rating: 4.9,
          createdAt: '2024-02-20T00:00:00Z',
          updatedAt: '2024-08-15T00:00:00Z',
          lastUsed: '2025-09-15T16:20:00Z',
          tags: ['安全', 'OWASP', '漏洞扫描', '高级'],
          configuration: {
            scanDepth: 'deep',
            skipTests: [],
            includePassive: true,
            reportLevel: 'detailed'
          },
          parameters: [
            {
              name: 'baseUrl',
              type: 'string',
              required: true,
              description: '基础URL'
            },
            {
              name: 'authToken',
              type: 'string',
              required: false,
              description: '认证令牌（如需要）'
            }
          ]
        },
        {
          id: '3',
          name: 'RESTful API完整性测�?,
          description: '全面的REST API测试模板，涵盖CRUD操作、状态码验证、响应格式检查等',
          category: 'api',
          type: 'standard',
          author: '开发团�?,
          authorId: 'dev-team',
          isPublic: true,
          isFavorite: true,
          usageCount: 234,
          rating: 4.7,
          createdAt: '2024-03-10T00:00:00Z',
          updatedAt: '2024-09-10T00:00:00Z',
          lastUsed: '2025-09-16T09:00:00Z',
          tags: ['API', 'REST', 'CRUD', '集成测试'],
          configuration: {
            baseUrl: '',
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000,
            validateSchema: true
          },
          parameters: [
            {
              name: 'apiBaseUrl',
              type: 'string',
              required: true,
              description: 'API基础URL'
            },
            {
              name: 'endpoints',
              type: 'array',
              required: true,
              description: '要测试的端点列表'
            }
          ]
        },
        {
          id: '4',
          name: 'SEO综合优化检�?,
          description: '全面的SEO检查模板，包括页面标题、元数据、结构化数据、页面速度等SEO要素',
          category: 'seo',
          type: 'custom',
          author: user?.username || '当前用户',
          authorId: user?.id || 'current-user',
          isPublic: false,
          isFavorite: false,
          usageCount: 45,
          rating: 4.5,
          createdAt: '2024-06-05T00:00:00Z',
          updatedAt: '2024-09-12T00:00:00Z',
          lastUsed: '2025-09-14T14:30:00Z',
          tags: ['SEO', '优化', '搜索引擎', '自定�?],
          configuration: {
            checkMetaTags: true,
            checkImages: true,
            checkLinks: true,
            checkStructuredData: true,
            mobileOptimization: true
          },
          parameters: [
            {
              name: 'websiteUrl',
              type: 'string',
              required: true,
              description: '网站URL'
            },
            {
              name: 'includeSubpages',
              type: 'boolean',
              required: false,
              defaultValue: false,
              description: '是否包含子页�?
            }
          ]
        }
      ];

      setTemplates(mockTemplates);
      setLoading(false);
    };

    loadTemplates();
  }, [user]);

  // 获取分类图标和颜�?
  const getCategoryInfo = (category: string) => {
    const categoryMap = {
      performance: { icon: Zap, color: 'text-yellow-600 bg-yellow-100', label: '性能测试' },
      security: { icon: Shield, color: 'text-red-600 bg-red-100', label: '安全测试' },
      api: { icon: Code, color: 'text-blue-600 bg-blue-100', label: 'API测试' },
      ui: { icon: Globe, color: 'text-green-600 bg-green-100', label: 'UI测试' },
      compatibility: { icon: Globe, color: 'text-purple-600 bg-purple-100', label: '兼容性测�? },
      stress: { icon: Zap, color: 'text-orange-600 bg-orange-100', label: '压力测试' },
      seo: { icon: Globe, color: 'text-indigo-600 bg-indigo-100', label: 'SEO测试' },
      database: { icon: Database, color: 'text-gray-600 bg-gray-100', label: '数据库测�? }
    };
    return categoryMap[category as keyof typeof categoryMap] || categoryMap.api;
  };

  // 获取类型标签颜色
  const getTypeColor = (type: string) => {
    const colors = {
      standard: 'text-blue-700 bg-blue-50 border-blue-200',
      custom: 'text-purple-700 bg-purple-50 border-purple-200',
      advanced: 'text-orange-700 bg-orange-50 border-orange-200'
    };
    return colors[type as keyof typeof colors] || colors.standard;
  };

  // 过滤模板
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesType = selectedType === 'all' || template.type === selectedType;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  // 分类选项
  const categories = [
    { value: 'all', label: '全部分类' },
    { value: 'performance', label: '性能测试' },
    { value: 'security', label: '安全测试' },
    { value: 'api', label: 'API测试' },
    { value: 'ui', label: 'UI测试' },
    { value: 'seo', label: 'SEO测试' },
    { value: 'stress', label: '压力测试' }
  ];

  // 类型选项
  const types = [
    { value: 'all', label: '全部类型' },
    { value: 'standard', label: '标准模板' },
    { value: 'custom', label: '自定义模�? },
    { value: 'advanced', label: '高级模板' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载测试模板...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">测试模板管理</h1>
              <p className="mt-2 text-gray-600">创建、管理和复用测试配置模板</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                导入模板
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                创建模板
              </button>
            </div>
          </div>
        </div>

        {/* 搜索和过滤器 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e?.target.value)}
                  placeholder="搜索模板..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-64"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e?.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e?.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {types.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>�?{filteredTemplates.length} 个模�?/span>
              </div>
              <div className="flex items-center border border-gray-300 rounded-md">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  网格
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  列表
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 模板展示 */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const categoryInfo = getCategoryInfo(template.category);
              return (
                <div key={template.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${categoryInfo.color}`}>
                        <categoryInfo.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-1">{template.name}</h3>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium border rounded-full ${getTypeColor(template.type)}`}>
                            {template.type === 'standard' ? '标准' : template.type === 'custom' ? '自定�? : '高级'}
                          </span>
                          {template.isFavorite && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                        </div>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">{template.description}</p>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {template.author}
                      </span>
                      <span className="flex items-center">
                        <Play className="h-3 w-3 mr-1" />
                        {template.usageCount}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Star className="h-3 w-3 text-yellow-500 fill-current mr-1" />
                      <span>{template.rating}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        +{template.tags.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      更新�?{new Date(template.updatedAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button className="p-1 text-gray-600 hover:text-blue-600">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-gray-600 hover:text-green-600">
                        <Play className="h-4 w-4" />
                      </button>
                      {template.authorId === user?.id && (
                        <button className="p-1 text-gray-600 hover:text-orange-600">
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      模板名称
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      分类/类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      作�?
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      使用次数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      评分
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      更新时间
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTemplates.map((template) => {
                    const categoryInfo = getCategoryInfo(template.category);
                    return (
                      <tr key={template.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg ${categoryInfo.color} mr-3`}>
                              <categoryInfo.icon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{template.name}</div>
                              <div className="text-sm text-gray-500">{template.description.slice(0, 60)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryInfo.color}`}>
                              {categoryInfo.label}
                            </span>
                            <div className="mt-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium border rounded-full ${getTypeColor(template.type)}`}>
                                {template.type === 'standard' ? '标准' : template.type === 'custom' ? '自定�? : '高级'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {template.author}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {template.usageCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
                            <span className="text-sm text-gray-900">{template.rating}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(template.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <Copy className="h-4 w-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              <Play className="h-4 w-4" />
                            </button>
                            {template.authorId === user?.id && (
                              <button className="text-orange-600 hover:text-orange-900">
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 空状�?*/}
        {filteredTemplates.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">没有找到匹配的模�?/h3>
            <p className="text-gray-500 mb-6">
              尝试调整搜索条件或创建新的测试模�?
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              创建第一个模�?
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestTemplates;
