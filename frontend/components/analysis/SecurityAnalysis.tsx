/**
 * SecurityAnalysis.tsx - React组件
 * 
 * 文件路径: frontend\components\analysis\SecurityAnalysis.tsx
 * 创建时间: 2025-09-25
 */

import { AlertCircle, AlertTriangle, CheckCircle, Eye, Info, Lock, Shield, TrendingDown, TrendingUp, XCircle } from 'lucide-react';
import React from 'react';
import type { FC } from 'react';

interface SecurityAnalysisResult {
  securityScore: number;
  overallRisk: 'low' | 'medium' | 'high';
  checks: {
    httpsRedirect: boolean;
    securityHeaders: boolean;
    sqlInjection: boolean;
    xss: boolean;
    csrf: boolean;
    sensitiveData: boolean;
    sslValid: boolean;
    cookieSecure: boolean;
  };
  vulnerabilities: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical' | 'info' | '低' | '中' | '高' | '信息';
    description: string;
    recommendation: string;
  }>;
  recommendations: string[];
  sslInfo?: {
    valid: boolean;
    subject?: any;
    issuer?: any;
    validFrom?: string;
    validTo?: string;
    protocol?: string;
    reason?: string;
  };
  headerAnalysis?: {
    [key: string]: {
      present: boolean;
      value: string | null;
      description: string;
    };
  };
  cookieAnalysis?: {
    total: number;
    secure: number;
    httpOnly: number;
    sameSite: number;
    issues: string[];
  };
  cspAnalysis?: {
    directives: { [key: string]: string[] };
    issues: string[];
    score: number;
  };
}

interface EnhancedSecurityAnalysisProps {
  result: SecurityAnalysisResult;
}

  /**
   * 获取getScoreColor数据
   * @param {string} id - 对象ID
   * @returns {Promise<Object|null>} 获取的数据
   */
export const EnhancedSecurityAnalysis: React.FC<EnhancedSecurityAnalysisProps> = ({ result }) => {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-400 bg-green-500/20 border-green-500/30';
    if (score >= 70) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    if (score >= 50) return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
    return 'text-red-400 bg-red-500/20 border-red-500/30';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 85) return <TrendingUp className="w-6 h-6 text-green-400" />;
    if (score >= 70) return <TrendingUp className="w-6 h-6 text-yellow-400" />;
    return <TrendingDown className="w-6 h-6 text-red-400" />;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-400 bg-green-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'high': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'medium': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'low': return <AlertCircle className="w-4 h-4 text-blue-400" />;
      case 'info': return <Info className="w-4 h-4 text-gray-400" />;
      // 兼容中文值
      case '高': return <XCircle className="w-4 h-4 text-red-400" />;
      case '中': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case '低': return <AlertCircle className="w-4 h-4 text-blue-400" />;
      case '信息': return <Info className="w-4 h-4 text-gray-400" />;
      default: return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

    /**
     * switch功能函数
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 返回结果
     */
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high': return 'border-red-500/30 bg-red-500/10';
      case 'medium': return 'border-yellow-500/30 bg-yellow-500/10';
      case 'low': return 'border-blue-500/30 bg-blue-500/10';
      case 'info': return 'border-gray-500/30 bg-gray-500/10';
      // 兼容中文值
      case '高': return 'border-red-500/30 bg-red-500/10';
      case '中': return 'border-yellow-500/30 bg-yellow-500/10';
      case '低': return 'border-blue-500/30 bg-blue-500/10';
      case '信息': return 'border-gray-500/30 bg-gray-500/10';
      default: return 'border-gray-500/30 bg-gray-500/10';
    }
  };

  const getSeverityText = (severity: string) => {
    const textMap: { [key: string]: string } = {
      'critical': '严重',
      'high': '高',
      'medium': '中',
      'low': '低',
      'info': '信息'
    };
    return textMap[severity] || severity;
  };

  const getCheckIcon = (passed: boolean) => {
    return passed ?
      <CheckCircle className="w-4 h-4 text-green-400" /> :
      <XCircle className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="space-y-6">
      {/* 安全评分概览 */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <Shield className="w-6 h-6 mr-2 text-blue-400" />
            安全分析报告
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 总体评分 */}
          <div className={`text-center p-4 rounded-lg border ${getScoreColor(result.securityScore)}`}>
            <div className="flex items-center justify-center mb-2">
              {getScoreIcon(result.securityScore)}
              <span className="ml-2 text-3xl font-bold">{result.securityScore}</span>
            </div>
            <div className="text-sm opacity-80">安全评分</div>
          </div>

          {/* 风险等级 */}
          <div className={`text-center p-4 rounded-lg border border-gray-600/50 ${getRiskColor(result.overallRisk)}`}>
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6" />
              <span className="ml-2 text-lg font-semibold capitalize">{result.overallRisk}</span>
            </div>
            <div className="text-sm opacity-80">风险等级</div>
          </div>

          {/* 漏洞数量 */}
          <div className="text-center p-4 rounded-lg border border-gray-600/50 bg-gray-700/30">
            <div className="flex items-center justify-center mb-2">
              <Eye className="w-6 h-6 text-purple-400" />
              <span className="ml-2 text-3xl font-bold text-white">{result.vulnerabilities.length}</span>
            </div>
            <div className="text-sm text-gray-300">发现问题</div>
          </div>
        </div>
      </div>

      {/* 安全检查项 */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-white mb-4">安全检查项</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
            <span className="text-gray-300">HTTPS重定向</span>
            {getCheckIcon(result.checks.httpsRedirect)}
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
            <span className="text-gray-300">安全头配置</span>
            {getCheckIcon(result.checks.securityHeaders)}
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
            <span className="text-gray-300">SSL证书有效</span>
            {getCheckIcon(result.checks.sslValid)}
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
            <span className="text-gray-300">Cookie安全</span>
            {getCheckIcon(result.checks.cookieSecure)}
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
            <span className="text-gray-300">SQL注入防护</span>
            {getCheckIcon(!result.checks.sqlInjection)}
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
            <span className="text-gray-300">XSS防护</span>
            {getCheckIcon(!result.checks.xss)}
          </div>
        </div>
      </div>

      {/* 发现的漏洞 */}
      {result.vulnerabilities.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">发现的安全问题</h4>
          <div className="space-y-3">
            {result.vulnerabilities.map((vuln, index) => (
              <div key={index} className={`flex items-start space-x-3 p-4 border rounded-lg ${getSeverityColor(vuln.severity)}`}>
                {getSeverityIcon(vuln.severity)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-white">{vuln.type}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSeverityColor(vuln.severity)}`}>
                      {getSeverityText(vuln.severity)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{vuln.description}</p>
                  <p className="text-xs text-blue-400 mt-2">
                    <strong>建议:</strong> {vuln.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 安全建议 */}
      {result.recommendations.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">安全建议</h4>
          <div className="space-y-3">
            {result.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-300">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SSL信息 */}
      {result.sslInfo && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-green-400" />
            SSL证书信息
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">状态:</span>
              <span className={`ml-2 ${result.sslInfo.valid ? 'text-green-400' : 'text-red-400'}`}>
                {result.sslInfo.valid ? '有效' : '无效'}
              </span>
            </div>
            {result.sslInfo.validFrom && (
              <div>
                <span className="text-gray-400">有效期:</span>
                <span className="ml-2 text-white">
                  {new Date(result.sslInfo.validFrom).toLocaleDateString()} - {new Date(result.sslInfo.validTo!).toLocaleDateString()}
                </span>
              </div>
            )}
            {result.sslInfo.protocol && (
              <div>
                <span className="text-gray-400">协议:</span>
                <span className="ml-2 text-white">{result.sslInfo.protocol}</span>
              </div>
            )}
            {result.sslInfo.subject && (
              <div>
                <span className="text-gray-400">颁发给:</span>
                <span className="ml-2 text-white">{result.sslInfo.subject.CN || 'N/A'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSecurityAnalysis;
