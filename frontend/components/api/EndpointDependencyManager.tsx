/**
 * Endpoint Dependency Manager
 * Manages API endpoint dependencies and execution order for business workflows
 */

import React, { useState, useCallback, useMemo } from 'react';
import {ArrowRight, Trash2, AlertTriangle, Settings} from 'lucide-react';

export interface EndpointDependency {
  id: string;
  name: string;
  method: string;
  path: string;
  dependencies: string[]; // IDs of endpoints this depends on
  businessPriority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  dataMapping?: {
    from: string; // source endpoint ID
    sourceField: string;
    targetField: string;
  }[];
}

interface EndpointDependencyManagerProps {
  endpoints: EndpointDependency[];
  onEndpointsChange: (endpoints: EndpointDependency[]) => void;
  onExecutionOrderChange: (order: string[]) => void;
}

export const EndpointDependencyManager: React.FC<EndpointDependencyManagerProps> = ({
  endpoints,
  onEndpointsChange,
  onExecutionOrderChange
}) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [showDependencyGraph, setShowDependencyGraph] = useState(false);

  // Calculate execution order using topological sort
  const executionOrder = useMemo(() => {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (endpointId: string): boolean => {
      if (visiting.has(endpointId)) {
        // Circular dependency detected
        return false;
      }
      if (visited.has(endpointId)) {
        return true;
      }

      visiting.add(endpointId);
      
      const endpoint = endpoints.find(e => e.id === endpointId);
      if (endpoint) {
        for (const depId of endpoint.dependencies) {
          if (!visit(depId)) {
            return false; // Circular dependency
          }
        }
      }

      visiting.delete(endpointId);
      visited.add(endpointId);
      order.push(endpointId);

      return true;
    };

    // Sort by business priority first
    const sortedEndpoints = [...endpoints].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.businessPriority] - priorityOrder[b.businessPriority];
    });

    for (const endpoint of sortedEndpoints) {
      if (!visited.has(endpoint.id)) {
        visit(endpoint.id);
      }
    }

    return order;
  }, [endpoints]);

  // Update execution order when it changes
  React.useEffect(() => {
    onExecutionOrderChange(executionOrder);
  }, [executionOrder, onExecutionOrderChange]);

  const addDependency = useCallback((endpointId: string, dependencyId: string) => {
    const updatedEndpoints = endpoints.map(endpoint => {
      if (endpoint.id === endpointId && !endpoint.dependencies.includes(dependencyId)) {
        return {
          ...endpoint,
          dependencies: [...endpoint.dependencies, dependencyId]
        };
      }
      return endpoint;
    });
    onEndpointsChange(updatedEndpoints);
  }, [endpoints, onEndpointsChange]);

  const removeDependency = useCallback((endpointId: string, dependencyId: string) => {

      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
    const updatedEndpoints = endpoints.map(endpoint => {
      if (endpoint.id === endpointId) {
        return {
          ...endpoint,
          dependencies: endpoint.dependencies.filter(id => id !== dependencyId)
        };
      }
      return endpoint;
    });
    onEndpointsChange(updatedEndpoints);
  }, [endpoints, onEndpointsChange]);

  const _addDataMapping = useCallback((endpointId: string, mapping: EndpointDependency['dataMapping'][0]) => {

      /**

       * if功能函数

       * @param {Object} params - 参数对象

       * @returns {Promise<Object>} 返回结果

       */
    const updatedEndpoints = endpoints.map(endpoint => {
      if (endpoint.id === endpointId) {
        return {
          ...endpoint,
          dataMapping: [...(endpoint.dataMapping || []), mapping]
        };
      }
      return endpoint;
    });
    onEndpointsChange(updatedEndpoints);
  }, [endpoints, onEndpointsChange]);


    /**

     * switch功能函数

     * @param {Object} params - 参数对象

     * @returns {Promise<Object>} 返回结果

     */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500 bg-red-100';
      case 'high': return 'text-orange-500 bg-orange-100';
      case 'medium': return 'text-yellow-500 bg-yellow-100';
      case 'low': return 'text-gray-500 bg-gray-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const hasCircularDependency = useMemo(() => {
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const checkCircular = (endpointId: string): boolean => {
      if (visiting.has(endpointId)) return true;
      if (visited.has(endpointId)) return false;

      visiting.add(endpointId);
      const endpoint = endpoints.find(e => e.id === endpointId);
      
      if (endpoint) {
        for (const depId of endpoint.dependencies) {
          if (checkCircular(depId)) return true;
        }
      }

      visiting.delete(endpointId);
      visited.add(endpointId);
      return false;
    };

    return endpoints.some(endpoint => checkCircular(endpoint.id));
  }, [endpoints]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">API 业务依赖管理</h3>
        <div className="flex items-center space-x-2">
          {hasCircularDependency && (
            <div className="flex items-center space-x-1 text-red-400 text-sm">
              <AlertTriangle size={16} />
              <span>检测到循环依赖</span>
            </div>
          )}
          <button
            onClick={() => setShowDependencyGraph(!showDependencyGraph)}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            <Settings size={14} />
            <span>{showDependencyGraph ? '隐藏' : '显示'}依赖图</span>
          </button>
        </div>
      </div>

      {/* Dependency Graph */}
      {showDependencyGraph && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h4 className="text-md font-medium text-white mb-3">执行顺序图</h4>
          <div className="flex flex-wrap items-center gap-2">
            {executionOrder.map((endpointId, index) => {
              const endpoint = endpoints.find(e => e.id === endpointId);
              if (!endpoint) return null;
              
              return (
                <React.Fragment key={endpointId}>
                  <div className="flex items-center space-x-2 bg-gray-700 px-3 py-2 rounded">
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(endpoint.businessPriority).replace('text-', 'bg-').replace('bg-', 'bg-')}`}></div>
                    <span className="text-white text-sm">{endpoint.name}</span>
                    <span className="text-gray-400 text-xs">{endpoint.method}</span>
                  </div>
                  {index < executionOrder.length - 1 && (
                    <ArrowRight size={16} className="text-gray-400" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Endpoints List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {endpoints.map(endpoint => (
          <div key={endpoint.id} className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-white font-medium">{endpoint.name}</span>
                <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(endpoint.businessPriority)}`}>
                  {endpoint.businessPriority}
                </span>
              </div>
              <span className="text-gray-400 text-sm">
                {endpoint.method} {endpoint.path}
              </span>
            </div>

            {/* Dependencies */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">依赖关系</span>
                <select
                  onChange={(e) => {
                    if (e.target.value && e.target.value !== endpoint.id) {
                      addDependency(endpoint.id, e.target.value);
                    }
                  }}
                  value=""
                  className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600"
                >
                  <option value="">添加依赖</option>
                  {endpoints
                    .filter(e => e.id !== endpoint.id && !endpoint.dependencies.includes(e.id))
                    .map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-1">
                {endpoint.dependencies.map(depId => {
                  const depEndpoint = endpoints.find(e => e.id === depId);
                  return depEndpoint ? (
                    <div key={depId} className="flex items-center space-x-1 bg-blue-600 px-2 py-1 rounded text-xs text-white">
                      <span>{depEndpoint.name}</span>
                      <button
                        onClick={() => removeDependency(endpoint.id, depId)}
                        className="hover:bg-blue-700 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            {/* Data Mappings */}
            {endpoint.dataMapping && endpoint.dataMapping.length > 0 && (
              <div className="mb-3">
                <span className="text-sm text-gray-300 block mb-2">数据映射</span>
                <div className="space-y-1">
                  {endpoint.dataMapping.map((mapping, index) => {
                    const sourceEndpoint = endpoints.find(e => e.id === mapping.from);
                    return (
                      <div key={index} className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                        {sourceEndpoint?.name}.{mapping.sourceField} → {mapping.targetField}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tags */}
            {endpoint.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {endpoint.tags.map(tag => (
                  <span key={tag} className="bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Business Workflow Validation */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="text-md font-medium text-white mb-3">业务流程验证</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {endpoints.filter(e => e.businessPriority === 'critical').length}
            </div>
            <div className="text-sm text-gray-400">关键业务端点</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {executionOrder.length}
            </div>
            <div className="text-sm text-gray-400">执行步骤</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {endpoints.reduce((sum, e) => sum + (e.dataMapping?.length || 0), 0)}
            </div>
            <div className="text-sm text-gray-400">数据映射</div>
          </div>
        </div>
      </div>
    </div>
  );
};
