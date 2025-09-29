/**
 * MFA管理面板组件
 * 用于管理已启用的MFA设置，包括查看状态、重新生成备用码、禁用MFA等
 * 版本: v1.0.0
 */

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Download,
  Key,
  Loader2,
  MoreVertical,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Trash2,
  X
} from 'lucide-react';
import { useMFA, MFAStatus } from '../../hooks/useMFA';

// ==================== 类型定义 ====================

interface MFAManagementProps {
  userId: string;
  userEmail: string;
  onMFADisabled?: () => void;
  className?: string;
}

interface DisableMFAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (verificationCode: string) => void;
  isLoading: boolean;
  error?: string;
}

interface BackupCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  codes: string[];
  onRegenerate: () => void;
  isLoading: boolean;
}

// ==================== 禁用MFA确认弹窗 ====================

const DisableMFAModal: React.FC<DisableMFAModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  error
}) => {
  const [verificationCode, setVerificationCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e?.preventDefault();
    if (verificationCode.length === 6) {
      onConfirm(verificationCode);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">禁用多因素认证</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-start space-x-3 p-4 bg-red-900/30 border border-red-700 rounded-lg mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
            <div className="text-sm text-red-300">
              <p className="font-medium mb-1">警告</p>
              <p>
                禁用MFA将降低您账户的安全性。请确保您了解这一操作的风险。
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                请输入当前验证码以确认操作
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e?.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white text-center text-xl font-mono tracking-widest focus:outline-none focus:border-red-500"
                maxLength={6}
                disabled={isLoading}
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

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={verificationCode.length !== 6 || isLoading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  '确认禁用'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ==================== 备用码管理弹窗 ====================

const BackupCodesModal: React.FC<BackupCodesModalProps> = ({
  isOpen,
  onClose,
  codes,
  onRegenerate,
  isLoading
}) => {
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    const content = `TestWeb 平台备用码\n生成时间: ${new Date().toLocaleString()}\n\n${codes.map((code, index) => `${index + 1}. ${code}`).join('\n')}\n\n重要提示:\n- 每个备用码只能使用一次\n- 请将这些代码保存在安全的地方\n- 如果丢失，请重新生成新的备用码`;

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
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">备用码管理</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-300">
                <p className="font-medium mb-1">备用码使用说明：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>每个备用码只能使用一次</li>
                  <li>用于身份验证器不可用时的紧急访问</li>
                  <li>建议下载保存到安全位置</li>
                  <li>可以随时重新生成新的备用码</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">当前备用码</h4>
            <div className="grid grid-cols-1 gap-2">
              {codes.map((code, index) => (
                <div
                  key={index}
                  className="bg-gray-700 rounded px-3 py-2 text-center font-mono text-sm text-gray-300 flex items-center justify-between"
                >
                  <span>{index + 1}.</span>
                  <span className="tracking-wider">{code}</span>
                  <span className="w-6"></span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleDownload}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              <Download className="w-4 h-4 mr-2" />
              下载备用码
            </button>
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新生成
                </>
              )}
            </button>
          </div>

          {downloaded && (
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-300 text-sm">备用码已下载成功</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== 主组件 ====================

export const MFAManagement: React.FC<MFAManagementProps> = ({
  userId,
  userEmail,
  onMFADisabled,
  className = ''
}) => {
  const { getMFAStatus, disableMFA, generateBackupCodes, isLoading, error } = useMFA();
  
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loadingBackupCodes, setLoadingBackupCodes] = useState(false);

  useEffect(() => {
    loadMFAStatus();
  }, [userId]);

  const loadMFAStatus = async () => {
    try {
      const status = await getMFAStatus(userId);
      setMfaStatus(status);
    } catch (error) {
      console.error('加载MFA状态失败:', error);
    }
  };

  const handleDisableMFA = async (verificationCode: string) => {
    try {

      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
      const success = await disableMFA(userId, verificationCode);
      if (success) {
        setShowDisableModal(false);
        await loadMFAStatus();
        onMFADisabled?.();
      }
    } catch (error) {
      console.error('禁用MFA失败:', error);
    }
  };

  const handleViewBackupCodes = async () => {
    setLoadingBackupCodes(true);
    try {
      const codes = await generateBackupCodes(userId);
      setBackupCodes(codes);
      setShowBackupCodes(true);
    } catch (error) {
      console.error('获取备用码失败:', error);
    } finally {
      setLoadingBackupCodes(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    setLoadingBackupCodes(true);
    try {
      const codes = await generateBackupCodes(userId);
      setBackupCodes(codes);
      await loadMFAStatus(); // 重新加载状态以更新剩余备用码数量
    } catch (error) {
      console.error('重新生成备用码失败:', error);
    } finally {
      setLoadingBackupCodes(false);
    }
  };

  if (!mfaStatus) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-400">加载MFA状态...</span>
        </div>
      </div>
    );
  }

  if (!mfaStatus.enabled) {
    return (
      <div className={`${className}`}>
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <ShieldOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">多因素认证未启用</h3>
          <p className="text-gray-400 mb-4">
            启用MFA可以为您的账户提供额外的安全保护
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* MFA状态概览 */}
      <div className="bg-green-900/20 border border-green-700 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              多因素认证已启用
            </h3>
            <p className="text-green-200 mb-4">
              您的账户受到多因素认证保护，提供额外的安全层级。
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-900/30 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-300">认证方式</span>
                </div>
                <p className="text-green-100 font-medium mt-1">
                  {mfaStatus.methods.length} 种方式
                </p>
              </div>
              <div className="bg-green-900/30 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-300">备用码</span>
                </div>
                <p className="text-green-100 font-medium mt-1">
                  剩余 {mfaStatus.backupCodesRemaining} 个
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MFA方法管理 */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">认证方式管理</h3>
        
        <div className="space-y-3">
          {/* TOTP身份验证器 */}
          {mfaStatus.methods.includes('totp') && (
            <div className="flex items-center space-x-4 p-4 bg-gray-700 rounded-lg">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">身份验证器应用</h4>
                <p className="text-sm text-gray-400">
                  使用 {userEmail} 配置的身份验证器
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-green-600 text-green-100 text-xs rounded-full">
                  已启用
                </span>
                <button className="text-gray-400 hover:text-white">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 安全选项 */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">安全选项</h3>
        
        <div className="space-y-3">
          {/* 查看/管理备用码 */}
          <div
            onClick={handleViewBackupCodes}
            className="flex items-center space-x-4 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-colors"
          >
            <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-white">备用码</h4>
              <p className="text-sm text-gray-400">
                查看、下载或重新生成备用码
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {loadingBackupCodes ? (
                <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>

          {/* 禁用MFA */}
          <div
            onClick={() => setShowDisableModal(true)}
            className="flex items-center space-x-4 p-4 bg-gray-700 hover:bg-red-900/30 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-red-700"
          >
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-white">禁用多因素认证</h4>
              <p className="text-sm text-gray-400">
                移除账户的额外安全保护
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-red-400" />
          </div>
        </div>
      </div>

      {/* 禁用MFA弹窗 */}
      <DisableMFAModal
        isOpen={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        onConfirm={handleDisableMFA}
        isLoading={isLoading}
        error={error}
      />

      {/* 备用码管理弹窗 */}
      <BackupCodesModal
        isOpen={showBackupCodes}
        onClose={() => setShowBackupCodes(false)}
        codes={backupCodes}
        onRegenerate={handleRegenerateBackupCodes}
        isLoading={loadingBackupCodes}
      />
    </div>
  );
};

export default MFAManagement;
