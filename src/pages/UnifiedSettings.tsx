import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Monitor,
  Clock,
  FileText,
  Archive,
  Server,
  Globe,
  Mail,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Download,
  Upload,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Lock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SettingsService, systemSettingsAPI, userPreferencesAPI } from '../services/settingsService';

// 导入主题样式
import '../styles/theme.css';
import '../styles/light-theme.css';
import '../styles/dark-theme.css';

// 导入现有组件
import SystemSettings from '../components/admin/SystemSettings';
import BackupManagement from '../components/admin/BackupManagement';
import SecurityCenter from '../components/admin/SecurityCenter';

interface TabConfig {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  adminOnly?: boolean;
}

interface InterfacePrefs {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  enableAnimations: boolean;
  showAdvancedOptions: boolean;
  autoSaveSettings: boolean;
}

interface TestingPrefs {
  defaultTimeout: number;
  resultRetentionDays: number;
  autoStartTests: boolean;
  showDetailedLogs: boolean;
}

interface NotificationPrefs {
  emailTestComplete: boolean;
  emailSystemAlerts: boolean;
  emailScheduledTasks: boolean;
  browserPushEnabled: boolean;
  browserPushResults: boolean;
}

const UnifiedSettings: React.FC = () => {
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('preferences');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [systemSettings, setSystemSettings] = useState<Record<string, any>>({});
  const [userPreferences, setUserPreferences] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState<Record<string, any>>({});

  const isAdmin = user?.role === 'admin';

  // 加载数据
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isAdmin && ['general', 'security', 'monitoring', 'scheduled', 'logs', 'backup', 'maintenance'].includes(activeTab)) {
        // 加载系统设置
        const settings = await SettingsService.getSystemSettings();
        setSystemSettings(settings);
      } else if (['preferences', 'account', 'notifications'].includes(activeTab)) {
        // 加载用户偏好
        const preferences = await SettingsService.getUserPreferences();
        setUserPreferences(preferences);
        setFormData(preferences);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  // 保存设置
  const saveSettings = async (category: string, data: Record<string, any>) => {
    try {
      setSaveStatus('idle');

      if (isAdmin && ['general', 'testing', 'monitoring', 'security', 'notifications', 'backup'].includes(category)) {
        // 保存系统设置
        await SettingsService.updateSystemSettings(category, data);
        setSystemSettings(prev => ({ ...prev, [category]: data }));
      } else {
        // 保存用户偏好
        await SettingsService.updateUserPreferences(category, data);
        setUserPreferences(prev => ({ ...prev, [category]: data }));
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // 统一的标签页配置
  const tabs: TabConfig[] = [
    {
      id: 'preferences',
      name: '个人偏好',
      icon: User,
      description: '个人界面和使用偏好设置'
    },
    {
      id: 'account',
      name: '账户设置',
      icon: Shield,
      description: '个人账户信息和密码管理'
    },
    {
      id: 'notifications',
      name: '通知设置',
      icon: Bell,
      description: '邮件、短信和推送通知配置'
    },
    {
      id: 'general',
      name: '系统配置',
      icon: Globe,
      description: '网站基本信息和系统级配置',
      adminOnly: true
    },
    {
      id: 'security',
      name: '安全设置',
      icon: Shield,
      description: '密码策略、登录安全和访问控制',
      adminOnly: true
    },
    {
      id: 'monitoring',
      name: '系统监控',
      icon: Monitor,
      description: '性能监控、告警设置和系统状态',
      adminOnly: true
    },
    {
      id: 'scheduled',
      name: '定时任务',
      icon: Clock,
      description: '自动化任务调度和执行管理',
      adminOnly: true
    },
    {
      id: 'logs',
      name: '系统日志',
      icon: FileText,
      description: '系统日志查看、搜索和管理',
      adminOnly: true
    },
    {
      id: 'backup',
      name: '备份管理',
      icon: Archive,
      description: '数据备份、恢复和存储管理',
      adminOnly: true
    },
    {
      id: 'maintenance',
      name: '系统维护',
      icon: Server,
      description: '系统维护、更新和性能优化',
      adminOnly: true
    }
  ];

  // 过滤标签页（非管理员用户只能看到部分标签）
  const visibleTabs = tabs.filter(tab => !tab.adminOnly || isAdmin);

  // 确保当前标签页对用户可见
  useEffect(() => {
    const currentTab = visibleTabs.find(tab => tab.id === activeTab);
    if (!currentTab && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [activeTab, visibleTabs]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'preferences':
        return <PreferencesSettings preferences={userPreferences} onSave={saveSettings} />;
      case 'account':
        return <AccountSettings />;
      case 'notifications':
        return <NotificationSettings preferences={userPreferences} onSave={saveSettings} />;
      case 'general':
        return <GeneralSettings settings={systemSettings} onSave={saveSettings} />;
      case 'security':
        return <SecurityCenter />;
      case 'monitoring':
        return <MonitoringSettings />;
      case 'scheduled':
        return <ScheduledTasksSettings />;
      case 'logs':
        return <LogsSettings />;
      case 'backup':
        return <BackupManagement />;
      case 'maintenance':
        return <MaintenanceSettings />;
      default:
        return isAdmin ? <GeneralSettings settings={systemSettings} onSave={saveSettings} /> : <PreferencesSettings preferences={userPreferences} onSave={saveSettings} />;
    }
  };

  return (
    <div className={`min-h-screen p-6 theme-transition ${actualTheme === 'light' ? 'light-theme-wrapper' : 'dark-theme-wrapper'}`}>
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 p-8 mb-8 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl border border-blue-500/30">
                <SettingsIcon className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  系统设置
                </h1>
                <p className="text-gray-400 mt-2 text-lg">管理系统配置和个人偏好设置</p>
              </div>
            </div>

            {/* 保存状态指示器 */}
            {saveStatus !== 'idle' && (
              <div className={`flex items-center space-x-3 px-4 py-3 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                saveStatus === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/20'
                  : 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-lg shadow-red-500/20'
              }`}>
                {saveStatus === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">
                  {saveStatus === 'success' ? '设置已保存' : '保存失败'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 侧边栏标签页 */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 p-6 shadow-2xl">
              <nav className="space-y-3">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`group w-full flex items-start space-x-4 px-4 py-4 rounded-xl text-left transition-all duration-300 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/20 text-blue-300 border border-blue-500/40 shadow-lg shadow-blue-500/20 transform scale-[1.02]'
                          : 'text-gray-300 hover:bg-gradient-to-r hover:from-gray-700/50 hover:to-gray-600/30 hover:text-white border border-transparent hover:border-gray-600/50 hover:shadow-lg hover:transform hover:scale-[1.01]'
                      }`}
                    >
                      <div className={`p-2 rounded-lg transition-all duration-300 ${
                        activeTab === tab.id
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-700/50 text-gray-400 group-hover:bg-gray-600/50 group-hover:text-gray-300'
                      }`}>
                        <Icon className="w-5 h-5 flex-shrink-0" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{tab.name}</div>
                        <div className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                          {tab.description}
                        </div>
                      </div>
                      {tab.adminOnly && (
                        <div className="px-2 py-1 text-xs bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-300 rounded-lg border border-orange-500/30 font-medium">
                          管理员
                        </div>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* 主内容区域 */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/60 p-8 shadow-2xl">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
                    <span className="text-gray-300 text-lg">加载中...</span>
                  </div>
                </div>
              ) : (
                renderTabContent()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 设置组件实现
const PreferencesSettings: React.FC<{
  preferences?: Record<string, any>;
  onSave?: (category: string, data: Record<string, any>) => void;
}> = ({ preferences = {}, onSave }) => {
  const { theme, setTheme, actualTheme } = useTheme();

  const [interfacePrefs, setInterfacePrefs] = useState<InterfacePrefs>({
    theme: theme,
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    enableAnimations: true,
    showAdvancedOptions: false,
    autoSaveSettings: true,
    ...preferences.interface
  });

  const [testingPrefs, setTestingPrefs] = useState<TestingPrefs>({
    defaultTimeout: 60,
    resultRetentionDays: 30,
    autoStartTests: false,
    showDetailedLogs: false,
    ...preferences.testing
  });

  const handleInterfaceSave = () => {
    // 应用主题更改
    if (interfacePrefs.theme !== theme) {
      setTheme(interfacePrefs.theme as 'light' | 'dark');
    }
    onSave?.('interface', interfacePrefs);
  };

  const handleTestingSave = () => {
    onSave?.('testing', testingPrefs);
  };

  return (
  <div className="space-y-8">
    <div className="flex items-center space-x-3 mb-6">
      <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-lg border border-purple-500/30">
        <User className="w-6 h-6 text-purple-400" />
      </div>
      <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
        个人偏好
      </h3>
    </div>

    {/* 界面设置 */}
    <div className="bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/50 shadow-xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Monitor className="w-5 h-5 text-blue-400" />
        </div>
        <h4 className="text-xl font-semibold text-white">界面设置</h4>
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="theme-select" className="block text-sm font-semibold text-gray-300">主题模式</label>
            <select
              id="theme-select"
              value={interfacePrefs.theme}
              onChange={(e) => {
                const newTheme = e.target.value as 'light' | 'dark';
                setInterfacePrefs(prev => ({ ...prev, theme: newTheme }));
                // 立即应用主题更改
                setTheme(newTheme);
              }}
              className="w-full px-4 py-3 bg-gray-700/60 border border-gray-600/60 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
              aria-label="选择主题模式"
            >
              <option value="dark">深色主题</option>
              <option value="light">浅色主题</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="language-select" className="block text-sm font-semibold text-gray-300">语言</label>
            <select
              id="language-select"
              value={interfacePrefs.language}
              onChange={(e) => setInterfacePrefs(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-700/60 border border-gray-600/60 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
              aria-label="选择界面语言"
            >
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="timezone-select" className="block text-sm font-semibold text-gray-300">时区</label>
            <select
              id="timezone-select"
              value={interfacePrefs.timezone}
              onChange={(e) => setInterfacePrefs(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-700/60 border border-gray-600/60 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
              aria-label="选择时区设置"
            >
              <option value="Asia/Shanghai">中国标准时间 (UTC+8)</option>
              <option value="America/New_York">美国东部时间 (UTC-5)</option>
              <option value="Europe/London">英国时间 (UTC+0)</option>
              <option value="Asia/Tokyo">日本时间 (UTC+9)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="date-format-select" className="block text-sm font-semibold text-gray-300">日期格式</label>
            <select
              id="date-format-select"
              value={interfacePrefs.dateFormat}
              onChange={(e) => setInterfacePrefs(prev => ({ ...prev, dateFormat: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-700/60 border border-gray-600/60 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
              aria-label="选择日期格式"
            >
              <option value="YYYY-MM-DD">2025-01-15</option>
              <option value="DD/MM/YYYY">15/01/2025</option>
              <option value="MM/DD/YYYY">01/15/2025</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center space-x-4 p-4 rounded-xl bg-gray-700/30 border border-gray-600/40 hover:bg-gray-700/50 transition-all duration-200 cursor-pointer">
            <input
              type="checkbox"
              checked={interfacePrefs.enableAnimations}
              onChange={(e) => setInterfacePrefs(prev => ({ ...prev, enableAnimations: e.target.checked }))}
              className="w-5 h-5 text-blue-600 bg-gray-700/60 border-gray-600 rounded-lg focus:ring-blue-500/50 focus:ring-2 transition-all duration-200"
              aria-label="启用动画效果"
            />
            <span className="text-gray-200 font-medium">启用动画效果</span>
          </label>
          <label className="flex items-center space-x-4 p-4 rounded-xl bg-gray-700/30 border border-gray-600/40 hover:bg-gray-700/50 transition-all duration-200 cursor-pointer">
            <input
              type="checkbox"
              checked={interfacePrefs.showAdvancedOptions}
              onChange={(e) => setInterfacePrefs(prev => ({ ...prev, showAdvancedOptions: e.target.checked }))}
              className="w-5 h-5 text-blue-600 bg-gray-700/60 border-gray-600 rounded-lg focus:ring-blue-500/50 focus:ring-2 transition-all duration-200"
              aria-label="显示高级选项"
            />
            <span className="text-gray-200 font-medium">显示高级选项</span>
          </label>
          <label className="flex items-center space-x-4 p-4 rounded-xl bg-gray-700/30 border border-gray-600/40 hover:bg-gray-700/50 transition-all duration-200 cursor-pointer">
            <input
              type="checkbox"
              checked={interfacePrefs.autoSaveSettings}
              onChange={(e) => setInterfacePrefs(prev => ({ ...prev, autoSaveSettings: e.target.checked }))}
              className="w-5 h-5 text-blue-600 bg-gray-700/60 border-gray-600 rounded-lg focus:ring-blue-500/50 focus:ring-2 transition-all duration-200"
              aria-label="自动保存设置"
            />
            <span className="text-gray-200 font-medium">自动保存设置</span>
          </label>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={handleInterfaceSave}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            保存界面设置
          </button>
        </div>
      </div>
    </div>

    {/* 测试偏好 */}
    <div className="bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/50 shadow-xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-green-500/20 rounded-lg">
          <Settings className="w-5 h-5 text-green-400" />
        </div>
        <h4 className="text-xl font-semibold text-white">测试偏好</h4>
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="default-timeout-input" className="block text-sm font-semibold text-gray-300">默认测试超时 (秒)</label>
            <input
              id="default-timeout-input"
              type="number"
              value={testingPrefs.defaultTimeout}
              onChange={(e) => setTestingPrefs(prev => ({ ...prev, defaultTimeout: parseInt(e.target.value) || 60 }))}
              min="10"
              max="300"
              aria-label="设置默认测试超时时间"
              className="w-full px-4 py-3 bg-gray-700/60 border border-gray-600/60 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="retention-days-input" className="block text-sm font-semibold text-gray-300">结果保留天数</label>
            <input
              id="retention-days-input"
              type="number"
              value={testingPrefs.resultRetentionDays}
              onChange={(e) => setTestingPrefs(prev => ({ ...prev, resultRetentionDays: parseInt(e.target.value) || 30 }))}
              min="7"
              max="365"
              aria-label="设置测试结果保留天数"
              className="w-full px-4 py-3 bg-gray-700/60 border border-gray-600/60 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200"
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center space-x-4 p-4 rounded-xl bg-gray-700/30 border border-gray-600/40 hover:bg-gray-700/50 transition-all duration-200 cursor-pointer">
            <input
              type="checkbox"
              checked={testingPrefs.autoStartTests}
              onChange={(e) => setTestingPrefs(prev => ({ ...prev, autoStartTests: e.target.checked }))}
              className="w-5 h-5 text-green-600 bg-gray-700/60 border-gray-600 rounded-lg focus:ring-green-500/50 focus:ring-2 transition-all duration-200"
              aria-label="自动开始测试"
            />
            <span className="text-gray-200 font-medium">自动开始测试</span>
          </label>
          <label className="flex items-center space-x-4 p-4 rounded-xl bg-gray-700/30 border border-gray-600/40 hover:bg-gray-700/50 transition-all duration-200 cursor-pointer">
            <input
              type="checkbox"
              checked={testingPrefs.showDetailedLogs}
              onChange={(e) => setTestingPrefs(prev => ({ ...prev, showDetailedLogs: e.target.checked }))}
              className="w-5 h-5 text-green-600 bg-gray-700/60 border-gray-600 rounded-lg focus:ring-green-500/50 focus:ring-2 transition-all duration-200"
              aria-label="显示详细日志"
            />
            <span className="text-gray-200 font-medium">显示详细日志</span>
          </label>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={handleTestingSave}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500/50"
          >
            保存测试偏好
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};

const GeneralSettings: React.FC<{
  settings?: Record<string, any>;
  onSave?: (category: string, data: Record<string, any>) => Promise<void>;
}> = ({ settings, onSave }) => (
  <div className="space-y-8">
    <div className="flex items-center space-x-3 mb-6">
      <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-lg border border-blue-500/30">
        <Globe className="w-6 h-6 text-blue-400" />
      </div>
      <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
        系统配置
      </h3>
    </div>

    {/* 深色主题包装器 */}
    <div className="bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/50 shadow-xl">
      <div className="dark-theme-wrapper">
        <SystemSettings />
      </div>
    </div>
  </div>
);

const AccountSettings: React.FC = () => {
  const { user } = useAuth();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 加载用户信息
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        setLoading(true);

        // 首先尝试使用useAuth中的用户信息
        if (user) {
          setUserInfo(user);
          setLoading(false);
          return;
        }

        // 如果useAuth中没有用户信息，尝试从API获取
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('test_web_app_token') || localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.user) {
            setUserInfo(result.data.user);
          } else {
            // 如果响应格式不正确，使用useAuth中的用户信息
            setUserInfo(user);
          }
        } else {
          // 如果API调用失败，使用useAuth中的用户信息
          console.warn('Failed to fetch user info from API, using auth context data');
          setUserInfo(user);
        }
      } catch (error) {
        console.error('Failed to load user info:', error);
        // 使用模拟数据作为后备
        setUserInfo({
          username: 'testuser',
          email: 'user@example.com',
          role: 'admin',
          createdAt: '2024-01-01T00:00:00Z'
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserInfo();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-lg border border-blue-500/30">
            <User className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            账户设置
          </h3>
        </div>
        <div className="bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/50 shadow-xl">
          <div className="text-center text-gray-400">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-lg border border-blue-500/30">
          <User className="w-6 h-6 text-blue-400" />
        </div>
        <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          账户设置
        </h3>
      </div>

      {/* 用户信息 */}
      <div className="bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/50 shadow-xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Info className="w-5 h-5 text-blue-400" />
          </div>
          <h4 className="text-xl font-semibold text-white">个人信息</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">用户名</label>
            <input
              type="text"
              value={userInfo?.username || ''}
              readOnly
              aria-label="用户名"
              className="w-full px-4 py-3 bg-gray-700/60 border border-gray-600/60 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">邮箱</label>
            <input
              type="email"
              value={userInfo?.email || ''}
              onChange={() => {}} // 只读，但允许选择文本
              aria-label="邮箱地址"
              className="w-full px-4 py-3 bg-gray-700/60 border border-gray-600/60 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:border-gray-500/60"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">角色</label>
            <input
              type="text"
              value={userInfo?.role || ''}
              readOnly
              aria-label="用户角色"
              className="w-full px-4 py-3 bg-gray-700/60 border border-gray-600/60 rounded-xl text-gray-400 placeholder-gray-400 focus:outline-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">注册时间</label>
            <input
              type="text"
              value={userInfo?.createdAt ? new Date(userInfo.createdAt).toLocaleDateString() : ''}
              readOnly
              aria-label="注册时间"
              className="w-full px-4 py-3 bg-gray-700/60 border border-gray-600/60 rounded-xl text-gray-400 placeholder-gray-400 focus:outline-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        </div>
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            更新信息
          </button>
        </div>
      </div>

      {/* 密码修改 */}
      <div className="bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/50 shadow-xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Lock className="w-5 h-5 text-green-400" />
          </div>
          <h4 className="text-xl font-semibold text-white">修改密码</h4>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">当前密码</label>
            <input
              type="password"
              aria-label="当前密码"
              placeholder="请输入当前密码"
              className="w-full px-4 py-3 bg-gray-700/60 border border-gray-600/60 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200 hover:border-gray-500/60"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">新密码</label>
            <input
              type="password"
              aria-label="新密码"
              placeholder="请输入新密码"
              className="w-full px-4 py-3 bg-gray-700/60 border border-gray-600/60 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200 hover:border-gray-500/60"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">确认新密码</label>
            <input
              type="password"
              aria-label="确认新密码"
              placeholder="请再次输入新密码"
              className="w-full px-4 py-3 bg-gray-700/60 border border-gray-600/60 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200 hover:border-gray-500/60"
            />
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="button"
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            >
              修改密码
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationSettings: React.FC<{
  preferences?: Record<string, any>;
  onSave?: (category: string, data: Record<string, any>) => void;
}> = ({ preferences = {}, onSave }) => {
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    emailTestComplete: true,
    emailSystemAlerts: true,
    emailScheduledTasks: false,
    browserPushEnabled: false,
    browserPushResults: false,
    ...preferences.notifications
  });

  const handleSave = () => {
    onSave?.('notifications', notificationPrefs);
  };

  return (
  <div className="space-y-8">
    <div className="flex items-center space-x-3 mb-6">
      <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-orange-600/20 rounded-lg border border-yellow-500/30">
        <Bell className="w-6 h-6 text-yellow-400" />
      </div>
      <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
        通知设置
      </h3>
    </div>

    {/* 邮件通知 */}
    <div className="bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/50 shadow-xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Mail className="w-5 h-5 text-blue-400" />
        </div>
        <h4 className="text-xl font-semibold text-white">邮件通知</h4>
      </div>
      <div className="space-y-4">
        <label className="flex items-center space-x-4 p-4 rounded-xl bg-gray-700/30 border border-gray-600/40 hover:bg-gray-700/50 transition-all duration-200 cursor-pointer">
          <input
            type="checkbox"
            checked={notificationPrefs.emailTestComplete}
            onChange={(e) => setNotificationPrefs(prev => ({ ...prev, emailTestComplete: e.target.checked }))}
            className="w-5 h-5 text-blue-600 bg-gray-700/60 border-gray-600 rounded-lg focus:ring-blue-500/50 focus:ring-2 transition-all duration-200"
            aria-label="测试完成通知"
          />
          <span className="text-gray-200 font-medium">测试完成通知</span>
        </label>
        <label className="flex items-center space-x-4 p-4 rounded-xl bg-gray-700/30 border border-gray-600/40 hover:bg-gray-700/50 transition-all duration-200 cursor-pointer">
          <input
            type="checkbox"
            checked={notificationPrefs.emailSystemAlerts}
            onChange={(e) => setNotificationPrefs(prev => ({ ...prev, emailSystemAlerts: e.target.checked }))}
            className="w-5 h-5 text-blue-600 bg-gray-700/60 border-gray-600 rounded-lg focus:ring-blue-500/50 focus:ring-2 transition-all duration-200"
            aria-label="系统告警通知"
          />
          <span className="text-gray-200 font-medium">系统告警通知</span>
        </label>
        <label className="flex items-center space-x-4 p-4 rounded-xl bg-gray-700/30 border border-gray-600/40 hover:bg-gray-700/50 transition-all duration-200 cursor-pointer">
          <input
            type="checkbox"
            checked={notificationPrefs.emailScheduledTasks}
            onChange={(e) => setNotificationPrefs(prev => ({ ...prev, emailScheduledTasks: e.target.checked }))}
            className="w-5 h-5 text-blue-600 bg-gray-700/60 border-gray-600 rounded-lg focus:ring-blue-500/50 focus:ring-2 transition-all duration-200"
            aria-label="定时任务状态通知"
          />
          <span className="text-gray-200 font-medium">定时任务状态通知</span>
        </label>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleSave}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          保存邮件设置
        </button>
      </div>
    </div>

    {/* 推送通知 */}
    <div className="bg-gradient-to-br from-gray-800/60 to-gray-700/40 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/50 shadow-xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Bell className="w-5 h-5 text-purple-400" />
        </div>
        <h4 className="text-xl font-semibold text-white">浏览器推送</h4>
      </div>
      <div className="space-y-4">
        <label className="flex items-center space-x-4 p-4 rounded-xl bg-gray-700/30 border border-gray-600/40 hover:bg-gray-700/50 transition-all duration-200 cursor-pointer">
          <input
            type="checkbox"
            checked={notificationPrefs.browserPushEnabled}
            onChange={(e) => setNotificationPrefs(prev => ({ ...prev, browserPushEnabled: e.target.checked }))}
            className="w-5 h-5 text-purple-600 bg-gray-700/60 border-gray-600 rounded-lg focus:ring-purple-500/50 focus:ring-2 transition-all duration-200"
            aria-label="启用浏览器推送通知"
          />
          <span className="text-gray-200 font-medium">启用浏览器推送通知</span>
        </label>
        <label className="flex items-center space-x-4 p-4 rounded-xl bg-gray-700/30 border border-gray-600/40 hover:bg-gray-700/50 transition-all duration-200 cursor-pointer">
          <input
            type="checkbox"
            checked={notificationPrefs.browserPushResults}
            onChange={(e) => setNotificationPrefs(prev => ({ ...prev, browserPushResults: e.target.checked }))}
            className="w-5 h-5 text-purple-600 bg-gray-700/60 border-gray-600 rounded-lg focus:ring-purple-500/50 focus:ring-2 transition-all duration-200"
            aria-label="测试结果推送"
          />
          <span className="text-gray-200 font-medium">测试结果推送</span>
        </label>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleSave}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        >
          保存推送设置
        </button>
      </div>
    </div>
  </div>
  );
};

const MonitoringSettings: React.FC = () => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold text-white mb-4">系统监控</h3>

    {/* 监控配置 */}
    <div className="bg-gray-700/30 rounded-lg p-6 border border-gray-600/50">
      <h4 className="text-white font-medium mb-4">监控配置</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="monitor-interval-input" className="block text-sm font-medium text-gray-300 mb-2">监控间隔 (秒)</label>
          <input
            id="monitor-interval-input"
            type="number"
            defaultValue="60"
            className="w-full px-3 py-2 bg-gray-600/50 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="设置监控间隔时间"
          />
        </div>
        <div>
          <label htmlFor="alert-threshold-input" className="block text-sm font-medium text-gray-300 mb-2">告警阈值 (%)</label>
          <input
            id="alert-threshold-input"
            type="number"
            defaultValue="80"
            className="w-full px-3 py-2 bg-gray-600/50 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="设置告警阈值百分比"
          />
        </div>
      </div>
    </div>

    {/* 系统状态 */}
    <div className="bg-gray-700/30 rounded-lg p-6 border border-gray-600/50">
      <h4 className="text-white font-medium mb-4">系统状态</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">98.5%</div>
          <div className="text-sm text-gray-300">CPU 使用率</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">2.1GB</div>
          <div className="text-sm text-gray-300">内存使用</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">45.2GB</div>
          <div className="text-sm text-gray-300">磁盘使用</div>
        </div>
      </div>
    </div>
  </div>
);

const ScheduledTasksSettings: React.FC = () => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold text-white mb-4">定时任务</h3>

    {/* 任务列表 */}
    <div className="bg-gray-700/30 rounded-lg p-6 border border-gray-600/50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-white font-medium">任务列表</h4>
        <button
          type="button"
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
        >
          新建任务
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-600/30 rounded-lg">
          <div>
            <div className="text-white font-medium">数据库备份</div>
            <div className="text-sm text-gray-300">每日 02:00 执行</div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">运行中</span>
            <button type="button" className="p-1 text-gray-400 hover:text-white" title="暂停服务">
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-600/30 rounded-lg">
          <div>
            <div className="text-white font-medium">日志清理</div>
            <div className="text-sm text-gray-300">每周日 03:00 执行</div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 bg-gray-500/20 text-gray-300 rounded text-xs">已停止</span>
            <button type="button" className="p-1 text-gray-400 hover:text-white" title="启动服务">
              <Play className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const LogsSettings: React.FC = () => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold text-white mb-4">系统日志</h3>

    {/* 日志配置 */}
    <div className="bg-gray-700/30 rounded-lg p-6 border border-gray-600/50">
      <h4 className="text-white font-medium mb-4">日志配置</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="log-level-select" className="block text-sm font-medium text-gray-300 mb-2">日志级别</label>
          <select
            id="log-level-select"
            className="w-full px-3 py-2 bg-gray-600/50 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="选择日志级别"
          >
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div>
          <label htmlFor="log-retention-input" className="block text-sm font-medium text-gray-300 mb-2">保留天数</label>
          <input
            id="log-retention-input"
            type="number"
            defaultValue="30"
            className="w-full px-3 py-2 bg-gray-600/50 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="设置日志保留天数"
          />
        </div>
      </div>
    </div>

    {/* 日志操作 */}
    <div className="bg-gray-700/30 rounded-lg p-6 border border-gray-600/50">
      <h4 className="text-white font-medium mb-4">日志操作</h4>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>下载日志</span>
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>清理日志</span>
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>删除所有</span>
        </button>
      </div>
    </div>
  </div>
);

const MaintenanceSettings: React.FC = () => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold text-white mb-4">系统维护</h3>

    {/* 系统信息 */}
    <div className="bg-gray-700/30 rounded-lg p-6 border border-gray-600/50">
      <h4 className="text-white font-medium mb-4">系统信息</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-gray-300">系统版本</div>
          <div className="text-white font-medium">Test Web App v2.1.0</div>
        </div>
        <div>
          <div className="text-sm text-gray-300">数据库版本</div>
          <div className="text-white font-medium">PostgreSQL 14.2</div>
        </div>
        <div>
          <div className="text-sm text-gray-300">Node.js 版本</div>
          <div className="text-white font-medium">v18.17.0</div>
        </div>
        <div>
          <div className="text-sm text-gray-300">最后更新</div>
          <div className="text-white font-medium">2025-01-15 10:30:00</div>
        </div>
      </div>
    </div>

    {/* 维护操作 */}
    <div className="bg-gray-700/30 rounded-lg p-6 border border-gray-600/50">
      <h4 className="text-white font-medium mb-4">维护操作</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg text-left hover:bg-blue-600/30 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-white font-medium">重启服务</div>
              <div className="text-sm text-gray-300">重启应用服务</div>
            </div>
          </div>
        </button>

        <button
          type="button"
          className="p-4 bg-green-600/20 border border-green-500/30 rounded-lg text-left hover:bg-green-600/30 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Database className="w-5 h-5 text-green-400" />
            <div>
              <div className="text-white font-medium">优化数据库</div>
              <div className="text-sm text-gray-300">清理和优化数据库</div>
            </div>
          </div>
        </button>

        <button
          type="button"
          className="p-4 bg-yellow-600/20 border border-yellow-500/30 rounded-lg text-left hover:bg-yellow-600/30 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Trash2 className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="text-white font-medium">清理缓存</div>
              <div className="text-sm text-gray-300">清理系统缓存文件</div>
            </div>
          </div>
        </button>

        <button
          type="button"
          className="p-4 bg-purple-600/20 border border-purple-500/30 rounded-lg text-left hover:bg-purple-600/30 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Upload className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-white font-medium">系统更新</div>
              <div className="text-sm text-gray-300">检查并安装更新</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
);

export default UnifiedSettings;
