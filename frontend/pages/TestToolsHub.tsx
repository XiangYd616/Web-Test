/**
 * 测试工具中心
 * 统一的测试工具入口和管理界面
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Monitor, Server, Gauge, Shield, // Search, Activity, User, Globe } from 'lucide-react'; // 已修复
const TestToolsHub: React.FC = () => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState('');

  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);
  
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  
  const showFeedback = (type, message, duration = 3000) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, duration);
  };
  
  useEffect(() => {
    if (state.error) {
      showFeedback('error', state.error.message);
    }
  }, [state.error]);
  
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  
  const handleConfirmAction = (action, message) => {
    setConfirmAction({ action, message });
    setShowConfirmDialog(true);
  };
  
  const executeConfirmedAction = async () => {
    if (confirmAction) {
      await confirmAction.action();
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };
  
  const [buttonStates, setButtonStates] = useState({});
  
  const setButtonLoading = (buttonId, loading) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonId]: { ...prev[buttonId], loading }
    }));
  };
  
  const setButtonDisabled = (buttonId, disabled) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonId]: { ...prev[buttonId], disabled }
    }));
  };
  const testTools = [
    { id: 'api', name: 'API测试', icon: Zap, path: '/testing/api', color: 'blue' },
    { id: 'compatibility', name: '兼容性测试', icon: Monitor, path: '/testing/compatibility', color: 'green' },
    { id: 'infrastructure', name: '基础设施测试', icon: Server, path: '/testing/infrastructure', color: 'purple' },
    { id: 'performance', name: '性能测试', icon: Gauge, path: '/testing/performance', color: 'orange' },
    { id: 'security', name: '安全测试', icon: Shield, path: '/testing/security', color: 'red' },
    { id: 'seo', name: 'SEO测试', icon: Search, path: '/testing/seo', color: 'indigo' },
    { id: 'stress', name: '压力测试', icon: Activity, path: '/testing/stress', color: 'pink' },
    { id: 'ux', name: 'UX测试', icon: User, path: '/testing/ux', color: 'teal' },
    { id: 'website', name: '网站测试', icon: Globe, path: '/testing/website', color: 'cyan' }
  ];

  
  if (state.isLoading || loading) {
    
  if (state.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">操作失败</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{state.error.message}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-100 px-2 py-1 text-sm text-red-800 rounded hover:bg-red-200"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  return (
    <div className="test-tools-hub max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          测试工具中心
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          选择需要的测试工具来检测和优化您的网站
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testTools.map(tool => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.id}
              to={tool.path}
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg bg-${tool.color}-100 dark:bg-${tool.color}-900`}>
                  <Icon className={`w-6 h-6 text-${tool.color}-600 dark:text-${tool.color}-400`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {tool.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    点击开始测试
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default TestToolsHub;