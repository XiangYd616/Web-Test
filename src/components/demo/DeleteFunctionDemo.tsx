import React, { useState } from 'react';
import { Trash2, Plus, CheckCircle } from 'lucide-react';
import { DeleteConfirmDialog } from '../common/DeleteConfirmDialog';
import { showToast } from '../common/Toast';

interface TestRecord {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export const DeleteFunctionDemo: React.FC = () => {
  // 模拟测试记录数据
  const [records, setRecords] = useState<TestRecord[]>([
    { id: '1', name: '压力测试 - 百度首页', status: 'completed', createdAt: '2025-08-06 10:30:00' },
    { id: '2', name: '压力测试 - 谷歌搜索', status: 'completed', createdAt: '2025-08-06 11:15:00' },
    { id: '3', name: '压力测试 - GitHub API', status: 'failed', createdAt: '2025-08-06 12:00:00' },
    { id: '4', name: '压力测试 - 本地服务器', status: 'running', createdAt: '2025-08-06 12:30:00' },
    { id: '5', name: '压力测试 - 电商网站', status: 'completed', createdAt: '2025-08-06 13:00:00' },
  ]);

  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  // 删除确认对话框状态
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'single' | 'batch';
    recordId?: string;
    recordName?: string;
    recordNames?: string[];
    isLoading: boolean;
  }>({
    isOpen: false,
    type: 'single',
    isLoading: false
  });

  // 打开单个删除确认对话框
  const openDeleteDialog = (recordId: string) => {
    const recordToDelete = records.find(r => r.id === recordId);
    const recordName = recordToDelete ? recordToDelete.name : '测试记录';

    setDeleteDialog({
      isOpen: true,
      type: 'single',
      recordId,
      recordName,
      isLoading: false
    });
  };

  // 打开批量删除确认对话框
  const openBatchDeleteDialog = () => {
    if (selectedRecords.size === 0) {
      showToast.error('请先选择要删除的记录');
      return;
    }

    const recordsToDelete = records.filter(r => selectedRecords.has(r.id));
    const recordNames = recordsToDelete.map(r => r.name);

    setDeleteDialog({
      isOpen: true,
      type: 'batch',
      recordNames,
      isLoading: false
    });
  };

  // 关闭删除对话框
  const closeDeleteDialog = () => {
    setDeleteDialog(prev => ({ ...prev, isOpen: false }));
  };

  // 执行单个删除
  const deleteRecord = async (recordId: string) => {
    const recordToDelete = records.find(r => r.id === recordId);
    const recordName = recordToDelete ? recordToDelete.name : '测试记录';

    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 从本地状态中移除记录
    setRecords(prev => prev.filter(r => r.id !== recordId));
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      newSet.delete(recordId);
      return newSet;
    });

    showToast.success(`"${recordName}" 已成功删除`);
  };

  // 执行批量删除
  const batchDeleteRecords = async () => {
    const recordsToDelete = records.filter(r => selectedRecords.has(r.id));
    
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 从本地状态中移除记录
    setRecords(prev => prev.filter(r => !selectedRecords.has(r.id)));
    const deletedCount = selectedRecords.size;
    setSelectedRecords(new Set());

    showToast.success(`成功删除 ${deletedCount} 条记录`);
  };

  // 确认删除操作
  const confirmDelete = async () => {
    if (!deleteDialog.isOpen) return;

    setDeleteDialog(prev => ({ ...prev, isLoading: true }));

    try {
      if (deleteDialog.type === 'single' && deleteDialog.recordId) {
        await deleteRecord(deleteDialog.recordId);
      } else if (deleteDialog.type === 'batch') {
        await batchDeleteRecords();
      }
      closeDeleteDialog();
    } catch (error) {
      console.error('删除操作失败:', error);
      showToast.error('删除操作失败，请稍后重试');
    } finally {
      setDeleteDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  // 切换记录选择状态
  const toggleRecordSelection = (recordId: string) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(records.map(r => r.id)));
    }
  };

  // 添加新记录（演示用）
  const addNewRecord = () => {
    const newRecord: TestRecord = {
      id: Date.now().toString(),
      name: `新测试记录 - ${new Date().toLocaleTimeString()}`,
      status: 'completed',
      createdAt: new Date().toLocaleString()
    };
    setRecords(prev => [newRecord, ...prev]);
    showToast.success('已添加新的测试记录');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-900/20';
      case 'running': return 'text-blue-400 bg-blue-900/20';
      case 'failed': return 'text-red-400 bg-red-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            测试历史删除功能演示
          </h1>
          <p className="text-gray-400">
            演示单个删除和批量删除功能，包含确认对话框和Toast提示
          </p>
        </div>

        {/* 操作栏 */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-800 rounded-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={addNewRecord}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加记录
            </button>
            
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              {selectedRecords.size === records.length ? '取消全选' : '全选'}
            </button>
          </div>

          {selectedRecords.size > 0 && (
            <button
              onClick={openBatchDeleteDialog}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              删除选中 ({selectedRecords.size})
            </button>
          )}
        </div>

        {/* 记录列表 */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">
              测试记录列表 ({records.length} 条)
            </h2>
          </div>

          {records.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              暂无测试记录，点击"添加记录"创建新的测试记录
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {records.map((record) => (
                <div
                  key={record.id}
                  className={`p-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors ${
                    selectedRecords.has(record.id) ? 'bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedRecords.has(record.id)}
                      onChange={() => toggleRecordSelection(record.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    
                    <div>
                      <h3 className="text-white font-medium">{record.name}</h3>
                      <p className="text-gray-400 text-sm">{record.createdAt}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                    
                    <button
                      onClick={() => openDeleteDialog(record.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                      title="删除记录"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 删除确认对话框 */}
        <DeleteConfirmDialog
          isOpen={deleteDialog.isOpen}
          onClose={closeDeleteDialog}
          onConfirm={confirmDelete}
          title={deleteDialog.type === 'single' ? '删除测试记录' : '批量删除测试记录'}
          message={
            deleteDialog.type === 'single'
              ? `确定要删除测试记录 "${deleteDialog.recordName}" 吗？`
              : `确定要删除选中的 ${selectedRecords.size} 条测试记录吗？`
          }
          itemNames={deleteDialog.type === 'single' ? [deleteDialog.recordName || ''] : deleteDialog.recordNames || []}
          isLoading={deleteDialog.isLoading}
          type={deleteDialog.type}
        />
      </div>
    </div>
  );
};
