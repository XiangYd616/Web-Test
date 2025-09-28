import React from 'react';
import { AlertCircle, Calendar, Camera, CheckCircle, Clock, Edit, Github, Globe, Key, Linkedin, Loader, Save, Trash2, Twitter, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { UpdateProfileData, UserProfile, userService, UserStats } from '../services/user/userService';

interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const UserProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<UpdateProfileData>({});
  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const [profileData, statsData] = await Promise.all([
          userService.getProfile(),
          userService.getUserStats()
        ]);

        setProfile(profileData);
        setStats(statsData);
        setFormData({
          fullName: profileData.fullName || '',
          bio: profileData.bio || '',
          phone: profileData.phone || '',
          location: profileData.location || '',
          website: profileData.website || '',
          github: profileData.github || '',
          twitter: profileData.twitter || '',
          linkedin: profileData.linkedin || ''
        });
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        setError('获取用户资料失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      setError(null);

      const updatedProfile = await userService.updateProfile(formData);
      setProfile(updatedProfile);
      setIsEditing(false);
      setSuccess('个人资料已更新！');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
      setError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        bio: profile.bio || '',
        phone: profile.phone || '',
        location: profile.location || '',
        website: profile.website || '',
        github: profile.github || '',
        twitter: profile.twitter || '',
        linkedin: profile.linkedin || ''
      });
    }
    setIsEditing(false);
    setError(null);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型和大小
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      setError('图片大小不能超过5MB');
      return;
    }

    try {
      setUploadingAvatar(true);
      setError(null);

      const avatarUrl = await userService.uploadAvatar(file);

      if (profile) {
        setProfile({ ...profile, avatar: avatarUrl });
        setSuccess('头像已更新！');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      setError('上传头像失败，请重试');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!profile?.avatar) return;

    try {
      setUploadingAvatar(true);
      setError(null);

      await userService.deleteAvatar();
      setProfile({ ...profile, avatar: undefined });
      setSuccess('头像已删除！');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to delete avatar:', error);
      setError('删除头像失败，请重试');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('新密码和确认密码不匹配');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('新密码长度至少6位');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await userService.changePassword(passwordForm);
      setShowPasswordModal(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setSuccess('密码已更新！');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to change password:', error);
      setError('修改密码失败，请检查当前密码是否正确');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${actualTheme === 'light' ? 'bg-gray-50' : 'bg-gray-900'
        }`}>
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className={actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
            加载用户资料中...
          </p>
        </div>
      </div>
    );
  }

  if (!profile || !stats) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${actualTheme === 'light' ? 'bg-gray-50' : 'bg-gray-900'
        }`}>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
          <p className={actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
            {error || '加载用户资料失败'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${actualTheme === 'light' ? 'bg-gray-50' : 'bg-gray-900'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 消息提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
              aria-label="关闭错误消息"
              title="关闭错误消息"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-300">{success}</span>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-400 hover:text-green-300"
              aria-label="关闭成功消息"
              title="关闭成功消息"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 页面标题和头像 */}
        <div className={`rounded-xl border p-6 mb-8 ${actualTheme === 'light'
          ? 'bg-white border-gray-200'
          : 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50'
          }`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-6 mb-4 lg:mb-0">
              {/* 头像 */}
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-white" />
                  )}
                </div>

                {/* 头像操作按钮 */}
                <div className="absolute -bottom-2 -right-2 flex space-x-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
                    title="上传头像"
                  >
                    {uploadingAvatar ? (
                      <Loader className="w-3 h-3 animate-spin" />
                    ) : (
                      <Camera className="w-3 h-3" />
                    )}
                  </button>

                  {profile.avatar && (
                    <button
                      onClick={handleDeleteAvatar}
                      disabled={uploadingAvatar}
                      className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
                      title="删除头像"
                      type="button">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  aria-label="选择头像图片"
                  title="选择要上传的头像图片文件"
                />
              </div>

              {/* 用户信息 */}
              <div>
                <h1 className={`text-2xl font-bold ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}>
                  {profile.fullName || profile.username}
                </h1>
                <p className={actualTheme === 'light' ? 'text-gray-600' : 'text-gray-300'}>
                  @{profile.username}
                </p>
                <div className={`flex items-center space-x-4 mt-2 text-sm ${actualTheme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>加入于 {new Date(profile.createdAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                  {profile.lastLoginAt && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>最后登录 {new Date(profile.lastLoginAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center space-x-3">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>编辑资料</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    type="button">
                    {saving ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>保存</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                    type="button">
                    <X className="w-4 h-4" />
                    <span>取消</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Key className="w-4 h-4" />
                <span>修改密码</span>
              </button>
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：个人资料表单 */}
          <div className="lg:col-span-2">
            <div className={`rounded-xl border p-6 ${actualTheme === 'light'
              ? 'bg-white border-gray-200'
              : 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50'
              }`}>
              <h2 className={`text-xl font-semibold mb-6 ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>
                个人信息
              </h2>

              <div className="space-y-6">
                {/* 全名 */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${actualTheme === 'light' ? 'text-gray-700' : 'text-gray-300'
                    }`}>
                    全名
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.fullName || ''}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${actualTheme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                        }`}
                      placeholder="请输入您的全名"
                    />
                  ) : (
                    <p className={actualTheme === 'light' ? 'text-gray-900' : 'text-white'}>
                      {profile.fullName || '未设置'}
                    </p>
                  )}
                </div>

                {/* 邮箱 */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${actualTheme === 'light' ? 'text-gray-700' : 'text-gray-300'
                    }`}>
                    邮箱地址
                  </label>
                  <div className="flex items-center space-x-2">
                    <p className={actualTheme === 'light' ? 'text-gray-900' : 'text-white'}>
                      {profile.email}
                    </p>
                    {profile.emailVerified ? (
                      <div className="flex items-center" title="已验证">
                        <CheckCircle className="w-4 h-4 text-green-500" aria-label="已验证" />
                      </div>
                    ) : (
                      <div className="flex items-center" title="未验证">
                        <AlertCircle className="w-4 h-4 text-yellow-500" aria-label="未验证" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 个人简介 */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${actualTheme === 'light' ? 'text-gray-700' : 'text-gray-300'
                    }`}>
                    个人简介
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.bio || ''}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${actualTheme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                        }`}
                      placeholder="介绍一下您自己..."
                    />
                  ) : (
                    <p className={actualTheme === 'light' ? 'text-gray-900' : 'text-white'}>
                      {profile.bio || '这个人很懒，什么都没有留下...'}
                    </p>
                  )}
                </div>

                {/* 联系信息 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${actualTheme === 'light' ? 'text-gray-700' : 'text-gray-300'
                      }`}>
                      电话号码
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${actualTheme === 'light'
                          ? 'bg-white border-gray-300 text-gray-900'
                          : 'bg-gray-700 border-gray-600 text-white'
                          }`}
                        placeholder="+86 138****8888"
                      />
                    ) : (
                      <p className={actualTheme === 'light' ? 'text-gray-900' : 'text-white'}>
                        {profile.phone || '未设置'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${actualTheme === 'light' ? 'text-gray-700' : 'text-gray-300'
                      }`}>
                      所在地区
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.location || ''}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${actualTheme === 'light'
                          ? 'bg-white border-gray-300 text-gray-900'
                          : 'bg-gray-700 border-gray-600 text-white'
                          }`}
                        placeholder="北京, 中国"
                      />
                    ) : (
                      <p className={actualTheme === 'light' ? 'text-gray-900' : 'text-white'}>
                        {profile.location || '未设置'}
                      </p>
                    )}
                  </div>
                </div>

                {/* 社交链接 */}
                <div>
                  <h3 className={`text-lg font-medium mb-4 ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                    社交链接
                  </h3>
                  <div className="space-y-4">
                    {[
                      { key: 'website', label: '个人网站', icon: Globe, placeholder: 'https://example.com' },
                      { key: 'github', label: 'GitHub', icon: Github, placeholder: 'username' },
                      { key: 'twitter', label: 'Twitter', icon: Twitter, placeholder: 'username' },
                      { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'username' }
                    ].map(({ key, label, icon: Icon, placeholder }) => (
                      <div key={key}>
                        <label className={`block text-sm font-medium mb-2 ${actualTheme === 'light' ? 'text-gray-700' : 'text-gray-300'
                          }`}>
                          <Icon className="w-4 h-4 inline mr-2" />
                          {label}
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={(formData as any)[key] || ''}
                            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${actualTheme === 'light'
                              ? 'bg-white border-gray-300 text-gray-900'
                              : 'bg-gray-700 border-gray-600 text-white'
                              }`}
                            placeholder={placeholder}
                          />
                        ) : (
                          <p className={actualTheme === 'light' ? 'text-gray-900' : 'text-white'}>
                            {(profile as any)[key] || '未设置'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：统计信息 */}
          <div className="space-y-6">
            {/* 用户统计 */}
            <div className={`rounded-xl border p-6 ${actualTheme === 'light'
              ? 'bg-white border-gray-200'
              : 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50'
              }`}>
              <h3 className={`text-lg font-semibold mb-4 ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>
                测试统计
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                    总测试数
                  </span>
                  <span className={`font-semibold ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                    {stats.totalTests}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                    成功测试
                  </span>
                  <span className="font-semibold text-green-500">
                    {stats.successfulTests}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                    失败测试
                  </span>
                  <span className="font-semibold text-red-500">
                    {stats.failedTests}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                    平均分数
                  </span>
                  <span className={`font-semibold ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                    {stats.averageScore.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                    收藏测试
                  </span>
                  <span className={`font-semibold ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                    {stats.favoriteTests}
                  </span>
                </div>
              </div>
            </div>

            {/* 账户安全 */}
            <div className={`rounded-xl border p-6 ${actualTheme === 'light'
              ? 'bg-white border-gray-200'
              : 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50'
              }`}>
              <h3 className={`text-lg font-semibold mb-4 ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>
                账户安全
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                    邮箱验证
                  </span>
                  {profile.emailVerified ? (
                    <span className="text-green-500 text-sm">已验证</span>
                  ) : (
                    <span className="text-yellow-500 text-sm">未验证</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className={actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                    双因素认证
                  </span>
                  {profile.twoFactorEnabled ? (
                    <span className="text-green-500 text-sm">已启用</span>
                  ) : (
                    <span className="text-red-500 text-sm">未启用</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className={actualTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                    账户状态
                  </span>
                  <span className={`text-sm ${profile.status === 'active' ? 'text-green-500' : 'text-red-500'
                    }`}>
                    {profile.status === 'active' ? '正常' : '异常'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 修改密码模态框 */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`w-full max-w-md mx-4 rounded-xl border p-6 ${actualTheme === 'light'
              ? 'bg-white border-gray-200'
              : 'bg-gray-800 border-gray-700'
              }`}>
              <h3 className={`text-lg font-semibold mb-4 ${actualTheme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>
                修改密码
              </h3>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${actualTheme === 'light' ? 'text-gray-700' : 'text-gray-300'
                    }`}>
                    当前密码
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${actualTheme === 'light'
                      ? 'bg-white border-gray-300 text-gray-900'
                      : 'bg-gray-700 border-gray-600 text-white'
                      }`}
                    aria-label="当前密码"
                    placeholder="请输入当前密码"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${actualTheme === 'light' ? 'text-gray-700' : 'text-gray-300'
                    }`}>
                    新密码
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${actualTheme === 'light'
                      ? 'bg-white border-gray-300 text-gray-900'
                      : 'bg-gray-700 border-gray-600 text-white'
                      }`}
                    aria-label="新密码"
                    placeholder="请输入新密码"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${actualTheme === 'light' ? 'text-gray-700' : 'text-gray-300'
                    }`}>
                    确认新密码
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${actualTheme === 'light'
                      ? 'bg-white border-gray-300 text-gray-900'
                      : 'bg-gray-700 border-gray-600 text-white'
                      }`}
                    aria-label="确认新密码"
                    placeholder="请再次输入新密码"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 mt-6">
                <button
                  onClick={handlePasswordChange}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  type="button">
                  {saving ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  <span>更新密码</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                    setError(null);
                  }}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;
