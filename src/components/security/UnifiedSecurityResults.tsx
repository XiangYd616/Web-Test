/**
 * 统一安全测试结果展示组件
 * 提供全面的安全分析结果可视化
 */

import {
  AlertTriangle,
  Award,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  Info,
  Lock,
  Network,
  Shield,
  Target,
  TrendingUp,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import {
  SecurityTestResult
} from '../../services/unifiedSecurityEngine';

interface UnifiedSecurityResultsProps {
  result: SecurityTestResult;
  onExport?: (format: 'json' | 'html' | 'pdf') => void;
  onRetry?: () => void;
}

export const UnifiedSecurityResults: React.FC<UnifiedSecurityResultsProps> = ({
  result,
  onExport,
  onRetry
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [showRawData, setShowRawData] = useState(false);

  // 切换展开状态
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // 获取等级颜色
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'B': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'C': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'D': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      case 'F': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  // 获取风险等级颜色
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  // 获取严重程度图标
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Info className="h-4 w-4 text-yellow-600" />;
      case 'low': return <Info className="h-4 w-4 text-blue-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  // 模块图标映射
  const moduleIcons = {
    ssl: <Lock className="h-5 w-5" />,
    headers: <Shield className="h-5 w-5" />,
    vulnerabilities: <Target className="h-5 w-5" />,
    cookies: <Eye className="h-5 w-5" />,
    content: <FileText className="h-5 w-5" />,
    network: <Network className="h-5 w-5" />,
    compliance: <Award className="h-5 w-5" />
  };

  return (
    <div className="unified-security-results space-y-4 sm:space-y-6 fade-in-up">
      {/* 头部概览 - 响应式优化 */}
      <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white border border-gray-700/60 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 sm:mb-6 gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm flex-shrink-0">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold">🛡️ 安全测试报告</h2>
              <p className="text-blue-100 text-xs sm:text-sm truncate">
                {result.url} • {new Date(result.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => onExport?.('json')}
              className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-blue-500/30 hover:border-blue-400/50 text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              导出报告
            </button>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-green-500/30 hover:border-green-400/50 text-sm"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                重新测试
              </button>
            )}
          </div>
        </div>

        {/* 核心指标 - 增强可读性 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* 总体评分 */}
          <div className="bg-gray-700/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-600/60 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-200 text-sm font-medium">总体评分</span>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-300" />
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
              {result.overallScore}
              <span className="text-lg sm:text-xl text-blue-200 ml-1">/100</span>
            </div>
            <div className={`inline-flex px-3 py-1.5 rounded-full text-sm font-bold ${getGradeColor(result.grade)} shadow-sm`}>
              等级 {result.grade}
            </div>
          </div>

          {/* 风险等级 */}
          <div className="bg-gray-700/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-600/60 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-200 text-sm font-medium">风险等级</span>
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-gray-300" />
            </div>
            <div className={`inline-flex px-3 py-2 rounded-full text-sm font-bold shadow-sm ${getRiskColor(result.riskLevel)}`}>
              {result.riskLevel === 'low' ? '🟢 低风险' :
                result.riskLevel === 'medium' ? '🟡 中等风险' :
                  result.riskLevel === 'high' ? '🟠 高风险' : '🔴 严重风险'}
            </div>
          </div>

          {/* 发现问题 */}
          <div className="bg-gray-700/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-600/60 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-200 text-sm font-medium">发现问题</span>
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-gray-300" />
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
              {result.findings.length}
            </div>
            <div className="text-sm text-blue-200 font-medium">
              {result.findings.filter(f => f.severity === 'critical' || f.severity === 'high').length} 个高危
            </div>
          </div>

          {/* 修复建议 */}
          <div className="bg-gray-700/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-600/60 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-200 text-sm font-medium">修复建议</span>
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-gray-300" />
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
              {result.recommendations.length}
            </div>
            <div className="text-sm text-blue-200 font-medium">
              {result.recommendations.filter(r => r.priority === 'critical' || r.priority === 'high').length} 个优先
            </div>
          </div>
        </div>
      </div>

      {/* 模块结果 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50">
        <div
          className="flex items-center justify-between p-6 cursor-pointer"
          onClick={() => toggleSection('modules')}
        >
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Shield className="h-5 w-5 mr-2 text-blue-600" />
            检测模块结果
          </h3>
          {expandedSections.has('modules') ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>

        {expandedSections.has('modules') && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(result.modules).map(([moduleKey, moduleResult]) => {
                if (!moduleResult) return null;

                const icon = moduleIcons[moduleKey as keyof typeof moduleIcons];
                const score = moduleResult.score || 0;

                return (
                  <div
                    key={moduleKey}
                    className="p-4 bg-gray-700/50 rounded-xl border border-gray-600/50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                          {icon}
                        </div>
                        <span className="font-semibold text-white capitalize">
                          {moduleKey === 'ssl' ? 'SSL/TLS' :
                            moduleKey === 'headers' ? '安全头' :
                              moduleKey === 'vulnerabilities' ? '漏洞扫描' :
                                moduleKey === 'cookies' ? 'Cookie' :
                                  moduleKey === 'content' ? '内容安全' :
                                    moduleKey === 'network' ? '网络安全' :
                                      moduleKey === 'compliance' ? '合规检查' : moduleKey}
                        </span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-semibold border ${score >= 90 ? 'bg-green-900/50 text-green-300 border-green-700/50' :
                        score >= 70 ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50' :
                          score >= 50 ? 'bg-orange-900/50 text-orange-300 border-orange-700/50' :
                            'bg-red-900/50 text-red-300 border-red-700/50'
                        }`}>
                        {score}/100
                      </div>
                    </div>

                    <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${score >= 90 ? 'bg-green-500' :
                          score >= 70 ? 'bg-yellow-500' :
                            score >= 50 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>

                    {moduleResult.recommendations && moduleResult.recommendations.length > 0 && (
                      <div className="text-xs text-gray-300">
                        {moduleResult.recommendations.length} 条建议
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 发现的问题 */}
      {result.findings.length > 0 && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50">
          <div
            className="flex items-center justify-between p-6 cursor-pointer"
            onClick={() => toggleSection('findings')}
          >
            <h3 className="text-lg font-semibold text-white flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
              发现的安全问题 ({result.findings.length})
            </h3>
            {expandedSections.has('findings') ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </div>

          {expandedSections.has('findings') && (
            <div className="px-6 pb-6">
              <div className="space-y-4">
                {result.findings
                  .sort((a, b) => {
                    // 按严重程度排序
                    const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
                    return (severityOrder[b.severity as keyof typeof severityOrder] || 0) -
                      (severityOrder[a.severity as keyof typeof severityOrder] || 0);
                  })
                  .map((finding, index) => (
                    <div
                      key={finding.id || index}
                      className="p-4 bg-gray-700/50 rounded-xl border border-gray-600/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getSeverityIcon(finding.severity)}
                          <span className="font-semibold text-white">
                            {finding.title}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${finding.severity === 'critical' ? 'bg-red-900/50 text-red-300 border border-red-700/50' :
                            finding.severity === 'high' ? 'bg-orange-900/50 text-orange-300 border border-orange-700/50' :
                              finding.severity === 'medium' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50' :
                                'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                            }`}>
                            {finding.severity === 'critical' ? '严重' :
                              finding.severity === 'high' ? '高危' :
                                finding.severity === 'medium' ? '中危' : '低危'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-300 capitalize">
                          {finding.category}
                        </span>
                      </div>

                      <p className="text-sm text-gray-200 mb-2">
                        {finding.description}
                      </p>

                      {finding.impact && (
                        <div className="text-xs text-gray-300 mb-2">
                          <strong className="text-white">影响：</strong>{finding.impact}
                        </div>
                      )}

                      {finding.location && (
                        <div className="text-xs text-gray-300">
                          <strong className="text-white">位置：</strong>{finding.location}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 修复建议 */}
      {result.recommendations.length > 0 && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50">
          <div
            className="flex items-center justify-between p-6 cursor-pointer"
            onClick={() => toggleSection('recommendations')}
          >
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Zap className="h-5 w-5 mr-2 text-green-400" />
              修复建议 ({result.recommendations.length})
            </h3>
            {expandedSections.has('recommendations') ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </div>

          {expandedSections.has('recommendations') && (
            <div className="px-6 pb-6">
              <div className="space-y-4">
                {result.recommendations.map((recommendation, index) => (
                  <div
                    key={recommendation.id || index}
                    className="p-4 bg-gray-700/50 rounded-xl border border-gray-600/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="font-semibold text-white">
                          {recommendation.title}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${recommendation.priority === 'critical' ? 'bg-red-900/50 text-red-300 border-red-700/50' :
                          recommendation.priority === 'high' ? 'bg-orange-900/50 text-orange-300 border-orange-700/50' :
                            recommendation.priority === 'medium' ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50' :
                              'bg-blue-900/50 text-blue-300 border-blue-700/50'
                          }`}>
                          {recommendation.priority === 'critical' ? '紧急' :
                            recommendation.priority === 'high' ? '高优先级' :
                              recommendation.priority === 'medium' ? '中优先级' : '低优先级'}
                        </span>
                      </div>
                      <div className="flex space-x-2 text-xs text-gray-300">
                        <span>难度: {recommendation.effort === 'high' ? '高' : recommendation.effort === 'medium' ? '中' : '低'}</span>
                        <span>影响: {recommendation.impact === 'high' ? '高' : recommendation.impact === 'medium' ? '中' : '低'}</span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-200 mb-2">
                      {recommendation.description}
                    </p>

                    <div className="text-sm text-gray-200">
                      <strong className="text-white">解决方案：</strong>{recommendation.solution}
                    </div>

                    {recommendation.code && (
                      <div className="mt-2 p-2 bg-gray-600/50 rounded text-xs font-mono text-gray-200">
                        {recommendation.code}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 统计信息 */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50">
        <div
          className="flex items-center justify-between p-6 cursor-pointer"
          onClick={() => toggleSection('statistics')}
        >
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Clock className="h-5 w-5 mr-2 text-gray-400" />
            测试统计
          </h3>
          {expandedSections.has('statistics') ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>

        {expandedSections.has('statistics') && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-700/50 rounded-xl border border-gray-600/50">
                <div className="text-2xl font-bold text-white">
                  {result.statistics.totalChecks}
                </div>
                <div className="text-sm text-gray-400">总检查项</div>
              </div>
              <div className="text-center p-4 bg-gray-700/50 rounded-xl border border-gray-600/50">
                <div className="text-2xl font-bold text-green-400">
                  {result.statistics.passedChecks}
                </div>
                <div className="text-sm text-gray-400">通过</div>
              </div>
              <div className="text-center p-4 bg-gray-700/50 rounded-xl border border-gray-600/50">
                <div className="text-2xl font-bold text-red-400">
                  {result.statistics.failedChecks}
                </div>
                <div className="text-sm text-gray-400">失败</div>
              </div>
              <div className="text-center p-4 bg-gray-700/50 rounded-xl border border-gray-600/50">
                <div className="text-2xl font-bold text-blue-400">
                  {Math.round(result.duration / 1000)}s
                </div>
                <div className="text-sm text-gray-400">耗时</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 原始数据 */}
      {result.rawData && (
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50">
          <div className="flex items-center justify-between p-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <FileText className="h-5 w-5 mr-2 text-gray-400" />
              原始数据
            </h3>
            <button
              type="button"
              onClick={() => setShowRawData(!showRawData)}
              className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {showRawData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{showRawData ? '隐藏' : '显示'}</span>
            </button>
          </div>

          {showRawData && (
            <div className="px-6 pb-6">
              <pre className="bg-gray-700/50 p-4 rounded-xl text-xs overflow-auto max-h-96 text-gray-200 border border-gray-600/50">
                {JSON.stringify(result.rawData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
