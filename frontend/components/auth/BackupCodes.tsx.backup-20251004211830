/**
 * BackupCodes 组件
 * 管理和显示双因素认证备份代码
 */

import React, { useState, useEffect } from 'react';
import { Copy, Download, RefreshCw, Shield, AlertTriangle, Check, Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
// TODO: Install react-toastify package
// import { toast } from 'react-toastify';
const toast = {
  success: (message: string) => console.log('Success:', message),
  error: (message: string) => console.error('Error:', message),
  info: (message: string) => console.info('Info:', message),
  warning: (message: string) => console.warn('Warning:', message),
};

interface BackupCode {
  code: string;
  used: boolean;
  usedAt?: Date;
}

interface BackupCodesProps {
  userId?: string;
  onClose?: () => void;
  showGenerateButton?: boolean;
}

const BackupCodes: React.FC<BackupCodesProps> = ({ 
  userId, 
  onClose,
  showGenerateButton = true 
}) => {
  const { user } = useAuth();
  const [codes, setCodes] = useState<BackupCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [_downloadReady, setDownloadReady] = useState(false);

  // 获取备份代码
  const fetchBackupCodes = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/auth/backup-codes/${userId || user?.id}`);
      setCodes(response.data.codes);
      setDownloadReady(response.data.codes.length > 0);
    } catch (error) {
      console.error('获取备份代码失败:', error);
      toast.error('获取备份代码失败');
    } finally {
      setLoading(false);
    }
  };

  // 生成新的备份代码
  const generateNewCodes = async () => {
    if (!window.confirm('生成新代码将使旧代码失效。确定要继续吗？')) {
      return;
    }

    setRegenerating(true);
    try {
      const response = await api.post(`/auth/backup-codes/generate`, {
        userId: userId || user?.id
      });
      
      setCodes(response.data.codes);
      setShowCodes(true);
      setDownloadReady(true);
      toast.success('已生成新的备份代�?);
    } catch (error) {
      console.error('生成备份代码失败:', error);
      toast.error('生成备份代码失败');
    } finally {
      setRegenerating(false);
    }
  };

  // 复制单个代码
  const copyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast.success('代码已复制到剪贴�?);
    } catch (error) {
      toast.error('复制失败');
    }
  };

  // 复制所有代�?  const copyAllCodes = async () => {
    const allCodes = codes
      .filter(c => !c.used)
      .map(c => c.code)
      .join('\n');
    
    try {
      await navigator.clipboard.writeText(allCodes);
      toast.success('所有代码已复制到剪贴板');
    } catch (error) {
      toast.error('复制失败');
    }
  };

  // 下载代码
  const downloadCodes = () => {
    const content = `Test-Web 备份代码\n` +
      `生成时间: ${new Date().toLocaleString()}\n` +
      `用户: ${user?.email}\n\n` +
      `请将这些代码保存在安全的地方。每个代码只能使用一次。\n\n` +
      codes.map((c, i) => `${i + 1}. ${c.code}${c.used ? ' (已使�?' : ''}`).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('备份代码已下�?);
  };

  useEffect(() => {
    fetchBackupCodes();
  }, [userId]);

  const unusedCodesCount = codes.filter(c => !c.used).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      {/* 标题和说�?*/}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
          <Shield className="w-6 h-6 mr-2 text-blue-500" />
          备份代码
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          备份代码可在您无法使用常规双因素认证方式时使用。请妥善保管这些代码�?        </p>
      </div>

      {/* 状态提�?*/}
      {codes.length > 0 && (
        <div className={`mb-4 p-4 rounded-lg ${
          unusedCodesCount < 3 
            ? 'bg-yellow-50 border border-yellow-200' 
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center">
            {unusedCodesCount < 3 ? (
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            ) : (
              <Shield className="w-5 h-5 text-blue-600 mr-2" />
            )}
            <span className={`font-medium ${
              unusedCodesCount < 3 ? 'text-yellow-800' : 'text-blue-800'
            }`}>
              您还�?{unusedCodesCount} 个未使用的备份代�?            </span>
          </div>
          {unusedCodesCount < 3 && (
            <p className="text-sm text-yellow-700 mt-1">
              建议生成新的备份代码以确保账户安�?            </p>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-3 mb-6">
        {showGenerateButton && (
          <button
            onClick={generateNewCodes}
            disabled={regenerating || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {regenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                生成�?..
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                生成新代�?              </>
            )}
          </button>
        )}

        <button
          onClick={() => setShowCodes(!showCodes)}
          disabled={codes.length === 0 || loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 
                   disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {showCodes ? (
            <>
              <EyeOff className="w-4 h-4 mr-2" />
              隐藏代码
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" />
              显示代码
            </>
          )}
        </button>

        {codes.length > 0 && (
          <>
            <button
              onClick={copyAllCodes}
              disabled={unusedCodesCount === 0}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 
                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Copy className="w-4 h-4 mr-2" />
              复制全部
            </button>

            <button
              onClick={downloadCodes}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                       flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              下载
            </button>
          </>
        )}
      </div>

      {/* 代码列表 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : codes.length > 0 ? (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${
          !showCodes ? 'filter blur-lg select-none' : ''
        }`}>
          {codes.map((code, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${
                code.used
                  ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <code className={`font-mono text-sm ${
                  code.used
                    ? 'text-gray-500 line-through'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {showCodes ? code.code : '•••�?•••�?•••�?}
                </code>
                
                {!code.used && showCodes && (
                  <button
                    onClick={() => copyCode(code.code, index)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="复制代码"
                  >
                    {copiedIndex === index ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                )}
              </div>
              
              {code.used && code.usedAt && (
                <p className="text-xs text-gray-500 mt-1">
                  使用�? {new Date(code.usedAt).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>尚未生成备份代码</p>
          <p className="text-sm mt-1">点击"生成新代�?创建备份代码</p>
        </div>
      )}

      {/* 安全提示 */}
      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 
                    dark:border-yellow-800 rounded-lg">
        <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
          安全提示
        </h4>
        <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
          <li>�?每个备份代码只能使用一�?/li>
          <li>�?请将代码保存在安全的地方（如密码管理器）</li>
          <li>�?不要将代码存储在您的设备上或通过不安全的方式传输</li>
          <li>�?如果您怀疑代码已泄露，请立即生成新的代码</li>
        </ul>
      </div>

      {/* 关闭按钮 */}
      {onClose && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 
                     dark:hover:text-gray-200"
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
};

export default BackupCodes;
