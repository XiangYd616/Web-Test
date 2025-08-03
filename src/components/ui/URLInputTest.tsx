import React, { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from './Card';
import { URLInput } from './URLInput';

export const URLInputTest: React.FC = () => {
  const [basicUrl, setBasicUrl] = useState('');
  const [validatedUrl, setValidatedUrl] = useState('');
  const [compactUrl, setCompactUrl] = useState('');
  const [disabledUrl, setDisabledUrl] = useState('https://example.com');
  const [responsiveUrl, setResponsiveUrl] = useState('');
  const [fullWidthUrl, setFullWidthUrl] = useState('');

  const handleValidationChange = (isValid: boolean, url?: string) => {
    console.log('URL验证结果:', { isValid, url });
  };

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">URL输入组件测试</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 基础URL输入 */}
          <Card>
            <CardHeader>
              <CardTitle>基础URL输入</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <URLInput
                  value={basicUrl}
                  onChange={(e) => setBasicUrl(e.target.value)}
                  placeholder="输入网站URL..."
                  enableValidation={false}
                />
                <div className="text-sm text-gray-400">
                  当前值: {basicUrl || '(空)'}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 带验证的URL输入 */}
          <Card>
            <CardHeader>
              <CardTitle>带验证的URL输入</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <URLInput
                  value={validatedUrl}
                  onChange={(e) => setValidatedUrl(e.target.value)}
                  placeholder="输入网站URL进行验证..."
                  enableValidation={true}
                  showProtocolSuggestion={true}
                  autoAddProtocol={true}
                  onValidationChange={handleValidationChange}
                />
                <div className="text-sm text-gray-400">
                  当前值: {validatedUrl || '(空)'}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 紧凑尺寸 */}
          <Card>
            <CardHeader>
              <CardTitle>紧凑尺寸</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <URLInput
                  value={compactUrl}
                  onChange={(e) => setCompactUrl(e.target.value)}
                  placeholder="紧凑尺寸的URL输入..."
                  size="sm"
                  enableValidation={true}
                />
                <div className="text-sm text-gray-400">
                  当前值: {compactUrl || '(空)'}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 禁用状态 */}
          <Card>
            <CardHeader>
              <CardTitle>禁用状态</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <URLInput
                  value={disabledUrl}
                  onChange={(e) => setDisabledUrl(e.target.value)}
                  placeholder="禁用状态的URL输入..."
                  disabled={true}
                  enableValidation={true}
                />
                <div className="text-sm text-gray-400">
                  当前值: {disabledUrl}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 响应式布局演示 */}
        <div className="grid grid-cols-1 gap-6 mt-6">
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
                  placeholder="这个URL输入框会占满整个容器宽度..."
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
                    placeholder="在大屏幕上与按钮并排，小屏幕上堆叠..."
                    enableValidation={true}
                    className="url-input-field"
                  />
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors whitespace-nowrap"
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
                  value={basicUrl}
                  onChange={(e) => setBasicUrl(e.target.value)}
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
        </div>

        {/* 功能演示 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>功能演示</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-3">测试用例</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-300">有效URL示例:</h4>
                    <ul className="space-y-1 text-gray-400">
                      <li>• https://www.example.com</li>
                      <li>• http://localhost:3000</li>
                      <li>• https://api.github.com</li>
                      <li>• www.google.com (自动添加协议)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-300">无效URL示例:</h4>
                    <ul className="space-y-1 text-gray-400">
                      <li>• just-text</li>
                      <li>• http://</li>
                      <li>• https://</li>
                      <li>• ftp://example.com</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-3">功能特性</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-300">验证功能:</h4>
                    <ul className="space-y-1 text-gray-400">
                      <li>• 实时URL格式验证</li>
                      <li>• 自动协议建议</li>
                      <li>• 智能错误提示</li>
                      <li>• 防抖输入处理</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-300">交互功能:</h4>
                    <ul className="space-y-1 text-gray-400">
                      <li>• 一键自动修复</li>
                      <li>• 新窗口打开链接</li>
                      <li>• 多种尺寸支持</li>
                      <li>• 完整的键盘支持</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default URLInputTest;
