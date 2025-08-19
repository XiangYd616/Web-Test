import React, { useEffect } from 'react';

const BackgroundTestNotifications: React.FC = () => {
  useEffect(() => {
    // 这里可以添加后台测试通知逻辑
    console.log('后台测试通知系统已启动');
    
    return () => {
      console.log('后台测试通知系统已停止');
    };
  }, []);

  return null; // 这是一个无UI的后台组件
};

export default BackgroundTestNotifications;
