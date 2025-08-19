/**
 * 404页面
 * 
 * 页面未找到的错误页面
 * 
 * @component
 * @author Test-Web Team
 * @since 1.0.0
 */

import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5'
    }}>
      <Result
        status="404"
        title="404"
        subTitle="抱歉，您访问的页面不存在。"
        extra={
          <Button type="primary" onClick={() => navigate('/app/dashboard')}>
            返回首页
          </Button>
        }
      />
    </div>
  );
};

export default NotFound;
