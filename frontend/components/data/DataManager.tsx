/**
 * DataManager.tsx - React缁勪欢
 * 
 * 鏂囦欢璺緞: frontend\components\data\DataManager.tsx
 * 鍒涘缓鏃堕棿: 2025-09-25
 */

import { Activity, Archive, BarChart3, Copy, Database, Download, Edit, Eye, FileText, Filter, HardDrive, RefreshCw, RotateCcw, Search, Settings, Shield, TestTube, Trash2, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { _advancedDataManager as advancedDataManager, DataAnalysisResult, DataQuery, DataRecord } from '../../services/integration/dataService';

interface AdvancedDataManagerProps {
  className?: string;
}

const AdvancedDataManager: React.FC<AdvancedDataManagerProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'analytics' | 'backup' | 'sync' | 'settings'>('browse');
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [analytics, setAnalytics] = useState<DataAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState<DataQuery>({
    pagination: {
      page: 1,
      limit: 50
    },
    sort: {
      field: 'created_at',
      order: 'desc'
    }
  });

  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
    loadAnalytics();
  }, [query]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await advancedDataManager.queryData(query);
      setRecords(result || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setRecords([]); // 纭繚鍦ㄩ敊璇椂璁剧疆涓虹┖鏁扮粍
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const analyticsData = await advancedDataManager.getAnalytics(query);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setQuery((prev: DataQuery) => ({
      ...prev,
      search: term,
      offset: 0
    }));
  };

  const handleFilterChange = (filters: Partial<DataQuery>) => {
    setQuery((prev: DataQuery) => ({
      ...prev,
      ...filters,
      pagination: {
        ...prev.pagination,
        page: 1
      }
    }));
  };

  const handleRecordSelect = (recordId: string, selected: boolean) => {
    const newSelected = new Set(selectedRecords);
    if (selected) {
      newSelected.add(recordId);
    } else {
      newSelected.delete(recordId);
    }
    setSelectedRecords(newSelected);
  };

    /**
     * if鍔熻兘鍑芥暟
     * @param {Object} params - 鍙傛暟瀵硅薄
     * @returns {Promise<Object>} 杩斿洖缁撴灉
     */
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRecords(new Set((records || []).map(r => r.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRecords.size === 0) return;

    if (!confirm(`纭畾瑕佸垹闄?${selectedRecords.size} 鏉¤褰曞悧锛熸鎿嶄綔鏃犳硶鎾ら攢銆俙)) {
      return;
    }

    try {
      const _operations = Array.from(selectedRecords).map(id => ({
        type: 'delete' as const,
        id
      }));

      await advancedDataManager.batchOperation('delete', Array.from(selectedRecords));
      setSelectedRecords(new Set());
      loadData();
    } catch (error) {
      console.error('Failed to delete records:', error);
      alert('鍒犻櫎澶辫触锛岃绋嶅悗閲嶈瘯');
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'xlsx') => {
    try {
      const result = await advancedDataManager.exportData(format, selectedRecords.size > 0 ? {
        ...query,
        // 鍙鍑洪€変腑鐨勮褰?      } : query);

      // 鍒涘缓涓嬭浇閾炬帴
      const blob = new Blob([result], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-export-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('瀵煎嚭澶辫触锛岃绋嶅悗閲嶈瘯');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'test': return <TestTube className="w-4 h-4 text-green-400" />;
      case 'user': return <Users className="w-4 h-4 text-blue-400" />;
      case 'report': return <FileText className="w-4 h-4 text-purple-400" />;
      case 'log': return <Activity className="w-4 h-4 text-yellow-400" />;
      case 'config': return <Settings className="w-4 h-4 text-gray-400" />;
      default: return <Database className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <section className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 ${className}`}>
      {/* 澶撮儴 */}
      <header className="p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <hgroup className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">楂樼骇鏁版嵁绠＄悊</h2>
          </hgroup>

          <div className="flex items-center space-x-2" role="toolbar" aria-label="鏁版嵁绠＄悊鎿嶄綔">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              aria-expanded={showFilters}
              aria-controls="filters-section"
            >
              <Filter className="w-4 h-4" />
              <span>杩囨护鍣?/span>
            </button>

            <button
              type="button"
              onClick={loadData}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              aria-label="鍒锋柊鏁版嵁"
            >
              <RefreshCw className="w-4 h-4" />
              <span>鍒锋柊</span>
            </button>
          </div>
        </div>

        {/* 鏍囩椤?*/}
        <nav className="flex space-x-1" role="tablist" aria-label="鏁版嵁绠＄悊瀵艰埅">
          {[
            { id: 'browse', label: '鏁版嵁娴忚', icon: Database },
            { id: 'analytics', label: '鏁版嵁鍒嗘瀽', icon: BarChart3 },
            { id: 'backup', label: '澶囦唤绠＄悊', icon: Archive },
            { id: 'sync', label: '鏁版嵁鍚屾', icon: RotateCcw },
            { id: 'settings', label: '璁剧疆', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* 鍐呭鍖哄煙 */}
      <main className="p-6">
        <section id="browse-panel" role="tabpanel" aria-labelledby="browse-tab" hidden={activeTab !== 'browse'}>
          {activeTab === 'browse' && (
            <div className="space-y-6">
              {/* 鎼滅储鍜屾搷浣滄爮 */}
              <header className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="relative">
                    <span className="sr-only">鎼滅储鏁版嵁</span>
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="search"
                      placeholder="鎼滅储鏁版嵁..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e?.target.value)}
                      className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </label>

                  {selectedRecords.size > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-300">
                        宸查€夋嫨 {selectedRecords.size} 椤?                      </span>
                      <button
                        type="button"
                        onClick={handleBatchDelete}
                        className="flex items-center space-x-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        aria-label={`鍒犻櫎閫変腑鐨?${selectedRecords.size} 椤筦}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>鍒犻櫎</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2" role="toolbar" aria-label="鏁版嵁鎿嶄綔">
                  <button
                    type="button"
                    onClick={() => handleExport('json')}
                    className="flex items-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    aria-label="瀵煎嚭鏁版嵁"
                  >
                    <Download className="w-4 h-4" />
                    <span>瀵煎嚭</span>
                  </button>
                </div>
              </header>

              {/* 杩囨护鍣ㄩ潰鏉?*/}
              {showFilters && (
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label htmlFor="data-type-select" className="block text-sm font-medium text-gray-300 mb-2">鏁版嵁绫诲瀷</label>
                      <select
                        id="data-type-select"
                        value={query.type || 'all'}
                        onChange={(e) => handleFilterChange({ type: e?.target.value === 'all' ? undefined : e?.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2"
                        aria-label="閫夋嫨鏁版嵁绫诲瀷"
                      >
                        <option value="all">鍏ㄩ儴绫诲瀷</option>
                        <option value="test">娴嬭瘯鏁版嵁</option>
                        <option value="user">鐢ㄦ埛鏁版嵁</option>
                        <option value="report">鎶ュ憡鏁版嵁</option>
                        <option value="log">鏃ュ織鏁版嵁</option>
                        <option value="config">閰嶇疆鏁版嵁</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="sort-field-select" className="block text-sm font-medium text-gray-300 mb-2">鎺掑簭鏂瑰紡</label>
                      <select
                        id="sort-field-select"
                        value={typeof query.sort === 'object' ? query.sort.field : 'created_at'}
                        onChange={(e) => handleFilterChange({
                          sort: {
                            field: e?.target.value,
                            order: typeof query.sort === 'object' ? query.sort.order : 'desc'
                          }
                        })}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2"
                        aria-label="閫夋嫨鎺掑簭鏂瑰紡"
                      >
                        <option value="created_at">鍒涘缓鏃堕棿</option>
                        <option value="updated_at">鏇存柊鏃堕棿</option>
                        <option value="test_type">鏁版嵁绫诲瀷</option>
                        <option value="status">鐘舵€?/option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="sort-order-select" className="block text-sm font-medium text-gray-300 mb-2">鎺掑簭椤哄簭</label>
                      <select
                        id="sort-order-select"
                        value={typeof query.sort === 'object' ? query.sort.order : 'desc'}
                        onChange={(e) => handleFilterChange({
                          sort: {
                            field: typeof query.sort === 'object' ? query.sort.field : 'createdAt',
                            order: e?.target.value as 'asc' | 'desc'
                          }
                        })}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2"
                        aria-label="閫夋嫨鎺掑簭椤哄簭"
                      >
                        <option value="desc">闄嶅簭</option>
                        <option value="asc">鍗囧簭</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="page-limit-select" className="block text-sm font-medium text-gray-300 mb-2">姣忛〉鏄剧ず</label>
                      <select
                        id="page-limit-select"
                        value={query.pagination?.limit || 50}
                        onChange={(e) => handleFilterChange({
                          pagination: {
                            page: 1,
                            limit: parseInt(e?.target.value)
                          }
                        })}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2"
                        aria-label="閫夋嫨姣忛〉鏄剧ず鏁伴噺"
                      >
                        <option value={25}>25 鏉?/option>
                        <option value={50}>50 鏉?/option>
                        <option value={100}>100 鏉?/option>
                        <option value={200}>200 鏉?/option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 鏁版嵁琛ㄦ牸 */}
              <div className="bg-gray-700/30 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <label className="sr-only" htmlFor="select-all-checkbox">鍏ㄩ€?鍙栨秷鍏ㄩ€?/label>
                          <input
                            id="select-all-checkbox"
                            type="checkbox"
                            checked={(records?.length || 0) > 0 && selectedRecords.size === (records?.length || 0)}
                            onChange={(e) => handleSelectAll(e?.target.checked)}
                            className="rounded border-gray-600 bg-gray-700 text-blue-500"
                            aria-label="鍏ㄩ€夋垨鍙栨秷鍏ㄩ€夋墍鏈夎褰?
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">绫诲瀷</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">澶у皬</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">鍒涘缓鏃堕棿</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">鏍囩</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">鎿嶄綔</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                            <div className="flex items-center justify-center space-x-2">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>鍔犺浇涓?..</span>
                            </div>
                          </td>
                        </tr>
                      ) : (records?.length || 0) === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                            鏆傛棤鏁版嵁
                          </td>
                        </tr>
                      ) : (
                        (records || []).map((record) => (
                          <tr key={record.id} className="hover:bg-gray-700/20">
                            <td className="px-4 py-3">
                              <label className="sr-only" htmlFor={`record-checkbox-${record.id}`}>閫夋嫨璁板綍 {record.id}</label>
                              <input
                                id={`record-checkbox-${record.id}`}
                                type="checkbox"
                                checked={selectedRecords.has(record.id)}
                                onChange={(e) => handleRecordSelect(record.id, e?.target.checked)}
                                className="rounded border-gray-600 bg-gray-700 text-blue-500"
                                aria-label={`閫夋嫨璁板綍 ${record.id}`}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                {getTypeIcon(record.type)}
                                <span className="text-sm text-white capitalize">{record.type}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-300 font-mono">{record.id.slice(0, 8)}...</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-300">{formatSize(JSON.stringify(record.data).length)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-300">{formatDate(record.metadata.createdAt)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {record.metadata.tags.slice(0, 2).map((tag: string, index: number) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 text-xs bg-blue-600/20 text-blue-300 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {record.metadata.tags.length > 2 && (
                                  <span className="px-2 py-1 text-xs bg-gray-600/20 text-gray-400 rounded">
                                    +{record.metadata.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  className="text-blue-400 hover:text-blue-300 p-1"
                                  title="鏌ョ湅璇︽儏"
                                  aria-label="鏌ョ湅璇︽儏"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  className="text-green-400 hover:text-green-300 p-1"
                                  title="缂栬緫"
                                  aria-label="缂栬緫璁板綍"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  className="text-gray-400 hover:text-gray-300 p-1"
                                  title="澶嶅埗"
                                  aria-label="澶嶅埗璁板綍"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  className="text-red-400 hover:text-red-300 p-1"
                                  title="鍒犻櫎"
                                  aria-label="鍒犻櫎璁板綍"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && analytics && (
            <div className="space-y-6">
              {/* 缁熻鍗＄墖 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Database className="w-8 h-8 text-blue-400" />
                    <div>
                      <p className="text-sm text-gray-400">鎬昏褰曟暟</p>
                      <p className="text-2xl font-bold text-white">{analytics?.summary?.totalRecords?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <HardDrive className="w-8 h-8 text-green-400" />
                    <div>
                      <p className="text-sm text-gray-400">瀛樺偍浣跨敤</p>
                      <p className="text-2xl font-bold text-white">{formatSize(0)}</p>
                      <p className="text-xs text-gray-500">/ {formatSize(0)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Activity className="w-8 h-8 text-yellow-400" />
                    <div>
                      <p className="text-sm text-gray-400">鏌ヨ鎬ц兘</p>
                      <p className="text-2xl font-bold text-white">0ms</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-8 h-8 text-purple-400" />
                    <div>
                      <p className="text-sm text-gray-400">鏁版嵁璐ㄩ噺</p>
                      <p className="text-2xl font-bold text-white">{analytics?.summary?.dataQuality?.completeness || 0}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 鏁版嵁绫诲瀷鍒嗗竷 */}
              <div className="bg-gray-700/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">鏁版嵁绫诲瀷鍒嗗竷</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(analytics?.summary?.recordsByType || {}).map(([type, count]) => (
                    <div key={type} className="text-center">
                      <div className="flex justify-center mb-2">
                        {getTypeIcon(type)}
                      </div>
                      <p className="text-sm text-gray-400 capitalize">{type}</p>
                      <p className="text-lg font-bold text-white">{count.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 鍏朵粬鏍囩椤靛唴瀹瑰彲浠ョ户缁坊鍔?*/}
          {activeTab !== 'browse' && activeTab !== 'analytics' && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Settings className="w-12 h-12 mx-auto mb-2" />
                <p>姝ゅ姛鑳芥鍦ㄥ紑鍙戜腑...</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </section>
  );
};

export default AdvancedDataManager;
