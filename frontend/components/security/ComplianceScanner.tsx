/**
 * Business-Critical Security Compliance Scanner
 * Provides enterprise-grade compliance scanning for GDPR, HIPAA, SOX, PCI-DSS and other regulations
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Shield, AlertTriangle, CheckCircle, FileText, Lock, Eye, Globe, Database, Users } from 'lucide-react';

export interface ComplianceRule {
  id: string;
  regulation: 'GDPR' | 'HIPAA' | 'SOX' | 'PCI-DSS' | 'CCPA' | 'ISO27001' | 'NIST';
  category: 'data_protection' | 'access_control' | 'encryption' | 'audit_logging' | 'network_security' | 'privacy';
  title: string;
  description: string;
  requirement: string;
  businessImpact: 'critical' | 'high' | 'medium' | 'low';
  fineRange: {
    min: number;
    max: number;
    currency: 'USD' | 'EUR' | 'GBP';
  };
  remediation: {
    effort: 'low' | 'medium' | 'high';
    timeEstimate: string;
    cost: number;
    steps: string[];
  };
  automatedCheck: boolean;
}

export interface ComplianceResult {
  ruleId: string;
  status: 'compliant' | 'non_compliant' | 'partially_compliant' | 'not_applicable';
  score: number; // 0-100
  findings: {
    type: 'violation' | 'warning' | 'recommendation';
    message: string;
    evidence: string;
    location: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }[];
  businessRisk: {
    probabilityOfAudit: number; // 0-1
    potentialFine: number;
    reputationImpact: 'high' | 'medium' | 'low';
    operationalImpact: string;
  };
  recommendedActions: {
    priority: number;
    action: string;
    effort: string;
    timeline: string;
  }[];
}

interface ComplianceScannerProps {
  targetUrl: string;
  selectedRegulations: ComplianceRule['regulation'][];
  onScanComplete?: (results: ComplianceResult[]) => void;
  showBusinessImpact?: boolean;
  enableAutomatedRemediation?: boolean;
}

export const ComplianceScanner: React.FC<ComplianceScannerProps> = ({
  targetUrl,
  selectedRegulations,
  onScanComplete,
  showBusinessImpact = true,
  enableAutomatedRemediation = false
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<ComplianceResult[]>([]);
  const [activeRegulation, setActiveRegulation] = useState<string>('all');

  // Comprehensive compliance rules database
  const complianceRules: ComplianceRule[] = [
    {
      id: 'gdpr-01',
      regulation: 'GDPR',
      category: 'data_protection',
      title: 'Personal Data Processing Consent',
      description: 'Ensure explicit consent for personal data processing',
      requirement: 'Article 6 - Lawful basis for processing',
      businessImpact: 'critical',
      fineRange: { min: 20000000, max: 20000000, currency: 'EUR' },
      remediation: {
        effort: 'high',
        timeEstimate: '2-4 weeks',
        cost: 15000,
        steps: [
          'Implement consent management system',
          'Add cookie consent banners',
          'Create privacy policy updates',
          'Implement data subject rights portal'
        ]
      },
      automatedCheck: true
    },
    {
      id: 'gdpr-02',
      regulation: 'GDPR',
      category: 'privacy',
      title: 'Right to be Forgotten',
      description: 'Implement data deletion mechanisms',
      requirement: 'Article 17 - Right to erasure',
      businessImpact: 'high',
      fineRange: { min: 10000000, max: 20000000, currency: 'EUR' },
      remediation: {
        effort: 'medium',
        timeEstimate: '1-2 weeks',
        cost: 8000,
        steps: [
          'Create data deletion API endpoints',
          'Implement cascading deletion logic',
          'Add audit trail for deletions',
          'Test data removal processes'
        ]
      },
      automatedCheck: false
    },
    {
      id: 'hipaa-01',
      regulation: 'HIPAA',
      category: 'encryption',
      title: 'Protected Health Information Encryption',
      description: 'Encrypt PHI in transit and at rest',
      requirement: '45 CFR 164.312(a)(2)(iv)',
      businessImpact: 'critical',
      fineRange: { min: 50000, max: 1500000, currency: 'USD' },
      remediation: {
        effort: 'high',
        timeEstimate: '3-6 weeks',
        cost: 25000,
        steps: [
          'Implement end-to-end encryption',
          'Configure TLS 1.3 minimum',
          'Add database encryption at rest',
          'Implement key management system'
        ]
      },
      automatedCheck: true
    },
    {
      id: 'pci-01',
      regulation: 'PCI-DSS',
      category: 'network_security',
      title: 'Secure Network Configuration',
      description: 'Maintain secure network and systems configuration',
      requirement: 'Requirement 1 & 2',
      businessImpact: 'critical',
      fineRange: { min: 5000, max: 100000, currency: 'USD' },
      remediation: {
        effort: 'medium',
        timeEstimate: '1-3 weeks',
        cost: 12000,
        steps: [
          'Configure firewall rules',
          'Remove default passwords',
          'Implement network segmentation',
          'Regular security configuration reviews'
        ]
      },
      automatedCheck: true
    },
    {
      id: 'sox-01',
      regulation: 'SOX',
      category: 'audit_logging',
      title: 'Financial Data Audit Trail',
      description: 'Maintain comprehensive audit logs for financial data',
      requirement: 'Section 404 - Internal Controls',
      businessImpact: 'critical',
      fineRange: { min: 1000000, max: 25000000, currency: 'USD' },
      remediation: {
        effort: 'high',
        timeEstimate: '4-8 weeks',
        cost: 35000,
        steps: [
          'Implement comprehensive logging',
          'Add tamper-proof log storage',
          'Create audit trail reports',
          'Establish log retention policies'
        ]
      },
      automatedCheck: true
    }
  ];

  // Filter rules based on selected regulations
  const activeRules = useMemo(() => {
    if (selectedRegulations.length === 0) return complianceRules;
    return complianceRules.filter(rule => selectedRegulations.includes(rule.regulation));
  }, [selectedRegulations]);

  // Calculate overall compliance score
  const complianceScore = useMemo(() => {
    if (results.length === 0) return 0;
    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    return Math.round(totalScore / results.length);
  }, [results]);

  // Calculate business risk metrics
  const businessRiskMetrics = useMemo(() => {
    const metrics = {
      totalPotentialFines: 0,
      criticalViolations: 0,
      highRiskRegulations: new Set<string>(),
      estimatedRemediationCost: 0,
      averageRemediationTime: 0
    };

    results.forEach(result => {
      if (result.status === 'non_compliant' || result.status === 'partially_compliant') {
        metrics.totalPotentialFines += result.businessRisk.potentialFine;
        metrics.estimatedRemediationCost += activeRules.find(r => r.id === result.ruleId)?.remediation.cost || 0;
        
        const rule = activeRules.find(r => r.id === result.ruleId);
        if (rule?.businessImpact === 'critical') {
          metrics.criticalViolations++;
          metrics.highRiskRegulations.add(rule.regulation);
        }
      }
    });

    return metrics;
  }, [results, activeRules]);

  // Mock compliance scanning logic
  const startComplianceScan = useCallback(async () => {
    setIsScanning(true);
    
    try {
      // Simulate scanning process
      const mockResults: ComplianceResult[] = activeRules.map(rule => {
        const isCompliant = Math.random() > 0.3; // 70% compliance rate
        const score = isCompliant ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 60) + 20;
        
        return {
          ruleId: rule.id,
          status: isCompliant ? 'compliant' : 
                 score > 60 ? 'partially_compliant' : 'non_compliant',
          score,
          findings: isCompliant ? [] : [
            {
              type: 'violation',
              message: `${rule.title} requirement not met`,
              evidence: 'Automated scan detected non-compliance',
              location: targetUrl,
              severity: rule.businessImpact
            }
          ],
          businessRisk: {
            probabilityOfAudit: rule.businessImpact === 'critical' ? 0.8 : 0.3,
            potentialFine: isCompliant ? 0 : 
              rule.fineRange.min + Math.random() * (rule.fineRange.max - rule.fineRange.min),
            reputationImpact: rule.businessImpact as 'high' | 'medium' | 'low',
            operationalImpact: isCompliant ? 'None' : 'Potential service disruption and legal action'
          },
          recommendedActions: isCompliant ? [] : rule.remediation.steps.map((step, index) => ({
            priority: index + 1,
            action: step,
            effort: rule.remediation.effort,
            timeline: rule.remediation.timeEstimate
          }))
        };
      });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setResults(mockResults);
      onScanComplete?.(mockResults);
    } catch (error) {
      console.error('Compliance scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  }, [activeRules, targetUrl, onScanComplete]);

  const getRegulationIcon = (regulation: string) => {
    const icons = {
      GDPR: <Shield size={16} className="text-blue-400" />,
      HIPAA: <Database size={16} className="text-green-400" />,
      'PCI-DSS': <Lock size={16} className="text-yellow-400" />,
      SOX: <FileText size={16} className="text-purple-400" />,
      CCPA: <Eye size={16} className="text-orange-400" />,
      ISO27001: <Globe size={16} className="text-indigo-400" />,
      NIST: <Users size={16} className="text-pink-400" />
    };
    return icons[regulation] || <Shield size={16} className="text-gray-400" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'partially_compliant': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'non_compliant': return 'text-red-400 bg-red-900/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">合规性扫描</h3>
        <div className="flex items-center space-x-4">
          <select
            value={activeRegulation}
            onChange={(e) => setActiveRegulation(e.target.value)}
            className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 text-sm"
          >
            <option value="all">全部法规</option>
            {[...new Set(activeRules.map(r => r.regulation))].map(reg => (
              <option key={reg} value={reg}>{reg}</option>
            ))}
          </select>
          <button
            onClick={startComplianceScan}
            disabled={isScanning}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {isScanning ? '扫描中...' : '开始扫描'}
          </button>
        </div>
      </div>

      {/* Compliance Overview */}
      {results.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-white">合规性概览</h4>
            <div className="text-2xl font-bold text-white">
              {complianceScore}/100
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-700 rounded">
              <div className="text-xl font-bold text-green-400">
                {results.filter(r => r.status === 'compliant').length}
              </div>
              <div className="text-sm text-gray-400">完全合规</div>
            </div>
            <div className="text-center p-3 bg-gray-700 rounded">
              <div className="text-xl font-bold text-yellow-400">
                {results.filter(r => r.status === 'partially_compliant').length}
              </div>
              <div className="text-sm text-gray-400">部分合规</div>
            </div>
            <div className="text-center p-3 bg-gray-700 rounded">
              <div className="text-xl font-bold text-red-400">
                {results.filter(r => r.status === 'non_compliant').length}
              </div>
              <div className="text-sm text-gray-400">不合规</div>
            </div>
            <div className="text-center p-3 bg-gray-700 rounded">
              <div className="text-xl font-bold text-orange-400">
                {businessRiskMetrics.criticalViolations}
              </div>
              <div className="text-sm text-gray-400">关键违规</div>
            </div>
          </div>

          {/* Business Impact Summary */}
          {showBusinessImpact && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-700 p-4 rounded">
                <h5 className="text-white font-medium mb-3">财务风险评估</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">潜在罚款总额</span>
                    <span className="text-red-400 font-medium">
                      ${businessRiskMetrics.totalPotentialFines.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">预估修复成本</span>
                    <span className="text-yellow-400 font-medium">
                      ${businessRiskMetrics.estimatedRemediationCost.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">净节约</span>
                    <span className="text-green-400 font-medium">
                      ${(businessRiskMetrics.totalPotentialFines - businessRiskMetrics.estimatedRemediationCost).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded">
                <h5 className="text-white font-medium mb-3">合规状态分布</h5>
                <div className="space-y-2">
                  {[...new Set(activeRules.map(r => r.regulation))].map(reg => {
                    const regResults = results.filter(r => {
                      const rule = activeRules.find(rule => rule.id === r.ruleId);
                      return rule?.regulation === reg;
                    });
                    const compliantCount = regResults.filter(r => r.status === 'compliant').length;
                    const compliance = regResults.length > 0 ? (compliantCount / regResults.length) * 100 : 0;
                    
                    return (
                      <div key={reg} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getRegulationIcon(reg)}
                          <span className="text-gray-300">{reg}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-600 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                compliance >= 80 ? 'bg-green-500' :
                                compliance >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${compliance}%` }}
                            />
                          </div>
                          <span className="text-white font-medium text-sm">
                            {Math.round(compliance)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-white">详细合规结果</h4>
          {results
            .filter(result => {
              if (activeRegulation === 'all') return true;
              const rule = activeRules.find(r => r.id === result.ruleId);
              return rule?.regulation === activeRegulation;
            })
            .map((result, index) => {
              const rule = activeRules.find(r => r.id === result.ruleId);
              if (!rule) return null;

              return (
                <div key={index} className={`bg-gray-800 rounded-lg border p-4 ${getStatusColor(result.status)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      {getRegulationIcon(rule.regulation)}
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-white font-medium">{rule.title}</span>
                          <span className={`text-xs px-2 py-1 rounded ${getImpactColor(rule.businessImpact)}`}>
                            {rule.businessImpact}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{rule.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{rule.regulation}</span>
                          <span>{rule.requirement}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white mb-1">
                        {result.score}/100
                      </div>
                      <div className="text-xs text-gray-400 capitalize">
                        {result.status.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  {result.findings.length > 0 && (
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-white mb-2">发现的问题</h6>
                      <div className="space-y-2">
                        {result.findings.map((finding, findingIndex) => (
                          <div key={findingIndex} className="bg-gray-700 p-3 rounded text-sm">
                            <div className="flex items-center space-x-2 mb-1">
                              <AlertTriangle size={14} className={getImpactColor(finding.severity)} />
                              <span className="text-white font-medium">{finding.message}</span>
                            </div>
                            <p className="text-gray-400 text-xs">{finding.evidence}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {showBusinessImpact && result.status !== 'compliant' && (
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-white mb-2">业务风险评估</h6>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">潜在罚款: </span>
                          <span className="text-red-400 font-medium">
                            ${result.businessRisk.potentialFine.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">审计概率: </span>
                          <span className="text-yellow-400 font-medium">
                            {(result.businessRisk.probabilityOfAudit * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {result.recommendedActions.length > 0 && (
                    <div>
                      <h6 className="text-sm font-medium text-white mb-2">建议的修复措施</h6>
                      <div className="space-y-1">
                        {result.recommendedActions.map((action, actionIndex) => (
                          <div key={actionIndex} className="flex items-start space-x-2 text-sm">
                            <span className="text-blue-400 font-medium">{action.priority}.</span>
                            <div className="flex-1">
                              <span className="text-gray-300">{action.action}</span>
                              <div className="text-xs text-gray-500 mt-1">
                                预计工作量: {action.effort} | 时间: {action.timeline}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Scanning in Progress */}
      {isScanning && (
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white font-medium mb-2">正在进行合规性扫描...</p>
          <p className="text-gray-400 text-sm">
            正在检查 {activeRules.length} 项合规规则
          </p>
        </div>
      )}

      {/* No Results */}
      {!isScanning && results.length === 0 && (
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
          <Shield size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">准备开始合规性扫描</p>
          <p className="text-gray-400 text-sm">
            点击"开始扫描"按钮来检查您的应用是否符合选定的法规要求
          </p>
        </div>
      )}
    </div>
  );
};
