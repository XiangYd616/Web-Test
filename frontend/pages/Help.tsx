import { BarChart3, Book, ChevronRight, Clock, Code, Download, FileText, Filter, HelpCircle, Mail, MessageCircle, Phone, Play, Search, Send, Shield, Tag, ThumbsDown, ThumbsUp, Users, Video, Zap } from 'lucide-react';
import { createElement, useEffect, useState } from 'react';
import type { ComponentType, FC } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { helpService } from '../services/helpService';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  helpful: number;
  notHelpful: number;
  lastUpdated: string;
}

interface GuideItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  estimatedTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  content?: GuideStep[];
  videoUrl?: string;
  downloadUrl?: string;
}

interface GuideStep {
  id: string;
  title: string;
  content: string;
  image?: string;
  code?: string;
}

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  videoUrl: string;
  category: string;
  views: number;
}

interface DownloadResource {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'doc' | 'zip' | 'json';
  size: string;
  downloadUrl: string;
  category: string;
  downloads: number;
}

interface FeedbackData {
  type: 'bug' | 'feature' | 'improvement' | 'question';
  title: string;
  description: string;
  email: string;
  priority: 'low' | 'medium' | 'high';
}

const Help: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'guides' | 'faq' | 'videos' | 'downloads' | 'contact'>('guides');
  const [selectedGuide, setSelectedGuide] = useState<GuideItem | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackData>({
    type: 'question',
    title: '',
    description: '',
    email: user?.email || '',
    priority: 'medium'
  });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [popularTerms, setPopularTerms] = useState<string[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  const categories = [
    { id: 'all', name: '全部', count: 24 },
    { id: 'getting-started', name: '快速开始', count: 6 },
    { id: 'testing', name: '测试功能', count: 8 },
    { id: 'monitoring', name: '监控告警', count: 4 },
    { id: 'api', name: 'API集成', count: 3 },
    { id: 'billing', name: '计费订阅', count: 3 }
  ];

  const guides: GuideItem[] = [
    {
      id: 'quick-start',
      title: '快速开始指南',
      description: '5分钟内完成第一次网站测试',
      icon: Play,
      color: 'blue',
      estimatedTime: '5分钟',
      difficulty: 'beginner'
    },
    {
      id: 'security-testing',
      title: '安全检测最佳实践',
      description: '全面的网站安全检测和漏洞扫描',
      icon: Shield,
      color: 'red',
      estimatedTime: '15分钟',
      difficulty: 'intermediate'
    },
    {
      id: 'performance-optimization',
      title: '性能优化指南',
      description: '提升网站性能和用户体验',
      icon: Zap,
      color: 'yellow',
      estimatedTime: '20分钟',
      difficulty: 'intermediate'
    },
    {
      id: 'monitoring-setup',
      title: '监控告警配置',
      description: '设置7x24小时网站监控',
      icon: BarChart3,
      color: 'green',
      estimatedTime: '10分钟',
      difficulty: 'beginner'
    },
    {
      id: 'api-integration',
      title: 'API集成开发',
      description: '将测试功能集成到您的工作流',
      icon: Code,
      color: 'purple',
      estimatedTime: '30分钟',
      difficulty: 'advanced'
    },
    {
      id: 'team-collaboration',
      title: '团队协作功能',
      description: '多人协作和权限管理',
      icon: Users,
      color: 'indigo',
      estimatedTime: '12分钟',
      difficulty: 'intermediate'
    }
  ];

  const faqs: FAQItem[] = [
    {
      id: 'what-is-test-web-app',
      question: 'Test Web App 是什么？',
      answer: 'Test Web App 是一个专业的网站测试平台，提供性能测试、安全检测、SEO分析、兼容性测试等全方位的网站质量检测服务。我们致力于帮助开发者和企业提升网站质量，确保最佳的用户体验。',
      category: 'getting-started',
      tags: ['平台介绍', '功能概述', '网站测试'],
      helpful: 45,
      notHelpful: 2,
      lastUpdated: '2025-01-15'
    },
    {
      id: 'how-to-start-testing',
      question: '如何开始第一次测试？',
      answer: '开始测试非常简单：\n\n1. 在测试页面输入您的网站URL\n2. 选择需要的测试类型（性能、安全、SEO等）\n3. 配置测试参数（可选）\n4. 点击"开始测试"按钮\n5. 等待测试完成并查看详细结果报告\n\n首次测试建议选择"综合测试"以获得全面的网站评估。',
      category: 'getting-started',
      tags: ['快速开始', '测试流程', '新手指南'],
      helpful: 38,
      notHelpful: 1,
      lastUpdated: '2025-01-10'
    },
    {
      id: 'test-types-available',
      question: '支持哪些类型的测试？',
      answer: '我们提供全面的测试服务：\n\n• 性能测试：页面加载速度、Core Web Vitals\n• 安全检测：漏洞扫描、SSL证书检查\n• SEO分析：搜索引擎优化建议\n• 兼容性测试：多浏览器、多设备测试\n• API测试：接口功能和性能测试\n• 可访问性检测：WCAG合规性检查\n• 内容分析：文本质量、图片优化\n• 移动端优化：响应式设计检测',
      category: 'testing',
      tags: ['测试类型', '功能列表', '测试范围'],
      helpful: 52,
      notHelpful: 3,
      lastUpdated: '2025-01-12'
    },
    {
      id: 'monitoring-frequency',
      question: '监控检查的频率是多少？',
      answer: '监控频率根据您的订阅计划而定：\n\n• 免费版：每小时检查一次\n• 基础版：每30分钟检查一次\n• 专业版：每5分钟检查一次\n• 企业版：每分钟检查一次（可自定义）\n\n您可以在设置中调整监控频率，也可以设置特定时间段的监控策略。',
      category: 'monitoring',
      tags: ['监控频率', '订阅计划', '实时监控'],
      helpful: 29,
      notHelpful: 1,
      lastUpdated: '2025-01-08'
    },
    {
      id: 'api-rate-limits',
      question: 'API调用有频率限制吗？',
      answer: 'API调用限制如下：\n\n• 免费用户：每小时100次调用\n• 基础版：每小时500次调用\n• 专业版：每小时2000次调用\n• 企业版：每小时10000次调用\n\n超出限制后会返回429状态码，建议实现重试机制。企业用户可申请更高的调用限制。',
      category: 'api',
      tags: ['API限制', '调用频率', '开发者'],
      helpful: 33,
      notHelpful: 2,
      lastUpdated: '2025-01-05'
    },
    {
      id: 'data-retention',
      question: '测试数据保存多长时间？',
      answer: '数据保存期限：\n\n• 免费版：保存30天\n• 基础版：保存90天\n• 专业版：保存1年\n• 企业版：可自定义保存时间（最长5年）\n\n您可以随时导出历史数据，支持JSON、CSV、Excel等格式。重要数据建议定期备份。',
      category: 'billing',
      tags: ['数据保存', '历史记录', '数据导出'],
      helpful: 41,
      notHelpful: 0,
      lastUpdated: '2025-01-03'
    }
  ];

  // 视频教程数据
  const videoTutorials: VideoTutorial[] = [
    {
      id: 'getting-started-video',
      title: '快速开始 - 5分钟上手指南',
      description: '从注册到完成第一次测试的完整流程演示',
      duration: '5:32',
      thumbnail: '/api/placeholder/320/180',
      videoUrl: 'https://example.com/videos/getting-started',
      category: 'getting-started',
      views: 1250
    },
    {
      id: 'performance-testing-deep-dive',
      title: '性能测试深度解析',
      description: '详细讲解性能测试指标和优化建议',
      duration: '12:45',
      thumbnail: '/api/placeholder/320/180',
      videoUrl: 'https://example.com/videos/performance-testing',
      category: 'testing',
      views: 890
    },
    {
      id: 'security-scanning-tutorial',
      title: '安全扫描功能详解',
      description: '如何使用安全扫描功能发现和修复漏洞',
      duration: '8:20',
      thumbnail: '/api/placeholder/320/180',
      videoUrl: 'https://example.com/videos/security-scanning',
      category: 'testing',
      views: 675
    },
    {
      id: 'api-integration-guide',
      title: 'API集成开发指南',
      description: '如何将Test Web App API集成到您的项目中',
      duration: '15:10',
      thumbnail: '/api/placeholder/320/180',
      videoUrl: 'https://example.com/videos/api-integration',
      category: 'api',
      views: 432
    }
  ];

  // 下载资源数据
  const downloadResources: DownloadResource[] = [
    {
      id: 'api-documentation',
      title: 'API 完整文档',
      description: '包含所有API接口的详细说明和示例代码',
      type: 'pdf',
      size: '2.5 MB',
      downloadUrl: '/downloads/api-documentation.pdf',
      category: 'api',
      downloads: 1580
    },
    {
      id: 'testing-checklist',
      title: '网站测试检查清单',
      description: '全面的网站测试检查清单，确保不遗漏任何重要测试项',
      type: 'pdf',
      size: '1.2 MB',
      downloadUrl: '/downloads/testing-checklist.pdf',
      category: 'testing',
      downloads: 2340
    },
    {
      id: 'performance-optimization-guide',
      title: '性能优化实战指南',
      description: '详细的网站性能优化策略和最佳实践',
      type: 'pdf',
      size: '3.8 MB',
      downloadUrl: '/downloads/performance-guide.pdf',
      category: 'testing',
      downloads: 1890
    },
    {
      id: 'security-best-practices',
      title: '网站安全最佳实践',
      description: '网站安全防护的完整指南和实施建议',
      type: 'pdf',
      size: '2.1 MB',
      downloadUrl: '/downloads/security-practices.pdf',
      category: 'testing',
      downloads: 1120
    },
    {
      id: 'postman-collection',
      title: 'Postman API 集合',
      description: '可直接导入Postman的API测试集合',
      type: 'json',
      size: '45 KB',
      downloadUrl: '/downloads/postman-collection.json',
      category: 'api',
      downloads: 890
    }
  ];

  // 加载热门搜索词
  useEffect(() => {
    const loadPopularTerms = async () => {
      try {
        const terms = await helpService.getPopularSearchTerms();
        setPopularTerms(terms);
      } catch (error) {
        console.error('加载热门搜索词失败:', error);
      }
    };
    loadPopularTerms();
  }, []);

  // 实时搜索功能
  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        try {
          // 使用真实的搜索服务
          const results = await helpService.searchContent(searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error('搜索失败:', error);
          // 降级到本地搜索
          const localResults = [
            ...faqs.filter(faq =>
              faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
              faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
              faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
            ).map(item => ({ ...item, type: 'faq' })),
            ...guides.filter(guide =>
              guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              guide.description.toLowerCase().includes(searchQuery.toLowerCase())
            ).map(item => ({ ...item, type: 'guide' })),
            ...videoTutorials.filter(video =>
              video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              video.description.toLowerCase().includes(searchQuery.toLowerCase())
            ).map(item => ({ ...item, type: 'video' })),
            ...downloadResources.filter(resource =>
              resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              resource.description.toLowerCase().includes(searchQuery.toLowerCase())
            ).map(item => ({ ...item, type: 'download' }))
          ];
          setSearchResults(localResults);
        } finally {
          setIsSearching(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
    return undefined;
  }, [searchQuery]);

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // 反馈提交功能
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      await helpService.submitFeedback({
        ...feedbackData,
        userId: user?.id
      });

      alert('反馈提交成功！我们会尽快回复您。');
      setFeedbackData({
        type: 'question',
        title: '',
        description: '',
        email: user?.email || '',
        priority: 'medium'
      });
    } catch (error) {
      console.error('提交反馈失败:', error);
      alert('提交失败，请稍后重试。');
    } finally {
      setSubmitLoading(false);
    }
  };

  // FAQ有用性反馈
  const handleFAQFeedback = async (faqId: string, isHelpful: boolean) => {
    try {
      await helpService.submitFAQFeedback({
        faqId,
        isHelpful,
        userId: user?.id
      });

      alert(isHelpful ? '感谢您的反馈！' : '感谢反馈，我们会改进这个答案。');

      // 更新本地FAQ统计（可选）
      // 这里可以重新获取FAQ统计数据
    } catch (error) {
      console.error('反馈提交失败:', error);
      alert('反馈提交失败，请稍后重试。');
    }
  };

  // 下载资源
  const handleDownload = async (resource: DownloadResource) => {
    try {
      // 记录下载并获取实际下载链接
      const downloadUrl = await helpService.recordDownload({
        resourceId: resource.id,
        userId: user?.id
      });

      // 执行下载
      const link = document.createElement('a');
      link.href = downloadUrl || resource.downloadUrl;
      link.download = resource.title;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 可以显示下载成功提示
      console.log('下载开始:', resource.title);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请稍后重试。');
    }
  };

  // 视频播放处理
  const handleVideoPlay = async (video: VideoTutorial) => {
    try {
      await helpService.recordVideoView(video.id);
      // 这里可以打开视频播放器或跳转到视频页面
      window.open(video.videoUrl, '_blank');
    } catch (error) {
      console.error('记录视频观看失败:', error);
      // 即使记录失败也允许观看视频
      window.open(video.videoUrl, '_blank');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'intermediate': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'advanced': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getIconColor = (color: string) => {
    switch (color) {
      case 'blue': return 'text-blue-400 bg-blue-500/10 border border-blue-500/20';
      case 'red': return 'text-red-400 bg-red-500/10 border border-red-500/20';
      case 'yellow': return 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20';
      case 'green': return 'text-green-400 bg-green-500/10 border border-green-500/20';
      case 'purple': return 'text-purple-400 bg-purple-500/10 border border-purple-500/20';
      case 'indigo': return 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-3">帮助中心</h1>
          <p className="text-lg text-gray-300 mb-5">
            快速找到您需要的答案和指南
          </p>

          {/* 搜索框 */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索帮助文档、常见问题、视频教程..."
              className="w-full pl-12 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>

          {/* 搜索结果 */}
          {searchQuery && searchResults.length > 0 && (
            <div className="max-w-xl mx-auto mt-4 bg-gray-700/50 border border-gray-600 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-gray-600">
                <p className="text-sm text-gray-300">找到 {searchResults.length} 个结果</p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {searchResults.slice(0, 5).map((result, index) => (
                  <div key={index} className="p-3 hover:bg-gray-600/30 border-b border-gray-600/50 last:border-b-0">
                    <div className="flex items-center space-x-2 mb-1">
                      {result.type === 'faq' && <HelpCircle className="w-4 h-4 text-blue-400" />}
                      {result.type === 'guide' && <Book className="w-4 h-4 text-green-400" />}
                      {result.type === 'video' && <Video className="w-4 h-4 text-red-400" />}
                      {result.type === 'download' && <Download className="w-4 h-4 text-purple-400" />}
                      <span className="text-xs text-gray-400 uppercase">{result.type}</span>
                    </div>
                    <h4 className="text-sm font-medium text-white">{result.title || result.question}</h4>
                    <p className="text-xs text-gray-300 mt-1 line-clamp-2">{result.description || result.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 标签页导航 */}
        <div className="flex justify-center mt-6">
          <div className="flex space-x-1 bg-gray-700/30 rounded-lg p-1">
            {[
              { id: 'guides', name: '快速指南', icon: Book },
              { id: 'faq', name: '常见问题', icon: HelpCircle },
              { id: 'videos', name: '视频教程', icon: Video },
              { id: 'downloads', name: '下载资源', icon: Download },
              { id: 'contact', name: '联系支持', icon: MessageCircle }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-600/50'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="space-y-6">
        {/* 快速指南标签页 */}
        {activeTab === 'guides' && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Book className="w-6 h-6 text-blue-400 mr-3" />
                <h2 className="text-xl font-bold text-white">快速指南</h2>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  title="选择分类"
                  className="px-3 py-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {guides.map((guide) => (
                <div
                  key={guide.id}
                  className="bg-gray-700/30 rounded-lg p-5 border border-gray-600/30 hover:border-blue-500/50 hover:bg-gray-700/50 transition-all cursor-pointer group"
                  onClick={() => setSelectedGuide(guide)}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getIconColor(guide.color)}`}>
                      <guide.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                          {guide.title}
                        </h3>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                      </div>
                      <p className="text-sm text-gray-300 mb-4">{guide.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">{guide.estimatedTime}</span>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getDifficultyColor(guide.difficulty)}`}>
                            {guide.difficulty === 'beginner' ? '初级' :
                              guide.difficulty === 'intermediate' ? '中级' : '高级'}
                          </span>
                        </div>
                        {guide.videoUrl && (
                          <div className="flex items-center space-x-1">
                            <Video className="w-4 h-4 text-red-400" />
                            <span className="text-xs text-gray-400">视频</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 常见问题标签页 */}
        {activeTab === 'faq' && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <HelpCircle className="w-6 h-6 text-green-400 mr-3" />
                <h2 className="text-xl font-bold text-white">常见问题</h2>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  title="选择分类"
                  className="px-3 py-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredFAQs.map((faq) => (
                <div
                  key={faq.id}
                  className="border border-gray-600/30 rounded-lg overflow-hidden hover:border-gray-500/50 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700/20 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-white">{faq.question}</span>
                        <div className="flex space-x-1">
                          {faq.tags.slice(0, 2).map((tag, index) => (
                            <span key={index} className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        <span>更新时间: {faq.lastUpdated}</span>
                        <span className="flex items-center space-x-1">
                          <ThumbsUp className="w-3 h-3" />
                          <span>{faq.helpful}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <ThumbsDown className="w-3 h-3" />
                          <span>{faq.notHelpful}</span>
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedFAQ === faq.id ? 'rotate-90' : ''
                        }`}
                    />
                  </button>
                  {expandedFAQ === faq.id && (
                    <div className="px-4 pb-4 border-t border-gray-600/30 bg-gray-700/10">
                      <p className="text-gray-300 whitespace-pre-line pt-4 mb-4">{faq.answer}</p>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-600/30">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-400">这个答案对您有帮助吗？</span>
                          <button
                            type="button"
                            onClick={() => handleFAQFeedback(faq.id, true)}
                            className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-500/20 text-green-300 rounded border border-green-500/30 hover:bg-green-500/30 transition-colors"
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>有用</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFAQFeedback(faq.id, false)}
                            className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-500/20 text-red-300 rounded border border-red-500/30 hover:bg-red-500/30 transition-colors"
                          >
                            <ThumbsDown className="w-3 h-3" />
                            <span>无用</span>
                          </button>
                        </div>
                        <div className="flex space-x-1">
                          {faq.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-0.5 text-xs bg-gray-600/30 text-gray-300 rounded border border-gray-600/50">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredFAQs.length === 0 && (
              <div className="text-center py-12">
                <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">没有找到相关问题</h3>
                <p className="text-gray-400 mb-4">请尝试其他关键词或联系客服获取帮助</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('contact')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  联系客服
                </button>
              </div>
            )}
          </div>
        )}

        {/* 视频教程标签页 */}
        {activeTab === 'videos' && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center mb-6">
              <Video className="w-6 h-6 text-red-400 mr-3" />
              <h2 className="text-xl font-bold text-white">视频教程</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videoTutorials.map((video) => (
                <div
                  key={video.id}
                  className="bg-gray-700/30 rounded-lg overflow-hidden border border-gray-600/30 hover:border-blue-500/50 transition-all cursor-pointer group"
                  onClick={() => handleVideoPlay(video)}
                >
                  <div className="relative">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-blue-600 rounded-full p-3">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                      视频教程
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-sm text-gray-300 mb-3">{video.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center space-x-1">
                        <Video className="w-3 h-3" />
                        <span>{video.views.toLocaleString()} 次观看</span>
                      </span>
                      <span className="px-2 py-1 bg-gray-600/30 rounded border border-gray-600/50">
                        {categories.find(c => c.id === video.category)?.name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 下载资源标签页 */}
        {activeTab === 'downloads' && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center mb-6">
              <Download className="w-6 h-6 text-purple-400 mr-3" />
              <h2 className="text-xl font-bold text-white">下载资源</h2>
            </div>

            <div className="space-y-4">
              {downloadResources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:border-purple-500/50 transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                      <FileText className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{resource.title}</h3>
                      <p className="text-sm text-gray-300 mb-2">{resource.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        <span className="flex items-center space-x-1">
                          <Tag className="w-3 h-3" />
                          <span>{resource.type.toUpperCase()}</span>
                        </span>
                        <span>{resource.size}</span>
                        <span>{resource.downloads.toLocaleString()} 次下载</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(resource)}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>下载</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 联系支持标签页 */}
        {activeTab === 'contact' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 联系方式 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <div className="flex items-center mb-6">
                <MessageCircle className="w-6 h-6 text-blue-400 mr-3" />
                <h2 className="text-xl font-bold text-white">联系我们</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">邮件支持</h3>
                    <p className="text-sm text-gray-300">xyd91964208@gamil.com</p>
                    <p className="text-xs text-gray-400">24小时内回复</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
                    <MessageCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">在线客服</h3>
                    <p className="text-sm text-gray-300">实时聊天支持</p>
                    <p className="text-xs text-gray-400">工作日 9:00-18:00</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center border border-orange-500/30">
                    <Phone className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">电话支持</h3>
                    <p className="text-sm text-gray-300">+86-177-8104-0916</p>
                    <p className="text-xs text-gray-400">工作日 9:00-18:00</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 反馈表单 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Send className="w-6 h-6 text-green-400 mr-3" />
                  <h2 className="text-xl font-bold text-white">提交反馈</h2>
                </div>
              </div>

              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">反馈类型</label>
                  <select
                    value={feedbackData.type}
                    onChange={(e) => setFeedbackData({ ...feedbackData, type: e.target.value as any })}
                    title="选择反馈类型"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="question">问题咨询</option>
                    <option value="bug">错误报告</option>
                    <option value="feature">功能建议</option>
                    <option value="improvement">改进建议</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">标题</label>
                  <input
                    type="text"
                    value={feedbackData.title}
                    onChange={(e) => setFeedbackData({ ...feedbackData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="请简要描述您的问题或建议"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">详细描述</label>
                  <textarea
                    value={feedbackData.description}
                    onChange={(e) => setFeedbackData({ ...feedbackData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="请详细描述您遇到的问题或建议..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">联系邮箱</label>
                  <input
                    type="email"
                    value={feedbackData.email}
                    onChange={(e) => setFeedbackData({ ...feedbackData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">优先级</label>
                  <select
                    value={feedbackData.priority}
                    onChange={(e) => setFeedbackData({ ...feedbackData, priority: e.target.value as any })}
                    title="选择优先级"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>提交中...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>提交反馈</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Help;
