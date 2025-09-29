/**
 * MFA设置页面组件
 * 用于设置双因素认证，包括生成二维码、验证TOTP等功能
 * 优化版：支持现代化UI和完整的MFA流程
 */

import React, { useState, useEffect } from 'react';

import {Shield, Smartphone, Key, CheckCircle, RefreshCw} from 'lucide-react';
import { useAuthCheck } from '../../components/auth/withAuthCheck';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface MFASetupProps {
  onComplete?: (success: boolean) => void;
  onCancel?: () => void;
}

interface MFASetupState {
  currentStep: number;
  isLoading: boolean;
  secret?: string;
  qrCodeUrl?: string;
  manualEntryKey?: string;
  verificationCode: string;
  deviceName: string;
  backupCodes?: string[];
  error?: string;
  success?: string;
}

const MFASetup: React.FC<MFASetupProps> = ({ onComplete, onCancel }) => {
  const navigate = useNavigate();
  
  // 登录检查
  const {
    isAuthenticated,
    requireLogin,
    LoginPromptComponent
  } = useAuthCheck({
    feature: "双因素认证设置",
    description: "设置双因素认证需要登录"
  });

  const [state, setState] = useState<MFASetupState>({
    currentStep: 0,
    isLoading: false,
    verificationCode: '',
    deviceName: ''
  });

  // 检查登录状态
  if (!requireLogin()) {
    return <LoginPromptComponent />;
  }

  // 第一步：初始化MFA设置
  const initiateMFASetup = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟数据
      const secret = 'JBSWY3DPEHPK3PXP';
      const qrCodeUrl = `otpauth://totp/Test-Web:user@example.com?secret=${secret}&issuer=Test-Web`;
      
      setState(prev => ({
        ...prev,
        secret,
        qrCodeUrl,
        manualEntryKey: secret,
        currentStep: 1,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error?.message : '未知错误',
        isLoading: false
      }));
      toast.error('MFA设置初始化失败');
    }
  };

  // 第二步：验证TOTP代码
  const verifyTOTPCode = async () => {
    if (!state.verificationCode || state.verificationCode.length !== 6) {
      toast.error('请输入6位验证码');
      return;
    }
    
    if (!state.deviceName.trim()) {
      toast.error('请输入设备名称');
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟验证成功
      const backupCodes = [
        'A1B2C3D4', 'E5F6G7H8', 'I9J0K1L2', 'M3N4O5P6',
        'Q7R8S9T0', 'U1V2W3X4', 'Y5Z6A7B8', 'C9D0E1F2'
      ];
      
      setState(prev => ({
        ...prev,
        backupCodes,
        currentStep: 2,
        isLoading: false,
        success: 'MFA设置成功！'
      }));
      
      toast.success('MFA设置成功！');
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error?.message : '验证失败',
        isLoading: false
      }));
      toast.error('验证码错误，请重试');
    }
  };

  // 下载备用码
  const downloadBackupCodes = () => {
    if (!state.backupCodes) return;

    const codesText = state.backupCodes.map((code, index) => 
      `${index + 1}. ${code}`
    ).join('\n');

    const content = `Test-Web 双因素认证备用码\n\n请安全保存这些备用码，当您无法使用认证应用时可以使用：\n\n${codesText}\n\n注意：每个备用码只能使用一次。`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'testweb-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('备用码已下载');
  };
  
  // 复制到剪贴板
  const _copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('已复制到剪贴板');
    }).catch(() => {
      toast.error('复制失败');
    });
  };

  // 完成设置
  const completeSetup = () => {
    onComplete?.(true);
    navigate('/mfa-management');
    toast.success('欢迎使用MFA保护的账户！');
  };

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (state.currentStep) {
      case 0:
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">保护您的账户安全</h2>
            <p className="text-gray-400 mb-8 text-lg leading-relaxed">
              双因素认证（MFA）为您的账户增加额外的安全层。即使密码泄露，
              没有您的手机认证应用，他人也无法登录您的账户。
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <Key className="w-8 h-8 text-yellow-500 mb-3" />
                <h3 className="font-semibold text-white mb-2">更安全</h3>
                <p className="text-sm text-gray-400">显著降低账户被盗用的风险</p>
              </div>
              <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <Smartphone className="w-8 h-8 text-green-500 mb-3" />
                <h3 className="font-semibold text-white mb-2">便捷</h3>
                <p className="text-sm text-gray-400">使用手机应用即可快速验证</p>
              </div>
              <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <CheckCircle className="w-8 h-8 text-blue-500 mb-3" />
                <h3 className="font-semibold text-white mb-2">可靠</h3>
                <p className="text-sm text-gray-400">即使离线也能生成验证码</p>
              </div>
            </div>
            
            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 mb-8">
              <div className="flex items-start space-x-3">
                <Smartphone className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm text-blue-300 font-medium">您需要：</p>
                  <ul className="text-xs text-blue-200 mt-1 space-y-1">
                    <li>• 智能手机</li>
                    <li>• 认证应用（如 Google Authenticator、Microsoft Authenticator）</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={initiateMFASetup}
              disabled={state.isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state.isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>初始化中...</span>
                </div>
              ) : (
                '开始设置'
              )}
            </button>
          </div>
        );

      case 1:
        return (
          <Card title="扫描二维码" className="mb-6">
            <Space direction="vertical" size="large" className="w-full">
              <div className="text-center">
                <Title level={3}>使用认证应用扫描二维码</Title>
                <Paragraph>用您的认证应用扫描下方二维码</Paragraph>
              </div>

              {state.qrCodeUrl && (
                <div className="text-center">
                  <div className="inline-block p-4 bg-white border rounded-lg">
                    <QRCode value={state.qrCodeUrl} size={200} />
                  </div>
                </div>
              )}

              <Divider>或者手动输入</Divider>
              
              {state.manualEntryKey && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <Title level={5}>手动输入密钥：</Title>
                  <Text code copyable className="break-all">
                    {state.manualEntryKey}
                  </Text>
                </div>
              )}

              <div>
                <Title level={4}>输入验证码</Title>
                <Paragraph className="text-gray-600">
                  设置完成后，请输入认证应用中显示的6位验证码：
                </Paragraph>
                <Input
                  value={state.verificationCode}
                  onChange={(e) => setState(prev => ({ 
                    ...prev, 
                    verificationCode: e?.target.value.replace(/\D/g, '').slice(0, 6)
                  }))}
                  placeholder="输入6位验证码"
                  maxLength={6}
                  size="large"
                  className="text-center text-xl font-mono mb-4"
                />
              </div>

              <Space className="w-full">
                <Button onClick={onCancel}>取消</Button>
                <Button 
                  type="primary" 
                  onClick={verifyTOTPCode}
                  loading={state.isLoading}
                  disabled={state.verificationCode.length !== 6}
                >
                  验证并继续
                </Button>
              </Space>
            </Space>
          </Card>
        );

      case 2:
        return (
          <Card title="保存备用码" className="mb-6">
            <Space direction="vertical" size="large" className="w-full">
              <div className="text-center">
                <CheckCircleOutlined className="text-6xl text-green-500 mb-4" />
                <Title level={3} className="text-green-600">MFA设置成功！</Title>
                <Paragraph>双因素认证已启用</Paragraph>
              </div>

              <Alert
                message="重要：请保存备用码"
                description="这些备用码可以在您无法使用认证应用时登录账户。每个代码只能使用一次。"
                type="warning"
                showIcon
              />

              {state.backupCodes && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <Title level={4}>备用码：</Title>
                  <div className="grid grid-cols-2 gap-2">
                    {state.backupCodes.map((code, index) => (
                      <div key={index} className="font-mono bg-white p-2 rounded border">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Space className="w-full">
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={downloadBackupCodes}
                >
                  下载备用码
                </Button>
                <Button type="primary" onClick={completeSetup}>
                  完成设置
                </Button>
              </Space>
            </Space>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mfa-setup max-w-2xl mx-auto p-6">
      <Title level={2} className="text-center mb-8">
        <SafetyOutlined className="mr-2" />
        设置双因素认证
      </Title>

      <Steps current={state.currentStep} className="mb-8">
        <Step title="开始" icon={<SafetyOutlined />} />
        <Step title="扫描二维码" icon={<QrcodeOutlined />} />
        <Step title="保存备用码" icon={<CheckCircleOutlined />} />
      </Steps>

      {state.error && (
        <Alert 
          message="错误" 
          description={state.error} 
          type="error" 
          closable
          onClose={() => setState(prev => ({ ...prev, error: undefined }))}
          className="mb-4"
        />
      )}

      {state.success && (
        <Alert 
          message={state.success} 
          type="success" 
          className="mb-4"
        />
      )}

      {state.isLoading && (
        <div className="text-center mb-4">
          <Spin size="large" />
        </div>
      )}

      {renderStepContent()}
    </div>
  );
};

export default MFASetup;
