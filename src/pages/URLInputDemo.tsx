import React, { useState } from 'react';
import { URLInput } from '../components/ui/URLInput';
import { SimpleURLInput } from '../components/ui/SimpleURLInput';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';

export const URLInputDemo: React.FC = () => {
  const [basicUrl, setBasicUrl] = useState('');
  const [responsiveUrl, setResponsiveUrl] = useState('');
  const [fullWidthUrl, setFullWidthUrl] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [simpleUrl, setSimpleUrl] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            URL输入框响应式布局演示
          </h1>
          <p className="text-gray-300 text-lg">
            展示URL输入框在不同布局和屏幕尺寸下的响应式效果
          </p>
        </div>

        {/* 全宽度URL输入 */}
        <Card>
          <CardHeader>
            <CardTitle>全宽度响应式URL输入</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="url-input-container">
              <URLInput
                value={fullWidthUrl}
                onChange={(e) => setFullWidthUrl(e.target.value)}
                placeholder="这个URL输入框会占满整个容器宽度，在任何屏幕尺寸下都能自适应..."
                enableValidation={true}
                className="url-input-full-width"
              />
              <div className="text-sm text-gray-400 mt-2">
                演示：URL输入框占满整个容器宽度，在不同屏幕尺寸下自适应
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 与按钮并排的响应式布局 */}
        <Card>
          <CardHeader>
            <CardTitle>与按钮并排的响应式布局</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="url-input-responsive with-button">
              <div className="url-input-wrapper">
                <URLInput
                  value={responsiveUrl}
                  onChange={(e) => setResponsiveUrl(e.target.value)}
                  placeholder="在大屏幕上与按钮并排，小屏幕上垂直堆叠..."
                  enableValidation={true}
                  className="url-input-field"
                />
              </div>
              <button
                type="button"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                开始测试
              </button>
            </div>
            <div className="text-sm text-gray-400 mt-2">
              演示：在桌面端URL输入框与按钮并排显示，在移动端垂直堆叠
            </div>
          </CardBody>
        </Card>

        {/* 表单组布局 */}
        <Card>
          <CardHeader>
            <CardTitle>表单组布局</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="url-input-form-group">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                网站URL *
              </label>
              <URLInput
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="请输入要测试的网站URL..."
                enableValidation={true}
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                请输入完整的网站地址，包括协议（http://或https://）
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 简化版URL输入 */}
        <Card>
          <CardHeader>
            <CardTitle>简化版URL输入框</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="url-input-container">
              <SimpleURLInput
                value={simpleUrl}
                onChange={(e) => setSimpleUrl(e.target.value)}
                placeholder="简化版URL输入框，同样支持全宽度响应式布局..."
                label="简化URL输入"
              />
              <div className="text-sm text-gray-400 mt-2">
                演示：SimpleURLInput组件的响应式效果
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 网格布局中的URL输入 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>网格布局 - 左侧</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="url-input-container">
                <URLInput
                  value={basicUrl}
                  onChange={(e) => setBasicUrl(e.target.value)}
                  placeholder="网格布局中的URL输入框..."
                  className="url-input-full-width"
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>网格布局 - 右侧</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="url-input-container">
                <SimpleURLInput
                  value=""
                  onChange={() => {}}
                  placeholder="另一个URL输入框..."
                />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle>响应式布局说明</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-4 text-gray-300">
              <div>
                <h4 className="font-semibold text-white mb-2">CSS类说明：</h4>
                <ul className="space-y-1 text-sm">
                  <li><code className="bg-gray-700 px-2 py-1 rounded">.url-input-container</code> - URL输入框容器，确保占满宽度</li>
                  <li><code className="bg-gray-700 px-2 py-1 rounded">.url-input-full-width</code> - 强制URL输入框占满宽度</li>
                  <li><code className="bg-gray-700 px-2 py-1 rounded">.url-input-responsive</code> - 响应式布局容器</li>
                  <li><code className="bg-gray-700 px-2 py-1 rounded">.url-input-form-group</code> - 表单组布局</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">响应式特性：</h4>
                <ul className="space-y-1 text-sm">
                  <li>• 在所有屏幕尺寸下都能占满容器宽度</li>
                  <li>• 支持与按钮并排显示（桌面端）和垂直堆叠（移动端）</li>
                  <li>• 在网格布局中自适应列宽</li>
                  <li>• 移动端优化，防止iOS缩放</li>
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default URLInputDemo;
