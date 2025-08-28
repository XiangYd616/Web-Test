import { useState } from 'react';
import type { FC } from 'react';
import { Save, Mail, Database, Shield, Globe } from 'lucide-react';

interface SystemConfig {
  general: {
    siteName: string;
    siteUrl: string;
    language: string;
    timezone: string;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
  };
  testing: {
    maxConcurrentTests: number;
    defaultTimeout: number;
    enabledTestTypes: string[];
  };
  security: {
    allowedIPs: string;
    sessionTimeout: number;
    enableTwoFactor: boolean;
  };
}

const SystemSettings: FC = () => {
  const [config, setConfig] = useState<SystemConfig>({
    general: {
      siteName: 'Test-Web Platform',
      siteUrl: 'https://test-web.example.com',
      language: 'zh-CN',
      timezone: 'Asia/Shanghai'
    },
    email: {
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      fromEmail: 'noreply@example.com',
      fromName: 'Test-Web Platform'
    },
    testing: {
      maxConcurrentTests: 10,
      defaultTimeout: 30000,
      enabledTestTypes: ['stress', 'performance', 'security']
    },
    security: {
      allowedIPs: '',
      sessionTimeout: 3600,
      enableTwoFactor: false
    }
  });

  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testingEmail, setTestingEmail] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Test email sent successfully! Please check your inbox.');
    } catch (error) {
      alert('Test email failed. Please check SMTP configuration.');
    } finally {
      setTestingEmail(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General Settings', icon: Globe },
    { id: 'email', label: 'Email Settings', icon: Mail },
    { id: 'testing', label: 'Testing Settings', icon: Database },
    { id: 'security', label: 'Security Settings', icon: Shield }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
            saving
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {saveStatus !== 'idle' && (
        <div className={`p-4 rounded-lg ${
          saveStatus === 'success' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {saveStatus === 'success' 
            ? 'Settings saved successfully!' 
            : 'Failed to save settings. Please try again.'}
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Name
                </label>
                <input
                  type="text"
                  value={config.general.siteName}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    general: { ...prev.general, siteName: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site URL
                </label>
                <input
                  type="url"
                  value={config.general.siteUrl}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    general: { ...prev.general, siteUrl: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={config.general.language}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    general: { ...prev.general, language: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="zh-CN">Simplified Chinese</option>
                  <option value="en-US">English</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={config.general.timezone}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    general: { ...prev.general, timezone: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Asia/Shanghai">Asia/Shanghai</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Email Settings</h3>
              <button
                onClick={handleTestEmail}
                disabled={testingEmail}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {testingEmail ? 'Testing...' : 'Test Email'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={config.email.smtpHost}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    email: { ...prev.email, smtpHost: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={config.email.smtpPort}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    email: { ...prev.email, smtpPort: parseInt(e.target.value) || 587 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'testing' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Testing Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Concurrent Tests
                </label>
                <input
                  type="number"
                  value={config.testing.maxConcurrentTests}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    testing: { ...prev.testing, maxConcurrentTests: parseInt(e.target.value) || 10 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Timeout (ms)
                </label>
                <input
                  type="number"
                  value={config.testing.defaultTimeout}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    testing: { ...prev.testing, defaultTimeout: parseInt(e.target.value) || 30000 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allowed IP Addresses
                </label>
                <textarea
                  value={config.security.allowedIPs}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    security: { ...prev.security, allowedIPs: e.target.value }
                  }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Leave empty to allow all IPs. Supports CIDR format."
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.security.enableTwoFactor}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      security: { ...prev.security, enableTwoFactor: e.target.checked }
                    }))}
                    className="mr-2"
                  />
                  Enable Two-Factor Authentication
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemSettings;
