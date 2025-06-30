import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Clock, TrendingUp, X, ArrowRight, Home, Globe, Zap, Shield,
  BarChart3, Settings, HelpCircle, Code, Monitor, Activity, Upload,
  Download, User, Bell, Key, Play, Book, Lock, TestTube
} from 'lucide-react';
import { globalSearchService, SearchResult } from '../services/globalSearchService';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  Home, Globe, Zap, Shield, Search, BarChart3, Settings, HelpCircle,
  Code, Monitor, Activity, Upload, Download, User, Bell, Key, Play,
  Book, Lock, TestTube, Clock
};

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // 初始化
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSearchHistory(globalSearchService.getSearchHistory());
      setShowHistory(!initialQuery);
      
      // 聚焦搜索框
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialQuery]);

  // 搜索功能
  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        setShowHistory(true);
        return;
      }

      setIsSearching(true);
      setShowHistory(false);
      
      try {
        const searchResults = await globalSearchService.search(query, { limit: 8 });
        setResults(searchResults);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  // 获取搜索建议
  useEffect(() => {
    const getSuggestions = async () => {
      if (query.trim()) {
        const suggestionList = await globalSearchService.getSuggestions(query);
        setSuggestions(suggestionList);
      } else {
        setSuggestions([]);
      }
    };

    getSuggestions();
  }, [query]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > -1 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          } else if (query.trim()) {
            handleSearch(query);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, results, query]);

  // 处理搜索
  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      globalSearchService.recordSearch(searchQuery);
      setSearchHistory(globalSearchService.getSearchHistory());
      
      // 如果没有精确匹配的结果，导航到帮助页面进行搜索
      if (results.length === 0) {
        navigate(`/help?search=${encodeURIComponent(searchQuery)}`);
      } else {
        // 导航到第一个结果
        handleResultClick(results[0]);
      }
    }
  };

  // 处理结果点击
  const handleResultClick = (result: SearchResult) => {
    globalSearchService.recordSearch(query);
    navigate(result.url);
    onClose();
  };

  // 处理历史记录点击
  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    setShowHistory(false);
  };

  // 清除搜索历史
  const clearHistory = () => {
    globalSearchService.clearSearchHistory();
    setSearchHistory([]);
  };

  // 渲染图标
  const renderIcon = (iconName: string, className: string = 'w-4 h-4') => {
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className={className} /> : <Search className={className} />;
  };

  // 高亮搜索词
  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-blue-500/30 text-blue-300 font-medium">
          {part}
        </span>
      ) : part
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-start justify-center pt-20">
      <div className="w-full max-w-2xl mx-4">
        {/* 搜索框 */}
        <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center p-4 border-b border-gray-600/50">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索测试、报告、设置..."
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSearch(query);
                }
              }}
            />
            {isSearching && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-3"></div>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              aria-label="关闭搜索"
              title="关闭搜索"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 搜索结果或历史记录 */}
          <div ref={resultsRef} className="max-h-96 overflow-y-auto">
            {showHistory && searchHistory.length > 0 && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center text-gray-400">
                    <Clock className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">最近搜索</span>
                  </div>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    清除
                  </button>
                </div>
                <div className="space-y-1">
                  {searchHistory.slice(0, 5).map((historyItem, index) => (
                    <button
                      key={index}
                      onClick={() => handleHistoryClick(historyItem)}
                      className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      {historyItem}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!showHistory && query && (
              <div className="p-2">
                {results.length > 0 ? (
                  <div className="space-y-1">
                    {results.map((result, index) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                          selectedIndex === index
                            ? 'bg-blue-500/20 border border-blue-500/30'
                            : 'hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            result.type === 'page' ? 'bg-blue-500/20 text-blue-400' :
                            result.type === 'test' ? 'bg-green-500/20 text-green-400' :
                            result.type === 'setting' ? 'bg-purple-500/20 text-purple-400' :
                            result.type === 'help' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {renderIcon(result.icon || 'Search')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-white truncate">
                                {highlightText(result.title, query)}
                              </h3>
                              <ArrowRight className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                            </div>
                            <p className="text-sm text-gray-400 truncate mt-1">
                              {highlightText(result.description, query)}
                            </p>
                            <div className="flex items-center mt-2">
                              <span className="text-xs px-2 py-1 bg-gray-600/50 text-gray-300 rounded">
                                {result.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : !isSearching ? (
                  <div className="p-8 text-center text-gray-400">
                    <Search className="w-8 h-8 mx-auto mb-3 text-gray-500" />
                    <p className="text-sm">没有找到相关结果</p>
                    <p className="text-xs text-gray-500 mt-1">
                      尝试使用不同的关键词或查看帮助文档
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* 搜索建议 */}
            {suggestions.length > 0 && query && !showHistory && (
              <div className="border-t border-gray-600/50 p-4">
                <div className="flex items-center text-gray-400 mb-2">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">搜索建议</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(suggestion)}
                      className="px-3 py-1 bg-gray-700/50 text-gray-300 text-sm rounded-full hover:bg-gray-600/50 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 快捷提示 */}
          <div className="border-t border-gray-600/50 px-4 py-3 bg-gray-800/50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span>↑↓ 导航</span>
                <span>↵ 选择</span>
                <span>ESC 关闭</span>
              </div>
              <span>由 Test Web App 提供支持</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
