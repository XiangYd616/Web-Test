/**
 * MFA设置组件
 * 提供TOTP、短信、邮件等多因素认证设置界面
 * 版本: v1.0.0
 */

import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Key,
  Loader2,
  Mail,
  QrCode,
  Shield,
  Smartphone
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { MFAMethod, MFASetup, TOTPSetupResult } from '../../services/auth/mfaService';
import {useMFA} from '../../services/auth/mfaService';

// ==================== 类型定义 ====================

interface MFASetupProps {
  userId: string;
  userEmail: string;
  onSetupComplete?: (method: MFAMethod) => void;
  onClose?: () => void;
}

interface TOTPSetupStepProps {
  userId: string;
  accountName: string;
  onComplete: (backupCodes: string[]) => void;
  onCancel: () => void;
}

interface BackupCodesDisplayProps {
  codes: string[];
  onDownload: () => void;
  onContinue: () => void;
}

// ==================== TOTP设置步骤组件 ====================

const TOTPSetupStep: React.FC<TOTPSetupStepProps> = ({
  userId,
  accountName,
  onComplete,
  onCancel
}) => {
  const { setupTOTP, enableTOTP, isLoading, error } = useMFA();
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [setupData, setSetupData] = useState<TOTPSetupResult | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    initializeSetup();
  }, []);

  const initializeSetup = async () => {
    try {
      const result = await setupTOTP(userId, accountName);
      setSetupData(result);
    } catch (error) {
      console.error('初始化TOTP设置失败:', error);
    }
  };

  const handleCopySecret = async () => {
    if (setupData?.secret) {
      await navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim()) return;

    try {
      const result = await enableTOTP(userId, verificationCode);
      if (result.success && result.backupCodes) {
        onComplete(result.backupCodes);
      }
    } catch (error) {
      console.error('验证TOTP失败:', error);
    }
  };

  if (!setupData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">正在初始化...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {step === 'setup' && (
        <>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">设置身份验证器</h3>
            <p className="text-gray-400">
              使用身份验证器应用扫描二维码或手动输入密钥
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <div className="text-center">
              <img
                src={setupData.qrCodeUrl}
                alt="TOTP QR Code"
                className="mx-auto bg-white p-4 rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                手动输入密钥
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={setupData.secret}
                  readOnly
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-300 font-mono text-sm"
                />
                <button
                  onClick={handleCopySecret}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-gray-300 transition-colors"
                  title="复制密钥"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">推荐的身份验证器应用：</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-200">
                    <li>Google Authenticator</li>
                    <li>Microsoft Authenticator</li>
                    <li>Authy</li>
                    <li>1Password</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => setStep('verify')}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              下一步
            </button>
          </div>
        </>
      )}

      {step === 'verify' && (
        <>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">验证设置</h3>
            <p className="text-gray-400">
              请输入身份验证器应用中显示的6位数字
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                验证码
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-blue-500"
                maxLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-red-300 text-sm">{error}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setStep('setup')}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            >
              返回
            </button>
            <button
              onClick={handleVerify}
              disabled={verificationCode.length !== 6 || isLoading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                '验证并启用'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ==================== 备用码显示组件 ====================

const BackupCodesDisplay: React.FC<BackupCodesDisplayProps> = ({
  codes,
  onDownload,
  onContinue
}) => {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    const content = `TestWeb 平台备用码/n生成时间: ${new Date().toLocaleString()}/n/n${codes.map((code, index) => `${index + 1}. ${code}`).join('\n')}/n/n重要提示:/n- 每个备用码只能使用一次/n- 请将这些代码保存在安全的地方/n- 如果丢失，请重新生成新的备用码`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `testweb-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    onDownload();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Download className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">保存备用码</h3>
        <p className="text-gray-400">
          请保存这些备用码，当您无法使用身份验证器时可以使用它们
        </p>
      </div>

      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
        <div className="flex items-start space-x-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div className="text-sm text-yellow-300">
            <p className="font-medium mb-1">重要提示：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>每个备用码只能使用一次</li>
              <li>请将这些代码保存在安全的地方</li>
              <li>建议打印或写下这些代码</li>
              <li>如果丢失，可以重新生成新的备用码</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-2">
          {codes.map((code, index) => (
            <div
              key={index}
              className="bg-gray-700 rounded px-3 py-2 text-center font-mono text-sm text-gray-300"
            >
              {code}
            </div>
          ))}
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleDownload}
          className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center justify-center"
        >
          <Download className="w-4 h-4 mr-2" />
          下载备用码
        </button>
        <button
          onClick={onContinue}
          disabled={!downloaded}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          完成设置
        </button>
      </div>
    </div>
  );
};

// ==================== 主组件 ====================

export const MFASetup: React.FC<MFASetupProps> = ({
  userId,
  userEmail,
  onSetupComplete,
  onClose
}) => {
  const { getUserSetups } = useMFA();
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod | null>(null);
  const [currentSetups, setCurrentSetups] = useState<MFASetup[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    loadUserSetups();
  }, [userId]);

  const loadUserSetups = async () => {
    try {
      const setups = await getUserSetups(userId);
      setCurrentSetups(setups);
    } catch (error) {
      console.error('加载MFA设置失败:', error);
    }
  };

  const handleMethodSelect = (method: MFAMethod) => {
    setSelectedMethod(method);
  };

  const handleTOTPComplete = (codes: string[]) => {
    setBackupCodes(codes);
    setShowBackupCodes(true);
  };

  const handleSetupComplete = () => {
    setShowBackupCodes(false);
    setSelectedMethod(null);
    loadUserSetups();
    onSetupComplete?.('totp');
  };

  const isMethodEnabled = (method: MFAMethod) => {
    return currentSetups.some(setup => setup.method === method && setup.isEnabled);
  };

  if (showBackupCodes) {
    return (
      <div className="max-w-md mx-auto">
        <BackupCodesDisplay
          codes={backupCodes}
          onDownload={() => { }}
          onContinue={handleSetupComplete}
        />
      </div>
    );
  }

  if (selectedMethod === 'totp') {
    return (
      <div className="max-w-md mx-auto">
        <TOTPSetupStep
          userId={userId}
          accountName={userEmail}
          onComplete={handleTOTPComplete}
          onCancel={() => setSelectedMethod(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">设置多因素认证</h2>
        <p className="text-gray-400">
          为您的账户添加额外的安全保护
        </p>
      </div>

      <div className="space-y-3">
        {/* TOTP身份验证器 */}
        <div
          onClick={() => !isMethodEnabled('totp') && handleMethodSelect('totp')}
          className={`p-4 rounded-lg border cursor-pointer transition-colors ${isMethodEnabled('totp')
              ? 'bg-green-900/30 border-green-700'
              : 'bg-gray-800 border-gray-600 hover:border-gray-500'
            }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMethodEnabled('totp') ? 'bg-green-600' : 'bg-gray-600'
              }`}>
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white">身份验证器应用</h3>
              <p className="text-sm text-gray-400">
                使用Google Authenticator等应用生成验证码
              </p>
            </div>
            {isMethodEnabled('totp') && (
              <Check className="w-5 h-5 text-green-400" />
            )}
          </div>
        </div>

        {/* 短信验证 */}
        <div className="p-4 rounded-lg border bg-gray-800 border-gray-600 opacity-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white">短信验证</h3>
              <p className="text-sm text-gray-400">
                通过短信接收验证码（即将推出）
              </p>
            </div>
          </div>
        </div>

        {/* 邮件验证 */}
        <div className="p-4 rounded-lg border bg-gray-800 border-gray-600 opacity-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white">邮件验证</h3>
              <p className="text-sm text-gray-400">
                通过邮件接收验证码（即将推出）
              </p>
            </div>
          </div>
        </div>
      </div>

      {onClose && (
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
          >
            稍后设置
          </button>
        </div>
      )}
    </div>
  );
};

export default MFASetup;
