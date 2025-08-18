/**
 * 测试历史页面
 * 使用统一的测试历史组件和布局
 */

import { FileText    } from 'lucide-react';import React, { useState, useEffect    } from 'react';import { PageLayout    } from '../../../components/layout/PageLayout.tsx';import TestHistoryComponent from './TestHistory.tsx';const TestHistory: React.FC  = () => {
  // 页面级功能
  const [pageTitle, setPageTitle] = useState("");
  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible') {'`
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
  
  if (state.isLoading || loading) {
    
  if (state.error) {
    return (<div className= 'bg-red-50 border border-red-200 rounded-md p-4'>
        <div className= 'flex'>
          <div className= 'flex-shrink-0'>
            <svg className= 'h-5 w-5 text-red-400' viewBox= '0 0 20 20' fill= 'currentColor'>
              <path fillRule= 'evenodd' d= 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clipRule= 'evenodd' />
            </svg>
          </div>
          <div className= 'ml-3'>
            <h3 className= 'text-sm font-medium text-red-800'>操作失败</h3>
            <div className= 'mt-2 text-sm text-red-700'>
              <p>{state.error.message}</p>
            </div>
            <div className= 'mt-4'>
              <button
                onClick={() => window.location.reload()}
                className= 'bg-red-100 px-2 py-1 text-sm text-red-800 rounded hover:bg-red-200'
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
      <div className= 'flex justify-center items-center h-64'>
        <div className= 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
        <span className= 'ml-3 text-gray-600'>加载中...</span>
      </div>
    );
  }

  return (
    <PageLayout
      title= '测试历史'
      description= '查看和管理您的所有测试记录，包括性能、安全、SEO等各类测试结果'
      icon={FileText}
      background= 'dark'
      maxWidth= 'xl'
    >
      <TestHistoryComponent testType= 'all'    />
    </PageLayout>
  );
};

export default TestHistory;
