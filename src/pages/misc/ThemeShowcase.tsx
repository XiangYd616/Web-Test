import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Download,
  Info,
  Moon,
  Play,
  RefreshCw,
  Search,
  Settings,
  Square,
  Star,
  Sun,
  XCircle,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeShowcase: React.FC = () => {
  const { actualTheme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('components');
  const [progress, setProgress] = useState(65);
  const [isLoading, setIsLoading] = useState(false);

  const handleProgressChange = (value: number) => {
    setProgress(value);
  };

  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className={`min-h-screen p-6 space-y-8 ${actualTheme === 'light' ? 'light-theme-wrapper' : 'dark-theme-wrapper'}`}>
      {/* 主题切换器 */}
      <div className="themed-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold themed-text-primary">主题展示页面</h1>
            <p className="themed-text-secondary mt-2">展示浅色和深色主题的所有组件效果</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="themed-text-secondary">当前主题:</span>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${actualTheme === 'light'
                    ? 'bg-white shadow-md text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Sun className="w-4 h-4" />
                <span>浅色</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${actualTheme === 'dark'
                    ? 'bg-gray-700 shadow-md text-white'
                    : 'text-gray-400 hover:text-gray-200'
                  }`}
              >
                <Moon className="w-4 h-4" />
                <span>深色</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="themed-card">
        <div className="tab-list flex">
          {[
            { id: 'components', label: '组件展示', icon: Star },
            { id: 'buttons', label: '按钮样式', icon: Zap },
            { id: 'forms', label: '表单元素', icon: Settings },
            { id: 'data', label: '数据展示', icon: BarChart3 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button flex items-center space-x-2 ${activeTab === tab.id ? 'active' : ''
                }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'components' && (
            <div className="space-y-8">
              {/* 状态指示器 */}
              <div>
                <h3 className="text-lg font-semibold themed-text-primary mb-4">状态指示器</h3>
                <div className="flex flex-wrap gap-4">
                  <div className="status-indicator status-success">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    成功状态
                  </div>
                  <div className="status-indicator status-warning">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    警告状态
                  </div>
                  <div className="status-indicator status-error">
                    <XCircle className="w-4 h-4 mr-2" />
                    错误状态
                  </div>
                  <div className="status-indicator status-info">
                    <Info className="w-4 h-4 mr-2" />
                    信息状态
                  </div>
                </div>
              </div>

              {/* 进度条 */}
              <div>
                <h3 className="text-lg font-semibold themed-text-primary mb-4">进度条</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between themed-text-secondary text-sm mb-2">
                      <span>测试进度</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="progress-bar h-3">
                      <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleProgressChange(Math.max(0, progress - 10))}
                      className="themed-button-secondary px-3 py-1 text-sm"
                    >
                      -10%
                    </button>
                    <button
                      onClick={() => handleProgressChange(Math.min(100, progress + 10))}
                      className="themed-button-secondary px-3 py-1 text-sm"
                    >
                      +10%
                    </button>
                  </div>
                </div>
              </div>

              {/* 通知样式 */}
              <div>
                <h3 className="text-lg font-semibold themed-text-primary mb-4">通知样式</h3>
                <div className="space-y-4">
                  <div className="notification notification-success">
                    <CheckCircle className="w-5 h-5 mr-3" />
                    <div>
                      <h4 className="font-medium">操作成功</h4>
                      <p className="text-sm opacity-90">您的设置已成功保存</p>
                    </div>
                  </div>
                  <div className="notification notification-warning">
                    <AlertTriangle className="w-5 h-5 mr-3" />
                    <div>
                      <h4 className="font-medium">注意事项</h4>
                      <p className="text-sm opacity-90">请检查您的网络连接</p>
                    </div>
                  </div>
                  <div className="notification notification-error">
                    <XCircle className="w-5 h-5 mr-3" />
                    <div>
                      <h4 className="font-medium">操作失败</h4>
                      <p className="text-sm opacity-90">无法连接到服务器</p>
                    </div>
                  </div>
                  <div className="notification notification-info">
                    <Info className="w-5 h-5 mr-3" />
                    <div>
                      <h4 className="font-medium">提示信息</h4>
                      <p className="text-sm opacity-90">新功能已上线，快来体验吧</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'buttons' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold themed-text-primary mb-4">按钮样式</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button className="themed-button-primary flex items-center justify-center space-x-2">
                    <Play className="w-4 h-4" />
                    <span>主要按钮</span>
                  </button>
                  <button className="themed-button-secondary flex items-center justify-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>次要按钮</span>
                  </button>
                  <button className="themed-button-success flex items-center justify-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>成功按钮</span>
                  </button>
                  <button className="themed-button-danger flex items-center justify-center space-x-2">
                    <XCircle className="w-4 h-4" />
                    <span>危险按钮</span>
                  </button>
                  <button className="themed-button-disabled flex items-center justify-center space-x-2">
                    <Square className="w-4 h-4" />
                    <span>禁用按钮</span>
                  </button>
                  <button
                    onClick={simulateLoading}
                    className="themed-button-primary flex items-center justify-center space-x-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>{isLoading ? '加载中...' : '下载文件'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'forms' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold themed-text-primary mb-4">表单元素</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium themed-text-secondary mb-2">
                        文本输入框
                      </label>
                      <input
                        type="text"
                        placeholder="请输入内容..."
                        className="themed-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium themed-text-secondary mb-2">
                        密码输入框
                      </label>
                      <input
                        type="password"
                        placeholder="请输入密码..."
                        className="themed-input"
                      />
                    </div>
                    <div>
                      <label htmlFor="theme-select-demo" className="block text-sm font-medium themed-text-secondary mb-2">
                        选择框
                      </label>
                      <select id="theme-select-demo" className="themed-input" aria-label="主题选择框示例">
                        <option>选项一</option>
                        <option>选项二</option>
                        <option>选项三</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium themed-text-secondary mb-2">
                        文本域
                      </label>
                      <textarea
                        rows={4}
                        placeholder="请输入详细描述..."
                        className="themed-input resize-none"
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-medium themed-text-secondary mb-2">
                        搜索框
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 themed-text-tertiary" />
                        <input
                          type="search"
                          placeholder="搜索..."
                          className="themed-input pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold themed-text-primary mb-4">数据表格</h3>
                <div className="data-table">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left">名称</th>
                        <th className="text-left">状态</th>
                        <th className="text-left">进度</th>
                        <th className="text-left">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>网站性能测试</td>
                        <td>
                          <span className="status-indicator status-success">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            完成
                          </span>
                        </td>
                        <td>100%</td>
                        <td>
                          <button className="themed-button-secondary px-3 py-1 text-sm">
                            查看
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td>安全检测</td>
                        <td>
                          <span className="status-indicator status-warning">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            进行中
                          </span>
                        </td>
                        <td>65%</td>
                        <td>
                          <button className="themed-button-secondary px-3 py-1 text-sm">
                            查看
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td>兼容性测试</td>
                        <td>
                          <span className="status-indicator status-error">
                            <XCircle className="w-3 h-3 mr-1" />
                            失败
                          </span>
                        </td>
                        <td>0%</td>
                        <td>
                          <button className="themed-button-secondary px-3 py-1 text-sm">
                            重试
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThemeShowcase;
