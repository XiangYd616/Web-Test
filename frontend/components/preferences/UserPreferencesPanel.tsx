/**
 * 用户偏好设置面板
 * 提供完整的个性化配置界面
 */

import {
  AlertCircle,
  BarChart3,
  Check,
  Download,
  FileText,
  Monitor,
  RotateCcw,
  Save,
  Settings,
  TestTube,
  Upload,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
// 暂时注释掉缺失的导入
// import {
//   userPreferencesService,
//   UserPreferences,
//   PreferenceCategory,
//   PreferenceSetting
// } from '../../services/preferences/userPreferencesService';

interface UserPreferencesPanelProps {
  onClose?: () => void;
}

const UserPreferencesPanel: React.FC<UserPreferencesPanelProps> = ({ onClose }) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [activeCategory, setActiveCategory] = useState('interface');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const categories = userPreferencesService.getPreferenceCategories();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await userPreferencesService.loadPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('加载偏好设置失败:', error);
      showMessage('error', '加载偏好设置失败');
    }
  };

  const handleSave = async () => {
    if (!preferences || !hasChanges) return;

    setSaving(true);
    try {
      const success = await userPreferencesService.savePreferences(preferences);
      if (success) {
        setHasChanges(false);
        showMessage('success', '偏好设置已保存');
      } else {
        showMessage('error', '保存失败，请重试');
      }
    } catch (error) {
      console.error('保存偏好设置失败:', error);
      showMessage('error', '保存失败: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('确定要重置所有偏好设置吗？此操作不可撤销。')) {
      setSaving(true);
      try {
        const success = await userPreferencesService.resetPreferences();
        if (success) {
          await loadPreferences();
          setHasChanges(false);
          showMessage('success', '偏好设置已重置');
        } else {
          showMessage('error', '重置失败，请重试');
        }
      } catch (error) {
        console.error('重置偏好设置失败:', error);
        showMessage('error', '重置失败: ' + (error as Error).message);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleExport = () => {
    try {
      const data = userPreferencesService.exportPreferences();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preferences-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('success', '偏好设置已导出');
    } catch (error) {
      console.error('导出偏好设置失败:', error);
      showMessage('error', '导出失败');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const success = await userPreferencesService.importPreferences(text);
          if (success) {
            await loadPreferences();
            setHasChanges(false);
            showMessage('success', '偏好设置已导入');
          } else {
            showMessage('error', '导入失败，请检查文件格式');
          }
        } catch (error) {
          console.error('导入偏好设置失败:', error);
          showMessage('error', '导入失败: ' + (error as Error).message);
        }
      }
    };
    input.click();
  };

  const updatePreference = (key: string, value: any) => {
    if (!preferences) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    setHasChanges(true);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const renderSetting = (setting: PreferenceSetting, category: PreferenceCategory) => {
    if (!preferences) return null;

    const value = preferences[setting.key as keyof UserPreferences];

    switch (setting.type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={(e) => updatePreference(setting.key, e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <div>
              <div className="text-white font-medium">{setting.label}</div>
              <div className="text-gray-400 text-sm">{setting.description}</div>
            </div>
          </label>
        );

      case 'select':
        return (
          <div>
            <label className="block text-white font-medium mb-2">{setting.label}</label>
            <select
              value={value as string}
              onChange={(e) => updatePreference(setting.key, e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              {setting.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="text-gray-400 text-sm mt-1">{setting.description}</div>
          </div>
        );

      case 'multiselect':
        return (
          <div>
            <label className="block text-white font-medium mb-2">{setting.label}</label>
            <div className="space-y-2">
              {setting.options?.map(option => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(value as string[]).includes(option.value)}
                    onChange={(e) => {
                      const currentValues = value as string[];
                      const newValues = e.target.checked
                        ? [...currentValues, option.value]
                        : currentValues.filter(v => v !== option.value);
                      updatePreference(setting.key, newValues);
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-300">{option.label}</span>
                </label>
              ))}
            </div>
            <div className="text-gray-400 text-sm mt-1">{setting.description}</div>
          </div>
        );

      case 'number':
        return (
          <div>
            <label className="block text-white font-medium mb-2">{setting.label}</label>
            <input
              type="number"
              value={value as number}
              min={setting.min}
              max={setting.max}
              onChange={(e) => updatePreference(setting.key, parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-gray-400 text-sm mt-1">{setting.description}</div>
          </div>
        );

      case 'string':
        return (
          <div>
            <label className="block text-white font-medium mb-2">{setting.label}</label>
            <input
              type="text"
              value={value as string}
              onChange={(e) => updatePreference(setting.key, e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-gray-400 text-sm mt-1">{setting.description}</div>
          </div>
        );

      default:
        return null;
    }
  };

  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: React.ComponentType<any> } = {
      Monitor,
      TestTube,
      BarChart3,
      FileText,
      Settings
    };
    return icons[iconName] || Settings;
  };

  if (!preferences) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-white">加载偏好设置...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-6 h-6" />
              用户偏好设置
            </h2>
            <p className="text-gray-400 mt-1">个性化您的使用体验</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出
            </button>

            <button
              onClick={handleImport}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              导入
            </button>

            <button
              onClick={handleReset}
              disabled={saving}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>

            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '保存'}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div className={`px-6 py-3 border-b border-gray-700 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
            {message.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {message.text}
          </div>
        )}

        <div className="flex h-[calc(90vh-120px)]">
          {/* 侧边栏 */}
          <div className="w-64 bg-gray-700 border-r border-gray-600">
            <div className="p-4">
              <h3 className="text-white font-medium mb-3">设置分类</h3>
              <div className="space-y-1">
                {categories.map(category => {
                  const IconComponent = getIconComponent(category.icon);
                  return (
                    <button
                      key={category.key}
                      onClick={() => setActiveCategory(category.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeCategory === category.key
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <div className="text-left">
                        <div className="font-medium">{category.label}</div>
                        <div className="text-xs opacity-75">{category.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 主内容区 */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {categories.map(category => {
                if (category.key !== activeCategory) return null;

                return (
                  <div key={category.key}>
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-white mb-2">{category.label}</h3>
                      <p className="text-gray-400">{category.description}</p>
                    </div>

                    <div className="space-y-6">
                      {category.settings.map(setting => (
                        <div key={setting.key} className="bg-gray-700 rounded-lg p-4">
                          {renderSetting(setting, category)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 底部状态栏 */}
        {hasChanges && (
          <div className="px-6 py-3 bg-yellow-500/10 border-t border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertCircle className="w-4 h-4" />
              您有未保存的更改
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  loadPreferences();
                  setHasChanges(false);
                }}
                className="px-3 py-1 text-gray-400 hover:text-white"
              >
                取消更改
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                保存更改
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPreferencesPanel;
