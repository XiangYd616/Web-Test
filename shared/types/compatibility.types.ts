/**
 * compatibility.types.ts - 兼容性类型定义
 */

export interface BrowserCompatibility {
  browser: string;
  version: string;
  supported: boolean;
  issues?: string[];
}

export interface DeviceCompatibility {
  device: string;
  os: string;
  osVersion: string;
  supported: boolean;
  issues?: string[];
}

export interface CompatibilityReport {
  browsers: BrowserCompatibility[];
  devices: DeviceCompatibility[];
  overallScore: number;
  recommendation?: string;
}

export interface CompatibilityTestConfig {
  browsers?: string[];
  devices?: string[];
  url?: string;
  viewport?: {
    width: number;
    height: number;
  };
}

