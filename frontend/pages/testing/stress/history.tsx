/**
 * Stress Test History Page - 压力测试历史页面
 *
 * 文件路径: frontend/pages/testing/stress/history.tsx
 * 创建时间: 2025-11-13
 *
 * 功能:使用配置驱动的TestHistory组件展示压力测试历史
 */

import { TestHistory } from '@/components/common/TestHistory/TestHistory';
import { stressTestConfig } from '@/components/common/TestHistory/config';
import type { TestRecord } from '@/components/common/TestHistory/types';
import React from 'react';

/**
 * 压力测试历史页面组件
 */
const StressTestHistoryPage: React.FC = () => {
  // 自定义记录点击处理
  const handleRecordClick = (record: TestRecord) => {
    // 导航到详情页
    window.location.href = `/testing/stress/detail/${record.id}`;
  };

  // 自定义删除处理
  const handleRecordDelete = async (id: string) => {
    // 调用API删除
    const response = await fetch(`/api/test/history/${id}`, {
      method: 'DELETE',
      headers: {
        ...(localStorage.getItem('auth_token')
          ? {
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            }
          : {}),
      },
    });

    if (!response.ok) {
      throw new Error('删除失败');
    }
  };

  // 批量删除处理
  const handleBatchDelete = async (ids: string[]) => {
    const response = await fetch('/api/test/batch-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('auth_token')
          ? {
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            }
          : {}),
      },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error('批量删除失败');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <TestHistory
        config={stressTestConfig}
        onRecordClick={handleRecordClick}
        onRecordDelete={handleRecordDelete}
        onBatchDelete={handleBatchDelete}
      />
    </div>
  );
};

export default StressTestHistoryPage;
