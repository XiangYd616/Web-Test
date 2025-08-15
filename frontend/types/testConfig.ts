/**
 * 统一的测试配置类型定义
 */

export interface BaseTestConfig {
  url: string;
  timeout: number;
  retries: number;
  advanced: Record<string, any>;
}

export interface APITestConfig extends BaseTestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  expectedStatus?: number;
  loadTest?: {
    concurrent: number;
    duration: number;
  };
}

export interface CompatibilityTestConfig extends BaseTestConfig {
  browsers: string[];
  devices: string[];
  features: string[];
}

export interface InfrastructureTestConfig extends BaseTestConfig {
  checks: string[];
  monitoring: {
    cpu: boolean;
    memory: boolean;
    network: boolean;
    disk: boolean;
  };
}

export interface PerformanceTestConfig extends BaseTestConfig {
  device: 'desktop' | 'mobile';
  categories: string[];
  throttling?: 'none' | '3g' | '4g';
  includeAccessibility?: boolean;
}

export interface SecurityTestConfig extends BaseTestConfig {
  scanDepth: 'basic' | 'standard' | 'comprehensive';
  includeOWASP: boolean;
  checkSSL: boolean;
  scanVulnerabilities: boolean;
}

export interface SEOTestConfig extends BaseTestConfig {
  includeStructuredData: boolean;
  checkMobile: boolean;
  analyzeTechnicalSEO: boolean;
}

export interface StressTestConfig extends BaseTestConfig {
  strategy: 'gradual' | 'spike' | 'constant' | 'stress' | 'load';
  virtualUsers: number;
  duration: number;
  rampUpTime: number;
}

export interface UXTestConfig extends BaseTestConfig {
  device: 'desktop' | 'mobile' | 'tablet';
  interactions: string[];
  checkUsability: boolean;
}

export interface WebsiteTestConfig extends BaseTestConfig {
  comprehensive: boolean;
  includeContent: boolean;
  analyzeTechnical: boolean;
}

export type TestConfig = 
  | APITestConfig
  | CompatibilityTestConfig  
  | InfrastructureTestConfig
  | PerformanceTestConfig
  | SecurityTestConfig
  | SEOTestConfig
  | StressTestConfig
  | UXTestConfig
  | WebsiteTestConfig;