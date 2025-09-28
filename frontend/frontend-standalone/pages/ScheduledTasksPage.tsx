/**
 * 定时任务页面
 * 集成定时任务管理组件，提供完整的定时任务管理界面
 */

import React, { useState, useCallback } from 'react';
import { 
  Clock, 
  Settings,
  Download,
  Upload,
  RefreshCw,
  Info,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Bell,
  TrendingUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ScheduledTaskManager from '../components/scheduling/ScheduledTaskManager';

interface PageStats {
  todayExecutions: number;
  weekExecutions: number;
  avgSuccessRate: number;
  nextScheduled: Date | null;
  alertCount: number;
}

const ScheduledTasksPage: React.FC = () => {
  const [pageStats, setPageStats] = useState<PageStats>({
    todayExecutions: 12,
    weekExecutions: 89,
    avgSuccessRate: 94.2,
    nextScheduled: new Date(Date.now() + 3600000), // 1小时后
    alertCount: 2
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // 处理任务创建
  const handleTaskCreate = useCallback((task: any) => {
    console.log('New task created:', task);
    // 可以在这里处理任务创建后的逻辑，比如发送到后端API
    
    // 更新页面统计
    setPageStats(prev => ({
      ...prev,
      nextScheduled: task.nextRun || prev.nextScheduled
    }));
  }, []);

  // 处理任务更新
  const handleTaskUpdate = useCallback((task: any) => {
    console.log('Task updated:', task);
    // 处理任务更新逻辑
  }, []);

  // 处理任务删除
  const handleTaskDelete = useCallback((taskId: string) => {
    console.log('Task deleted:', taskId);
    // 处理任务删除逻辑
  }, []);

  // 导出任务配置
  const exportTasks = useCallback(() => {
    // 模拟导出功能
    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      tasks: [], // 这里应该是实际的任务数据
      settings: {
        timezone: 'Asia/Shanghai',
        notificationDefaults: {
          email: true,
          webhook: false
        }
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scheduled-tasks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('任务配置导出成功');
  }, []);

  // 导入任务配置
  const importTasks = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      toast.error('请选择有效的JSON文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        console.log('Import data:', importData);
        
        // 这里可以验证导入数据的格式
        if (!importData.version || !importData.tasks) {
          throw new Error('无效的配置文件格式');
        }

        // 处理导入逻辑
        toast.success(`成功导入 ${importData.tasks.length} 个任务配置`);
        setShowImportModal(false);
      } catch (error) {
        toast.error('导入配置文件失败：' + (error as Error).message);
      }
    };

    reader.onerror = () => {
      toast.error('读取文件失败');
    };

    reader.readAsText(file);
    event.target.value = '';
  }, []);

  // 系统设置
  const systemSettings = {
    timezone: 'Asia/Shanghai',
    maxConcurrentTasks: 5,
    logRetentionDays: 30,
    emailNotifications: true,
    webhookTimeout: 30,
    autoCleanupFailedTasks: true,
    defaultRetryCount: 3
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">定时任务管理</h1>
                  <p className="text-sm text-gray-600">自动化测试调度与监控</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* 刷新按钮 */}
              <button
                onClick={() => window.location.reload()}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="刷新页面"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              {/* 导入按钮 */}
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={importTasks}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button
                  className="flex items-center space-x-2 px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title="导入任务配置"
                >
                  <Upload className="w-4 h-4" />
                  <span>导入</span>
                </button>
              </div>

              {/* 导出按钮 */}
              <button
                onClick={exportTasks}
                className="flex items-center space-x-2 px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="导出任务配置"
              >
                <Download className="w-4 h-4" />
                <span>导出</span>
              </button>

              {/* 设置按钮 */}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="系统设置"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 页面统计卡片 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">今日执行</p>
                <p className="text-3xl font-bold text-blue-600">{pageStats.todayExecutions}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">本周执行</p>
                <p className="text-3xl font-bold text-purple-600">{pageStats.weekExecutions}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">平均成功率</p>
                <p className="text-3xl font-bold text-green-600">{pageStats.avgSuccessRate}%</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">下次调度</p>
                <p className="text-sm font-bold text-gray-900">
                  {pageStats.nextScheduled 
                    ? pageStats.nextScheduled.toLocaleTimeString('zh-CN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    : '无'
                  }
                </p>
                <p className="text-xs text-gray-500">
                  {pageStats.nextScheduled 
                    ? new Date(pageStats.nextScheduled).toLocaleDateString('zh-CN')
                    : ''
                  }
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">需要关注</p>
                <p className="text-3xl font-bold text-red-600">{pageStats.alertCount}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 主要内容 */}
        <ScheduledTaskManager
          onTaskCreate={handleTaskCreate}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
        />
      </div>

      {/* 系统设置模态框 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">系统设置</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 基本设置 */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">基本设置</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    时区设置
                  </label>
                  <select
                    defaultValue={systemSettings.timezone}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Asia/Shanghai">中国标准时间 (UTC+8)</option>
                    <option value="UTC">协调世界时 (UTC)</option>
                    <option value="America/New_York">美国东部时间</option>
                    <option value="Europe/London">英国时间</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最大并发任务数
                  </label>
                  <input
                    type="number"
                    defaultValue={systemSettings.maxConcurrentTasks}
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    日志保留天数
                  </label>
                  <input
                    type="number"
                    defaultValue={systemSettings.logRetentionDays}
                    min="7"
                    max="365"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* 通知设置 */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">通知设置</h4>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked={systemSettings.emailNotifications}
                      className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">启用邮件通知</span>
                  </label>

                  <div className="ml-7">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Webhook 超时 (秒)
                    </label>
                    <input
                      type="number"
                      defaultValue={systemSettings.webhookTimeout}
                      min="5"
                      max="120"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* 任务管理 */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">任务管理</h4>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked={systemSettings.autoCleanupFailedTasks}
                      className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">自动清理失败任务</span>
                  </label>

                  <div className="ml-7">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      默认重试次数
                    </label>
                    <input
                      type="number"
                      defaultValue={systemSettings.defaultRetryCount}
                      min="0"
                      max="10"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                取消
              </button>
              <button
                onClick={() => {
                  toast.success('设置已保存');
                  setShowSettings(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 信息提示 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-1">使用提示</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• 定时任务基于服务器时区执行，请确保时区设置正确</p>
                <p>• 建议将重要任务设置多种通知方式以确保及时收到执行结果</p>
                <p>• 可以导出任务配置进行备份，或在其他环境中导入</p>
                <p>• 系统会自动处理任务冲突和资源限制，确保稳定运行</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduledTasksPage;
