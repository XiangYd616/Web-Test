/**
 * Real-time Schema Validator
 * Provides schema validatio
// Type helper
const asAny = (x: any) => x;

n with business rule enforcement for API responses
 */

import React, { useState, useCallback, useMemo } from 'react';
import {CheckCircle, AlertTriangle, XCircle, Eye, EyeOff, Code} from 'lucide-react';

export interface SchemaRule {
  id: string;
  field: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  businessRule?: {
    type: 'range' | 'pattern' | 'enum' | 'custom';
    value: any;
    message: string;
  };
  format?: string; // e?.g., 'email', 'date', 'currency'
  description: string;
}

export interface ValidationResult {
  field: string;
  isValid: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  businessImpact?: 'high' | 'medium' | 'low';
}

interface SchemaValidatorProps {
  schema: SchemaRule[];
  responseData: any;
  onSchemaChange?: (schema: SchemaRule[]) => void;
  onValidationComplete?: (results: ValidationResult[]) => void;
  showBusinessRules?: boolean;
}

export const SchemaValidator: React.FC<SchemaValidatorProps> = ({
  schema,
  responseData,
  onSchemaChange,
  onValidationComplete,
  showBusinessRules = true
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['validation']));
  const [showRawData, setShowRawData] = useState(false);

  // Validate data against schema
  const validationResults = useMemo((): ValidationResult[] => {
    if (!responseData || schema.length === 0) return [];

    const results: ValidationResult[] = [];

    const validateValue = (rule: SchemaRule, value: unknown, path: string = rule.field): ValidationResult => {
      const fieldPath = path || rule.field;
      
      // Check if field exists when required
      if (rule.required && (value === undefined || value === null)) {
        return {
          field: fieldPath,
          isValid: false,
          message: `Required field "${fieldPath}" is missing`,
          severity: 'error',
          businessImpact: 'high'
        };
      }

      // Skip validation if field is optional and missing
      if (!rule.required && (value === undefined || value === null)) {
        return {
          field: fieldPath,
          isValid: true,
          message: `Optional field "${fieldPath}" is not present`,
          severity: 'info',
          businessImpact: 'low'
        };
      }

      // Type validation
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        return {
          field: fieldPath,
          isValid: false,
          message: `Expected ${rule.type} but got ${actualType}`,
          severity: 'error',
          businessImpact: 'high'
        };
      }

      // Format validation
      if (rule.format && rule.type === 'string') {
        const formatValid = validateFormat(value, rule.format);
        if (!formatValid) {
          return {
            field: fieldPath,
            isValid: false,
            message: `Invalid ${rule.format} format`,
            severity: 'error',
            businessImpact: 'medium'
          };
        }
      }

      // Business rule validation
      if (rule.businessRule) {
        const businessValid = validateBusinessRule(value, rule.businessRule);
        if (!businessValid.isValid) {
          return {
            field: fieldPath,
            isValid: false,
            message: businessValid.message,
            severity: 'warning',
            businessImpact: 'medium'
          };
        }
      }

      return {
        field: fieldPath,
        isValid: true,
        message: `Field "${fieldPath}" is valid`,
        severity: 'info',
        businessImpact: 'low'
      };
    };

    const getNestedValue = (obj: unknown, path: string) => {
      return path.split('.').reduce((current, key) => current?.[key], obj);
    };

    for (const rule of schema) {
      const value = getNestedValue(responseData, rule.field);
      results.push(validateValue(rule, value));
    }

    return results;
  }, [schema, responseData]);

  // Business rule validation logic
  const validateBusinessRule = (value: unknown, rule: SchemaRule['businessRule']): { isValid: boolean; message: string } => {
    if (!rule) return { isValid: true, message: '' };

    switch (rule.type) {
      case 'range':
        if (typeof value === 'number') {

          /**

           * if功能函数

           * @param {Object} params - 参数对象

           * @returns {Promise<Object>} 返回结果

           */
          const [min, max] = rule.value as [number, number];
          if (value < min || value > max) {
            return { isValid: false, message: rule.message || `Value must be between ${min} and ${max}` };
          }
        }
        break;
      case 'pattern':
        if (typeof value === 'string') {
          const regex = new RegExp(rule.value as string);
          if (!regex.test(value)) {
            return { isValid: false, message: rule.message || 'Value does not match required pattern' };
          }
        }
        break;
      case 'enum':
        if (!(rule.value as any[]).includes(value)) {
          return { isValid: false, message: rule.message || `Value must be one of: ${(rule.value as any[]).join(', ')}` };
        }
        break;
      case 'custom':
        // Custom validation logic would go here
        break;
    }

    return { isValid: true, message: '' };
  };

  // Format validation logic
  const validateFormat = (value: string, format: string): boolean => {
    switch (format) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'date':
        return !isNaN(Date.parse(value));
      case 'currency':
        return /^\$?\d+(\.\d{2})?$/.test(value);
      case 'phone':
        return /^\+?[\d\s-()]+$/.test(value);
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      default:
        return true;
    }
  };

  // Update validation results
  React.useEffect(() => {
    onValidationComplete?.(validationResults);
  }, [validationResults, onValidationComplete]);

  const getValidationIcon = (result: ValidationResult) => {
    if (result.isValid && result.severity === 'info') return <CheckCircle size={16} className="text-green-400" />;
    if (result.severity === 'warning') return <AlertTriangle size={16} className="text-yellow-400" />;
    return <XCircle size={16} className="text-red-400" />;
  };


    /**

     * switch功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
  const getBusinessImpactColor = (impact?: string) => {
    switch (impact) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const validResults = validationResults.filter(r => r.isValid && r.severity === 'info');
  const warningResults = validationResults.filter(r => r.severity === 'warning');
  const errorResults = validationResults.filter(r => r.severity === 'error');

  return (
    <div className="space-y-4">
      {/* Validation Summary */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Schema 验证结果</h3>
          <button
            onClick={() => setShowRawData(!showRawData)}
            className="flex items-center space-x-1 text-gray-400 hover:text-white text-sm"
          >
            {showRawData ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{showRawData ? '隐藏' : '显示'}原始数据</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-700 rounded">
            <div className="text-2xl font-bold text-white">{schema.length}</div>
            <div className="text-sm text-gray-400">总字段数</div>
          </div>
          <div className="text-center p-3 bg-gray-700 rounded">
            <div className="text-2xl font-bold text-green-400">{validResults.length}</div>
            <div className="text-sm text-gray-400">验证通过</div>
          </div>
          <div className="text-center p-3 bg-gray-700 rounded">
            <div className="text-2xl font-bold text-yellow-400">{warningResults.length}</div>
            <div className="text-sm text-gray-400">警告</div>
          </div>
          <div className="text-center p-3 bg-gray-700 rounded">
            <div className="text-2xl font-bold text-red-400">{errorResults.length}</div>
            <div className="text-sm text-gray-400">错误</div>
          </div>
        </div>

        {showRawData && (
          <div className="bg-gray-900 rounded p-3 mt-4">
            <div className="flex items-center space-x-2 mb-2">
              <Code size={16} className="text-gray-400" />
              <span className="text-sm text-gray-400">响应数据</span>
            </div>
            <pre className="text-xs text-gray-300 overflow-auto max-h-40">
              {JSON.stringify(responseData, null, String(2))}
            </pre>
          </div>
        )}
      </div>

      {/* Validation Details */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <button
          onClick={() => toggleSection('validation')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700 rounded-t-lg"
        >
          <span className="text-white font-medium">字段验证详情</span>
          <span className="text-gray-400">
            {expandedSections.has('validation') ? '收起' : '展开'}
          </span>
        </button>
        
        {expandedSections.has('validation') && (
          <div className="p-4 border-t border-gray-700">
            <div className="space-y-3">
              {validationResults.map((result, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700 rounded">
                  <div className="flex-shrink-0 mt-1">
                    {getValidationIcon(result)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-white font-medium">{result.field}</span>
                      {result.businessImpact && (
                        <span className={`text-xs px-2 py-1 rounded ${getBusinessImpactColor(result.businessImpact)}`}>
                          {result.businessImpact} impact
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Business Rules */}
      {showBusinessRules && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <button
            onClick={() => toggleSection('businessRules')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700 rounded-t-lg"
          >
            <span className="text-white font-medium">业务规则配置</span>
            <span className="text-gray-400">
              {expandedSections.has('businessRules') ? '收起' : '展开'}
            </span>
          </button>
          
          {expandedSections.has('businessRules') && (
            <div className="p-4 border-t border-gray-700">
              <div className="space-y-3">
                {schema.filter(rule => rule.businessRule).map((rule, index) => (
                  <div key={index} className="p-3 bg-gray-700 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{rule.field}</span>
                      <span className="text-xs text-gray-400 bg-gray-600 px-2 py-1 rounded">
                        {rule.businessRule?.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{rule.description}</p>
                    {rule.businessRule && (
                      <div className="text-xs text-blue-300">
                        规则: {rule.businessRule.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Business Impact Summary */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="text-md font-medium text-white mb-3">业务影响评估</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-red-400">
              {validationResults.filter(r => r.businessImpact === 'high' && !r.isValid).length}
            </div>
            <div className="text-sm text-gray-400">高影响问题</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-400">
              {validationResults.filter(r => r.businessImpact === 'medium' && !r.isValid).length}
            </div>
            <div className="text-sm text-gray-400">中等影响问题</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-400">
              {Math.round((validResults.length / Math.max(validationResults.length, 1)) * 100)}%
            </div>
            <div className="text-sm text-gray-400">数据质量得分</div>
          </div>
        </div>
      </div>
    </div>
  );
};
