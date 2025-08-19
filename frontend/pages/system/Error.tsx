/**
 * 统一错误页面
 * 
 * 处理各种错误状态：403、500等
 * 
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';

interface ErrorPageProps {
  status?: '403' | '404' | '500';
  title?: string;
  subTitle?: string;
}

const Error: React.FC<ErrorPageProps> = ({ 
  status = '500',
  title,
  subTitle 
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 根据URL参数或props确定错误类型
  const getErrorInfo = () => {
    const urlParams = new URLSearchParams(location.search);
    const errorType = urlParams.get('type') || status;

    switch (errorType) {
      case '403':
        return {
          status: '403' as const,
          title: title || '403',
          subTitle: subTitle || '抱歉，您没有权限访问此页面。'
        };
      case '404':
        return {
          status: '404' as const,
          title: title || '404',
          subTitle: subTitle || '抱歉，您访问的页面不存在。'
        };
      case '500':
      default:
        return {
          status: '500' as const,
          title: title || '500',
          subTitle: subTitle || '抱歉，服务器出现错误。'
        };
    }
  };

  const errorInfo = getErrorInfo();

  const getActions = () => {
    const actions = [
      <Button type="primary" onClick={() => navigate('/app/dashboard')}>
        返回首页
      </Button>
    ];

    if (errorInfo.status === '403') {
      actions.unshift(
        <Button onClick={() => window.history.back()}>
          返回上页
        </Button>
      );
      actions.push(
        <Button onClick={() => navigate('/auth/login')}>
          重新登录
        </Button>
      );
    } else if (errorInfo.status === '500') {
      actions.push(
        <Button onClick={() => window.location.reload()}>
          刷新页面
        </Button>
      );
    }

    return actions;
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5'
    }}>
      <Result
        status={errorInfo.status}
        title={errorInfo.title}
        subTitle={errorInfo.subTitle}
        extra={getActions()}
      />
    </div>
  );
};

export default Error;
