/**
 * Chrome浏览器兼容性测试页面
 * 用于验证和测试Chrome兼容性修复效果
 */

import { AlertTriangle, CheckCircle, Chrome, Info, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ChromeCompatibilityHelper } from '../utils/chromeCompatibility';

interface CompatibilityTestResult {
  browserInfo: any;
  cssSupport: any;
  issues: string[];
  needsFixes: boolean;
}

const ChromeCompatibilityTest: React.FC = () => {
  const [testResult, setTestResult] = useState<CompatibilityTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 运行兼容性检测
    const runCompatibilityTest = () => {
      setIsLoading(true);

      setTimeout(() => {
        const result = ChromeCompatibilityHelper.detectCompatibilityIssues();
        setTestResult(result);
        setIsLoading(false);
      }, 1000);
    };

    runCompatibilityTest();
  }, []);

  const renderBrowserInfo = () => {
    if (!testResult) return null;

    const { browserInfo } = testResult;

    return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
          <Chrome className="mr-2 h-5 w-5 text-blue-400" />
          浏览器信息
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Chrome:</span>
              <span className={`text-sm font-medium ${browserInfo.isChrome ? 'text-green-600' : 'text-gray-500'}`}>
                {browserInfo.isChrome ? '是' : '否'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Edge:</span>
              <span className={`text-sm font-medium ${browserInfo.isEdge ? 'text-blue-600' : 'text-gray-500'}`}>
                {browserInfo.isEdge ? '是' : '否'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Safari:</span>
              <span className={`text-sm font-medium ${browserInfo.isSafari ? 'text-purple-600' : 'text-gray-500'}`}>
                {browserInfo.isSafari ? '是' : '否'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Firefox:</span>
              <span className={`text-sm font-medium ${browserInfo.isFirefox ? 'text-orange-600' : 'text-gray-500'}`}>
                {browserInfo.isFirefox ? '是' : '否'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">User Agent:</span>
              <p className="text-xs text-gray-800 dark:text-gray-200 mt-1 break-all">
                {browserInfo.userAgent}
              </p>
            </div>

            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Vendor:</span>
              <p className="text-xs text-gray-800 dark:text-gray-200 mt-1">
                {browserInfo.vendor}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCSSSupport = () => {
    if (!testResult) return null;

    const { cssSupport } = testResult;

    const features = [
      { name: 'Backdrop Filter', key: 'backdropFilter', description: '背景模糊效果' },
      { name: 'CSS Grid', key: 'grid', description: '网格布局' },
      { name: 'Flexbox', key: 'flexbox', description: '弹性布局' },
      { name: 'CSS Variables', key: 'customProperties', description: 'CSS变量' },
      { name: 'Transforms', key: 'transforms', description: 'CSS变换' },
      { name: 'Animations', key: 'animations', description: 'CSS动画' },
      { name: 'Filters', key: 'filters', description: 'CSS滤镜' }
    ];

    return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
          <CheckCircle className="mr-2 h-5 w-5 text-green-400" />
          CSS特性支持
        </h3>

        <div className="grid grid-cols-1 gap-3">
          {features.map(({ name, key, description }) => {
            const isSupported = cssSupport[key];

            return (
              <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {isSupported ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <span className="font-medium">{name}</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${isSupported ? 'text-green-600' : 'text-red-600'}`}>
                  {isSupported ? '支持' : '不支持'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCompatibilityIssues = () => {
    if (!testResult) return null;

    const { issues, needsFixes } = testResult;

    return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
          <AlertTriangle className="mr-2 h-5 w-5 text-yellow-400" />
          兼容性问题
        </h3>

        {needsFixes ? (
          <div className="space-y-3">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  检测到 {issues.length} 个兼容性问题
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {issues.map((issue, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                  <XCircle className="h-3 w-3 text-red-500" />
                  <span className="text-sm text-red-700 dark:text-red-400">{issue}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                未检测到兼容性问题
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTestComponents = () => {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-white">
          <Info className="mr-2 h-5 w-5 text-blue-400" />
          兼容性测试组件
        </h3>

        <div className="space-y-4">
          {/* Grid布局测试 */}
          <div>
            <h4 className="text-sm font-medium mb-2">Grid布局测试</h4>
            <div className="security-test-grid grid grid-cols-3 gap-2">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded text-center text-sm">Grid 1</div>
              <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded text-center text-sm">Grid 2</div>
              <div className="bg-purple-100 dark:bg-purple-900/20 p-2 rounded text-center text-sm">Grid 3</div>
            </div>
          </div>

          {/* Flexbox测试 */}
          <div>
            <h4 className="text-sm font-medium mb-2">Flexbox测试</h4>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm">左侧内容</span>
              <span className="text-sm">右侧内容</span>
            </div>
          </div>

          {/* 背景模糊测试 */}
          <div>
            <h4 className="text-sm font-medium mb-2">背景模糊测试</h4>
            <div className="relative h-20 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg overflow-hidden">
              <div className="absolute inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center">
                <span className="text-white font-medium">背景模糊效果</span>
              </div>
            </div>
          </div>

          {/* 颜色测试 */}
          <div>
            <h4 className="text-sm font-medium mb-2">颜色渲染测试</h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="security-test-card border-2 border-green-500 bg-green-50 dark:bg-green-900/20 p-2 rounded text-center text-xs">绿色</div>
              <div className="security-test-card border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-center text-xs">蓝色</div>
              <div className="security-test-card border-2 border-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded text-center text-xs">红色</div>
              <div className="security-test-card border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20 p-2 rounded text-center text-xs">紫色</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <TestPageLayout className="space-y-4 dark-page-scrollbar">
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2 text-white">正在检测浏览器兼容性...</h2>
            <p className="text-gray-300">请稍候，正在分析您的浏览器环境</p>
          </div>
        </div>
      </TestPageLayout>
    );
  }

  return (
    <TestPageLayout className="space-y-4 dark-page-scrollbar">
      {/* 页面标题 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <h1 className="text-2xl font-bold mb-2">Chrome浏览器兼容性测试</h1>
        <p className="text-gray-600 dark:text-gray-400">
          检测和验证浏览器兼容性，确保在不同浏览器中的一致显示效果
        </p>
      </div>

      {/* 浏览器信息 */}
      {renderBrowserInfo()}

      {/* CSS特性支持 */}
      {renderCSSSupport()}

      {/* 兼容性问题 */}
      {renderCompatibilityIssues()}

      {/* 测试组件 */}
      {renderTestComponents()}
    </TestPageLayout>
  );
};

export default ChromeCompatibilityTest;
