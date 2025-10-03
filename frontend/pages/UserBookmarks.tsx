import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {Bookmark, BookmarkPlus, Search, Filter, Trash2, ExternalLink, Star, Clock, FolderPlus, Folder, Grid, RefreshCw} from 'lucide-react';

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  tags: string[];
  category: string;
  isFavorite: boolean;
  createdAt: string;
  lastAccessed?: string;
  accessCount: number;
  thumbnail?: string;
}

interface BookmarkCategory {
  id: string;
  name: string;
  color: string;
  count: number;
}

const UserBookmarks: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [categories, setCategories] = useState<BookmarkCategory[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'title' | 'date' | 'accessed'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockCategories: BookmarkCategory[] = [
      { id: 'development', name: 'Development', color: 'blue', count: 8 },
      { id: 'testing', name: 'Testing Tools', color: 'green', count: 5 },
      { id: 'documentation', name: 'Documentation', color: 'purple', count: 6 },
      { id: 'tutorials', name: 'Tutorials', color: 'orange', count: 4 },
      { id: 'resources', name: 'Resources', color: 'red', count: 3 }
    ];

    const mockBookmarks: BookmarkItem[] = [
      {
        id: '1',
        title: 'React Documentation',
        url: 'https://reactjs.org/docs',
        description: 'Official React documentation with guides and API reference',
        tags: ['react', 'javascript', 'frontend'],
        category: 'documentation',
        isFavorite: true,
        createdAt: '2024-01-15T10:00:00Z',
        lastAccessed: '2024-01-20T14:30:00Z',
        accessCount: 25,
        thumbnail: '/api/placeholder/300/200'
      },
      {
        id: '2',
        title: 'TypeScript Handbook',
        url: 'https://www.typescriptlang.org/docs',
        description: 'Complete guide to TypeScript language features',
        tags: ['typescript', 'javascript', 'types'],
        category: 'documentation',
        isFavorite: true,
        createdAt: '2024-01-14T09:15:00Z',
        lastAccessed: '2024-01-19T16:45:00Z',
        accessCount: 18,
        thumbnail: '/api/placeholder/300/200'
      }
    ];

    setCategories(mockCategories);
    setBookmarks(mockBookmarks);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  useEffect(() => {
    // Filter and sort bookmarks
    const filtered = bookmarks.filter(bookmark => {
      const matchesSearch = bookmark.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           bookmark.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           bookmark.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || bookmark.category === selectedCategory;
      const matchesFavorites = !showFavoritesOnly || bookmark.isFavorite;
      
      return matchesSearch && matchesCategory && matchesFavorites;
    });

    // Sort bookmarks
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'accessed':
          comparison = (a.lastAccessed ? new Date(a.lastAccessed).getTime() : 0) - 
                      (b.lastAccessed ? new Date(b.lastAccessed).getTime() : 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredBookmarks(filtered);
  }, [bookmarks, searchTerm, selectedCategory, showFavoritesOnly, sortBy, sortOrder]);

  const toggleFavorite = useCallback((bookmarkId: string) => {
    setBookmarks(prev => prev.map(bookmark => 
      bookmark.id === bookmarkId 
        ? { ...bookmark, isFavorite: !bookmark.isFavorite }
        : bookmark
    ));
  }, []);

  const deleteBookmark = useCallback((bookmarkId: string) => {
    setBookmarks(prev => prev.filter(bookmark => bookmark.id !== bookmarkId));
  }, []);

  const openBookmark = useCallback((bookmark: BookmarkItem) => {
    // Update access count and last accessed time
    setBookmarks(prev => prev.map(b => 
      b.id === bookmark.id 
        ? { 
            ...b, 
            accessCount: b.accessCount + 1, 
            lastAccessed: new Date().toISOString() 
          }
        : b
    ));
    
    // Open in new tab
    window.open(bookmark.url, '_blank');
  }, []);

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || 'gray';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Bookmark className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Bookmarks</h1>
                <p className="text-sm text-gray-500">Organize and manage your saved resources</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => loadBookmarks()}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <BookmarkPlus className="w-4 h-4" />
                <span>Add Bookmark</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <div className="lg:w-64 flex-shrink-0">
              {/* Search */}
              <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search bookmarks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Categories</h3>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <FolderPlus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left ${
                      selectedCategory === 'all' ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Folder className="w-4 h-4" />
                      <span className="text-sm">All Bookmarks</span>
                    </div>
                    <span className="text-xs text-gray-500">{bookmarks.length}</span>
                  </button>

                  {categories.map((category) => (
                    <button
                      key={category?.id}
                      onClick={() => setSelectedCategory(category?.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left ${
                        selectedCategory === category?.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full bg-${category?.color}-500`}></div>
                        <span className="text-sm">{category?.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{category?.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {/* Bookmarks Grid */}
              {filteredBookmarks.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <Bookmark className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No bookmarks found</h3>
                  <p className="text-gray-600 mb-4">Start by adding your first bookmark</p>
                  <button className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <BookmarkPlus className="w-4 h-4" />
                    <span>Add Bookmark</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBookmarks.map((bookmark) => (
                    <div key={bookmark.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden">
                      {bookmark.thumbnail && (
                        <div className="h-32 bg-gray-200 relative">
                          <img
                            src={bookmark.thumbnail}
                            alt={bookmark.title}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => toggleFavorite(bookmark.id)}
                            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow"
                          >
                            <Star className={`w-4 h-4 ${bookmark.isFavorite ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                          </button>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-gray-900 truncate flex-1">{bookmark.title}</h3>
                          <div className="flex items-center space-x-1 ml-2">
                            <button
                              onClick={() => openBookmark(bookmark)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteBookmark(bookmark.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {bookmark.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{bookmark.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <div className={`w-2 h-2 rounded-full bg-${getCategoryColor(bookmark.category)}-500`}></div>
                            <span>{categories.find(cat => cat.id === bookmark.category)?.name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatRelativeTime(bookmark.createdAt)}</span>
                          </div>
                        </div>
                        
                        {bookmark.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {bookmark.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {bookmark.tags.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                +{bookmark.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserBookmarks;
