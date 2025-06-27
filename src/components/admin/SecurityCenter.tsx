import React, { useState } from 'react';
import { Shield, AlertTriangle, Lock, Eye, EyeOff, Key, Users, Activity } from 'lucide-react';

interface SecurityEvent {
  id: string;
  type: 'login' | 'failed_login' | 'permission_change' | 'data_access' | 'system_change';
  user: string;
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  ip: string;
}

const SecurityCenter: React.FC = () => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([
    {
      id: '1',
      type: 'failed_login',
      user: 'unknown',
      description: '多次登录失败尝试',
      timestamp: '2025-01-15 10:30:00',
      severity: 'high',
      ip: '192.168.1.100'
    },
    {
      id: '2',
      type: 'permission_change',
      user: 'admin',
      description: '用户权限被修改',
      timestamp: '2025-01-15 09:15:00',
      severity: 'medium',
      ip: '192.168.1.50'
    },
    {
      id: '3',
      type: 'login',
      user: 'testuser1',
      description: '用户成功登录',
      timestamp: '2025-01-15 08:45:00',
      severity: 'low',
      ip: '192.168.1.75'
    }
  ]);

  const [securitySettings, setSecuritySettings] = useState({
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAge: 90
    },
    sessionSettings: {
      sessionTimeout: 30,
      maxConcurrentSessions: 3,
      requireReauth: true
    },
    accessControl: {
      enableTwoFactor: false,
      enableIpWhitelist: false,
      enableRateLimit: true,
      maxLoginAttempts: 5
    }
  });

  const [showPasswordPolicy, setShowPasswordPolicy] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'login': return <Users className="w-4 h-4 text-green-500" />;
      case 'failed_login': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'permission_change': return <Key className="w-4 h-4 text-orange-500" />;
      case 'data_access': return <Eye className="w-4 h-4 text-blue-500" />;
      case 'system_change': return <Activity className="w-4 h-4 text-purple-500" />;
      default: return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'login': return '用户登录';
      case 'failed_login': return '登录失败';
      case 'permission_change': return '权限变更';
      case 'data_access': return '数据访问';
      case 'system_change': return '系统变更';
      default: return type;
    }
  };

  const highSeverityEvents = securityEvents.filter(e => e.severity === 'high').length;
  const mediumSeverityEvents = securityEvents.filter(e => e.severity === 'medium').length;
  const todayEvents = securityEvents.length; // 简化为所有事件
  const failedLogins = securityEvents.filter(e => e.type === 'failed_login').length;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-red-600" />
          <h2 className="text-2xl font-bold text-gray-900">安全中心</h2>
        </div>
        <button className="btn btn-primary flex items-center space-x-2">
          <Shield className="w-4 h-4" />
          <span>安全扫描</span>
        </button>
      </div>

      {/* 安全统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">高危事件</p>
              <p className="text-2xl font-bold text-gray-900">{highSeverityEvents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">中危事件</p>
              <p className="text-2xl font-bold text-gray-900">{mediumSeverityEvents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">今日事件</p>
              <p className="text-2xl font-bold text-gray-900">{todayEvents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Lock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">登录失败</p>
              <p className="text-2xl font-bold text-gray-900">{failedLogins}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 安全设置 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 密码策略 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">密码策略</h3>
            <button
              onClick={() => setShowPasswordPolicy(!showPasswordPolicy)}
              className="text-blue-600 hover:text-blue-800"
            >
              {showPasswordPolicy ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {showPasswordPolicy && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">最小长度</label>
                <input
                  type="number"
                  value={securitySettings.passwordPolicy.minLength}
                  onChange={(e) => setSecuritySettings(prev => ({
                    ...prev,
                    passwordPolicy: { ...prev.passwordPolicy, minLength: parseInt(e.target.value) }
                  }))}
                  className="input"
                  min="6"
                  max="32"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={securitySettings.passwordPolicy.requireUppercase}
                    onChange={(e) => setSecuritySettings(prev => ({
                      ...prev,
                      passwordPolicy: { ...prev.passwordPolicy, requireUppercase: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">要求大写字母</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={securitySettings.passwordPolicy.requireNumbers}
                    onChange={(e) => setSecuritySettings(prev => ({
                      ...prev,
                      passwordPolicy: { ...prev.passwordPolicy, requireNumbers: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">要求数字</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={securitySettings.passwordPolicy.requireSpecialChars}
                    onChange={(e) => setSecuritySettings(prev => ({
                      ...prev,
                      passwordPolicy: { ...prev.passwordPolicy, requireSpecialChars: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">要求特殊字符</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 访问控制 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">访问控制</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">启用双因素认证</span>
              <input
                type="checkbox"
                checked={securitySettings.accessControl.enableTwoFactor}
                onChange={(e) => setSecuritySettings(prev => ({
                  ...prev,
                  accessControl: { ...prev.accessControl, enableTwoFactor: e.target.checked }
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">启用IP白名单</span>
              <input
                type="checkbox"
                checked={securitySettings.accessControl.enableIpWhitelist}
                onChange={(e) => setSecuritySettings(prev => ({
                  ...prev,
                  accessControl: { ...prev.accessControl, enableIpWhitelist: e.target.checked }
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">启用速率限制</span>
              <input
                type="checkbox"
                checked={securitySettings.accessControl.enableRateLimit}
                onChange={(e) => setSecuritySettings(prev => ({
                  ...prev,
                  accessControl: { ...prev.accessControl, enableRateLimit: e.target.checked }
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">最大登录尝试次数</label>
              <input
                type="number"
                value={securitySettings.accessControl.maxLoginAttempts}
                onChange={(e) => setSecuritySettings(prev => ({
                  ...prev,
                  accessControl: { ...prev.accessControl, maxLoginAttempts: parseInt(e.target.value) }
                }))}
                className="input"
                min="3"
                max="10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 安全事件日志 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">安全事件日志</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  事件类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  描述
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  严重程度
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP地址
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {securityEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getEventTypeIcon(event.type)}
                      <span className="ml-2 text-sm text-gray-900">{getEventTypeLabel(event.type)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {event.user}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {event.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(event.severity)}`}>
                      {event.severity === 'high' ? '高危' : 
                       event.severity === 'medium' ? '中危' : '低危'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.ip}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SecurityCenter;
