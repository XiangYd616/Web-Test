/**
 * MFA多因子认证管理组件
 * 支持TOTP认证器、备用代码、设备信任等功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Smartphone, 
  Key, 
  QrCode, 
  Copy, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Trash2,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';
import QRCode from 'qrcode.react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

// MFA相关类型定义
interface MFADevice {
  id: string;
  name: string;
  type: 'totp' | 'sms' | 'email';
  enabled: boolean;
  lastUsed?: string;
  createdAt: string;
}

interface BackupCode {
  code: string;
  used: boolean;
}

interface MFASetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

const MFAManagement: React.FC = () => {
  const { user } = useAuth();
  
  // 状态管理
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaDevices, setMfaDevices] = useState<MFADevice[]>([]);
  const [backupCodes, setBackupCodes] = useState<BackupCode[]>([]);
  const [setupMode, setSetupMode] = useState(false);
  const [setupData, setSetupData] = useState<MFASetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [trustedDevices, setTrustedDevices] = useState<Array<{
    id: string;
    name: string;
    lastSeen: string;
    location: string;
  }>>([]);

  // 模拟数据加载
  useEffect(() => {
    loadMFAStatus();
  }, []);

  const loadMFAStatus = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟数据
      setMfaEnabled(false);
      setMfaDevices([]);
      setBackupCodes([]);
      setTrustedDevices([
        {
          id: '1',
          name: 'Chrome on Windows',
          lastSeen: '2小时前',
          location: '北京, 中国'
        },
        {
          id: '2', 
          name: 'Safari on iPhone',
          lastSeen: '1天前',
          location: '上海, 中国'
        }
      ]);
    } catch (error) {
      toast.error('加载MFA状态失败');
    } finally {
      setLoading(false);
    }
  };

  // 开始设置MFA
  const startMFASetup = async () => {
    setLoading(true);
    try {
      // 模拟生成MFA设置数据
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const secret = 'JBSWY3DPEHPK3PXP'; // 模拟secret
      const qrCodeUrl = `otpauth://totp/Test-Web:${user?.email}?secret=${secret}&issuer=Test-Web`;
      const backupCodesGenerated = [
        'A1B2C3D4',
        'E5F6G7H8', 
        'I9J0K1L2',
        'M3N4O5P6',
        'Q7R8S9T0',
        'U1V2W3X4',
        'Y5Z6A7B8',
        'C9D0E1F2'
      ];
      
      setSetupData({
        secret,
        qrCodeUrl,
        backupCodes: backupCodesGenerated
      });
      setSetupMode(true);
    } catch (error) {
      toast.error('MFA设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 验证并完成MFA设置
  const completeMFASetup = async () => {
    if (!verificationCode || !deviceName) {
      toast.error('请输入验证码和设备名称');
      return;
    }

    setLoading(true);
    try {
      // 模拟验证
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟验证成功
      const newDevice: MFADevice = {
        id: Date.now().toString(),
        name: deviceName,
        type: 'totp',
        enabled: true,
        createdAt: new Date().toISOString()
      };
      
      setMfaDevices([newDevice]);
      setMfaEnabled(true);
      setBackupCodes(setupData?.backupCodes.map(code => ({ code, used: false })) || []);
      setSetupMode(false);
      setSetupData(null);
      setVerificationCode('');
      setDeviceName('');
      
      toast.success('MFA设置成功！');
    } catch (error) {
      toast.error('验证码错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 禁用MFA
  const disableMFA = async () => {
    if (!confirm('确定要禁用多因子认证吗？这将降低您的账户安全性。')) {
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMfaEnabled(false);
      setMfaDevices([]);
      setBackupCodes([]);
      
      toast.success('MFA已禁用');
    } catch (error) {
      toast.error('禁用MFA失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除设备
  const removeDevice = async (deviceId: string) => {
    if (!confirm('确定要删除这个认证设备吗？')) {
      return;
    }

    try {
      setMfaDevices(prev => prev.filter(device => device.id !== deviceId));
      toast.success('设备已删除');
    } catch (error) {
      toast.error('删除设备失败');
    }
  };

  // 生成新的备用代码
  const generateNewBackupCodes = async () => {
    if (!confirm('生成新的备用代码将使旧代码失效，确定继续吗？')) {
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newCodes = [
        'X1Y2Z3A4',
        'B5C6D7E8',
        'F9G0H1I2', 
        'J3K4L5M6',
        'N7O8P9Q0',
        'R1S2T3U4',
        'V5W6X7Y8',
        'Z9A0B1C2'
      ];
      
      setBackupCodes(newCodes.map(code => ({ code, used: false })));
      toast.success('新的备用代码已生成');
    } catch (error) {
      toast.error('生成备用代码失败');
    } finally {
      setLoading(false);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('已复制到剪贴板');
    }).catch(() => {
      toast.error('复制失败');
    });
  };

  // 删除信任设备
  const removeTrustedDevice = async (deviceId: string) => {
    if (!confirm('确定要移除这个信任设备吗？该设备下次登录时需要MFA验证。')) {
      return;
    }

    try {
      setTrustedDevices(prev => prev.filter(device => device.id !== deviceId));
      toast.success('信任设备已移除');
    } catch (error) {
      toast.error('移除设备失败');
    }
  };

  if (loading && !setupMode && !mfaEnabled) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">加载MFA设置...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-white">多因子认证 (MFA)</h1>
          </div>
          <p className="mt-2 text-gray-400">
            为您的账户添加额外的安全保护层
          </p>
        </div>

        {!mfaEnabled ? (
          /* MFA未启用状态 */
          !setupMode ? (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">MFA未启用</h2>
                <p className="text-gray-400 mb-6">
                  启用多因子认证可以显著提高您账户的安全性。即使密码泄露，攻击者也无法访问您的账户。
                </p>
                <button
                  onClick={startMFASetup}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>设置中...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Plus className="w-4 h-4" />
                      <span>启用MFA</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* MFA设置流程 */
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">设置多因子认证</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 二维码扫描 */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <QrCode className="w-5 h-5" />
                    <span>1. 扫描二维码</span>
                  </h3>
                  
                  {setupData && (
                    <div className="bg-white p-4 rounded-lg mb-4">
                      <QRCode 
                        value={setupData.qrCodeUrl}
                        size={200}
                        className="mx-auto"
                      />
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-400 mb-4">
                    使用认证应用（如Google Authenticator、Microsoft Authenticator）扫描上方二维码
                  </p>
                  
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">手动输入密钥：</span>
                      <button
                        onClick={() => copyToClipboard(setupData?.secret || '')}
                        className="text-blue-400 hover:text-blue-300 p-1"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <code className="text-xs text-gray-300 font-mono break-all">
                      {setupData?.secret}
                    </code>
                  </div>
                </div>
                
                {/* 验证设置 */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <Key className="w-5 h-5" />
                    <span>2. 验证设置</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        设备名称
                      </label>
                      <input
                        type="text"
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="例如：我的手机"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        认证码
                      </label>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="000000"
                        maxLength={6}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        输入认证应用中显示的6位数字
                      </p>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={completeMFASetup}
                        disabled={loading || !verificationCode || !deviceName}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center space-x-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>验证中...</span>
                          </div>
                        ) : (
                          '完成设置'
                        )}
                      </button>
                      
                      <button
                        onClick={() => setSetupMode(false)}
                        disabled={loading}
                        className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          /* MFA已启用状态 */
          <div className="space-y-6">
            {/* 状态概览 */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">MFA已启用</h2>
                    <p className="text-gray-400">您的账户受到多因子认证保护</p>
                  </div>
                </div>
                <button
                  onClick={disableMFA}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  禁用MFA
                </button>
              </div>
            </div>

            {/* 认证设备 */}
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <Smartphone className="w-5 h-5" />
                    <span>认证设备</span>
                  </h3>
                  <button
                    onClick={startMFASetup}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                  >
                    添加设备
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {mfaDevices.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">暂无认证设备</p>
                ) : (
                  <div className="space-y-4">
                    {mfaDevices.map((device) => (
                      <div key={device.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Smartphone className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-white font-medium">{device.name}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-400">
                              <span>类型：{device.type.toUpperCase()}</span>
                              <span>创建：{new Date(device.createdAt).toLocaleDateString()}</span>
                              {device.lastUsed && <span>最后使用：{device.lastUsed}</span>}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeDevice(device.id)}
                          className="text-red-400 hover:text-red-300 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 备用代码 */}
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <Key className="w-5 h-5" />
                    <span>备用代码</span>
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowBackupCodes(!showBackupCodes)}
                      className="text-gray-400 hover:text-gray-300 p-2"
                    >
                      {showBackupCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={generateNewBackupCodes}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      重新生成
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <p className="text-gray-400 text-sm mb-4">
                  备用代码可在无法使用认证设备时用于登录。每个代码只能使用一次。
                </p>
                
                {showBackupCodes ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {backupCodes.map((backup, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg font-mono text-center cursor-pointer transition-colors ${
                          backup.used 
                            ? 'bg-gray-700 text-gray-500 line-through' 
                            : 'bg-gray-700/50 text-white hover:bg-gray-700'
                        }`}
                        onClick={() => !backup.used && copyToClipboard(backup.code)}
                      >
                        {backup.code}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">点击眼睛图标查看备用代码</p>
                  </div>
                )}
              </div>
            </div>

            {/* 信任设备 */}
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>信任设备</span>
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  这些设备在30天内无需MFA验证
                </p>
              </div>
              
              <div className="p-6">
                {trustedDevices.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">暂无信任设备</p>
                ) : (
                  <div className="space-y-4">
                    {trustedDevices.map((device) => (
                      <div key={device.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{device.name}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <span>最后活动：{device.lastSeen}</span>
                            <span>位置：{device.location}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeTrustedDevice(device.id)}
                          className="text-red-400 hover:text-red-300 p-2"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MFAManagement;
