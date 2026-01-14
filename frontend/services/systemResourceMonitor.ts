import Logger from '@/utils/logger';

﻿// 移除React Hook导入，这是一个服务文件，不应该使用React Hook

export interface SystemResources {
  cpu: {
    usage: number; // CPU使用率 (0-100)
    cores: number; // CPU核心数
    loadAverage: number[]; // 负载平均值
  };
  memory: {
    used: number; // 已使用内存 (MB)
    total: number; // 总内存 (MB)
    usage: number; // 内存使用率 (0-100)
    available: number; // 可用内存 (MB)
  };
  network: {
    activeConnections: number; // 活跃连接数
    bandwidth: {
      upload: number; // 上传带宽使用 (Mbps)
      download: number; // 下载带宽使用 (Mbps)
    };
  };
  disk: {
    usage: number; // 磁盘使用率 (0-100)
    available: number; // 可用空间 (GB)
  };
  timestamp: number;
}

export interface ResourceThresholds {
  cpu: {
    warning: number; // CPU使用率警告阈值
    critical: number; // CPU使用率临界阈值
  };
  memory: {
    warning: number; // 内存使用率警告阈值
    critical: number; // 内存使用率临界阈值
  };
  network: {
    maxConnections: number; // 最大连接数
    maxBandwidth: number; // 最大带宽使用
  };
}


/**

 * SystemResourceMonitor类 - 负责处理相关功能

 */
export type ResourceStatus = 'healthy' | 'warning' | 'critical' | 'overloaded';

class SystemResourceMonitor {
  private resources: SystemResources | null = null;
  private thresholds: ResourceThresholds;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private listeners = new Set<(resources: SystemResources, status: ResourceStatus) => void>();
  private isMonitoring = false;

  constructor(thresholds?: Partial<ResourceThresholds>) {
    this.thresholds = {
      cpu: {
        warning: 70,
        critical: 85,
        ...thresholds?.cpu
      },
      memory: {
        warning: 75,
        critical: 90,
        ...thresholds?.memory
      },
      network: {
        maxConnections: 1000,
        maxBandwidth: 100,
        ...thresholds?.network
      }
    };
  }

  /**
   * 开始监控系统资源
   */
  startMonitoring(intervalMs: number = 30000): void { // 改为30秒间隔
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    // Logger.debug('🔍 开始系统资源监控...'); // 静默启动

    // 立即获取一次资源信息
    this.updateResources();

    // 定期更新资源信息
    this.monitoringInterval = setInterval(() => {
      this.updateResources();
    }, intervalMs);
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    // // 静默停止
  }

  /**
   * 更新资源信息
   */
  private async updateResources(): Promise<void> {
    try {
      // 在开发模式下，跳过API调用，使用模拟数据
      if (import.meta.env.DEV) {
        const mockResources = this.getMockResourcesV1();
        this.resources = mockResources;
        const status = this.evaluateResourceStatus(mockResources);

        // 通知监听器
        this.listeners.forEach(listener => {
          try {
            listener(mockResources, status);
          } catch (error) {
            Logger.warn('Resource listener error:', { error: String(error) });
          }
        });
        return;
      }

      // 在生产环境中，通过API获取资源信息
      const resources = await this.fetchResourcesFromAPI();

      this.resources = resources;
      const status = this.evaluateResourceStatus(resources);

      // 通知监听器
      this.listeners.forEach(listener => {
        try {
          listener(resources, status);
        } catch (error) {
          Logger.error('资源监控监听器错误:', { error: String(error) });
        }
      });

    } catch (error) {
      Logger.error('更新系统资源信息失败:', { error: String(error) });
    }
  }

  /**
   * 获取模拟资源数据（开发模式使用）
   */
  private getMockResourcesV1(): SystemResources {
    return {
      timestamp: Date.now(),
      cpu: {
        usage: Math.random() * 30 + 10, // 10-40% CPU使用率
        cores: 8,
        loadAverage: [0.5, 0.7, 0.9]
      },
      memory: {
        used: Math.random() * 8 * 1024 * 1024 * 1024 + 4 * 1024 * 1024 * 1024, // 4-12GB
        total: 16 * 1024 * 1024 * 1024, // 16GB
        usage: 0, // 将在计算中设置
        available: 0 // 将在计算中设置
      },
      disk: {
        usage: Math.random() * 50 + 20, // 20-70% 磁盘使用率
        available: Math.random() * 200 * 1024 * 1024 * 1024 + 100 * 1024 * 1024 * 1024 // 100-300GB可用
      },
      network: {
        activeConnections: Math.floor(Math.random() * 100) + 10,
        bandwidth: {
          upload: Math.random() * 100,
          download: Math.random() * 1000
        }
      }
    };
  }

  /**
   * 从API获取资源信息
   */
  private async fetchResourcesFromAPI(): Promise<SystemResources> {
    try {
      const response = await fetch(`http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/api/system/resources`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.resources;

    } catch (error) {
      // 如果API不可用，返回模拟数据
      // Logger.warn('无法获取真实资源信息，使用模拟数据:', { error: String(error) }); // 静默处理
      return this.getMockResourcesV2();
    }
  }

  /**
   * 获取模拟资源数据（用于开发和测试）
   */
  private getMockResourcesV2(): SystemResources {
    const now = Date.now();
    const baseUsage = 30 + Math.sin(now / 60000) * 20; // 30-50% 基础使用率，带周期性波动

    return {
      cpu: {
        usage: Math.max(0, Math.min(100, baseUsage + Math.random() * 20)),
        cores: 8,
        loadAverage: [1.2, 1.5, 1.8]
      },
      memory: {
        used: 4096 + Math.random() * 2048,
        total: 16384,
        usage: Math.max(0, Math.min(100, baseUsage + Math.random() * 15)),
        available: 12288 - Math.random() * 2048
      },
      network: {
        activeConnections: Math.floor(50 + Math.random() * 200),
        bandwidth: {
          upload: Math.random() * 10,
          download: Math.random() * 50
        }
      },
      disk: {
        usage: 45 + Math.random() * 10,
        available: 500 + Math.random() * 200
      },
      timestamp: now
    };
  }

  /**
   * 评估资源状态
   */
  private evaluateResourceStatus(resources: SystemResources): ResourceStatus {
    const { cpu, memory, network } = resources;

    // 检查临界状态
    if (
      cpu.usage >= this.thresholds.cpu.critical ||
      memory.usage >= this.thresholds.memory.critical ||
      network.activeConnections >= this.thresholds.network.maxConnections
    ) {
      return 'critical';
    }

    // 检查警告状态
    if (
      cpu.usage >= this.thresholds.cpu.warning ||
      memory.usage >= this.thresholds.memory.warning ||
      network.activeConnections >= this.thresholds.network.maxConnections * 0.8
    ) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * 获取当前资源信息
   */
  getCurrentResources(): SystemResources | null {
    return this.resources;
  }

  /**
   * 获取资源状态
   */
  getCurrentStatus(): ResourceStatus {
    if (!this.resources) return 'healthy';
    return this.evaluateResourceStatus(this.resources);
  }

  /**
   * 检查是否可以启动新的压力测试
   */
  canStartNewTest(testType?: 'stress' | 'regular'): boolean {
    const status = this.getCurrentStatus();

    // 压力测试更宽松的资源检查
    if (testType === 'stress') {
      return status !== 'critical'; // 只要不是严重状态就可以启动
    }

    // 普通测试的原有逻辑
    return status === 'healthy' || status === 'warning';
  }

  /**
   * 获取建议的最大并发测试数
   */
  getRecommendedMaxConcurrentTests(): number {
    const status = this.getCurrentStatus();
    const resources = this.getCurrentResources();

    if (!resources) return 3; // 默认值

    switch (status) {
      case 'healthy':
        return Math.min(8, Math.floor(resources.cpu.cores * 1.5));
      case 'warning':
        return Math.min(5, Math.floor(resources.cpu.cores));
      case 'critical':
        return Math.min(2, Math.floor(resources.cpu.cores * 0.5));
      case 'overloaded':
        return 1;
      default:
        return 3;
    }
  }

  /**
   * 添加资源监控监听器
   */
  addListener(listener: (resources: SystemResources, status: ResourceStatus) => void): () => void {
    this.listeners.add(listener);

    // 如果已有资源数据，立即通知
    if (this.resources) {
      const status = this.evaluateResourceStatus(this.resources);
      listener(this.resources, status);
    }

    // 返回移除监听器的函数
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 获取资源使用统计
   */
  getResourceStats(): {
    status: ResourceStatus;
    recommendations: string[];
    metrics: {
      cpuUsage: number;
      memoryUsage: number;
      networkLoad: number;
      diskUsage: number;
    };
  } {
    const resources = this.getCurrentResources();
    const status = this.getCurrentStatus();
    const recommendations: string[] = [];

    if (!resources) {
      return {
        status: 'healthy',
        recommendations: ['系统资源监控未启动'],
        metrics: { cpuUsage: 0, memoryUsage: 0, networkLoad: 0, diskUsage: 0 }
      };
    }

    // 生成建议
    if (resources.cpu.usage > this.thresholds.cpu.warning) {
      recommendations.push(`CPU使用率较高 (${resources.cpu.usage.toFixed(1)}%)，建议减少并发测试数量`);
    }
    if (resources.memory.usage > this.thresholds.memory.warning) {
      recommendations.push(`内存使用率较高 (${resources.memory.usage.toFixed(1)}%)，建议清理内存或增加内存`);
    }
    if (resources.network.activeConnections > this.thresholds.network.maxConnections * 0.8) {
      recommendations.push(`网络连接数较多 (${resources.network.activeConnections})，建议控制并发连接`);
    }

    return {
      status,
      recommendations,
      metrics: {
        cpuUsage: resources.cpu.usage,
        memoryUsage: resources.memory.usage,
        networkLoad: (resources.network.activeConnections / this.thresholds.network.maxConnections) * 100,
        diskUsage: resources.disk.usage
      }
    };
  }
}

// 创建全局实例 - 静默启动监控
export const _systemResourceMonitor = (() => {
  // 使用普通变量而不是React Hook
  let error: string | null = null;

  try {
    const instance = new SystemResourceMonitor();

    // 静默启动监控，不输出日志
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        instance.startMonitoring();
      }, 100);
    }

    return instance;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    Logger.warn('⚠️ 系统资源监控器初始化失败:', { error: String(err) });

    // 返回一个安全的默认实现
    return {
      getCurrentStatus: () => 'healthy' as const,
      canStartNewTest: (testType?: 'stress' | 'regular') => true, // 默认实现总是允许
      getRecommendedMaxConcurrentTests: () => 3,
      getCurrentResources: (): any => null,
      addListener: () => () => { },
      startMonitoring: () => { },
      stopMonitoring: () => { },
      getResourceStats: () => ({
        status: 'healthy' as const,
        recommendations: [] as any[],
        metrics: { cpuUsage: 0, memoryUsage: 0, networkLoad: 0, diskUsage: 0 }
      })
    } as unknown as SystemResourceMonitor;
  }
})();

export default SystemResourceMonitor;
