import React from 'react';
import type { ReactNode, FC } from 'react';
import toast, { Toaster, ToastOptions } from 'react-hot-toast';

// Toast 配置
const toastConfig: ToastOptions = {
  duration: 4000,
  position: 'top-right',
  style: {
    background: '#363636',
    color: '#fff',
    borderRadius: '8px',
    fontSize: '14px',
    maxWidth: '400px',
  },
};

// 成功和错误的特定配置
const successConfig = {
  ...toastConfig,
  iconTheme: {
    primary: '#10b981',
    secondary: '#fff',
  },
};

const errorConfig = {
  ...toastConfig,
  iconTheme: {
    primary: '#ef4444',
    secondary: '#fff',
  },
};

// Toast 提供者组件
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={toastConfig}
      />
    </>
  );
};

// Toast 工具函数
export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, { ...successConfig, ...options });
  },

  error: (message: string, options?: ToastOptions) => {
    toast.error(message, { ...errorConfig, ...options });
  },

  loading: (message: string, options?: ToastOptions) => {
    return toast.loading(message, { ...toastConfig, ...options });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
    options?: ToastOptions
  ) => {
    return toast.promise(promise, messages, { ...toastConfig, ...options });
  },

  custom: (message: string, options?: ToastOptions) => {
    toast(message, { ...toastConfig, ...options });
  },

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },

  remove: (toastId?: string) => {
    toast.remove(toastId);
  }
};

// 导出默认的 toast 实例
export { toast };
export default showToast;
