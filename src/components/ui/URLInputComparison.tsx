import React, { useState } from 'react';
import { SimpleURLInput, URLInput } from './index';
import { Card, CardHeader, CardTitle, CardBody } from './Card';

export const URLInputComparison: React.FC = () => {
  const [simpleUrl, setSimpleUrl] = useState('');
  const [advancedUrl, setAdvancedUrl] = useState('');

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">URL输入组件优化</h1>
          <p className="text-gray-400">对比展示优化前后的URL输入组件效果</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 简化版URL输入 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>优化后 - SimpleURLInput</span>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <SimpleURLInput
                  value={simpleUrl}
                  onChange={(e) => setSimpleUrl(e.target.value)}
                  label="测试URL"
                  placeholder="输入要进行压力测试的网站URL..."
                />

                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">特点:</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• 简洁的设计，专注于核心功能</li>
                    <li>• 与截图样式完全一致</li>
                    <li>• 优化的响应式设计</li>
                    <li>• 更好的移动端体验</li>
                    <li>• 轻量级实现，性能更好</li>
                  </ul>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 高级版URL输入 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <span>功能完整版 - URLInput</span>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <URLInput
                  value={advancedUrl}
                  onChange={(e) => setAdvancedUrl(e.target.value)}
                  placeholder="输入网站URL进行验证..."
                  enableValidation={true}
                  showProtocolSuggestion={true}
                  autoAddProtocol={true}
                  showExternalLink={true}
                  showAutoFix={true}
                />

                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">特点:</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• 实时URL验证</li>
                    <li>• 自动协议建议</li>
                    <li>• 一键自动修复</li>
                    <li>• 新窗口打开链接</li>
                    <li>• 智能错误提示</li>
                  </ul>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 使用建议 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>使用建议</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-3">SimpleURLInput 适用场景</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• 测试页面的URL输入</li>
                  <li>• 需要简洁设计的场景</li>
                  <li>• 移动端优先的应用</li>
                  <li>• 性能敏感的页面</li>
                  <li>• 不需要复杂验证的场景</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-3">URLInput 适用场景</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• 需要URL验证的表单</li>
                  <li>• 用户体验要求较高的场景</li>
                  <li>• 需要自动修复功能</li>
                  <li>• 管理后台或配置页面</li>
                  <li>• 需要外部链接跳转的场景</li>
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 代码示例 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>代码示例</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-3">SimpleURLInput 用法</h3>
                <pre className="bg-gray-800 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto">
{`import { SimpleURLInput } from '@/components/ui';

<SimpleURLInput
  value={url}
  onChange={(e) => setUrl(e.target.value)}
  label="测试URL"
  placeholder="输入网站URL..."
/>`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-3">URLInput 用法</h3>
                <pre className="bg-gray-800 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto">
{`import { URLInput } from '@/components/ui';

<URLInput
  value={url}
  onChange={(e) => setUrl(e.target.value)}
  enableValidation={true}
  showProtocolSuggestion={true}
  autoAddProtocol={true}
  onValidationChange={(isValid, url) => {
    console.log('验证结果:', isValid, url);
  }}
/>`}
                </pre>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default URLInputComparison;
