import React, { useState, useEffect } from 'react';

import { Download, Monitor, CheckCircle, Star } from 'lucide-react';

const DownloadDesktop: React.FC = () => {
  
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
  const features = [
    '完整的系统权限，支持高并发测试',
    '离线使用，无需网络连接',
    '更好的性能和稳定性',
    '支持本地文件测试',
    '高级网络分析功能',
    '自动更新和同步'
  ];

  const systemRequirements = {
    windows: {
      os: 'Windows 10 或更高版本',
      memory: '4GB RAM',
      storage: '500MB 可用空间',
      processor: 'Intel Core i3 或同等处理器'
    },
    mac: {
      os: 'macOS 10.14 或更高版本',
      memory: '4GB RAM',
      storage: '500MB 可用空间',
      processor: 'Intel 或 Apple Silicon'
    },
    linux: {
      os: 'Ubuntu 18.04 或同等发行版',
      memory: '4GB RAM',
      storage: '500MB 可用空间',
      processor: 'x64 处理器'
    }
  };

  
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
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Test Web App</h1>
              <p className="text-gray-600 mt-1">专业的网站测试平台</p>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/login" className="text-blue-600 hover:text-blue-800">登录</a>
              <a href="/register" className="btn btn-primary">注册</a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 主要内容 */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">下载桌面版应用</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            获得完整的测试功能和更好的性能体验。桌面版支持高并发测试、离线使用和高级分析功能。
          </p>
        </div>

        {/* 下载按钮 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Monitor className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Windows</h3>
            <p className="text-gray-600 mb-4">适用于 Windows 10 及以上版本</p>
            <button className="btn btn-primary w-full flex items-center justify-center space-x-2" type="button">
              <Download className="w-5 h-5" />
              <span>下载 Windows 版</span>
            </button>
            <p className="text-sm text-gray-500 mt-2">版本 1.0.0 • 45.2 MB</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Monitor className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">macOS</h3>
            <p className="text-gray-600 mb-4">适用于 macOS 10.14 及以上版本</p>
            <button className="btn btn-primary w-full flex items-center justify-center space-x-2" type="button">
              <Download className="w-5 h-5" />
              <span>下载 macOS 版</span>
            </button>
            <p className="text-sm text-gray-500 mt-2">版本 1.0.0 • 52.1 MB</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Monitor className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Linux</h3>
            <p className="text-gray-600 mb-4">适用于主流 Linux 发行版</p>
            <button className="btn btn-primary w-full flex items-center justify-center space-x-2" type="button">
              <Download className="w-5 h-5" />
              <span>下载 Linux 版</span>
            </button>
            <p className="text-sm text-gray-500 mt-2">版本 1.0.0 • 48.7 MB</p>
          </div>
        </div>

        {/* 功能特性 */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">桌面版独有功能</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 系统要求 */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">系统要求</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Windows</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div><strong>操作系统:</strong> {systemRequirements.windows.os}</div>
                <div><strong>内存:</strong> {systemRequirements.windows.memory}</div>
                <div><strong>存储:</strong> {systemRequirements.windows.storage}</div>
                <div><strong>处理器:</strong> {systemRequirements.windows.processor}</div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">macOS</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div><strong>操作系统:</strong> {systemRequirements.mac.os}</div>
                <div><strong>内存:</strong> {systemRequirements.mac.memory}</div>
                <div><strong>存储:</strong> {systemRequirements.mac.storage}</div>
                <div><strong>处理器:</strong> {systemRequirements.mac.processor}</div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Linux</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div><strong>操作系统:</strong> {systemRequirements.linux.os}</div>
                <div><strong>内存:</strong> {systemRequirements.linux.memory}</div>
                <div><strong>存储:</strong> {systemRequirements.linux.storage}</div>
                <div><strong>处理器:</strong> {systemRequirements.linux.processor}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 用户评价 */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">用户评价</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-600">5.0</span>
              </div>
              <p className="text-gray-700 mb-4">
                "桌面版的性能比网页版好很多，特别是在进行大规模压力测试时。界面也很直观，功能很全面。"
              </p>
              <div className="text-sm text-gray-500">
                <strong>张工程师</strong> - 前端开发
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-600">5.0</span>
              </div>
              <p className="text-gray-700 mb-4">
                "离线功能很实用，可以在没有网络的环境下进行本地测试。报告导出功能也很方便。"
              </p>
              <div className="text-sm text-gray-500">
                <strong>李测试</strong> - QA工程师
              </div>
            </div>
          </div>
        </div>

        {/* 底部链接 */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            还没有账户？
          </p>
          <div className="space-x-4">
            <a href="/register" className="btn btn-primary">免费注册</a>
            <a href="/login" className="btn btn-outline">已有账户登录</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadDesktop;
