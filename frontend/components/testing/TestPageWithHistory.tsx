/**
 * 通用的测试页面组件，包含测试和历史两个标签页
 * 基于压力测试页面的标签页设计
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface TestPageWithHistoryProps {
  testType: 'stress' | 'security' | 'api' | 'performance' | 'compatibility' | 'seo' | 'accessibility';
  testName: string;
  testIcon?: string;
  testContent: React.ReactNode;
  historyContent: React.ReactNode;
  className?: string;
  defaultTab?: 'test' | 'history';
  onTabChange?: (tab: 'test' | 'history') => void;
}

export const TestPageWithHistory: React.FC<TestPageWithHistoryProps> = ({
  testType,
  testName,
  testIcon = '🔧',
  testContent,
  historyContent,
  className = '',
  defaultTab = 'test',
  onTabChange
}) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'test' | 'history'>(defaultTab);

  // 处理从其他页面导航过来时的标签页状态
  useEffect(() => {
    if (location.state) {
      const state = location.state as any;
      if (state.activeTab) {
        setActiveTab(state.activeTab);
      }
    }
  }, [location.state]);

  // 处理标签页切换
  const handleTabChange = (tab: 'test' | 'history') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className={`test-page-with-history ${className}`}>
      {/* 标签页切换按钮 */}
      <div className="tab-switcher">
        <div className="flex items-center bg-gray-700/50 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => handleTabChange('test')}
            className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
              activeTab === 'test'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>{testIcon}</span>
              {testName}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('history')}
            className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
            }`}
          >
            测试历史
          </button>
        </div>
      </div>

      {/* 标签页内容 */}
      <div className="tab-content">
        {activeTab === 'test' ? (
          <div className="test-content">
            {testContent}
          </div>
        ) : (
          <div className="history-content">
            {historyContent}
          </div>
        )}
      </div>

      {/* 样式 */}
      <style jsx>{`
        .test-page-with-history {
          min-height: 100vh;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        }

        .tab-switcher {
          position: sticky;
          top: 0;
          z-index: 10;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(71, 85, 105, 0.3);
          padding: 16px 24px;
          display: flex;
          justify-content: center;
        }

        .tab-content {
          flex: 1;
          padding: 24px;
        }

        .test-content,
        .history-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* 响应式设计 */
        @media (max-width: 768px) {
          .tab-switcher {
            padding: 12px 16px;
          }

          .tab-content {
            padding: 16px;
          }

          .tab-switcher button {
            padding: 8px 12px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default TestPageWithHistory;
