/**
 * MFA管理组件 - 多因素认证管理
 * 支持 TOTP、短信、邮件和备用码
 */

import React, { useState, useEffect } from 'react';
import { MFAService, MFAMethod, MFASetup } from '../../services/auth/mfaService';

interface MFAManagementProps {
  userId?: string;
  onUpdate?: () => void;
}

interface MFAMethodInfo {
  method: MFAMethod;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

const MFAManagement: React.FC<MFAManagementProps> = ({ userId, onUpdate }) => {
  const [mfaMethods, setMfaMethods] = useState<MFAMethodInfo[]>([
    { method: 'totp', name: 'TOTP 认证器', description: '使用 Google Authenticator 等应用', icon: '📱', enabled: false },
    { method: 'sms', name: '短信验证', description: '通过手机短信接收验证码', icon: '💬', enabled: false },
    { method: 'email', name: '邮箱验证', description: '通过邮箱接收验证码', icon: '✉️', enabled: false },
    { method: 'backup_codes', name: '备用码', description: '用于备用的一次性代码', icon: '🔑', enabled: false },
  ]);

  const [loading, setLoading] = useState(false);
  const [setupMethod, setSetupMethod] = useState<MFAMethod | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const mfaService = new MFAService();

  // 加载 MFA 设置状态
  useEffect(() => {
    loadMFAStatus();
  }, [userId]);

  const loadMFAStatus = async () => {
    try {
      setLoading(true);
      // TODO: 从后端 API 加载用户的 MFA 设置
      // const response = await fetch(`/api/auth/mfa/status?userId=${userId}`);
      // const data = await response.json();
      // 更新 mfaMethods 状态
    } catch (err) {
      console.error('Failed to load MFA status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupTOTP = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await mfaService.setupTOTP(userId || 'current_user', 'user@example.com');
      setQrCode(result.qrCodeUrl);
      setSecret(result.secret);
      setBackupCodes(result.backupCodes);
      setSetupMethod('totp');
    } catch (err: any) {
      setError('设置 TOTP 失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTOTP = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await mfaService.enableTOTP(userId || 'current_user', verificationCode);
      if (result.success) {
        setSuccess('TOTP 启用成功！');
        setSetupMethod(null);
        setVerificationCode('');
        await loadMFAStatus();
        onUpdate?.();
      } else {
        setError('验证码错误，请重试');
      }
    } catch (err: any) {
      setError('验证失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSMS = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await mfaService.setupSMS(userId || 'current_user', phoneNumber);
      setSetupMethod('sms');
      setSuccess('验证码已发送到您的手机');
    } catch (err: any) {
      setError('设置短信验证失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMethod = async (method: MFAMethod) => {
    if (!confirm(`确认禁用 ${method} 认证方式？`)) {
      return;
    }

    try {
      setLoading(true);
      // TODO: 调用后端 API 禁用 MFA 方法
      setSuccess(`${method} 已禁用`);
      await loadMFAStatus();
      onUpdate?.();
    } catch (err: any) {
      setError('禁用失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackupCodes = () => {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mfa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mfa-management" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>多因素认证管理</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        增强您的账户安全性，启用额外的身份验证方式
      </p>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c00' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '1rem', marginBottom: '1rem', background: '#efe', border: '1px solid #cfc', borderRadius: '4px', color: '#0c0' }}>
          {success}
        </div>
      )}

      {!setupMethod ? (
        <div className="mfa-methods-list">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>可用的认证方式</h2>
          
          {mfaMethods.map((method) => (
            <div key={method.method} style={{
              padding: '1.5rem',
              marginBottom: '1rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>{method.icon}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{method.name}</h3>
                  <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.875rem' }}>
                    {method.description}
                  </p>
                </div>
              </div>
              
              <div>
                {method.enabled ? (
                  <button
                    onClick={() => handleDisableMethod(method.method)}
                    disabled={loading}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    禁用
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (method.method === 'totp') handleSetupTOTP();
                      else if (method.method === 'sms') setSetupMethod('sms');
                      else if (method.method === 'email') setSetupMethod('email');
                      else if (method.method === 'backup_codes') setSetupMethod('backup_codes');
                    }}
                    disabled={loading}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    设置
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mfa-setup-wizard" style={{
          padding: '2rem',
          border: '1px solid #ddd',
          borderRadius: '8px',
          background: '#f9f9f9'
        }}>
          {setupMethod === 'totp' && (
            <div>
              <h2 style={{ marginTop: 0 }}>设置 TOTP 认证器</h2>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <h3>步骤 1: 扫描二维码</h3>
                {qrCode && (
                  <div style={{ margin: '1rem 0' }}>
                    <img src={qrCode} alt="QR Code" style={{ maxWidth: '200px' }} />
                  </div>
                )}
                <p style={{ fontSize: '0.875rem', color: '#666' }}>
                  或手动输入密钥: <code style={{ background: '#fff', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>{secret}</code>
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3>步骤 2: 输入验证码</h3>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="输入6位数字验证码"
                  maxLength={6}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {backupCodes.length > 0 && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fff3cd', borderRadius: '4px' }}>
                  <h3>备用码</h3>
                  <p style={{ fontSize: '0.875rem', color: '#856404' }}>
                    请保存好这些备用码，每个只能使用一次
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', margin: '1rem 0' }}>
                    {backupCodes.map((code, i) => (
                      <code key={i} style={{ background: 'white', padding: '0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}>
                        {code}
                      </code>
                    ))}
                  </div>
                  <button
                    onClick={handleDownloadBackupCodes}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    💾 下载备用码
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handleVerifyTOTP}
                  disabled={loading || verificationCode.length !== 6}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    opacity: verificationCode.length !== 6 ? 0.5 : 1
                  }}
                >
                  {loading ? '验证中...' : '验证并启用'}
                </button>
                <button
                  onClick={() => {
                    setSetupMethod(null);
                    setQrCode('');
                    setSecret('');
                    setBackupCodes([]);
                    setVerificationCode('');
                  }}
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {setupMethod === 'sms' && (
            <div>
              <h2 style={{ marginTop: 0 }}>设置短信验证</h2>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  手机号码:
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+86 138 0000 0000"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handleSetupSMS}
                  disabled={loading || !phoneNumber}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    opacity: !phoneNumber ? 0.5 : 1
                  }}
                >
                  {loading ? '设置中...' : '发送验证码'}
                </button>
                <button
                  onClick={() => setSetupMethod(null)}
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#e7f3ff', borderRadius: '4px' }}>
        <h3 style={{ marginTop: 0, fontSize: '1rem' }}>🛡️ 安全提示</h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#004085' }}>
          <li>启用 MFA 可以大大提高账户安全性</li>
          <li>建议启用至少两种认证方式</li>
          <li>请妥善保管备用码，并存储在安全的地方</li>
          <li>如果更换手机或设备，请及时更新 MFA 设置</li>
        </ul>
      </div>
    </div>
  );
};

export default MFAManagement;
