/**
 * 测试结果详情页面
 * 显示测试结果详情和协作批注功能
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReportAnnotations from '../components/collaboration/ReportAnnotations';
import { PageLayout } from '../components/common/Layout';
import { useAuth } from '../contexts/AuthContext';

interface TestResultDetailProps {
  children?: React.ReactNode;
}

const TestResultDetail: React.FC<TestResultDetailProps> = ({ children }) => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 加载测试结果数据
  useEffect(() => {
    if (!id) return;

    const loadTestResult = async () => {
      try {
        // 这里应该调用实际的API获取测试结果
        // const response = await fetch(`/api/test-results/${id}`);
        // const data = await response.json();

        // 模拟数据
        const mockData = {
          id,
          testName: '网站综合测试',
          testType: 'website',
          url: 'https://example.com',
          status: 'completed',
          score: 85,
          duration: 120000,
          createdAt: new Date().toISOString(),
          results: {
            performance: { score: 90 },
            security: { score: 80 },
            seo: { score: 85 },
            accessibility: { score: 88 },
          },
        };

        setTestResult(mockData);
      } catch (error) {
        console.error('加载测试结果失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTestResult();
  }, [id]);

  if (loading) {
    return (
      <PageLayout
        title="测试结果详情"
        description="查看测试结果详细信息和协作批注"
        background="light"
        maxWidth="2xl"
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    );
  }

  if (!testResult) {
    return (
      <PageLayout
        title="测试结果详情"
        description="查看测试结果详细信息和协作批注"
        background="light"
        maxWidth="2xl"
      >
        <div className="text-center py-8">
          <p className="text-gray-500">未找到测试结果</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={`测试结果详情 - ${testResult.testName}`}
      description="查看测试结果详细信息和协作批注"
      background="light"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* 测试结果概览 */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">测试概览</h2>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                testResult.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {testResult.status === 'completed' ? '已完成' : '进行中'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">测试名称</p>
              <p className="font-medium">{testResult.testName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">目标URL</p>
              <p className="font-medium">{testResult.url}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">总体评分</p>
              <p className="font-medium text-lg">{testResult.score}/100</p>
            </div>
          </div>
        </div>

        {/* 详细结果 */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">详细结果</h2>
          <div className="space-y-4">
            {Object.entries(testResult.results || {}).map(([key, result]: [string, any]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium capitalize">{key}</span>
                <span className="font-semibold">{result.score}/100</span>
              </div>
            ))}
          </div>
        </div>

        {/* 协作批注 */}
        <ReportAnnotations
          reportId={id!}
          currentUser={
            user
              ? {
                  id: user.id,
                  name: user.profile.fullName || user.username || user.email,
                  avatar: user.profile.avatar,
                }
              : undefined
          }
          onAnnotationAdd={annotation => {
            console.log('批注已添加:', annotation);
          }}
          onAnnotationUpdate={annotation => {
            console.log('批注已更新:', annotation);
          }}
          onAnnotationDelete={annotationId => {
            console.log('批注已删除:', annotationId);
          }}
        />
      </div>
    </PageLayout>
  );
};

export default TestResultDetail;
