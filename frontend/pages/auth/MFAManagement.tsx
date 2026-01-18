/**
 * MFAManagement 组件
 * MFA 管理面板：查看状态、禁用 MFA、重置备用码
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import showToast from '../../components/common/Toast';
import { apiClient } from '../../services/api/client';

interface MFAStatusResponse {
  success: boolean;
  data?: {
    mfaEnabled?: boolean;
    backupCodesRemaining?: number;
    setupRequired?: boolean;
  };
  message?: string;
}

interface MFAManagementProps {
  className?: string;
  onSetup?: () => void;
  onDisabled?: () => void;
  onRegenerated?: (codes: string[]) => void;
}

const MFAManagement: React.FC<MFAManagementProps> = ({
  className,
  onSetup,
  onDisabled,
  onRegenerated,
}) => {
  const [status, setStatus] = useState<MFAStatusResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const authHeader = useMemo(() => {
    if (typeof window === 'undefined') return {} as Record<string, string>;
    const storedToken =
      localStorage.getItem('authToken') ||
      sessionStorage.getItem('authToken') ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('token');
    return storedToken ? { Authorization: `Bearer ${storedToken}` } : {};
  }, []);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.getInstance().get('/auth/mfa/status', {
        headers: authHeader,
      });
      const payload = response.data as MFAStatusResponse;
      setStatus(payload?.data || null);
    } catch {
      showToast.error('获取MFA状态失败');
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleDisable = async () => {
    if (!password) {
      showToast.custom('请输入当前密码');
      return;
    }
    if (token && token.length !== 6) {
      showToast.custom('验证码必须为6位数字');
      return;
    }

    setActionLoading(true);
    try {
      const response = await apiClient
        .getInstance()
        .post(
          '/auth/mfa/disable',
          { password, token: token || undefined },
          { headers: authHeader }
        );
      const payload = response.data as { success?: boolean; message?: string };
      if (!payload?.success) {
        throw new Error(payload?.message || '禁用MFA失败');
      }
      showToast.success('MFA已禁用');
      setPassword('');
      setToken('');
      await loadStatus();
      onDisabled?.();
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : '禁用MFA失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!password) {
      showToast.custom('请输入当前密码');
      return;
    }
    if (!token || token.length !== 6) {
      showToast.custom('请输入6位验证码');
      return;
    }

    setActionLoading(true);
    try {
      const response = await apiClient
        .getInstance()
        .post('/auth/mfa/regenerate-backup-codes', { password, token }, { headers: authHeader });
      const payload = response.data as {
        success?: boolean;
        backupCodes?: string[];
        message?: string;
      };
      if (!payload?.success) {
        throw new Error(payload?.message || '生成备用码失败');
      }
      const nextCodes = payload?.backupCodes || [];
      setBackupCodes(nextCodes);
      showToast.success('备用码已更新');
      await loadStatus();
      onRegenerated?.(nextCodes);
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : '生成备用码失败');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">MFA 管理</h2>
          <p className="text-sm text-gray-500">管理双因素认证状态与备用码</p>
        </div>
        <button
          type="button"
          onClick={loadStatus}
          disabled={loading}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300"
        >
          {loading ? '刷新中...' : '刷新状态'}
        </button>
      </div>

      <div className="mt-6 grid gap-4 rounded-lg bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">状态</span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status?.mfaEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {status?.mfaEnabled ? '已启用' : '未启用'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">剩余备用码</span>
          <span className="text-sm font-medium text-gray-900">
            {status?.backupCodesRemaining ?? 0} 个
          </span>
        </div>
        {!status?.mfaEnabled && (
          <button
            type="button"
            onClick={onSetup}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            开始设置 MFA
          </button>
        )}
      </div>

      {status?.mfaEnabled && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-600">当前密码</label>
              <input
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">验证码(6位)</label>
              <input
                type="text"
                value={token}
                onChange={event => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={actionLoading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {actionLoading ? '处理中...' : '重新生成备用码'}
            </button>
            <button
              type="button"
              onClick={handleDisable}
              disabled={actionLoading}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:border-red-300"
            >
              {actionLoading ? '处理中...' : '禁用 MFA'}
            </button>
          </div>

          {backupCodes.length > 0 && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
              <h3 className="text-sm font-semibold text-indigo-700">最新备用码</h3>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {backupCodes.map(code => (
                  <span key={code} className="rounded-md bg-white px-3 py-2 text-xs font-mono">
                    {code}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-indigo-600">备用码仅显示一次，请妥善保存。</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MFAManagement;
