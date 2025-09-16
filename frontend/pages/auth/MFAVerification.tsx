/**
 * MFA验证页面组件
 * 用于登录时验证双因素认证码
 */

import React, { useState, useEffect, useRef } from 'react';
import { Alert, Button, Card, Input, Typography, Space, Checkbox, message } from 'antd';
import { SafetyOutlined, ReloadOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import type { MFAVerificationResponse } from '../../types/auth';

const { Title, Paragraph, Text } = Typography;

interface MFAVerificationProps {
  email?: string;
  onSuccess?: (response: MFAVerificationResponse) => void;
  onCancel?: () => void;
  redirectPath?: string;
}

interface MFAVerificationState {
  verificationCode: string;
  isLoading: boolean;
  error?: string;
  attemptsLeft: number;
  showBackupCodeInput: boolean;
  backupCode: string;
  trustDevice: boolean;
  countdown: number;
}

const MFAVerification: React.FC<MFAVerificationProps> = ({
  email,
  onSuccess,
  onCancel,
  redirectPath = '/dashboard'
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<any>(null);
  const countdownRef = useRef<NodeJS.Timeout>();

  const [state, setState] = useState<MFAVerificationState>({
    verificationCode: '',
    isLoading: false,
    attemptsLeft: 5,
    showBackupCodeInput: false,
    backupCode: '',
    trustDevice: false,
    countdown: 0
  });

  // 获取用户邮箱（从URL参数或组件props）
  const userEmail = email || new URLSearchParams(location.search).get('email') || '';

  useEffect(() => {
    // 自动聚焦到输入框
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [state.showBackupCodeInput]);

  // 倒计时效果
  useEffect(() => {
    if (state.countdown > 0) {
      countdownRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, countdown: prev.countdown - 1 }));
      }, 1000);
    }
    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [state.countdown]);

  // 验证TOTP代码
  const verifyTOTPCode = async () => {
    if (!state.verificationCode || state.verificationCode.length !== 6) {
      setState(prev => ({ ...prev, error: '请输入6位验证码' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userEmail,
          token: state.verificationCode,
          trustDevice: state.trustDevice
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setState(prev => ({
            ...prev,
            error: '尝试次数过多，请稍后再试',
            countdown: 60,
            isLoading: false
          }));
        } else {
          setState(prev => ({
            ...prev,
            error: data.message || '验证码无效',
            attemptsLeft: Math.max(0, prev.attemptsLeft - 1),
            isLoading: false,
            verificationCode: ''
          }));
        }
        return;
      }

      // 验证成功
      if (onSuccess) {
        onSuccess(data);
      } else {
        // 保存令牌
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
        }
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        
        message.success('验证成功！');
        navigate(redirectPath);
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: '网络错误，请稍后重试',
        isLoading: false
      }));
    }
  };

  // 使用备用码验证
  const verifyBackupCode = async () => {
    if (!state.backupCode || state.backupCode.length < 8) {
      setState(prev => ({ ...prev, error: '请输入完整的备用码' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const response = await fetch('/api/auth/mfa/verify-backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userEmail,
          backupCode: state.backupCode,
          trustDevice: state.trustDevice
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setState(prev => ({
          ...prev,
          error: data.message || '备用码无效',
          isLoading: false,
          backupCode: ''
        }));
        return;
      }

      // 验证成功
      if (onSuccess) {
        onSuccess(data);
      } else {
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
        }
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        
        message.success('验证成功！');
        navigate(redirectPath);
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: '网络错误，请稍后重试',
        isLoading: false
      }));
    }
  };

  // 切换到备用码输入
  const switchToBackupCode = () => {
    setState(prev => ({
      ...prev,
      showBackupCodeInput: true,
      error: undefined,
      verificationCode: ''
    }));
  };

  // 切换回验证码输入
  const switchToVerificationCode = () => {
    setState(prev => ({
      ...prev,
      showBackupCodeInput: false,
      error: undefined,
      backupCode: ''
    }));
  };

  // 重新发送（实际上TOTP不需要发送，这里只是重置状态）
  const resetVerification = () => {
    setState(prev => ({
      ...prev,
      verificationCode: '',
      backupCode: '',
      error: undefined,
      attemptsLeft: 5,
      countdown: 0
    }));
    message.info('请重新输入验证码');
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (state.showBackupCodeInput) {
        verifyBackupCode();
      } else {
        verifyTOTPCode();
      }
    }
  };

  return (
    <div className="mfa-verification max-w-md mx-auto p-6">
      <Card className="shadow-lg">
        <div className="text-center mb-6">
          <SafetyOutlined className="text-4xl text-blue-500 mb-4" />
          <Title level={3}>双因素认证</Title>
          <Paragraph className="text-gray-600 mb-0">
            {userEmail && (
              <>为账户 <Text strong>{userEmail}</Text> 输入验证码</>
            )}
          </Paragraph>
        </div>

        {state.error && (
          <Alert 
            message={state.error} 
            type="error" 
            closable
            onClose={() => setState(prev => ({ ...prev, error: undefined }))}
            className="mb-4"
          />
        )}

        {state.attemptsLeft <= 2 && state.attemptsLeft > 0 && (
          <Alert 
            message={`还有 ${state.attemptsLeft} 次尝试机会`}
            type="warning"
            className="mb-4"
          />
        )}

        {state.countdown > 0 && (
          <Alert 
            message={`请等待 ${state.countdown} 秒后重试`}
            type="info"
            className="mb-4"
          />
        )}

        <Space direction="vertical" size="large" className="w-full">
          {!state.showBackupCodeInput ? (
            // TOTP验证码输入
            <>
              <div>
                <Paragraph className="text-center mb-3">
                  请输入认证应用中的6位验证码：
                </Paragraph>
                <Input
                  ref={inputRef}
                  value={state.verificationCode}
                  onChange={(e) => setState(prev => ({ 
                    ...prev, 
                    verificationCode: e.target.value.replace(/\D/g, '').slice(0, 6)
                  }))}
                  onKeyPress={handleKeyPress}
                  placeholder="000000"
                  maxLength={6}
                  size="large"
                  className="text-center text-2xl font-mono"
                  disabled={state.isLoading || state.countdown > 0}
                />
              </div>

              <Button 
                type="primary" 
                size="large"
                onClick={verifyTOTPCode}
                loading={state.isLoading}
                disabled={state.verificationCode.length !== 6 || state.countdown > 0}
                className="w-full"
              >
                验证
              </Button>

              <div className="text-center">
                <Button 
                  type="link" 
                  icon={<QuestionCircleOutlined />}
                  onClick={switchToBackupCode}
                  disabled={state.isLoading}
                >
                  使用备用码
                </Button>
              </div>
            </>
          ) : (
            // 备用码输入
            <>
              <div>
                <Paragraph className="text-center mb-3">
                  请输入备用码（8位字符）：
                </Paragraph>
                <Input
                  ref={inputRef}
                  value={state.backupCode}
                  onChange={(e) => setState(prev => ({ 
                    ...prev, 
                    backupCode: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
                  }))}
                  onKeyPress={handleKeyPress}
                  placeholder="XXXXXXXX"
                  maxLength={10}
                  size="large"
                  className="text-center text-xl font-mono"
                  disabled={state.isLoading}
                />
              </div>

              <Button 
                type="primary" 
                size="large"
                onClick={verifyBackupCode}
                loading={state.isLoading}
                disabled={state.backupCode.length < 8}
                className="w-full"
              >
                使用备用码验证
              </Button>

              <div className="text-center">
                <Button 
                  type="link"
                  onClick={switchToVerificationCode}
                  disabled={state.isLoading}
                >
                  返回验证码输入
                </Button>
              </div>
            </>
          )}

          {/* 信任设备选项 */}
          <div className="border-t pt-4">
            <Checkbox
              checked={state.trustDevice}
              onChange={(e) => setState(prev => ({ ...prev, trustDevice: e.target.checked }))}
              disabled={state.isLoading}
            >
              信任此设备30天（不推荐在公共设备上使用）
            </Checkbox>
          </div>

          {/* 底部操作 */}
          <div className="border-t pt-4 text-center">
            <Space>
              <Button 
                icon={<ReloadOutlined />}
                onClick={resetVerification}
                disabled={state.isLoading}
              >
                重新输入
              </Button>
              {onCancel && (
                <Button onClick={onCancel} disabled={state.isLoading}>
                  取消
                </Button>
              )}
            </Space>
          </div>
        </Space>
      </Card>

      <div className="text-center mt-6">
        <Paragraph className="text-gray-500 text-sm">
          没有收到验证码？检查您的认证应用是否已正确设置。
        </Paragraph>
      </div>
    </div>
  );
};

export default MFAVerification;
