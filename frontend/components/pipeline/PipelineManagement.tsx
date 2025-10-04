/**
 * Pipeline Management Dashboard
 * Visual interface for creating and managing test pipelines
 */

import React, { useState, useEffect, useCallback } from 'react';
import {Play, Settings, Plus, Trash2, Clock, AlertTriangle, CheckCircle, GitBranch, Bell, Shield, Activity} from 'lucide-react';
import TestOrchestrator, { TestPipeline, TestJob } from '../../services/orchestration/testOrchestrator';

interface PipelineManagementProps {
  onPipelineSelect?: (pipeline: TestPipeline) => void;
  selectedPipelineId?: string;
}

export const PipelineManagement: React.FC<PipelineManagementProps> = ({
  onPipelineSelect,
  selectedPipelineId
}) => {
  const [pipelines, setPipelines] = useState<TestPipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<TestPipeline | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [executionMetrics, setExecutionMetrics] = useState<any>(null);
  const [isCreatingPipeline, setIsCreatingPipeline] = useState(false);

  // Load pipelines on mount
  useEffect(() => {
    loadPipelines();
    loadExecutionMetrics();

    // Refresh metrics every 5 seconds
    const interval = setInterval(loadExecutionMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadPipelines = useCallback(() => {
    const allPipelines = TestOrchestrator.getAllPipelines();
    setPipelines(allPipelines);

    if (selectedPipelineId) {
      const selected = allPipelines.find(p => p.id === selectedPipelineId);
      if (selected) {
        setSelectedPipeline(selected);
      }
    }
  }, [selectedPipelineId]);

  const loadExecutionMetrics = useCallback(() => {
    const metrics = TestOrchestrator.getExecutionMetrics();
    setExecutionMetrics(metrics);
  }, []);

  const handleCreatePipeline = useCallback(async (template: string) => {
    setIsCreatingPipeline(true);
    try {
      const newPipeline = TestOrchestrator.createPipelineFromTemplate(template as any);
      TestOrchestrator.createPipeline(newPipeline);
      loadPipelines();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create pipeline:', error);
    } finally {
      setIsCreatingPipeline(false);
    }
  }, [loadPipelines]);

  const handleExecutePipeline = useCallback(async (pipelineId: string) => {
    try {
      await TestOrchestrator.executePipeline(pipelineId, {
        environment: 'development'
      });
      loadExecutionMetrics();
    } catch (error) {
      console.error('Failed to execute pipeline:', error);
    }
  }, [loadExecutionMetrics]);

  const handleDeletePipeline = useCallback((pipelineId: string) => {
    if (window.confirm('Are you sure you want to delete this pipeline?')) {
      TestOrchestrator.deletePipeline(pipelineId);
      loadPipelines();
      if (selectedPipeline.id === pipelineId) {
        setSelectedPipeline(null);
      }
    }
  }, [selectedPipeline, loadPipelines]);

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'running':
        return <Activity size={16} className="text-blue-400 animate-spin" />;
      case 'failed':
        return <AlertTriangle size={16} className="text-red-400" />;
      case 'pending':
        return <Clock size={16} className="text-yellow-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };


    /**

     * switch鍔熻兘鍑芥暟

     * @param {Object} params - 鍙傛暟瀵硅薄

     * @returns {Promise<Object>} 杩斿洖缁撴灉

     */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500 bg-red-900/20';
      case 'high': return 'text-orange-500 bg-orange-900/20';
      case 'medium': return 'text-yellow-500 bg-yellow-900/20';
      case 'low': return 'text-green-500 bg-green-900/20';
      default: return 'text-gray-500 bg-gray-900/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">娴嬭瘯娴佹按绾跨鐞?/h2>
        <div className="flex items-center space-x-4">
          {executionMetrics && (
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Activity size={14} className="text-blue-400" />
                <span className="text-gray-400">杩愯涓? </span>
                <span className="text-white">{executionMetrics.runningJobs}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock size={14} className="text-yellow-400" />
                <span className="text-gray-400">鎺掗槦涓? </span>
                <span className="text-white">{executionMetrics.queuedJobs}</span>
              </div>
            </div>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus size={16} />
            <span>鍒涘缓娴佹按绾?/span>
          </button>
        </div>
      </div>

      {/* Pipeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline List */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">娴佹按绾垮垪琛?/h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {pipelines.map(pipeline => (
                <div
                  key={pipeline?.id}
                  className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700 ${
                    selectedPipeline.id === pipeline?.id ? 'bg-gray-700' : ''
                  }`}
                  onClick={() => {
                    setSelectedPipeline(pipeline);
                    onPipelineSelect?.(pipeline);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{pipeline?.name}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e?.stopPropagation();
                          handleExecutePipeline(pipeline?.id);
                        }}
                        className="p-1 hover:bg-gray-600 rounded"
                        title="鎵ц娴佹按绾?
                      >
                        <Play size={14} className="text-green-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e?.stopPropagation();
                          handleDeletePipeline(pipeline?.id);
                        }}
                        className="p-1 hover:bg-gray-600 rounded"
                        title="鍒犻櫎娴佹按绾?
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{pipeline?.description}</p>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-gray-500">{pipeline?.jobs.length} 涓换鍔?/span>
                    {pipeline?.schedule && (
                      <div className="flex items-center space-x-1">
                        <Clock size={12} className="text-blue-400" />
                        <span className="text-blue-400">瀹氭椂鎵ц</span>
                      </div>
                    )}
                    {pipeline?.notifications.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <Bell size={12} className="text-purple-400" />
                        <span className="text-purple-400">閫氱煡</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pipeline Details */}
        <div className="lg:col-span-2">
          {selectedPipeline ? (
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">{selectedPipeline?.name}</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleExecutePipeline(selectedPipeline?.id)}
                      className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <Play size={14} />
                      <span>鎵ц</span>
                    </button>
                    <button className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700">
                      <Settings size={14} />
                      <span>閰嶇疆</span>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-1">{selectedPipeline?.description}</p>
              </div>

              {/* Jobs */}
              <div className="p-4">
                <h4 className="text-md font-medium text-white mb-3">浠诲姟娴佺▼</h4>
                <div className="space-y-3">
                  {selectedPipeline?.jobs.map((job, index) => (
                    <div key={job.id} className="flex items-center space-x-4">
                      {/* Job Status */}
                      <div className="flex-shrink-0">
                        {getJobStatusIcon(job.status)}
                      </div>

                      {/* Job Details */}
                      <div className="flex-1 bg-gray-700 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{job.id}</span>
                            <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(job.priority)}`}>
                              {job.priority}
                            </span>
                          </div>
                          <span className="text-sm text-gray-400">{job.type}</span>
                        </div>

                        {/* Dependencies */}
                        {job.dependencies.length > 0 && (
                          <div className="flex items-center space-x-2 text-sm">
                            <GitBranch size={14} className="text-blue-400" />
                            <span className="text-gray-400">渚濊禆浜? </span>
                            <span className="text-blue-400">{job.dependencies.join(', ')}</span>
                          </div>
                        )}

                        {/* Timing */}
                        {job.startTime && (
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                            <span>寮€濮? {job.startTime.toLocaleTimeString()}</span>
                            {job.endTime && (
                              <span>
                                鑰楁椂: {Math.round((job.endTime.getTime() - job.startTime.getTime()) / 1000)}s
                              </span>
                            )}
                            {job.retryCount > 0 && (
                              <span className="text-yellow-400">閲嶈瘯: {job.retryCount}娆?/span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Connection to next job */}
                      {index < selectedPipeline?.jobs.length - 1 && (
                        <div className="flex-shrink-0 w-8 h-0.5 bg-gray-600"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quality Gates */}
              {selectedPipeline?.qualityGates.length > 0 && (
                <div className="p-4 border-t border-gray-700">
                  <h4 className="text-md font-medium text-white mb-3">璐ㄩ噺闂ㄧ</h4>
                  <div className="space-y-2">
                    {selectedPipeline?.qualityGates.map((gate, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <div className="flex items-center space-x-2">
                          <Shield size={14} className="text-blue-400" />
                          <span className="text-white text-sm">{gate.metric}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-gray-400">{gate.operator} {gate.value}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            gate.action === 'block' ? 'bg-red-600 text-white' :
                            gate.action === 'fail' ? 'bg-orange-600 text-white' :
                            'bg-yellow-600 text-black'
                          }`}>
                            {gate.action}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notifications */}
              {selectedPipeline?.notifications.length > 0 && (
                <div className="p-4 border-t border-gray-700">
                  <h4 className="text-md font-medium text-white mb-3">閫氱煡閰嶇疆</h4>
                  <div className="space-y-2">
                    {selectedPipeline?.notifications.map((notification, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <div className="flex items-center space-x-2">
                          <Bell size={14} className="text-purple-400" />
                          <span className="text-white text-sm">{notification.type}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {notification.events.map(event => (
                            <span key={event} className="px-2 py-1 bg-purple-600 text-white text-xs rounded">
                              {event}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
              <GitBranch size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">閫夋嫨涓€涓祦姘寸嚎</p>
              <p className="text-gray-400 text-sm">
                浠庡乏渚у垪琛ㄤ腑閫夋嫨涓€涓祦姘寸嚎鏉ユ煡鐪嬭缁嗕俊鎭拰绠＄悊閰嶇疆
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Pipeline Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-medium text-white mb-4">鍒涘缓鏂版祦姘寸嚎</h3>
            <div className="space-y-3">
              {[
                { id: 'cicd', name: 'CI/CD 娴佹按绾?, description: '鏍囧噯鐨勬寔缁泦鎴愭祴璇曟祦绋? },
                { id: 'monitoring', name: '鐩戞帶娴佹按绾?, description: '鐢熶骇鐜鐩戞帶娴嬭瘯' },
                { id: 'regression', name: '鍥炲綊娴嬭瘯娴佹按绾?, description: '瀹屾暣鐨勫洖褰掓祴璇曞浠? },
                { id: 'security', name: '瀹夊叏娴嬭瘯娴佹按绾?, description: '鍏ㄩ潰鐨勫畨鍏ㄦ祴璇曟祦绋? }
              ].map(template => (
                <button
                  key={template.id}
                  onClick={() => handleCreatePipeline(template.id)}
                  disabled={isCreatingPipeline}
                  className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 disabled:opacity-50"
                >
                  <div className="text-white font-medium">{template.name}</div>
                  <div className="text-sm text-gray-400 mt-1">{template.description}</div>
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-2 mt-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                鍙栨秷
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
