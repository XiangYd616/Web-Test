import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, Filter, RefreshCw, Trash2 } from 'lucide-react';
import { useAuthCheck } from '../../../components/auth/WithAuthCheck.tsx';

/**
 * 数据管理页面 - 完整实现版
 */
const DataManagement: React.FC = () => {
  useAuthCheck();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/data-management/list');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 导出数据
  const handleExport = async () => {
    try {
      const response = await fetch('/api/data-management/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter, selectedItems })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  // 删除数据
  const handleDelete = async () => {
    if (!selectedItems.length) return;
    
    if (confirm(`确定要删除 ${selectedItems.length} 项数据吗？`)) {
      try {
        const response = await fetch('/api/data-management/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedItems })
        });
        
        if (response.ok) {
          setSelectedItems([]);
          loadData();
        }
      } catch (error) {
        console.error('删除失败:', error);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="w-6 h-6" />
            数据管理
          </h1>
          <p className="text-gray-400 mt-1">管理测试数据、导入导出和批量操作</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
          
          {selectedItems.length > 0 && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              删除 ({selectedItems.length})
            </button>
          )}
        </div>
      </div>

      {/* 筛选器 */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="搜索数据..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>
        <Filter className="w-5 h-5 text-gray-400" />
      </div>

      {/* 数据表格 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
            加载中...
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === data.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(data.map((item: any) => item.id));
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-gray-300">ID</th>
                  <th className="px-4 py-3 text-left text-gray-300">类型</th>
                  <th className="px-4 py-3 text-left text-gray-300">URL</th>
                  <th className="px-4 py-3 text-left text-gray-300">状态</th>
                  <th className="px-4 py-3 text-left text-gray-300">创建时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {data.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, item.id]);
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item.id));
                          }
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-300">{item.id}</td>
                    <td className="px-4 py-3 text-gray-300">{item.type}</td>
                    <td className="px-4 py-3 text-gray-300">{item.url}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        item.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataManagement;