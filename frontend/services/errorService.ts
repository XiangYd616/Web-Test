// 错误服务
export interface ErrorInfo {
  type: string;
  title: string;
  message: string;
  details?: string;
  code?: string;
  suggestions?: string[];
}

export class ErrorService {
  private static instance: ErrorService;
  
  public static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }
  
  public handleError(error: Error | ErrorInfo): ErrorInfo {
    if ('type' in error) {
      return error as ErrorInfo;
    }
    
    return {
      type: 'unknown',
      title: '未知错误',
      message: error.message || '发生了未知错误',
      details: error.stack,
      suggestions: ['请刷新页面重试', '如果问题持续存在，请联系技术支持']
    };
  }
  
  public logError(error: Error | ErrorInfo): void {
    console.error('Error logged:', error);
  }
}

export const errorService = ErrorService.getInstance();

export default errorService;
