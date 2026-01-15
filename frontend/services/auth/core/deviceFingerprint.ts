import Logger from '@/utils/logger';

/**
 * 设备指纹模块
 * 从AuthManager提取的设备指纹功能
 */

export class DeviceFingerprinter {
  /**
   * 生成设备指纹
   */
  static async generateFingerprint(): Promise<string> {
    const components: string[] = [];

    // 基础信息
    components.push(navigator.userAgent);
    components.push(navigator.language);
    components.push(navigator.platform);
    components.push(screen.width + 'x' + screen.height);
    components.push(screen.colorDepth.toString());
    components.push(new Date().getTimezoneOffset().toString());

    // 硬件信息
    if (navigator.hardwareConcurrency) {
      components.push(navigator.hardwareConcurrency.toString());
    }

    if ((navigator as any).deviceMemory) {
      components.push((navigator as any).deviceMemory.toString());
    }

    // Canvas指纹
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint test', 2, 2);
        components.push(canvas.toDataURL());
      }
    } catch (e) {
      // Canvas可能被禁用
    }

    // WebGL指纹
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl && gl instanceof WebGLRenderingContext) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
      }
    } catch (e) {
      // WebGL可能不可用
    }

    // 生成哈希
    const fingerprint = await this.hashString(components.join('|'));
    return fingerprint;
  }

  /**
   * 字符串哈希
   */
  private static async hashString(str: string): Promise<string> {
    if (crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // 降级到简单哈希
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // 转换为32位整数
      }
      return Math.abs(hash).toString(16);
    }
  }

  /**
   * 生成设备ID（持久化存储）
   */
  static generateDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * 获取设备信息
   */
  static async getDeviceInfo(): Promise<{
    deviceId: string;
    userAgent: string;
    language: string;
    platform: string;
    fingerprint?: string;
  }> {
    const deviceId = this.generateDeviceId();

    try {
      const fingerprint = await this.generateFingerprint();
      return {
        deviceId,
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        fingerprint,
      };
    } catch (error) {
      Logger.warn('生成设备指纹失败:', { error: String(error) });
      return {
        deviceId,
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
      };
    }
  }
}
