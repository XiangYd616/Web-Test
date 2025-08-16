import React, { useEffect } from 'react';

import { AlertTriangle, Book, CheckCircle, Clock, Code, Copy, Download, ExternalLink, GitBranch, Globe, Key, Layers, Play, Settings, Shield, Terminal, Webhook, Zap } from 'lucide-react';

const CICDIntegration: React.FC = () => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState('');

  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);
  
  // CRUD操作
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = useCallback(async (newItem) => {
    try {
      setLoading(true);
      const response = await apiClient.post('/api/items', newItem);
      setData(prev => [...(prev || []), response.data]);
      setIsCreating(false);
    } catch (err) {
      handleError(err, 'create');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const handleUpdate = useCallback(async (id, updates) => {
    try {
      setLoading(true);
      const response = await apiClient.put(`/api/items/${id}`, updates);
      setData(prev => prev?.map(item =>
        item.id === id ? response.data : item
      ));
      setIsEditing(false);
      setSelectedItem(null);
    } catch (err) {
      handleError(err, 'update');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('确定要删除这个项目吗？')) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.delete(`/api/items/${id}`);
      setData(prev => prev?.filter(item => item.id !== id));
    } catch (err) {
      handleError(err, 'delete');
    } finally {
      setLoading(false);
    }
  }, [handleError]);
  
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
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'github' | 'gitlab' | 'jenkins' | 'azure'>('github');

  // 复制代码到剪贴板
  const copyToClipboard = async (text: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(codeId);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // GitHub Actions 配置代码
  const githubActionsCode = `name: Test Website CI
on: undefined, // 已修复
  push: undefined, // 已修复
    branches: [ main, develop ]
  pull_request: undefined, // 已修复
    branches: [ main ]

jobs: undefined, // 已修复
  test: undefined, // 已修复
    runs-on: ubuntu-latest
    steps: undefined, // 已修复
      - uses: actions/checkout@v3

      - name: Run Website Tests
        run: |
          curl -X POST \\
            -H "Authorization: Bearer \$\{{ secrets.TESTWEB_API_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            -d '{
              "url": "\$\{{ secrets.WEBSITE_URL }}",
              "tests": ["performance", "security", "seo"],
              "webhook": "\$\{{ secrets.WEBHOOK_URL }}"
            }' \\
            https://api.testweb.com/v1/test/comprehensive

      - name: Wait for Results
        run: |
          sleep 60

      - name: Get Test Results
        run: |
          curl -H "Authorization: Bearer \$\{{ secrets.TESTWEB_API_TOKEN }}" \\
            https://api.testweb.com/v1/test/results/latest`;

  // GitLab CI 配置代码
  const gitlabCICode = `stages: undefined, // 已修复
  - test
  - deploy

variables: undefined, // 已修复
  WEBSITE_URL: "https://your-website.com"

test_website: undefined, // 已修复
  stage: test
  image: alpine:latest
  before_script: undefined, // 已修复
    - apk add --no-cache curl
  script: undefined, // 已修复
    - |
      curl -X POST //
        -H "Authorization: Bearer $TESTWEB_API_TOKEN" //
        -H "Content-Type: application/json" //
        -d '{
          "url": "'$WEBSITE_URL'",
          "tests": ["performance", "security", "seo"],
          "webhook": "'$WEBHOOK_URL'"
        }' //
        https://api.testweb.com/v1/test/comprehensive
    - sleep 60
    - |
      curl -H "Authorization: Bearer $TESTWEB_API_TOKEN" //
        https://api.testweb.com/v1/test/results/latest
  only: undefined, // 已修复
    - main
    - develop
  artifacts: undefined, // 已修复
    reports: undefined, // 已修复
      junit: test-results.xml`;

  
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 space-y-6">
      {/* 页面标题 */}
      <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Layers className="w-8 h-8 text-blue-400" />
              CI/CD 集成
            </h1>
            <p className="text-gray-300">将测试集成到您的持续集成和部署流程中</p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              type="button"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Book className="w-4 h-4" />
              <span>查看文档</span>
            </button>
            <button
              type="button"
              className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>下载示例</span>
            </button>
          </div>
        </div>
      </div>

      {/* CI/CD 平台选择 */}
      <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-400" />
          选择 CI/CD 平台
        </h2>

        <div className="flex space-x-1 bg-gray-700/30 rounded-lg p-1 mb-6">
          {[
            { id: 'github', label: 'GitHub Actions', icon: GitBranch, color: 'text-blue-400' },
            { id: 'gitlab', label: 'GitLab CI', icon: Code, color: 'text-orange-400' },
            { id: 'jenkins', label: 'Jenkins', icon: Settings, color: 'text-green-400' },
            { id: 'azure', label: 'Azure DevOps', icon: Globe, color: 'text-cyan-400' }
          ].map((platform) => (
            <button
              key={platform.id}
              type="button"
              onClick={() => setActiveTab(platform.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${activeTab === platform.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:bg-gray-600/50'
                }`}
            >
              <platform.icon className={`w-4 h-4 ${platform.color}`} />
              <span className="text-sm">{platform.label}</span>
            </button>
          ))}
        </div>

        {/* GitHub Actions 配置 */}
        {activeTab === 'github' && (
          <div className="space-y-6">
            <div className="bg-gray-700/20 rounded-lg p-6 border border-gray-600/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                    <GitBranch className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">GitHub Actions</h3>
                    <p className="text-gray-400 text-sm">在GitHub Actions工作流中自动运行测试</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(githubActionsCode, 'github')}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {copiedCode === 'github' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="text-sm">{copiedCode === 'github' ? '已复制' : '复制代码'}</span>
                </button>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-mono">.github/workflows/test.yml</span>
                  <Terminal className="w-4 h-4 text-gray-400" />
                </div>
                <pre className="text-sm text-gray-300 overflow-x-auto">
                  <code>{githubActionsCode}</code>
                </pre>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>预计运行时间: 2-5分钟</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Shield className="w-4 h-4" />
                    <span>需要API密钥</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>查看示例仓库</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GitLab CI 配置 */}
        {activeTab === 'gitlab' && (
          <div className="space-y-6">
            <div className="bg-gray-700/20 rounded-lg p-6 border border-gray-600/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center border border-orange-500/20">
                    <Code className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">GitLab CI</h3>
                    <p className="text-gray-400 text-sm">在GitLab CI/CD管道中集成测试</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(gitlabCICode, 'gitlab')}
                  className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  {copiedCode === 'gitlab' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="text-sm">{copiedCode === 'gitlab' ? '已复制' : '复制代码'}</span>
                </button>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-mono">.gitlab-ci.yml</span>
                  <Terminal className="w-4 h-4 text-gray-400" />
                </div>
                <pre className="text-sm text-gray-300 overflow-x-auto">
                  <code>{gitlabCICode}</code>
                </pre>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>预计运行时间: 2-5分钟</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Shield className="w-4 h-4" />
                    <span>需要API密钥</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>查看示例项目</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* API 集成 */}
      <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Key className="w-5 h-5 text-green-400" />
          API 集成
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-white mb-4">API 端点</h3>
            <div className="space-y-3">
              {[
                { method: 'POST', endpoint: '/api/v1/test/comprehensive', desc: '综合测试' },
                { method: 'POST', endpoint: '/api/v1/test/performance', desc: '性能测试' },
                { method: 'POST', endpoint: '/api/v1/test/security', desc: '安全检测' },
                { method: 'POST', endpoint: '/api/v1/test/seo', desc: 'SEO分析' },
                { method: 'GET', endpoint: '/api/v1/test/results/{id}', desc: '获取测试结果' },
                { method: 'GET', endpoint: '/api/v1/test/history', desc: '测试历史' }
              ].map((api, index) => (
                <div key={index} className="bg-gray-700/20 rounded-lg p-3 border border-gray-600/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs font-mono rounded ${api.method === 'POST'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-green-500/10 text-green-400 border border-green-500/20'
                        }`}>
                        {api.method}
                      </span>
                      <code className="text-sm text-gray-300 font-mono">{api.endpoint}</code>
                    </div>
                    <span className="text-xs text-gray-400">{api.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-white mb-4">认证配置</h3>
            <div className="space-y-4">
              <div className="bg-gray-700/20 rounded-lg p-4 border border-gray-600/30">
                <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-yellow-400" />
                  API Token 认证
                </h4>
                <p className="text-sm text-gray-400 mb-3">
                  使用Bearer Token进行API认证
                </p>
                <div className="bg-gray-800/50 rounded p-3 border border-gray-600/30">
                  <code className="text-sm text-gray-300 font-mono">
                    Authorization: Bearer YOUR_API_TOKEN
                  </code>
                </div>
                <button
                  type="button"
                  className="mt-3 flex items-center space-x-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                >
                  <Key className="w-4 h-4" />
                  <span>生成 API Token</span>
                </button>
              </div>

              <div className="bg-gray-700/20 rounded-lg p-4 border border-gray-600/30">
                <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  请求示例
                </h4>
                <div className="bg-gray-800/50 rounded p-3 border border-gray-600/30">
                  <pre className="text-xs text-gray-300 overflow-x-auto">
                    {`curl -X POST //
  -H "Authorization: Bearer YOUR_TOKEN" //
  -H "Content-Type: application/json" //
  -d '{
    "url": "https://example.com",
    "tests": ["performance", "security"],
    "webhook": "https://your-webhook.com"
  }' //
  https://api.testweb.com/v1/test/comprehensive`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Webhook 配置 */}
      <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Webhook className="w-5 h-5 text-cyan-400" />
          Webhook 配置
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-white mb-4">配置 Webhook</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://your-domain.com/webhook"
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  事件类型
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'test.completed', label: '测试完成', desc: '当测试成功完成时触发' },
                    { id: 'test.failed', label: '测试失败', desc: '当测试失败时触发' },
                    { id: 'threshold.exceeded', label: '阈值告警', desc: '当性能指标超过阈值时触发' },
                    { id: 'security.issue', label: '安全问题', desc: '发现安全漏洞时触发' }
                  ].map((event) => (
                    <label key={event.id} className="flex items-start space-x-3 p-3 bg-gray-700/20 rounded-lg border border-gray-600/30 hover:bg-gray-700/30 transition-colors">
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-gray-800"
                      />
                      <div>
                        <div className="text-sm font-medium text-white">{event.label}</div>
                        <div className="text-xs text-gray-400">{event.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
              >
                <Webhook className="w-4 h-4" />
                <span>保存 Webhook 配置</span>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-white mb-4">Webhook 负载示例</h3>
            <div className="bg-gray-700/20 rounded-lg p-4 border border-gray-600/30">
              <div className="bg-gray-800/50 rounded p-4 border border-gray-600/30">
                <pre className="text-xs text-gray-300 overflow-x-auto">
                  {`{
  "event": "test.completed",
  "timestamp": "2025-06-19T10:30:00Z",
  "test_id": "test_123456",
  "url": "https://example.com",
  "results": {
    "performance": {
      "score": 85,
      "load_time": 1.2,
      "first_paint": 0.8
    },
    "security": {
      "score": 92,
      "vulnerabilities": 0,
      "ssl_grade": "A+"
    },
    "seo": {
      "score": 78,
      "issues": 3,
      "recommendations": [...]
    }
  },
  "report_url": "https://app.testweb.com/reports/123456"
}`}
                </pre>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-400 mb-1">安全提示</h4>
                  <p className="text-xs text-gray-300">
                    建议使用HTTPS端点并验证Webhook签名以确保数据安全。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 快速开始指南 */}
      <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Play className="w-5 h-5 text-green-400" />
          快速开始指南
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-700/20 rounded-lg p-4 border border-gray-600/30">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20 mb-3">
              <span className="text-blue-400 font-bold text-sm">1</span>
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">获取 API 密钥</h3>
            <p className="text-xs text-gray-400 mb-3">
              在集成配置页面生成您的API密钥，用于CI/CD流程中的身份验证。
            </p>
            <button
              type="button"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <Key className="w-3 h-3" />
              生成密钥
            </button>
          </div>

          <div className="bg-gray-700/20 rounded-lg p-4 border border-gray-600/30">
            <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20 mb-3">
              <span className="text-purple-400 font-bold text-sm">2</span>
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">配置 CI/CD</h3>
            <p className="text-xs text-gray-400 mb-3">
              选择您的CI/CD平台，复制相应的配置代码到您的项目中。
            </p>
            <button
              type="button"
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
            >
              <Code className="w-3 h-3" />
              查看示例
            </button>
          </div>

          <div className="bg-gray-700/20 rounded-lg p-4 border border-gray-600/30">
            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center border border-green-500/20 mb-3">
              <span className="text-green-400 font-bold text-sm">3</span>
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">设置 Webhook</h3>
            <p className="text-xs text-gray-400 mb-3">
              配置Webhook接收测试结果通知，实现自动化监控和告警。
            </p>
            <button
              type="button"
              className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
            >
              <Webhook className="w-3 h-3" />
              配置通知
            </button>
          </div>
        </div>
      </div>

      {/* 帮助和支持 */}
      <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 border border-gray-700 backdrop-blur-sm">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-3">需要帮助？</h2>
          <p className="text-gray-400 mb-6">
            查看我们的详细文档或联系技术支持团队
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Book className="w-4 h-4" />
              <span>查看完整文档</span>
            </button>

            <button
              type="button"
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>示例项目</span>
            </button>

            <button
              type="button"
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Webhook className="w-4 h-4" />
              <span>联系支持</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CICDIntegration;
