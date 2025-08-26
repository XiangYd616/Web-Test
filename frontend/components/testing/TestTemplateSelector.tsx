import { Bookmark, BookmarkCheck, Clock, Plus, Search, Star, Tag, TrendingUp } from 'lucide-react';
import type { useEffect, useState, FC } from 'react';
import { TestTemplate, TestTemplateService } from '../../services/testTemplates';

export interface TestTemplateSelectorProps {
  onSelectTemplate: (template: TestTemplate) => void;
  selectedTemplateId?: string;
  testType?: string;
  category?: string;
  className?: string;
}

const TestTemplateSelector: React.FC<TestTemplateSelectorProps> = ({
  onSelectTemplate,
  selectedTemplateId,
  testType,
  category,
  className = ''
}) => {
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<TestTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');
  const [selectedTestType, setSelectedTestType] = useState(testType || 'all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadFavorites();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory, selectedTestType, showFavorites]);

  const loadTemplates = () => {
    const allTemplates = TestTemplateService.getAllTemplates();
    setTemplates(allTemplates);
  };

  const loadFavorites = () => {
    try {
      const stored = localStorage.getItem('favorite_templates');
      setFavorites(stored ? JSON.parse(stored) : []);
    } catch {
      setFavorites([]);
    }
  };

  const saveFavorites = (newFavorites: string[]) => {
    setFavorites(newFavorites);
    localStorage.setItem('favorite_templates', JSON.stringify(newFavorites));
  };

  const filterTemplates = () => {
    let filtered = templates;

    // 搜索过滤
    if (searchQuery) {
      filtered = TestTemplateService.searchTemplates(searchQuery);
    }

    // 类别过滤
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (selectedTestType !== 'all') {
      filtered = filtered.filter(t => t.testType === selectedTestType);
    }

    // 收藏过滤
    if (showFavorites) {
      filtered = filtered.filter(t => favorites.includes(t.id));
    }

    setFilteredTemplates(filtered);
  };

  const toggleFavorite = (templateId: string) => {
    const newFavorites = favorites.includes(templateId)
      ? favorites.filter(id => id !== templateId)
      : [...favorites, templateId];
    saveFavorites(newFavorites);
  };

  const handleSelectTemplate = (template: TestTemplate) => {
    TestTemplateService.incrementTemplateUsage(template.id);
    onSelectTemplate(template);
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      ecommerce: '🛒',
      blog: '📝',
      corporate: '🏢',
      saas: '☁️',
      portfolio: '🎨',
      news: '📰',
      custom: '⚙️'
    };
    return icons[category] || '📄';
  };

  const getTestTypeColor = (testType: string) => {
    const colors: Record<string, string> = {
      stress: 'bg-red-100 text-red-800',
      content: 'bg-green-100 text-green-800',
      compatibility: 'bg-blue-100 text-blue-800',
      api: 'bg-purple-100 text-purple-800',
      security: 'bg-orange-100 text-orange-800',
      performance: 'bg-yellow-100 text-yellow-800',
      comprehensive: 'bg-indigo-100 text-indigo-800'
    };
    return colors[testType] || 'bg-gray-100 text-gray-800';
  };

  const categories = [
    { value: 'all', label: '全部类别' },
    { value: 'ecommerce', label: '电商网站' },
    { value: 'blog', label: '博客网站' },
    { value: 'corporate', label: '企业官网' },
    { value: 'saas', label: 'SaaS应用' },
    { value: 'portfolio', label: '作品集' },
    { value: 'news', label: '新闻网站' },
    { value: 'custom', label: '自定义' }
  ];

  const testTypes = [
    { value: 'all', label: '全部类型' },
    { value: 'stress', label: '压力测试' },
    { value: 'content', label: '内容检测' },
    { value: 'compatibility', label: '兼容性测试' },
    { value: 'api', label: 'API测试' },
    { value: 'security', label: '安全测试' },
    { value: 'performance', label: '性能测试' },
    { value: 'comprehensive', label: '综合测试' }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 搜索和过滤 */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* 搜索框 */}
          <div className="relative flex-1 lg:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索模板..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 过滤器 */}
          <div className="flex items-center space-x-4">
            <label htmlFor="category-select" className="sr-only">选择分类</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="选择模板分类"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <label htmlFor="test-type-select" className="sr-only">选择测试类型</label>
            <select
              id="test-type-select"
              value={selectedTestType}
              onChange={(e) => setSelectedTestType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="选择测试类型"
            >
              {testTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowFavorites(!showFavorites)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${showFavorites
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {showFavorites ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              <span>收藏</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>创建模板</span>
            </button>
          </div>
        </div>
      </div>

      {/* 模板列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`bg-white rounded-xl shadow-sm border-2 transition-all cursor-pointer hover:shadow-md ${selectedTemplateId === template.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-100 hover:border-gray-300'
              }`}
            onClick={() => handleSelectTemplate(template)}
          >
            <div className="p-6">
              {/* 头部 */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getCategoryIcon(template.category)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${getTestTypeColor(template.testType)}`}>
                      {testTypes.find(t => t.value === template.testType)?.label}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(template.id);
                  }}
                  className={`p-2 rounded-lg transition-colors ${favorites.includes(template.id)
                    ? 'text-yellow-600 bg-yellow-100'
                    : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                    }`}
                  aria-label={favorites.includes(template.id) ? `取消收藏 ${template.name}` : `收藏 ${template.name}`}
                  title={favorites.includes(template.id) ? `取消收藏 ${template.name}` : `收藏 ${template.name}`}
                >
                  <Star className={`w-4 h-4 ${favorites.includes(template.id) ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* 描述 */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>

              {/* 标签 */}
              <div className="flex flex-wrap gap-2 mb-4">
                {template.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </span>
                ))}
                {template.tags.length > 3 && (
                  <span className="text-xs text-gray-500">+{template.tags.length - 3}</span>
                )}
              </div>

              {/* 底部信息 */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>{template.usage}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{template.isDefault ? '官方' : '自定义'}</span>
                  </div>
                </div>
                {template.isDefault && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    推荐
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 空状态 */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">未找到匹配的模板</h3>
          <p className="text-gray-600 mb-4">尝试调整搜索条件或创建新的模板</p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>创建新模板</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TestTemplateSelector;
