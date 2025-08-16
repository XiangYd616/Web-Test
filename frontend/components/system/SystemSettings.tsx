import { AlertTriangle, CheckCircle, Database, Globe, Mail, Monitor, Save, Server, Shield    } from 'lucide-react';import React, { useState    } from 'react';import type { SystemConfig  } from '../../types/admin';export interface SystemSettingsProps     {'
  // 基础属性
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  
  // 事件处理
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onChange?: (value: any) => void;
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
  
  // 状态属性
  disabled?: boolean;
  loading?: boolean;
  error?: string | boolean;
  
  // 数据属性
  value?: any;
  defaultValue?: any;
  
  // 配置属性
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
  // 可访问性
  'aria-label'?: string;'
  'aria-describedby'?: string;'
  role?: string;
  tabIndex?: number;
}


const SystemSettings: React.FC<SystemSettingsProps>  = (props) => {
  
  // 页面级功能
  const [pageTitle, setPageTitle] = useState("');'
  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} - Test Web`;`
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible') {'`
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);'
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);'
    };
  }, [fetchData]);
  
  const memoizedHandleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  }, [disabled, loading, onClick]);
  
  const memoizedHandleChange = useMemo(() => debounce((value: any) => {
      onChange?.(value);
    }, 300), [onChange]
  );
  const [config, setConfig] = useState<SystemConfig>({
    general: {
      siteName: 'Test Web App','
      siteDescription: '专业的Web测试平台','
      adminEmail: 'admin@testweb.com','
      timezone: 'Asia/Shanghai','
      language: 'zh-CN','
      maintenanceMode: false,
      registrationEnabled: true,
      emailVerificationRequired: true,
    },
    testing: {
      maxConcurrentTests: 10,
      maxTestsPerUser: 50,
      testTimeoutMinutes: 60,
      dataRetentionDays: 90,
      enabledTestTypes: {
        coreWebVitals: true,
        lighthouseAudit: true,
        securityScan: true,
        loadTest: true,
        apiTest: true,
        uptimeMonitor: true,
        syntheticMonitor: true,
        realUserMonitor: false
      },
      defaultLocations: ['beijing', 'shanghai', 'guangzhou'],'
      maxFileUploadSize: 10, // MB
      screenshotQuality: 'high','
      videoRecording: true,
      harGeneration: true
    },
    monitoring: {
      uptimeCheckInterval: 60, // seconds
      alertThresholds: {
        responseTime: 5000, // ms
        errorRate: 5, // percentage
        availability: 99.9 // percentage
      },
      retentionPeriods: {
        rawData: 30, // days
        aggregatedData: 365, // days
        screenshots: 7, // days
        videos: 3 // days
      }
    },
    security: {
      passwordMinLength: 8,
      passwordRequireSpecialChars: true,
      sessionTimeoutMinutes: 480, // 8小时
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 30,
      twoFactorRequired: false,
      ipWhitelist: [],
    },
    notifications: {
      emailEnabled: true,
      smtpHost: 'smtp.gmail.com','
      smtpPort: 587,
      smtpUser: '','
      smtpPassword: '','
      fromEmail: 'noreply@testweb.com','
      fromName: 'Test Web App','
    },
    backup: {
      enabled: true,
      frequency: 'daily','
      retentionDays: 30,
      location: 'local','
    },
  });

  const [activeTab, setActiveTab] = useState('general');'
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');'
  const [testingEmail, setTestingEmail] = useState(false);

  const tabs = [
    { id: 'general', name: '常规设置', icon: Globe },'
    { id: 'testing', name: '测试配置', icon: Server },'
    { id: 'monitoring', name: '监控设置', icon: Monitor },'
    { id: 'security', name: '安全设置', icon: Shield },'
    { id: 'notifications', name: '通知设置', icon: Mail },'
    { id: 'backup', name: '备份设置', icon: Database },'
  ];

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle');'
    try {
      // 模拟保存配置
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSaveStatus('success');'
      setTimeout(() => setSaveStatus('idle'), 3000);'
    } catch (error) {
      console.error('保存配置失败:', error);'
      setSaveStatus("error');'
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);

    try {
      // 模拟发送测试邮件
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('测试邮件发送成功！请检查您的邮箱。');'
    } catch (error) {
      alert('测试邮件发送失败，请检查SMTP配置。');'
    } finally {
      setTestingEmail(false);
    }
  };

  const updateConfig = <T extends keyof SystemConfig>(section: T,
    key: keyof SystemConfig[T],
    value: any
  ) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  return (
    <div className= 'space-y-6'>
      {/* 页面标题和操作 */}
      <div className= 'flex justify-between items-center'>
        <div>
          <h2 className= 'text-2xl font-bold text-gray-900'>系统设置</h2>
          <p className= 'text-gray-600 mt-1'>配置系统的各项参数和策略</p>
        </div>
        <div className= 'flex items-center space-x-3'>
          {saveStatus === 'success' && ('')
            <div className= 'flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg'>
              <CheckCircle className= 'w-4 h-4 text-green-600'    />
              <span className= 'text-sm text-green-700 font-medium'>保存成功</span>
            </div>
          )}
          {saveStatus === 'error' && ('')
            <div className= 'flex items-center space-x-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg'>
              <AlertTriangle className= 'w-4 h-4 text-red-600'    />
              <span className= 'text-sm text-red-700 font-medium'>保存失败</span>
            </div>
          )}
          <button
            type= 'button';
            onClick={handleSave}
            disabled={saving}
            className= 'btn btn-primary flex items-center space-x-2';
          >
            <Save className= 'w-4 h-4'    />
            <span>{saving ? "保存中..." : "保存设置'}</span>
          </button>
        </div>
      </div>

      <div className= 'flex'>
        {/* 侧边栏导航 */}
        <div className= 'w-64 mr-8'>
          <nav className= 'space-y-1'>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (<button
                  key={tab.id}
                  type= 'button';
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id`}
                    ? "bg-primary-100 text-primary-700 border-r-2 border-primary-500';'`
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900';
                    }`}`
                >
                  <Icon className= "w-5 h-5 mr-3'    />`
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 主内容区 */}
        <div className= 'flex-1'>
          <div className= 'bg-white rounded-lg shadow p-6'>
            {/* 常规设置 */}
            {activeTab === 'general' && (<div className= 'space-y-6'>
                <h3 className= 'text-lg font-medium text-gray-900'>常规设置</h3>

                <div className= 'grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      站点名称
                    </label>
                    <input
                      type= 'text';
                      value={config.general.siteName}
                      onChange={(e) => updateConfig('general', 'siteName', e.target.value)}'
                      className= 'input';
                      aria-label= '站点名称';
                    />
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      管理员邮箱
                    </label>
                    <input
                      type= 'email';
                      value={config.general.adminEmail}
                      onChange={(e) => updateConfig('general', 'adminEmail', e.target.value)}'
                      className= 'input';
                      aria-label= '管理员邮箱';
                    />
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      时区
                    </label>
                    <select
                      value={config.general.timezone}
                      onChange={(e) => updateConfig('general', 'timezone', e.target.value)}'
                      className= 'input';
                      aria-label= '时区';
                    >
                      <option value= 'Asia/Shanghai'>中国标准时间 (UTC+8)</option>
                      <option value= 'America/New_York'>美国东部时间 (UTC-5)</option>
                      <option value= 'Europe/London'>英国时间 (UTC+0)</option>
                      <option value= 'Asia/Tokyo'>日本时间 (UTC+9)</option>
                    </select>
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      默认语言
                    </label>
                    <select
                      value={config.general.language}
                      onChange={(e) => updateConfig('general', 'language', e.target.value)}'
                      className= 'input';
                      aria-label= '默认语言';
                    >
                      <option value= 'zh-CN'>简体中文</option>
                      <option value= 'en-US'>English</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                    站点描述
                  </label>
                  <textarea
                    value={config.general.siteDescription}
                    onChange={(e) => updateConfig('general', 'siteDescription', e.target.value)}'
                    rows={3}
                    className= 'input';
                    aria-label= '站点描述';
                  />
                </div>

                <div className= 'space-y-4'>
                  <div className= 'flex items-center'>
                    <input
                      type= 'checkbox';
                      id= 'maintenanceMode';
                      checked={config.general.maintenanceMode}
                      onChange={(e) => updateConfig('general', 'maintenanceMode', e.target.checked)}'
                      className= 'rounded border-gray-300 text-primary-600 focus:ring-primary-500';
                    />
                    <label htmlFor= 'maintenanceMode' className= 'ml-2 text-sm text-gray-700'>
                      维护模式（启用后用户无法访问系统）
                    </label>
                  </div>

                  <div className= 'flex items-center'>
                    <input
                      type= 'checkbox';
                      id= 'registrationEnabled';
                      checked={config.general.registrationEnabled}
                      onChange={(e) => updateConfig('general', 'registrationEnabled', e.target.checked)}'
                      className= 'rounded border-gray-300 text-primary-600 focus:ring-primary-500';
                    />
                    <label htmlFor= 'registrationEnabled' className= 'ml-2 text-sm text-gray-700'>
                      允许用户注册
                    </label>
                  </div>

                  <div className= 'flex items-center'>
                    <input
                      type= 'checkbox';
                      id= 'emailVerificationRequired';
                      checked={config.general.emailVerificationRequired}
                      onChange={(e) => updateConfig('general', 'emailVerificationRequired', e.target.checked)}'
                      className= 'rounded border-gray-300 text-primary-600 focus:ring-primary-500';
                    />
                    <label htmlFor= 'emailVerificationRequired' className= 'ml-2 text-sm text-gray-700'>
                      要求邮箱验证
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 测试配置 */}
            {activeTab === 'testing' && (<div className= 'space-y-6'>
                <h3 className= 'text-lg font-medium text-gray-900'>测试配置</h3>

                {/* 基础测试设置 */}
                <div className= 'grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      每个用户最大测试数
                    </label>
                    <input
                      type= 'number';
                      value={config.testing.maxTestsPerUser}
                      onChange={(e) => updateConfig('testing', 'maxTestsPerUser', parseInt(e.target.value))}'
                      className= 'input';
                      min= '1';
                      aria-label= '每个用户最大测试数';
                    />
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      最大并发测试数
                    </label>
                    <input
                      type= 'number';
                      value={config.testing.maxConcurrentTests}
                      onChange={(e) => updateConfig('testing', 'maxConcurrentTests', parseInt(e.target.value))}'
                      className= 'input';
                      min= '1';
                      aria-label= '最大并发测试数';
                    />
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      测试超时时间 (分钟)
                    </label>
                    <input
                      type= 'number';
                      value={config.testing.testTimeoutMinutes}
                      onChange={(e) => updateConfig('testing', 'testTimeoutMinutes', parseInt(e.target.value))}'
                      className= 'input';
                      min= '1';
                      aria-label= '测试超时时间';
                    />
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      数据保留天数
                    </label>
                    <input
                      type= 'number';
                      value={config.testing.dataRetentionDays}
                      onChange={(e) => updateConfig('testing', 'dataRetentionDays', parseInt(e.target.value))}'
                      className= 'input';
                      min= '1';
                      aria-label= '数据保留天数';
                    />
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      最大文件上传大小 (MB)
                    </label>
                    <input
                      type= 'number';
                      value={config.testing.maxFileUploadSize}
                      onChange={(e) => updateConfig('testing', 'maxFileUploadSize', parseInt(e.target.value))}'
                      className= 'input';
                      min= '1';
                      aria-label= '最大文件上传大小';
                    />
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      截图质量
                    </label>
                    <select
                      value={config.testing.screenshotQuality}
                      onChange={(e) => updateConfig('testing', 'screenshotQuality', e.target.value as 'low' | 'medium' | 'high')}'
                      className= 'input';
                      aria-label= '截图质量';
                    >
                      <option value= 'low'>低质量</option>
                      <option value= 'medium'>中等质量</option>
                      <option value= 'high'>高质量</option>
                    </select>
                  </div>
                </div>

                {/* 启用的测试类型 */}
                <div>
                  <h4 className= 'text-md font-medium text-gray-900 mb-4'>启用的测试类型</h4>
                  <div className= 'grid grid-cols-2 md:grid-cols-4 gap-4'>
                    {Object.entries(config.testing.enabledTestTypes).map(([key, enabled]) => (
                      <div key={key} className= 'flex items-center'>
                        <input
                          type= 'checkbox';
                          id={`testType-${key}`}`
                          checked={enabled}
                          onChange={(e) => updateConfig("testing', "enabledTestTypes', {'`
                            ...config.testing.enabledTestTypes,
                            [key]: e.target.checked
                          })}
                          className= 'rounded border-gray-300 text-primary-600 focus:ring-primary-500';
                        />
                        <label htmlFor={`testType-${key}`} className= 'ml-2 text-sm text-gray-700'>`
                          {key === "coreWebVitals' && 'Core Web Vitals'}'`
                          {key === 'lighthouseAudit' && 'Lighthouse 审计'}'
                          {key === 'securityScan' && '安全扫描'}'
                          {key === 'loadTest' && '负载测试'}'
                          {key === 'apiTest' && 'API 测试'}'
                          {key === 'uptimeMonitor' && '正常运行时间监控'}'
                          {key === 'syntheticMonitor' && '合成监控'}'
                          {key === 'realUserMonitor' && '真实用户监控'}'
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 其他设置 */}
                <div className= 'space-y-4'>
                  <div className= 'flex items-center'>
                    <input
                      type= 'checkbox';
                      id= 'videoRecording';
                      checked={config.testing.videoRecording}
                      onChange={(e) => updateConfig('testing', 'videoRecording', e.target.checked)}'
                      className= 'rounded border-gray-300 text-primary-600 focus:ring-primary-500';
                    />
                    <label htmlFor= 'videoRecording' className= 'ml-2 text-sm text-gray-700'>
                      启用视频录制
                    </label>
                  </div>

                  <div className= 'flex items-center'>
                    <input
                      type= 'checkbox';
                      id= 'harGeneration';
                      checked={config.testing.harGeneration}
                      onChange={(e) => updateConfig('testing', 'harGeneration', e.target.checked)}'
                      className= 'rounded border-gray-300 text-primary-600 focus:ring-primary-500';
                    />
                    <label htmlFor= 'harGeneration' className= 'ml-2 text-sm text-gray-700'>
                      生成 HAR 文件
                    </label>
                  </div>
                </div>

                {/* 默认测试位置 */}
                <div>
                  <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                    默认测试位置 (每行一个)
                  </label>
                  <textarea
                    value={config.testing.defaultLocations.join('/n')}'
                    onChange={(e) => updateConfig('testing', 'defaultLocations', e.target.value.split('/n').filter(loc => loc.trim()))}'
                    rows={4}
                    className= 'input';
                    placeholder= 'beijing&#10;shanghai&#10;guangzhou';
                    aria-label= '默认测试位置';
                  />
                  <p className= 'text-xs text-gray-500 mt-1'>
                    支持的位置：beijing, shanghai, guangzhou, hongkong, singapore, tokyo, seoul
                  </p>
                </div>
              </div>
            )}

            {/* 安全设置 */}
            {activeTab === 'security' && (<div className= 'space-y-6'>
                <h3 className= 'text-lg font-medium text-gray-900'>安全设置</h3>

                <div className= 'grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      密码最小长度
                    </label>
                    <input
                      type= 'number';
                      value={config.security.passwordMinLength}
                      onChange={(e) => updateConfig('security', 'passwordMinLength', parseInt(e.target.value))}'
                      className= 'input';
                      min= '6';
                      max= '32';
                      aria-label= '密码最小长度';
                    />
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      会话超时时间 (分钟)
                    </label>
                    <input
                      type= 'number';
                      value={config.security.sessionTimeoutMinutes}
                      onChange={(e) => updateConfig('security', 'sessionTimeoutMinutes', parseInt(e.target.value))}'
                      className= 'input';
                      min= '30';
                      aria-label= '会话超时时间';
                    />
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      最大登录尝试次数
                    </label>
                    <input
                      type= 'number';
                      value={config.security.maxLoginAttempts}
                      onChange={(e) => updateConfig('security', 'maxLoginAttempts', parseInt(e.target.value))}'
                      className= 'input';
                      min= '3';
                      max= '10';
                      aria-label= '最大登录尝试次数';
                    />
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      锁定持续时间 (分钟)
                    </label>
                    <input
                      type= 'number';
                      value={config.security.lockoutDurationMinutes}
                      onChange={(e) => updateConfig('security', 'lockoutDurationMinutes', parseInt(e.target.value))}'
                      className= 'input';
                      min= '5';
                      aria-label= '锁定持续时间';
                    />
                  </div>
                </div>

                <div className= 'space-y-4'>
                  <div className= 'flex items-center'>
                    <input
                      type= 'checkbox';
                      id= 'passwordRequireSpecialChars';
                      checked={config.security.passwordRequireSpecialChars}
                      onChange={(e) => updateConfig('security', 'passwordRequireSpecialChars', e.target.checked)}'
                      className= 'rounded border-gray-300 text-primary-600 focus:ring-primary-500';
                    />
                    <label htmlFor= 'passwordRequireSpecialChars' className= 'ml-2 text-sm text-gray-700'>
                      密码必须包含特殊字符
                    </label>
                  </div>

                  <div className= 'flex items-center'>
                    <input
                      type= 'checkbox';
                      id= 'twoFactorRequired';
                      checked={config.security.twoFactorRequired}
                      onChange={(e) => updateConfig('security', 'twoFactorRequired', e.target.checked)}'
                      className= 'rounded border-gray-300 text-primary-600 focus:ring-primary-500';
                    />
                    <label htmlFor= 'twoFactorRequired' className= 'ml-2 text-sm text-gray-700'>
                      强制启用双因素认证
                    </label>
                  </div>
                </div>

                <div>
                  <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                    IP白名单 (每行一个IP地址)
                  </label>
                  <textarea
                    value={config.security.ipWhitelist.join('/n')}'
                    onChange={(e) => updateConfig('security', 'ipWhitelist', e.target.value.split('/n').filter(ip => ip.trim()))}'
                    rows={4}
                    className= 'input';
                    placeholder= '192.168.1.1&#10;10.0.0.0/8';
                    aria-label= 'IP白名单';
                  />
                  <p className= 'text-xs text-gray-500 mt-1'>
                    留空表示允许所有IP访问。支持CIDR格式。
                  </p>
                </div>
              </div>
            )}

            {/* 通知设置 */}
            {activeTab === 'notifications' && (<div className= 'space-y-6'>
                <div className= 'flex justify-between items-center'>
                  <h3 className= 'text-lg font-medium text-gray-900'>通知设置</h3>
                  <button
                    type= 'button';
                    onClick={handleTestEmail}
                    disabled={testingEmail || !config.notifications.emailEnabled}
                    className= 'btn btn-outline btn-sm flex items-center space-x-2';
                  >
                    <Mail className= 'w-4 h-4'    />
                    <span>{testingEmail ? '发送中..." : '测试邮件'}</span>
                  </button>
                </div>

                <div className= 'flex items-center mb-6'>
                  <input
                    type= 'checkbox';
                    id= 'emailEnabled';
                    checked={config.notifications.emailEnabled}
                    onChange={(e) => updateConfig('notifications', 'emailEnabled', e.target.checked)}'
                    className= 'rounded border-gray-300 text-primary-600 focus:ring-primary-500';
                  />
                  <label htmlFor= 'emailEnabled' className= 'ml-2 text-sm text-gray-700'>
                    启用邮件通知
                  </label>
                </div>

                <div className= 'grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      SMTP主机
                    </label>
                    <input
                      type= 'text';
                      value={config.notifications.smtpHost}
                      onChange={(e) => updateConfig('notifications', 'smtpHost', e.target.value)}'
                      className= 'input';
                      disabled={!config.notifications.emailEnabled}
                      aria-label= 'SMTP主机';
                    />
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      SMTP端口
                    </label>
                    <input
                      type= 'number';
                      value={config.notifications.smtpPort}
                      onChange={(e) => updateConfig('notifications', 'smtpPort', parseInt(e.target.value))}'
                      className= 'input';
                      disabled={!config.notifications.emailEnabled}
                      aria-label= 'SMTP端口';
                    />
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      SMTP用户名
                    </label>
                    <input
                      type= 'text';
                      value={config.notifications.smtpUser}
                      onChange={(e) => updateConfig('notifications', 'smtpUser', e.target.value)}'
                      className= 'input';
                      disabled={!config.notifications.emailEnabled}
                      aria-label= 'SMTP用户名';
                    />
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      SMTP密码
                    </label>
                    <input
                      type= 'password';
                      value={config.notifications.smtpPassword}
                      onChange={(e) => updateConfig('notifications', 'smtpPassword', e.target.value)}'
                      className= 'input';
                      disabled={!config.notifications.emailEnabled}
                      aria-label= 'SMTP密码';
                    />
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      发件人邮箱
                    </label>
                    <input
                      type= 'email';
                      value={config.notifications.fromEmail}
                      onChange={(e) => updateConfig('notifications', 'fromEmail', e.target.value)}'
                      className= 'input';
                      disabled={!config.notifications.emailEnabled}
                      aria-label= '发件人邮箱';
                    />
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      发件人名称
                    </label>
                    <input
                      type= 'text';
                      value={config.notifications.fromName}
                      onChange={(e) => updateConfig('notifications', 'fromName', e.target.value)}'
                      className= 'input';
                      disabled={!config.notifications.emailEnabled}
                      aria-label= '发件人名称';
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 备份设置 */}
            {activeTab === 'backup' && (<div className= 'space-y-6'>
                <h3 className= 'text-lg font-medium text-gray-900'>备份设置</h3>

                <div className= 'flex items-center mb-6'>
                  <input
                    type= 'checkbox';
                    id= 'backupEnabled';
                    checked={config.backup.enabled}
                    onChange={(e) => updateConfig('backup', 'enabled', e.target.checked)}'
                    className= 'rounded border-gray-300 text-primary-600 focus:ring-primary-500';
                  />
                  <label htmlFor= 'backupEnabled' className= 'ml-2 text-sm text-gray-700'>
                    启用自动备份
                  </label>
                </div>

                <div className= 'grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      备份频率
                    </label>
                    <select
                      value={config.backup.frequency}
                      onChange={(e) => updateConfig('backup', 'frequency', e.target.value as 'daily' | 'weekly' | 'monthly')}'
                      className= 'input';
                      disabled={!config.backup.enabled}
                      aria-label= '备份频率';
                    >
                      <option value= 'daily'>每日</option>
                      <option value= 'weekly'>每周</option>
                      <option value= 'monthly'>每月</option>
                    </select>
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      保留天数
                    </label>
                    <input
                      type= 'number';
                      value={config.backup.retentionDays}
                      onChange={(e) => updateConfig('backup', 'retentionDays', parseInt(e.target.value))}'
                      className= 'input';
                      min= '1';
                      disabled={!config.backup.enabled}
                      aria-label= '保留天数';
                    />
                  </div>

                  <div>
                    <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                      备份位置
                    </label>
                    <select
                      value={config.backup.location}
                      onChange={(e) => updateConfig('backup', 'location', e.target.value as 'local' | 's3' | 'ftp')}'
                      className= 'input';
                      disabled={!config.backup.enabled}
                      aria-label= '备份位置';
                    >
                      <option value= 'local'>本地存储</option>
                      <option value= 's3'>Amazon S3</option>
                      <option value= 'ftp'>FTP服务器</option>
                    </select>
                  </div>
                </div>

                {config.backup.location === 's3' && config.backup.enabled && (<div className= 'border-t pt-6'>
                    <h4 className= 'text-md font-medium text-gray-900 mb-4'>Amazon S3 配置</h4>
                    <div className= 'grid grid-cols-1 md:grid-cols-2 gap-6'>
                      <div>
                        <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                          S3 Bucket
                        </label>
                        <input
                          type= 'text';
                          value={config.backup.s3Config?.bucket || ''}'
                          onChange={(e) => updateConfig('backup', 's3Config', {'
                            ...config.backup.s3Config,
                            bucket: e.target.value
                          })}
                          className= 'input';
                          aria-label= 'S3 Bucket';
                        />
                      </div>

                      <div>
                        <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                          区域
                        </label>
                        <input
                          type= 'text';
                          value={config.backup.s3Config?.region || ''}'
                          onChange={(e) => updateConfig('backup', 's3Config', {'
                            ...config.backup.s3Config,
                            region: e.target.value
                          })}
                          className= 'input';
                          aria-label= '区域';
                        />
                      </div>

                      <div>
                        <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                          Access Key
                        </label>
                        <input
                          type= 'text';
                          value={config.backup.s3Config?.accessKey || ''}'
                          onChange={(e) => updateConfig('backup', 's3Config', {'
                            ...config.backup.s3Config,
                            accessKey: e.target.value
                          })}
                          className= 'input';
                          aria-label= 'Access Key';
                        />
                      </div>

                      <div>
                        <label className= 'block text-sm font-medium text-gray-700 mb-2'>
                          Secret Key
                        </label>
                        <input
                          type= 'password';
                          value={config.backup.s3Config?.secretKey || ''}'
                          onChange={(e) => updateConfig('backup', 's3Config', {'
                            ...config.backup.s3Config,
                            secretKey: e.target.value
                          })}
                          className= 'input';
                          aria-label= 'Secret Key';
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
