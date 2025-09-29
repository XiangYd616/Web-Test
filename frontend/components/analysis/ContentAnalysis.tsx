/**
 * ContentAnalysis.tsx - React组件
 * 
 * 文件路径: frontend\components\analysis\ContentAnalysis.tsx
 * 创建时间: 2025-09-25
 */

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {FileText, Eye, Clock, TrendingUp, Heart, MessageCircle, Share2, BarChart3, RefreshCw, Target, Search, Filter} from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  type: 'article' | 'video' | 'tutorial' | 'documentation' | 'blog';
  author: string;
  publishDate: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  readTime: number; // in minutes
  engagement: number; // percentage
  status: 'published' | 'draft' | 'archived';
  tags: string[];
}

interface ContentMetrics {
  totalContent: number;
  totalViews: number;
  totalEngagement: number;
  averageReadTime: number;
  topPerforming: ContentItem[];
  recentContent: ContentItem[];
}

const ContentAnalysis: React.FC = () => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [metrics, setMetrics] = useState<ContentMetrics>({
    totalContent: 0,
    totalViews: 0,
    totalEngagement: 0,
    averageReadTime: 0,
    topPerforming: [],
    recentContent: []
  });
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadContentData = useCallback(async () => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockContent: ContentItem[] = [
      {
        id: '1',
        title: 'Getting Started with Load Testing',
        type: 'tutorial',
        author: 'John Doe',
        publishDate: '2024-01-15T10:00:00Z',
        views: 15420,
        likes: 234,
        comments: 45,
        shares: 67,
        readTime: 8,
        engagement: 85.2,
        status: 'published',
        tags: ['testing', 'performance', 'tutorial']
      },
      {
        id: '2',
        title: 'Advanced API Testing Strategies',
        type: 'article',
        author: 'Jane Smith',
        publishDate: '2024-01-12T14:30:00Z',
        views: 8930,
        likes: 156,
        comments: 23,
        shares: 34,
        readTime: 12,
        engagement: 78.5,
        status: 'published',
        tags: ['api', 'testing', 'strategies']
      },
      {
        id: '3',
        title: 'Performance Testing Best Practices',
        type: 'documentation',
        author: 'Mike Johnson',
        publishDate: '2024-01-10T09:15:00Z',
        views: 12340,
        likes: 189,
        comments: 56,
        shares: 78,
        readTime: 15,
        engagement: 92.1,
        status: 'published',
        tags: ['performance', 'best-practices', 'documentation']
      },
      {
        id: '4',
        title: 'Introduction to Security Testing',
        type: 'video',
        author: 'Sarah Wilson',
        publishDate: '2024-01-08T16:45:00Z',
        views: 6780,
        likes: 98,
        comments: 12,
        shares: 23,
        readTime: 25,
        engagement: 65.3,
        status: 'published',
        tags: ['security', 'testing', 'video']
      },
      {
        id: '5',
        title: 'Test Automation Framework Guide',
        type: 'blog',
        author: 'David Brown',
        publishDate: '2024-01-05T11:20:00Z',
        views: 9870,
        likes: 145,
        comments: 34,
        shares: 56,
        readTime: 10,
        engagement: 73.8,
        status: 'published',
        tags: ['automation', 'framework', 'guide']
      }
    ];

    setContent(mockContent);
    
    // Calculate metrics
    const totalContent = mockContent.length;
    const totalViews = mockContent.reduce((sum, item) => sum + item.views, 0);
    const totalEngagement = mockContent.reduce((sum, item) => sum + item.engagement, 0) / totalContent;
    const averageReadTime = mockContent.reduce((sum, item) => sum + item.readTime, 0) / totalContent;
    const topPerforming = [...mockContent].sort((a, b) => b.engagement - a.engagement).slice(0, 3);
    const recentContent = [...mockContent].sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()).slice(0, 3);

    setMetrics({
      totalContent,
      totalViews,
      totalEngagement,
      averageReadTime,
      topPerforming,
      recentContent
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    loadContentData();
  }, [loadContentData]);

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Update content with new engagement data
    setContent(prev => prev.map(item => ({
      ...item,
      views: item.views + Math.floor(Math.random() * 100),
      likes: item.likes + Math.floor(Math.random() * 10),
      comments: item.comments + Math.floor(Math.random() * 5),
      shares: item.shares + Math.floor(Math.random() * 8),
      engagement: Math.random() * 20 + 70
    })));
    
    setIsAnalyzing(false);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'article':
        return <FileText className="w-4 h-4" />;
      case 'video':
        return <Eye className="w-4 h-4" />;
      case 'tutorial':
        return <Target className="w-4 h-4" />;
      case 'documentation':
        return <FileText className="w-4 h-4" />;
      case 'blog':
        return <MessageCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'article':
        return 'text-blue-600 bg-blue-100';
      case 'video':
        return 'text-red-600 bg-red-100';
      case 'tutorial':
        return 'text-green-600 bg-green-100';
      case 'documentation':
        return 'text-purple-600 bg-purple-100';
      case 'blog':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getEngagementColor = (engagement: number) => {
    if (engagement >= 80) return 'text-green-600';
    if (engagement >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredContent = content.filter(item => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Content Analysis</h2>
            <p className="text-sm text-gray-600">Analyze content performance and engagement</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => loadContentData()}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            <BarChart3 className="w-4 h-4" />
            <span>{isAnalyzing ? 'Analyzing...' : 'Run Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Total Content</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.totalContent}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Eye className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Total Views</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(metrics.totalViews)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Avg Engagement</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.totalEngagement.toFixed(1)}%</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-600">Avg Read Time</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{Math.round(metrics.averageReadTime)}m</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="article">Articles</option>
              <option value="video">Videos</option>
              <option value="tutorial">Tutorials</option>
              <option value="documentation">Documentation</option>
              <option value="blog">Blog Posts</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Content Items ({filteredContent.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredContent.map((item) => (
            <div key={item.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${getTypeColor(item.type)}`}>
                    {getTypeIcon(item.type)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{item.title}</h4>
                    <p className="text-sm text-gray-600">by {item.author} • {formatDate(item.publishDate)}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <span className={`text-lg font-semibold ${getEngagementColor(item.engagement)}`}>
                  {item.engagement.toFixed(1)}%
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-gray-600" />
                  <div>
                    <span className="text-sm text-gray-600">Views:</span>
                    <div className="font-medium text-gray-900">{formatNumber(item.views)}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-gray-600" />
                  <div>
                    <span className="text-sm text-gray-600">Likes:</span>
                    <div className="font-medium text-gray-900">{formatNumber(item.likes)}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageCircle className="w-4 h-4 text-gray-600" />
                  <div>
                    <span className="text-sm text-gray-600">Comments:</span>
                    <div className="font-medium text-gray-900">{formatNumber(item.comments)}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Share2 className="w-4 h-4 text-gray-600" />
                  <div>
                    <span className="text-sm text-gray-600">Shares:</span>
                    <div className="font-medium text-gray-900">{formatNumber(item.shares)}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <div>
                    <span className="text-sm text-gray-600">Read Time:</span>
                    <div className="font-medium text-gray-900">{item.readTime}m</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-6">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Content Performance Trends</h3>
        </div>
        
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Content performance chart would be rendered here</p>
            <p className="text-sm text-gray-400">Showing engagement and views over time</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentAnalysis;
