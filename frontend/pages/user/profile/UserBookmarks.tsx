import {AlertCircle, Bookmark, Calendar, CheckCircle, Clock, Loader, Plus, Search, Star, Trash2, X} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {useTheme} from '../../../contexts/ThemeContext.tsx';
import {BookmarkItem, userService} from '../../../services/user/userService.ts';

interface BookmarkCategory {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface BookmarkForm {
  title: string;
  url: string;
  description: string;
  category: string;
  tags: string[];
}

const UserBookmarks: React.FC = () => {
  const { actualTheme } = useTheme();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [categories, setCategories] = useState<BookmarkCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'createdAt' | 'title' | 'visitCount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkItem | null>(null);

  const [newBookmarkForm, setNewBookmarkForm] = useState<BookmarkForm>({
    title: '',
    url: '',
    description: '',
    category: '工具',
    tags: []
  });

  // 获取收藏夹数据
  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        setLoading(true);
        setError(null);

        const bookmarksData = await userService.getBookmarks();
        setBookmarks(bookmarksData);

        // 生成分类统计
        const categoryStats = bookmarksData.reduce((acc, bookmark) => {
          acc[bookmark.category] = (acc[bookmark.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const categoriesData: BookmarkCategory[] = [
          { id: '工具', name: '工具', color: 'blue', count: categoryStats['工具'] || 0 },
          { id: '文档', name: '文档', color: 'green', count: categoryStats['文档'] || 0 },
          { id: '学习', name: '学习', color: 'purple', count: categoryStats['学习'] || 0 },
          { id: '娱乐', name: '娱乐', color: 'pink', count: categoryStats['娱乐'] || 0 },
          { id: '其他', name: '其他', color: 'gray', count: categoryStats['其他'] || 0 }
        ];

        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to fetch bookmarks:', error);
        setError('获取收藏夹失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarks();
  }, []);

  // 添加收藏
  const handleAddBookmark = async () => {
    if (!newBookmarkForm.title || !newBookmarkForm.url) {
      setError('请填写标题和URL');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const newBookmark = await userService.addBookmark({
        title: newBookmarkForm.title,
        url: newBookmarkForm.url,
        description: newBookmarkForm.description,
        category: newBookmarkForm.category,
        tags: newBookmarkForm.tags,
        isFavorite: false,
        lastVisited: undefined
      });

      setBookmarks(prev => [newBookmark, ...prev]);
      setShowAddModal(false);
      setNewBookmarkForm({
        title: '',
        url: '',
        description: '',
        category: '工具',
        tags: []
      });
      setSuccess('收藏已添加！');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to add bookmark:', error);
      setError('添加收藏失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 删除收藏
  const handleDeleteBookmark = async (id: string) => {
    if (!confirm('确定要删除这个收藏吗？')) return;

    try {
      setSaving(true);
      setError(null);

      await userService.deleteBookmark(id);
      setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));
      setSuccess('收藏已删除！');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
      setError('删除收藏失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 切换收藏状态
  const toggleFavorite = async (bookmarkId: string) => {
    const bookmark = bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;

    try {
      const updatedBookmark = await userService.updateBookmark(bookmarkId, {
        isFavorite: !bookmark.isFavorite
      });

      setBookmarks(prev => prev.map(b =>
        b.id === bookmarkId ? updatedBookmark : b
      ));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      setError('更新收藏状态失败');
    }
  };

  // 点击收藏
  const handleBookmarkClick = async (bookmark: BookmarkItem) => {
    try {
      // 更新访问记录
      await userService.updateBookmark(bookmark.id, {
        lastVisited: new Date().toISOString(),
        visitCount: bookmark.visitCount + 1
      });

      setBookmarks(prev => prev.map(b =>
        b.id === bookmark.id
          ? { ...b, lastVisited: new Date().toISOString(), visitCount: b.visitCount + 1 }
          : b
      ));

      // 跳转到链接
      if (bookmark.url.startsWith('/')) {
        window.location.href = bookmark.url;
      } else {
        window.open(bookmark.url, '_blank');
      }
    } catch (error) {
      console.error('Failed to update bookmark visit:', error);
    }
  };

  // 过滤和排序收藏
  const filteredBookmarks = bookmarks
    .filter(bookmark => {
      const matchesSearch = bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bookmark.description && bookmark.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || bookmark.category === selectedCategory;

      const matchesTags = selectedTags.length === 0 ||
        selectedTags.some(tag => bookmark.tags.includes(tag));

      return matchesSearch && matchesCategory && matchesTags;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'visitCount':
          comparison = a.visitCount - b.visitCount;
          break;
        case 'createdAt':
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // 获取所有标签
  const allTags = Array.from(new Set(bookmarks.flatMap(bookmark => bookmark.tags)));

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${actualTheme === 'light' ? 'bg-gray-50' : 'bg-gray-900'
        }`}>
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className={actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
            加载收藏夹中...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${actualTheme === 'light' ? 'bg-gray-50' : 'bg-gray-900'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 消息提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
              aria-label="关闭错误提示"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-300">{success}</span>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-400 hover:text-green-300"
              aria-label="关闭成功提示"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 页面标题 */}
        <div className={`rounded-xl border p-6 mb-8 ${actualTheme === 'light'
          ? 'bg-white border-gray-200'
          : 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50'
          }`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-4 mb-4 lg:mb-0">
              <div className="p-3 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                <Bookmark className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}>
                  收藏夹
                </h1>
                <p className={actualTheme === 'light' ? 'text-gray-600' : 'text-gray-300'}>
                  管理您收藏的页面和资源
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>添加收藏</span>
              </button>
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧：筛选和分类 */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* 搜索框 */}
              <div className={`rounded-xl border p-4 ${actualTheme === 'light'
                ? 'bg-white border-gray-200'
                : 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50'
                }`}>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${actualTheme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索收藏..."
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${actualTheme === 'light'
                      ? 'bg-white border-gray-300 text-gray-900'
                      : 'bg-gray-700 border-gray-600 text-white'
                      }`}
                  />
                </div>
              </div>

              {/* 分类筛选 */}
              <div className={`rounded-xl border p-4 ${actualTheme === 'light'
                ? 'bg-white border-gray-200'
                : 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50'
                }`}>
                <h3 className={`text-lg font-semibold mb-4 ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}>
                  分类
                </h3>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${selectedCategory === 'all'
                      ? 'bg-blue-500/20 text-blue-400'
                      : actualTheme === 'light'
                        ? 'text-gray-700 hover:bg-gray-100'
                        : 'text-gray-300 hover:bg-gray-700/50'
                      }`}
                  >
                    <span>全部</span>
                    <span className="text-sm">{bookmarks.length}</span>
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${selectedCategory === category.id
                        ? 'bg-blue-500/20 text-blue-400'
                        : actualTheme === 'light'
                          ? 'text-gray-700 hover:bg-gray-100'
                          : 'text-gray-300 hover:bg-gray-700/50'
                        }`}
                    >
                      <span>{category.name}</span>
                      <span className="text-sm">{category.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：收藏列表 */}
          <div className="lg:col-span-3">
            {filteredBookmarks.length === 0 ? (
              <div className={`rounded-xl border p-8 text-center ${actualTheme === 'light'
                ? 'bg-white border-gray-200'
                : 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50'
                }`}>
                <Bookmark className={`w-12 h-12 mx-auto mb-4 ${actualTheme === 'light' ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                <h3 className={`text-lg font-medium mb-2 ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}>
                  暂无收藏
                </h3>
                <p className={`mb-4 ${actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                  开始收藏您喜欢的页面和资源
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  添加收藏
                </button>
              </div>
            ) : (
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                : 'space-y-4'
              }>
                {filteredBookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className={`rounded-xl border transition-all hover:shadow-lg ${actualTheme === 'light'
                      ? 'bg-white border-gray-200 hover:border-gray-300'
                      : 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50 hover:border-gray-600/50'
                      } ${viewMode === 'list' ? 'p-4' : 'p-6'}`}
                  >
                    <div className={`flex ${viewMode === 'list' ? 'items-center space-x-4' : 'flex-col space-y-4'}`}>
                      {/* 收藏信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3
                            className={`font-medium cursor-pointer hover:text-blue-500 transition-colors ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                              }`}
                            onClick={() => handleBookmarkClick(bookmark)}
                          >
                            {bookmark.title}
                          </h3>
                          <div className="flex items-center space-x-1 ml-2">
                            <button
                              type="button"
                              onClick={() => toggleFavorite(bookmark.id)}
                              className={`p-1 rounded transition-colors ${bookmark.isFavorite
                                ? 'text-yellow-500 hover:text-yellow-600'
                                : actualTheme === 'light'
                                  ? 'text-gray-400 hover:text-yellow-500'
                                  : 'text-gray-500 hover:text-yellow-500'
                                }`}
                              aria-label={bookmark.isFavorite ? '取消收藏' : '添加收藏'}
                            >
                              <Star className={`w-4 h-4 ${bookmark.isFavorite ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBookmark(bookmark.id)}
                              className={`p-1 rounded transition-colors ${actualTheme === 'light'
                                ? 'text-gray-400 hover:text-red-500'
                                : 'text-gray-500 hover:text-red-400'
                                }`}
                              aria-label="删除书签"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <p className={`text-sm mb-2 ${actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'
                          }`}>
                          {bookmark.url}
                        </p>

                        {bookmark.description && (
                          <p className={`text-sm mb-3 ${actualTheme === 'light' ? 'text-gray-700' : 'text-gray-300'
                            }`}>
                            {bookmark.description}
                          </p>
                        )}

                        {/* 标签 */}
                        {bookmark.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {bookmark.tags.map((tag) => (
                              <span
                                key={tag}
                                className={`px-2 py-1 text-xs rounded-full ${actualTheme === 'light'
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-gray-700 text-gray-300'
                                  }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 元信息 */}
                        <div className={`flex items-center justify-between text-xs ${actualTheme === 'light' ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(bookmark.createdAt).toLocaleDateString('zh-CN')}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>访问 {bookmark.visitCount} 次</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserBookmarks;
