import React, { useEffect } from 'react';

import { Copy, Key, Zap, Globe, BarChart3, CheckCircle, AlertTriangle, Play, Download, Github } from 'lucide-react';

interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  response: string;
  example: string;
}

const APIDocs: React.FC = () => {
  
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
  
  const [formErrors, setFormErrors] = useState({});
  
  const validateForm = (data) => {
    const errors = {};
    
    // 基础验证规则
    if (!data.name || data.name.trim() === '') {
      errors.name = '名称不能为空';
    }
    
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = '请输入有效的邮箱地址';
    }
    
    return errors;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm(formData);
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    // 提交表单
    await submitForm(formData);
  };
  const [activeSection, setActiveSection] = useState('getting-started');

  const apiEndpoints: Record<string, APIEndpoint[]> = {
    'performance': [
      {
        method: 'POST',
        path: '/api/v1/test/performance',
        description: '启动网站性能测试',
        parameters: [
          { name: 'url', type: 'string', required: true, description: '要测试的网站URL' },
          { name: 'device', type: 'string', required: false, description: '设备类型 (desktop/mobile)' },
          { name: 'location', type: 'string', required: false, description: '测试节点位置' }
        ],
        response: `{
  "success": true,
  "data": {
    "testId": "test_123456",
    "status": "running",
    "estimatedTime": 60
  }
}`,
        example: `curl -X POST "https://api.testweb.com/v1/test/performance" //
  -H "Authorization: Bearer YOUR_API_KEY" //
  -H "Content-Type: application/json" //
  -d '{
    "url": "https://example.com",
    "device": "desktop",
    "location": "beijing"
  }'`
      },
      {
        method: 'GET',
        path: '/api/v1/test/{testId}/result',
        description: '获取测试结果',
        parameters: [
          { name: 'testId', type: 'string', required: true, description: '测试ID' }
        ],
        response: `{
  "success": true,
  "data": {
    "testId": "test_123456",
    "status": "completed",
    "score": 85,
    "metrics": {
      "fcp": "1.2s",
      "lcp": "2.4s",
      "cls": "0.05"
    }
  }
}`,
        example: `curl -X GET "https://api.testweb.com/v1/test/test_123456/result" //
  -H "Authorization: Bearer YOUR_API_KEY"`
      }
    ],
    'monitoring': [
      {
        method: 'POST',
        path: '/api/v1/monitoring/sites',
        description: '添加监控站点',
        parameters: [
          { name: 'name', type: 'string', required: true, description: '站点名称' },
          { name: 'url', type: 'string', required: true, description: '站点URL' },
          { name: 'interval', type: 'number', required: false, description: '检查间隔(分钟)' }
        ],
        response: `{
  "success": true,
  "data": {
    "siteId": "site_123456",
    "name": "My Website",
    "url": "https://example.com",
    "status": "active"
  }
}`,
        example: `curl -X POST "https://api.testweb.com/v1/monitoring/sites" //
  -H "Authorization: Bearer YOUR_API_KEY" //
  -H "Content-Type: application/json" //
  -d '{
    "name": "My Website",
    "url": "https://example.com",
    "interval": 5
  }'`
      }
    ]
  };

  const sections = [
    { id: 'getting-started', name: '快速开始', icon: Play },
    { id: 'authentication', name: '身份验证', icon: Key },
    { id: 'performance', name: '性能测试', icon: Zap },
    { id: 'monitoring', name: '监控管理', icon: BarChart3 },
    { id: 'webhooks', name: 'Webhooks', icon: Globe },
    { id: 'sdks', name: 'SDK下载', icon: Download }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // 显示复制成功提示
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">API 文档</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          使用我们的RESTful API将网站测试功能集成到您的应用程序中
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 侧边导航 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
            <h3 className="font-semibold text-gray-900 mb-4">文档导航</h3>
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeSection === section.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  <span>{section.name}</span>
                </button>
              ))}
            </nav>

            {/* API状态 */}
            <div className="mt-8 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-800">API状态正常</span>
              </div>
              <p className="text-xs text-green-600">所有服务运行正常</p>
            </div>
          </div>
        </div>

        {/* 主要内容 */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* 快速开始 */}
            {activeSection === 'getting-started' && (
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">快速开始</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">基础信息</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">API基础URL:</span>
                          <div className="font-mono text-blue-600">https://api.testweb.com/v1</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">当前版本:</span>
                          <div className="font-mono text-gray-900">v1.0</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">请求格式:</span>
                          <div className="font-mono text-gray-900">JSON</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">响应格式:</span>
                          <div className="font-mono text-gray-900">JSON</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">获取API密钥</h3>
                    <p className="text-gray-600 mb-4">
                      要使用我们的API，您需要先获取API密钥。请按照以下步骤操作：
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-gray-600">
                      <li>登录您的TestWeb账户</li>
                      <li>进入"设置" → "API密钥"页面</li>
                      <li>点击"生成新密钥"按钮</li>
                      <li>复制并安全保存您的API密钥</li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">第一个API调用</h3>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-green-400 text-sm font-medium">示例请求</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(`curl -X GET "https://api.testweb.com/v1/account/info" //
  -H "Authorization: Bearer YOUR_API_KEY"`)}
                          className="text-gray-400 hover:text-white"
                          title="复制到剪贴板"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <pre className="text-green-400 text-sm overflow-x-auto">
{`curl -X GET "https://api.testweb.com/v1/account/info" //
  -H "Authorization: Bearer YOUR_API_KEY"`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 身份验证 */}
            {activeSection === 'authentication' && (
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">身份验证</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Bearer Token认证</h3>
                    <p className="text-gray-600 mb-4">
                      所有API请求都需要在请求头中包含您的API密钥：
                    </p>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <pre className="text-green-400 text-sm">
{`Authorization: Bearer YOUR_API_KEY`}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">安全提醒</h4>
                        <p className="text-yellow-700 text-sm mt-1">
                          请妥善保管您的API密钥，不要在客户端代码中暴露密钥。如果密钥泄露，请立即重新生成。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">错误响应</h3>
                    <p className="text-gray-600 mb-4">
                      当认证失败时，API会返回401状态码：
                    </p>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <pre className="text-red-400 text-sm">
{`{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key"
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* API端点 */}
            {(activeSection === 'performance' || activeSection === 'monitoring') && (
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {activeSection === 'performance' ? '性能测试 API' : '监控管理 API'}
                </h2>

                <div className="space-y-8">
                  {apiEndpoints[activeSection]?.map((endpoint, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg">
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(endpoint.method)}`}>
                            {endpoint.method}
                          </span>
                          <code className="text-lg font-mono text-gray-900">{endpoint.path}</code>
                        </div>
                        <p className="text-gray-600">{endpoint.description}</p>
                      </div>

                      <div className="p-6">
                        {/* 参数 */}
                        {endpoint.parameters && (
                          <div className="mb-6">
                            <h4 className="font-semibold text-gray-900 mb-3">请求参数</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="text-left py-2 font-medium text-gray-700">参数名</th>
                                    <th className="text-left py-2 font-medium text-gray-700">类型</th>
                                    <th className="text-left py-2 font-medium text-gray-700">必需</th>
                                    <th className="text-left py-2 font-medium text-gray-700">说明</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {endpoint.parameters.map((param, i) => (
                                    <tr key={i} className="border-b border-gray-100">
                                      <td className="py-2 font-mono text-blue-600">{param.name}</td>
                                      <td className="py-2 text-gray-600">{param.type}</td>
                                      <td className="py-2">
                                        {param.required ? (
                                          <span className="text-red-600">是</span>
                                        ) : (
                                          <span className="text-gray-400">否</span>
                                        )}
                                      </td>
                                      <td className="py-2 text-gray-600">{param.description}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* 响应示例 */}
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-900 mb-3">响应示例</h4>
                          <div className="bg-gray-900 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(endpoint.response)}
                                className="text-gray-400 hover:text-white"
                                title="复制响应示例"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                            <pre className="text-green-400 text-sm overflow-x-auto">
                              {endpoint.response}
                            </pre>
                          </div>
                        </div>

                        {/* 请求示例 */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">请求示例</h4>
                          <div className="bg-gray-900 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(endpoint.example)}
                                className="text-gray-400 hover:text-white"
                                title="复制请求示例"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                            <pre className="text-green-400 text-sm overflow-x-auto">
                              {endpoint.example}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SDK下载 */}
            {activeSection === 'sdks' && (
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">SDK 下载</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { name: 'JavaScript/Node.js', icon: '🟨', version: 'v1.2.0' },
                    { name: 'Python', icon: '🐍', version: 'v1.1.0' },
                    { name: 'PHP', icon: '🐘', version: 'v1.0.5' },
                    { name: 'Java', icon: '☕', version: 'v1.0.3' },
                    { name: 'Go', icon: '🐹', version: 'v1.0.2' },
                    { name: 'Ruby', icon: '💎', version: 'v1.0.1' }
                  ].map((sdk, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <span className="text-2xl">{sdk.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{sdk.name}</h3>
                          <p className="text-sm text-gray-600">{sdk.version}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button type="button" className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                          <Download className="w-4 h-4" />
                          <span>下载</span>
                        </button>
                        <button type="button" className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                          <Github className="w-4 h-4" />
                          <span>GitHub</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIDocs;
