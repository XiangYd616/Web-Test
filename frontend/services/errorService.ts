// 错误服务
export const errorService = {
  logError: (error: Error, context?: string) => {
    console.error('Error logged:', error, context);
  },
  
  reportError: (error: Error, context?: string) => {
    // 这里可以添加错误报告逻辑
    console.error('Error reported:', error, context);
  }
};

export default errorService;
