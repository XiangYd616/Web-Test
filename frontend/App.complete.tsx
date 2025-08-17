/**
 * 完整版应用程序主组件
 * 整合了所有增强的上下文、组件和功能
 * 提供完整的Web测试平台体验
 */

import React, { Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 增强的上下文提供者
import { EnhancedAuthProvider } from './contexts/EnhancedAuthContext';
import { EnhancedThemeProvider } from './contexts/EnhancedThemeContext';
import { EnhancedAppProvider } from './contexts/EnhancedAppContext';

// 错误边界
import EnhancedErrorBoundary from './components/common/EnhancedErrorBoundary';

// 增强的UI组件
import { LineChart, BarChart, PieChart, AreaChart } from './components/charts/Charts';
import { DataTable } from './components/data/DataTable';
import { EnhancedModal, EnhancedConfirmModal } from './components/ui/EnhancedModal';

// 基础组件
import SimpleTestTools from './components/testing/SimpleTestTools';
import { StatCard } from './components/charts/SimpleCharts';

// 加载组件
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-600">正在加载完整版功能...</p>
    </div>
  </div>
);

// 完整版仪表板组件
const CompleteDashboard = () => {
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 示例图表数据
  const chartData = [
    {
      name: '性能测试',
      data: [
        { x: '1月', y: 120 },
        { x: '2月', y: 150 },
        { x: '3月', y: 180 },
        { x: '4月', y: 200 },
        { x: '5月', y: 170 },
        { x: '6月', y: 220 }
      ]
    },
    {
      name: '安全测试',
      data: [
        { x: '1月', y: 80 },
        { x: '2月', y: 90 },
        { x: '3月', y: 110 },
        { x: '4月', y: 130 },
        { x: '5月', y: 120 },
        { x: '6月', y: 140 }
      ]
    }
  ];

  const pieData = [
    { x: '成功', y: 85, color: '#10B981' },
    { x: '失败', y: 10, color: '#EF4444' },
    { x: '警告', y: 5, color: '#F59E0B' }
  ];

  // 示例表格数据
  const tableData = [
    {
      id: 1,
      url: 'https://example.com',
      type: '性能测试',
      status: '完成',
      score: 95,
      time: '2025-01-17 12:30:00',
      duration: '2.5s'
    },
    {
      id: 2,
      url: 'https://test.com',
      type: '安全测试',
      status: '进行中',
      score: 88,
      time: '2025-01-17 12:25:00',
      duration: '3.2s'
    },
    {
      id: 3,
      url: 'https://demo.com',
      type: 'SEO测试',
      status: '失败',
      score: 72,
      time: '2025-01-17 12:20:00',
      duration: '1.8s'
    }
  ];

  const tableColumns = [
    {
      key: 'url',
      title: '测试URL',
      dataIndex: 'url',
      sortable: true,
      searchable: true,
      render: (value: string) => (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
          {value}
        </a>
      )
    },
    {
      key: 'type',
      title: '测试类型',
      dataIndex: 'type',
      sortable: true,
      filterable: true,
      filters: [
        { text: '性能测试', value: '性能测试' },
        { text: '安全测试', value: '安全测试' },
        { text: 'SEO测试', value: 'SEO测试' }
      ]
    },
    {
      key: 'status',
      title: '状态',
      dataIndex: 'status',
      sortable: true,
      render: (value: string) => {
        const statusColors = {
          '完成': 'bg-green-100 text-green-800',
          '进行中': 'bg-blue-100 text-blue-800',
          '失败': 'bg-red-100 text-red-800'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${statusColors[value as keyof typeof statusColors]}`}>
            {value}
          </span>
        );
      }
    },
    {
      key: 'score',
      title: '评分',
      dataIndex: 'score',
      sortable: true,
      align: 'center' as const,
      render: (value: number) => (
        <span className={`font-semibold ${value >= 90 ? 'text-green-600' : value >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
          {value}
        </span>
      )
    },
    {
      key: 'time',
      title: '测试时间',
      dataIndex: 'time',
      sortable: true
    },
    {
      key: 'duration',
      title: '耗时',
      dataIndex: 'duration',
      sortable: true,
      align: 'center' as const
    }
  ];

  return (
    <EnhancedErrorBoundary level="page">
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Test Web App - 完整版专业Web测试平台
            </h1>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                打开模态框
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                确认对话框
              </button>
            </div>
          </div>
          
          {/* 状态概览 */}
          <EnhancedErrorBoundary level="section">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="总测试数"
                value="1,234"
                change="+12% 本月"
                changeType="positive"
              />
              <StatCard
                title="成功率"
                value="98.5%"
                change="+2.1% 本周"
                changeType="positive"
              />
              <StatCard
                title="平均响应时间"
                value="245ms"
                change="-15ms 优化"
                changeType="positive"
              />
              <StatCard
                title="活跃用户"
                value="156"
                change="+8 今日"
                changeType="positive"
              />
            </div>
          </EnhancedErrorBoundary>

          {/* 图表展示 */}
          <EnhancedErrorBoundary level="section">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">测试趋势</h3>
                <LineChart
                  data={chartData}
                  title="月度测试趋势"
                  config={{ height: 300, legend: true, tooltip: true }}
                />
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">测试结果分布</h3>
                <PieChart
                  data={pieData}
                  title="测试结果分布"
                  config={{ height: 300, legend: true, tooltip: true }}
                />
              </div>
            </div>
          </EnhancedErrorBoundary>

          {/* 柱状图和面积图 */}
          <EnhancedErrorBoundary level="section">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">测试类型对比</h3>
                <BarChart
                  data={chartData}
                  title="测试类型对比"
                  config={{ height: 300, legend: true, tooltip: true }}
                />
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">测试量趋势</h3>
                <AreaChart
                  data={chartData}
                  title="测试量趋势"
                  config={{ height: 300, legend: true, tooltip: true }}
                />
              </div>
            </div>
          </EnhancedErrorBoundary>

          {/* 数据表格 */}
          <EnhancedErrorBoundary level="section">
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">最近测试记录</h3>
              </div>
              <div className="p-6">
                <DataTable
                  columns={tableColumns}
                  dataSource={tableData}
                  pagination={{
                    current: 1,
                    pageSize: 10,
                    total: tableData.length,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: true
                  }}
                  selection={{
                    type: 'checkbox',
                    onChange: (selectedRowKeys, selectedRows) => {
                      console.log('选中的行:', selectedRowKeys, selectedRows);
                    }
                  }}
                  onExport={(data, format) => {
                    console.log('导出数据:', data, format);
                  }}
                />
              </div>
            </div>
          </EnhancedErrorBoundary>

          {/* 主要测试工具 */}
          <EnhancedErrorBoundary level="section">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">网站测试工具</h3>
              </div>
              <div className="p-6">
                <SimpleTestTools />
              </div>
            </div>
          </EnhancedErrorBoundary>

          {/* 模态框示例 */}
          <EnhancedModal
            visible={showModal}
            title="增强版模态框"
            onCancel={() => setShowModal(false)}
            onOk={() => {
              console.log('确定按钮被点击');
              setShowModal(false);
            }}
            width={600}
          >
            <div className="space-y-4">
              <p>这是一个增强版的模态框组件，支持：</p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>焦点管理和键盘导航</li>
                <li>无障碍访问支持</li>
                <li>流畅的动画效果</li>
                <li>可定制的样式和行为</li>
                <li>完整的事件回调</li>
              </ul>
            </div>
          </EnhancedModal>

          {/* 确认对话框示例 */}
          <EnhancedConfirmModal
            visible={showConfirm}
            type="warning"
            title="确认操作"
            content="您确定要执行此操作吗？此操作不可撤销。"
            onCancel={() => setShowConfirm(false)}
            onOk={() => {
              console.log('确认操作');
              setShowConfirm(false);
            }}
            okText="确认"
            cancelText="取消"
            okType="danger"
          />
        </div>
      </div>
    </EnhancedErrorBoundary>
  );
};

// 完整版登录组件
const CompleteLogin = () => (
  <EnhancedErrorBoundary level="page">
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">登录</h2>
          <p className="text-gray-600 mt-2">Test Web App - 完整版</p>
        </div>
        
        <form className="space-y-6">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              邮箱地址
            </label>
            <input 
              type="email" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入邮箱地址"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              密码
            </label>
            <input 
              type="password" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入密码"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span className="text-sm text-gray-600">记住我</span>
            </label>
            <a href="#" className="text-sm text-blue-500 hover:text-blue-700">
              忘记密码？
            </a>
          </div>
          
          <button 
            type="submit"
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
          >
            登录
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            还没有账户？ 
            <a href="#" className="text-blue-500 hover:text-blue-700 font-semibold">立即注册</a>
          </p>
        </div>
      </div>
    </div>
  </EnhancedErrorBoundary>
);

// 完整版导航组件
const CompleteNavigation = () => (
  <nav className="bg-white shadow-sm border-b">
    <div className="max-w-7xl mx-auto px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center space-x-8">
          <h1 className="text-xl font-bold text-blue-600">Test Web App</h1>
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">完整版</span>
          <div className="hidden md:flex space-x-6">
            <a href="/" className="text-gray-600 hover:text-blue-600 transition-colors">仪表板</a>
            <a href="/test" className="text-gray-600 hover:text-blue-600 transition-colors">测试工具</a>
            <a href="/reports" className="text-gray-600 hover:text-blue-600 transition-colors">测试报告</a>
            <a href="/analytics" className="text-gray-600 hover:text-blue-600 transition-colors">数据分析</a>
            <a href="/about" className="text-gray-600 hover:text-blue-600 transition-colors">关于</a>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="text-gray-600 hover:text-blue-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </button>
          <a href="/login" className="text-gray-600 hover:text-blue-600 transition-colors">登录</a>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            注册
          </button>
        </div>
      </div>
    </div>
  </nav>
);

// 带导航的布局组件
const CompleteLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EnhancedErrorBoundary level="page">
    <div>
      <CompleteNavigation />
      {children}
    </div>
  </EnhancedErrorBoundary>
);

// 完整版应用程序根组件
function CompleteApp() {
  return (
    <EnhancedErrorBoundary 
      level="page"
      onError={(error, errorInfo, errorDetails) => {
        console.error('应用级错误:', { error, errorInfo, errorDetails });
      }}
    >
      <EnhancedThemeProvider>
        <EnhancedAppProvider>
          <EnhancedAuthProvider>
            <Router>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/login" element={<CompleteLogin />} />
                  <Route 
                    path="/dashboard" 
                    element={
                      <CompleteLayout>
                        <CompleteDashboard />
                      </CompleteLayout>
                    } 
                  />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </Router>
          </EnhancedAuthProvider>
        </EnhancedAppProvider>
      </EnhancedThemeProvider>
    </EnhancedErrorBoundary>
  );
}

export default CompleteApp;
