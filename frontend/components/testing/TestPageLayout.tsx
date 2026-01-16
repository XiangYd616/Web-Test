import { LucideIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getTestHistoryConfig } from '../common/TestHistory/config';
import { TestHistory } from '../common/TestHistory/TestHistory';
import type { TestRecord } from '../common/TestHistory/types';
import TestHeader from './TestHeader';

interface TestPageLayoutProps {
  // 页面基本信息
  testType:
    | 'stress'
    | 'security'
    | 'api'
    | 'performance'
    | 'compatibility'
    | 'seo'
    | 'accessibility'
    | 'website'
    | 'network'
    | 'ux'
    | 'database';
  title: string;
  description: string;
  icon: LucideIcon;

  // 主题色彩配置（可选，会根据testType自动选择）
  primaryColor?: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'indigo' | 'pink' | 'orange';
  secondaryColor?: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'indigo' | 'pink' | 'orange';

  // 测试内容
  testContent: React.ReactNode;

  // 测试控制
  testStatus?: 'idle' | 'running' | 'completed' | 'failed';
  isTestDisabled?: boolean;
  onStartTest?: () => void;
  onStopTest?: () => void;

  // 历史记录处理
  onTestSelect?: (test: TestRecord) => void;
  onTestRerun?: (test: TestRecord) => void;
  onTestDelete?: (id: string) => Promise<void>;

  // 额外控制
  extraControls?: React.ReactNode;

  // 其他组件（如登录提示）
  additionalComponents?: React.ReactNode;

  // 样式
  className?: string;

  // 自定义标签页标签
  testTabLabel?: string;
  historyTabLabel?: string;
}

export const TestPageLayout: React.FC<TestPageLayoutProps> = ({
  testType,
  title,
  description,
  icon,
  primaryColor,
  secondaryColor,
  testContent,
  testStatus = 'idle',
  isTestDisabled = false,
  onStartTest,
  onStopTest,
  onTestSelect,
  onTestRerun,
  onTestDelete,
  extraControls,
  additionalComponents,
  className = '',
  testTabLabel,
  historyTabLabel,
}) => {
  const location = useLocation();

  // 根据测试类型自动选择颜色主题
  const getTestTypeColors = (type: string) => {
    const colorMap = {
      stress: { primary: 'red' as const, secondary: 'orange' as const },
      security: { primary: 'purple' as const, secondary: 'indigo' as const },
      api: { primary: 'green' as const, secondary: 'blue' as const },
      performance: { primary: 'yellow' as const, secondary: 'orange' as const },
      compatibility: { primary: 'indigo' as const, secondary: 'purple' as const },
      seo: { primary: 'green' as const, secondary: 'blue' as const },
      accessibility: { primary: 'blue' as const, secondary: 'green' as const },
      website: { primary: 'indigo' as const, secondary: 'blue' as const },
      network: { primary: 'blue' as const, secondary: 'green' as const },
      ux: { primary: 'pink' as const, secondary: 'purple' as const },
      database: { primary: 'purple' as const, secondary: 'blue' as const },
    };
    return (
      colorMap[type as keyof typeof colorMap] || {
        primary: 'blue' as const,
        secondary: 'green' as const,
      }
    );
  };

  const colors = getTestTypeColors(testType);
  const finalPrimaryColor = primaryColor || colors.primary;
  const finalSecondaryColor = secondaryColor || colors.secondary;

  // 状态持久化的键名
  const storageKey = `test-engine-page-${testType}-active-tab`;

  // 标签页状态（支持状态持久化）
  const [activeTab, setActiveTab] = useState<'test' | 'history'>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return (saved as 'test' | 'history') || 'test';
    } catch {
      return 'test';
    }
  });

  // 处理从其他页面导航过来时的标签页状态
  useEffect(() => {
    if (location.state) {
      const state = location.state as any;
      if (state.activeTab) {
        setActiveTab(state.activeTab);
      }
    }
  }, [location.state]);

  // 状态持久化
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, activeTab);
    } catch {
      // 忽略存储错误
    }
  }, [activeTab, storageKey]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            setActiveTab('test');
            break;
          case '2':
            event.preventDefault();
            setActiveTab('history');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 默认的历史记录处理函数
  const handleTestSelect = (test: TestRecord) => {
    setActiveTab('test');
    onTestSelect?.(test);
  };

  const handleTestRerun = (test: TestRecord) => {
    setActiveTab('test');
    onTestRerun?.(test);
  };

  const handleTabChange = (tab: 'test' | 'history') => {
    setActiveTab(tab);
  };

  return (
    <div className={`space-y-4 dark-page-scrollbar ${className}`}>
      {/* 统一的测试页面头部 */}
      <TestHeader
        title={title}
        description={description}
        icon={icon}
        primaryColor={finalPrimaryColor}
        secondaryColor={finalSecondaryColor}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        testTabLabel={testTabLabel}
        historyTabLabel={historyTabLabel}
        testStatus={testStatus}
        isTestDisabled={isTestDisabled}
        onStartTest={onStartTest}
        onStopTest={onStopTest}
        extraControls={extraControls}
      />

      {/* 标签页内容 */}
      <div className="relative">
        {/* 测试标签页内容 */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            activeTab === 'test'
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none absolute inset-0'
          }`}
        >
          {testContent}
        </div>

        {/* 历史记录标签页 */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            activeTab === 'history'
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none absolute inset-0'
          }`}
        >
          {(() => {
            const config = getTestHistoryConfig(testType);
            if (!config) {
              return null;
            }
            return (
              <TestHistory
                config={config}
                onRecordClick={handleTestSelect}
                onRecordDelete={onTestDelete}
              />
            );
          })()}
        </div>
      </div>

      {/* 其他组件（如登录提示等） */}
      {additionalComponents}
    </div>
  );
};

export default TestPageLayout;
