/**
 * 真实的文件上传服务
 * 支持多种文件类型的上传和管理
 */

export interface UploadConfig {
  maxSize?: number; // 最大文件大小（字节）
  allowedTypes?: string[]; // 允许的文件类型
  multiple?: boolean; // 是否允许多文件上传
  compress?: boolean; // 是否压缩图片
  generateThumbnail?: boolean; // 是否生成缩略图
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // 上传速度 (bytes/s)
  timeRemaining: number; // 剩余时间 (seconds)
}

export interface UploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  url: string;
  thumbnailUrl?: string;
  tags?: string[];
  description?: string;
}

class FileUploadService {
  // 监控和指标收集
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errorsByType: new Map<string, number>()
  };
  
  private logSuccess(info: any): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    
    // 更新平均响应时间
    const responseTime = info.responseTime || 0;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + responseTime) / 
      this.metrics.successfulRequests;
  }
  
  private logError(error: Error, context: any): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    
    const errorType = error.name || 'UnknownError';
    this.metrics.errorsByType.set(
      errorType, 
      (this.metrics.errorsByType.get(errorType) || 0) + 1
    );
    
    // 发送错误到监控系统
    this.sendErrorToMonitoring(error, context);
  }
  
  private logMetrics(info: any): void {
    // 记录请求指标
    console.debug('API Metrics:', {
      url: info.url,
      method: info.method,
      status: info.status,
      responseTime: info.responseTime
    });
  }
  
  getMetrics(): any {
    return {
      ...this.metrics,
      errorsByType: Object.fromEntries(this.metrics.errorsByType),
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0
    };
  }
  private async retryRequest(fn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`请求失败，第${attempt}次重试:`, error.message);
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}
  }
  private readonly API_BASE = '/api/files';
  private readonly DEFAULT_CONFIG: UploadConfig = {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv',
      'application/json', 'application/zip'
    ],
    multiple: false,
    compress: true,
    generateThumbnail: true
  };

  /**
   * 上传单个文件
   */
  async uploadFile(
    file: File, 
    config: UploadConfig = {},
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    // 验证文件
    const validation = this.validateFile(file, finalConfig);
    if (!validation.valid) {
      
        return {
        success: false,
        fileId: '',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        url: '',
        error: validation.error
      };
    }

    try {
      // 准备上传数据
      const formData = new FormData();
      formData.append('file', file);
      formData.append('config', JSON.stringify(finalConfig));

      // 创建XMLHttpRequest以支持进度监控
      return new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const startTime = Date.now();

        // 监听上传进度
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = event.loaded / elapsed;
            const timeRemaining = (event.total - event.loaded) / speed;

            onProgress({
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
              speed,
              timeRemaining
            });
          }
        });

        // 监听完成
        xhr.addEventListener('load', () => {
          try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status === 200 && response.success) {
              resolve({
                success: true,
                fileId: response.data.id,
                fileName: response.data.name,
                fileSize: response.data.size,
                fileType: response.data.type,
                url: response.data.url,
                thumbnailUrl: response.data.thumbnailUrl
              });
            } else {
              resolve({
                success: false,
                fileId: '',
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                url: '',
                error: response.error || `HTTP ${xhr.status}`
              });
            }
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        });

        // 监听错误
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        // 发送请求
        const token = this.getAuthToken();
        xhr.open('POST', `${this.API_BASE}/upload`);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.send(formData);
      });

    } catch (error) {
      return {
        success: false,
        fileId: '',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        url: '',
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * 上传多个文件
   */
  async uploadFiles(
    files: FileList | File[],
    config: UploadConfig = {},
    onProgress?: (fileIndex: number, progress: UploadProgress) => void
  ): Promise<UploadResult[]> {
    const fileArray = Array.from(files);
    const results: UploadResult[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const result = await this.uploadFile(
        file,
        config,
        onProgress ? (progress) => onProgress(i, progress) : undefined
      );
      results.push(result);
    }

    return results;
  }

  /**
   * 获取文件列表
   */
  async getFiles(page = 1, limit = 20, type?: string): Promise<{
    files: FileMetadata[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(type && { type })
      });

      const response = await fetch(`${this.API_BASE}?${params}`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch files');
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
      return {
        files: [],
        total: 0,
        page: 1,
        totalPages: 0
      };
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/${fileId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  /**
   * 更新文件元数据
   */
  async updateFileMetadata(fileId: string, metadata: Partial<FileMetadata>): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/${fileId}/metadata`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to update file metadata:', error);
      return false;
    }
  }

  /**
   * 获取文件下载URL
   */
  async getDownloadUrl(fileId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.API_BASE}/${fileId}/download`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success ? result.data.url : null;
    } catch (error) {
      console.error('Failed to get download URL:', error);
      return null;
    }
  }

  /**
   * 验证文件
   */
  private validateFile(file: File, config: UploadConfig): { valid: boolean; error?: string } {
    // 检查文件大小
    if (config.maxSize && file.size > config.maxSize) {
      
        return {
        valid: false,
        error: `文件大小超过限制 (${this.formatFileSize(config.maxSize)
      })`
      };
    }

    // 检查文件类型
    if (config.allowedTypes && !config.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `不支持的文件类型: ${file.type}`
      };
    }

    return { valid: true };
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 获取认证token
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token') || localStorage.getItem('token');
  }

  /**
   * 获取请求头
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }
}

// 单例实例
export const fileUploadService = new FileUploadService();
export default fileUploadService;
