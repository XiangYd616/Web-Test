/**
 * Dashboard 首页视图 — 英雄区 + 最近测试 + 核心指标
 * 仅在无测试结果时显示，替代原来的空状态
 */

import { useCallback } from 'react';

import { type TestType, useTestConfig, useTestHistory } from '../../context/TestContext';

import DashboardHero from './DashboardHero';
import MetricsOverview from './MetricsOverview';
import RecentTestsSection from './RecentTestsSection';

const DashboardHomePage = () => {
  const { updateUrl, selectTestType, updateConfigText, applyPreset } = useTestConfig();
  const { history, historyPagination } = useTestHistory();

  const handleStartTest = useCallback(
    (urls: string[], types: TestType[], mode: string) => {
      const firstUrl = urls[0] || '';
      updateUrl(firstUrl);
      if (types.length > 0) {
        selectTestType(types[0]);
      }
      // 根据快捷模式应用预设配置
      if (mode === 'fast') {
        applyPreset('Fast');
      } else if (mode === 'quality') {
        applyPreset('High');
      } else if (mode === 'last') {
        // 'last' 模式：不改动配置，复用当前/上次配置
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.dispatchEvent(new CustomEvent('tw:focus-url-and-run'));
    },
    [updateUrl, selectTestType, applyPreset]
  );

  const handleRerun = useCallback(
    (item: { url: string; type: TestType; configText: string }) => {
      updateUrl(item.url);
      selectTestType(item.type);
      if (item.configText) {
        updateConfigText(item.configText);
      }
      window.dispatchEvent(new CustomEvent('tw:focus-url-and-run'));
    },
    [updateUrl, selectTestType, updateConfigText]
  );

  return (
    <div className='tw-home'>
      <DashboardHero onStartTest={handleStartTest} />
      <RecentTestsSection items={history} onRerun={handleRerun} />
      <MetricsOverview items={history} pagination={historyPagination} />
    </div>
  );
};

export default DashboardHomePage;
