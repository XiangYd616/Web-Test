import React from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Clock, CheckCircle, XCircle } from 'lucide-react';

const TestResultDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // 模拟测试结果数据
  const testResult = {
    id: id || '1',
    type: '压力测试',
    url: 'https://example.com',
    status: 'success',
    createdAt: '2025-01-15 14:30:00',
    duration: 120,
    score: 85,
    details: {
      totalRequests: 1200,
      successfulRequests: 1140,
      failedRequests: 60,
      averageResponseTime: 245,
      maxResponseTime: 1200,
      minResponseTime: 89,
      throughput: 10.5,
      errorRate: 5.0
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              返回
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">测试结果详情</h2>
              <p className="text-gray-600">测试ID: {testResult.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button type="button" className="btn btn-outline btn-sm flex items-center space-x-1">
              <Share2 className="w-4 h-4" />
              <span>分享</span>
            </button>
            <button type="button" className="btn btn-outline btn-sm flex items-center space-x-1">
              <Download className="w-4 h-4" />
              <span>导出</span>
            </button>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">测试类型</span>
              <span className="text-sm font-medium text-gray-900">{testResult.type}</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">状态</span>
              <div className="flex items-center">
                {testResult.status === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className="text-sm font-medium text-gray-900">
                  {testResult.status === 'success' ? '成功' : '失败'}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">评分</span>
              <span className="text-sm font-medium text-gray-900">{testResult.score}分</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">耗时</span>
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-gray-400 mr-1" />
                <span className="text-sm font-medium text-gray-900">{testResult.duration}s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 详细指标 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">详细指标</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{testResult.details.totalRequests}</div>
            <div className="text-sm text-blue-600">总请求数</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{testResult.details.successfulRequests}</div>
            <div className="text-sm text-green-600">成功请求</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{testResult.details.failedRequests}</div>
            <div className="text-sm text-red-600">失败请求</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{testResult.details.averageResponseTime}ms</div>
            <div className="text-sm text-orange-600">平均响应时间</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-600">{testResult.details.maxResponseTime}ms</div>
            <div className="text-xs text-purple-600">最大响应时间</div>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <div className="text-lg font-bold text-indigo-600">{testResult.details.minResponseTime}ms</div>
            <div className="text-xs text-indigo-600">最小响应时间</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-lg font-bold text-yellow-600">{testResult.details.throughput} req/s</div>
            <div className="text-xs text-yellow-600">吞吐量</div>
          </div>
          <div className="text-center p-4 bg-pink-50 rounded-lg">
            <div className="text-lg font-bold text-pink-600">{testResult.details.errorRate}%</div>
            <div className="text-xs text-pink-600">错误率</div>
          </div>
        </div>
      </div>

      {/* 测试配置 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">测试配置</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">基本配置</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">目标URL:</span>
                <span className="text-gray-900">{testResult.url}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">测试时长:</span>
                <span className="text-gray-900">{testResult.duration}秒</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">并发用户:</span>
                <span className="text-gray-900">10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">测试类型:</span>
                <span className="text-gray-900">恒定负载</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">高级配置</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">HTTP方法:</span>
                <span className="text-gray-900">GET</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">超时时间:</span>
                <span className="text-gray-900">30秒</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">思考时间:</span>
                <span className="text-gray-900">1秒</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">加压时间:</span>
                <span className="text-gray-900">10秒</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 建议和总结 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">测试总结</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">性能评估</h4>
            <p className="text-sm text-gray-600">
              网站在{testResult.duration}秒的压力测试中表现良好，平均响应时间为{testResult.details.averageResponseTime}ms，
              成功率达到{((testResult.details.successfulRequests / testResult.details.totalRequests) * 100).toFixed(1)}%。
            </p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">优化建议</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 考虑优化响应时间，目标控制在200ms以下</li>
              <li>• 监控错误率，建议保持在2%以下</li>
              <li>• 可以尝试增加并发用户数进行更严格的测试</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestResultDetail;
