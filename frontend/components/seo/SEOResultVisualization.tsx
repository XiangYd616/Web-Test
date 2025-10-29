/**
 * SEOResultVisualization.tsx - React组件
 * 
 * 文件路径: frontend\components\seo\SEOResultVisualization.tsx
 * 创建时间: 2025-09-25
 */

import React, { useState, useMemo } from 'react';
import {BarChart3, TrendingUp, AlertCircle, CheckCircle, Clock} from 'lucide-react';
import { SEOAnalysisResult } from '../../services/realSEOAnalysisEngine';
import { MobileSeoAnalysisResult } from '../../utils/MobileSEODetector';
import { CoreWebVitalsResult } from '../../utils/coreWebVitalsAnalyzer';

interface SEOVisualizationData {
  basicSEO?: SEOAnalysisResult;
  mobileSEO?: MobileSeoAnalysisResult;
  coreWebVitals?: CoreWebVitalsResult;
  timestamp: number;
  url: string;
}

interface SEOResultVisualizationProps {
  data: SEOVisualizationData;
  showComparison?: boolean;
  historicalData?: SEOVisualizationData[];
}

// 简化的圆形进度条组件
const CircularProgress: React.FC<{
  score: number;
  size: number;
  strokeWidth: number;
  color: string;
  label?: string;
}> = ({ score, size, strokeWidth, color, label }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{score}</span>
        </div>
      </div>
      {label && (
        <span className="text-sm text-gray-600 mt-2">{label}</span>
      )}
    </div>
  );
};

// 简化的柱状图组件
const BarChart: React.FC<{
  data: Array<{ label: string; value: number; color: string }>;
  maxValue?: number;
}> = ({ data, maxValue }) => {
  const max = maxValue || Math.max(...data.map(d => d.value));

  return (
    <div className="flex items-end space-x-2 h-32">
      {data.map((item, index) => {
        const height = (item.value / max) * 100;
        return (
          <div key={index} className="flex flex-col items-center flex-1">
            <div className="flex-1 flex items-end w-full">
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${height}%`,
                  backgroundColor: item.color
                }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1 text-center">
              {item.label}
            </div>
            <div className="text-sm font-semibold">
              {item.value}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 雷达图组件（简化版）
const RadarChart: React.FC<{
  data: Array<{ label: string; value: number }>;
  size: number;
}> = ({ data, size }) => {
  const center = size / 2;
  const radius = center - 20;
  const angleStep = (2 * Math.PI) / data.length;

  const points = data.map((item, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const value = (item.value / 100) * radius;
    const x = center + value * Math.cos(angle);
    const y = center + value * Math.sin(angle);
    return { x, y, angle, value: item.value, label: item.label };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="relative">
      <svg width={size} height={size} className="overflow-visible">
        {/* 背景网格 */}
        {[20, 40, 60, 80, 100].map(percent => {
          const r = (percent / 100) * radius;
          return (
            <circle
              key={percent}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          );
        })}
        
        {/* 轴线 */}
        {points.map((point, index) => {
          const axisX = center + radius * Math.cos(point.angle);
          const axisY = center + radius * Math.sin(point.angle);
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={axisX}
              y2={axisY}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          );
        })}
        
        {/* 数据区域 */}
        <path
          d={pathData}
          fill="#3b82f680"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        
        {/* 数据点 */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth="2"
          />
        ))}
      </svg>
      
      {/* 标签 */}
      {points.map((point, index) => {
        const labelX = center + (radius + 15) * Math.cos(point.angle);
        const labelY = center + (radius + 15) * Math.sin(point.angle);
        return (
          <div
            key={index}
            className="absolute text-xs font-medium transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: labelX,
              top: labelY
            }}
          >
            {point.label}
          </div>
        );
      })}
    </div>
  );
};

export const SEOResultVisualization: React.FC<SEOResultVisualizationProps> = ({
  data,
  showComparison = false,
  historicalData = []
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'detailed' | 'comparison' | 'trends'>('overview');

  // 计算总体评分数据
  const overviewScores = useMemo(() => {
    const scores = [];
    
    if (data.basicSEO) {
      // 计算技术SEO分数（基于布尔值）
      const technicalScore = data.basicSEO.technical 
        ? ((data.basicSEO.technical.canonical ? 33 : 0) + 
           (data.basicSEO.technical.robots ? 33 : 0) + 
           (data.basicSEO.technical.sitemap ? 34 : 0))
        : 0;
      
      scores.push(
        { label: '技术SEO', value: technicalScore, color: '#3b82f6' },
        { label: '内容质量', value: data.basicSEO.contentQuality?.score || 0, color: '#10b981' },
        { label: '可访问性', value: data.basicSEO.accessibility?.score || 0, color: '#f59e0b' },
        { label: '社交媒体', value: data.basicSEO.socialMedia?.score || 0, color: '#8b5cf6' },
        { label: '结构化数据', value: data.basicSEO.structuredData?.score || 0, color: '#ef4444' }
      );
    }
    
    if (data.mobileSEO) {
      scores.push({ label: '移动SEO', value: data.mobileSEO.overallScore, color: '#06b6d4' });
    }
    
    return scores;
  }, [data]);

  // 计算雷达图数据
  const radarData = useMemo(() => {
    const radarScores = [];
    
    if (data.basicSEO) {
      // 计算技术SEO分数
      const technicalScore = data.basicSEO.technical 
        ? ((data.basicSEO.technical.canonical ? 33 : 0) + 
           (data.basicSEO.technical.robots ? 33 : 0) + 
           (data.basicSEO.technical.sitemap ? 34 : 0))
        : 0;
      
      radarScores.push(
        { label: '技术', value: technicalScore },
        { label: '内容', value: data.basicSEO.contentQuality?.score || 0 },
        { label: '可访问', value: data.basicSEO.accessibility?.score || 0 },
        { label: '社交', value: data.basicSEO.socialMedia?.score || 0 },
        { label: '结构化', value: data.basicSEO.structuredData?.score || 0 }
      );
    }
    
    if (data.mobileSEO) {
      radarScores.push({ label: '移动', value: data.mobileSEO.overallScore });
    }
    
    return radarScores;
  }, [data]);

  // 计算问题分布
  const issueDistribution = useMemo(() => {
    if (!data.basicSEO) return [];
    
    const issues = data.basicSEO.issues;
    const distribution = {
      high: issues.filter(i => i.impact === 'high').length,
      medium: issues.filter(i => i.impact === 'medium').length,
      low: issues.filter(i => i.impact === 'low').length
    };
    
    return [
      { label: '高', value: distribution.high, color: '#ef4444' },
      { label: '中', value: distribution.medium, color: '#f59e0b' },
      { label: '低', value: distribution.low, color: '#10b981' }
    ];
  }, [data]);

  // Core Web Vitals 数据
  const coreWebVitalsData = useMemo(() => {
    if (!data.coreWebVitals) return [];
    
    const vitals = data.coreWebVitals;
    return [
      { 
        label: 'LCP', 
        value: vitals.metrics.lcp, 
        rating: vitals.measurements.find(m => m.metric === 'lcp')?.rating || 'poor',
        unit: 'ms' 
      },
      { 
        label: 'FID', 
        value: vitals.metrics.fid, 
        rating: vitals.measurements.find(m => m.metric === 'fid')?.rating || 'poor',
        unit: 'ms' 
      },
      { 
        label: 'CLS', 
        value: vitals.metrics.cls, 
        rating: vitals.measurements.find(m => m.metric === 'cls')?.rating || 'poor',
        unit: '' 
      }
    ];
  }, [data]);

  // 获取评分颜色
  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 70) return '#f59e0b'; // yellow
    if (score >= 50) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  // 获取评级图标
  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'good': return <CheckCircle className="text-green-500" size={16} />;
      case 'needs-improvement': return <Clock className="text-yellow-500" size={16} />;
      case 'poor': return <AlertCircle className="text-red-500" size={16} />;
      default: return <AlertCircle className="text-gray-500" size={16} />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* 导航标签 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center">
          <BarChart3 className="mr-2" />
          SEO测试结果可视化
        </h3>
        <div className="flex space-x-2">
          {['overview', 'detailed', 'comparison', 'trends'].map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view as any)}
              className={`px-3 py-1 text-sm rounded-lg ${
                activeView === view
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {view === 'overview' ? '总览' :
               view === 'detailed' ? '详细' :
               view === 'comparison' ? '对比' : '趋势'}
            </button>
          ))}
        </div>
      </div>

      {/* 总览视图 */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* 总体评分 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <CircularProgress
                score={data.basicSEO?.score || 0}
                size={120}
                strokeWidth={8}
                color={getScoreColor(data.basicSEO?.score || 0)}
                label="总体评分"
              />
            </div>
            
            {data.mobileSEO && (
              <div className="text-center">
                <CircularProgress
                  score={data.mobileSEO.overallScore}
                  size={120}
                  strokeWidth={8}
                  color={getScoreColor(data.mobileSEO.overallScore)}
                  label="移动SEO"
                />
              </div>
            )}
            
            {data.coreWebVitals && (
              <div className="text-center">
                <CircularProgress
                  score={data.coreWebVitals.overallRating === 'good' ? 90 :
                         data.coreWebVitals.overallRating === 'needs-improvement' ? 60 : 30}
                  size={120}
                  strokeWidth={8}
                  color={data.coreWebVitals.overallRating === 'good' ? '#10b981' :
                         data.coreWebVitals.overallRating === 'needs-improvement' ? '#f59e0b' : '#ef4444'}
                  label="Core Web Vitals"
                />
              </div>
            )}
          </div>

          {/* 各项评分柱状图 */}
          <div>
            <h4 className="text-md font-semibold mb-4">各项评分对比</h4>
            <BarChart data={overviewScores} />
          </div>

          {/* 问题分布 */}
          {issueDistribution.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-semibold mb-4">问题优先级分布</h4>
                <BarChart data={issueDistribution} />
              </div>
              
              <div>
                <h4 className="text-md font-semibold mb-4">SEO维度雷达图</h4>
                <div className="flex justify-center">
                  <RadarChart data={radarData} size={200} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 详细视图 */}
      {activeView === 'detailed' && (
        <div className="space-y-6">
          {/* Core Web Vitals 详细指标 */}
          {data.coreWebVitals && (
            <div>
              <h4 className="text-md font-semibold mb-4">Core Web Vitals 详细指标</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {coreWebVitalsData.map((vital, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{vital.label}</span>
                      {getRatingIcon(vital.rating)}
                    </div>
                    <div className="text-2xl font-bold mb-1">
                      {vital.value.toFixed(vital.label === 'CLS' ? 3 : 0)}{vital.unit}
                    </div>
                    <div className={`text-sm ${
                      vital.rating === 'good' ? 'text-green-600' :
                      vital.rating === 'needs-improvement' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {vital.rating === 'good' ? '良好' :
                       vital.rating === 'needs-improvement' ? '需要改善' : '较差'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 移动SEO详细指标 */}
          {data.mobileSEO && (
            <div>
              <h4 className="text-md font-semibold mb-4">移动SEO详细指标</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <div className="text-xl font-bold text-blue-600">
                    {data.mobileSEO.viewport.hasViewport ? '✓' : '✗'}
                  </div>
                  <div className="text-sm text-blue-600">Viewport标签</div>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <div className="text-xl font-bold text-green-600">
                    {data.mobileSEO.responsive.score}
                  </div>
                  <div className="text-sm text-green-600">响应式设计</div>
                </div>
                
                <div className="p-3 bg-purple-50 rounded-lg text-center">
                  <div className="text-xl font-bold text-purple-600">
                    {data.mobileSEO.touchTargets.appropriateSize}
                  </div>
                  <div className="text-sm text-purple-600">触摸目标</div>
                </div>
                
                <div className="p-3 bg-orange-50 rounded-lg text-center">
                  <div className="text-xl font-bold text-orange-600">
                    {data.mobileSEO.fonts.averageFontSize}px
                  </div>
                  <div className="text-sm text-orange-600">平均字体</div>
                </div>
              </div>
            </div>
          )}

          {/* 技术SEO详细信息 */}
          {data.basicSEO && (
            <div>
              <h4 className="text-md font-semibold mb-4">技术SEO详细信息</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span>Robots.txt</span>
                    <span className={`font-semibold ${
                      data.basicSEO.technical?.robots ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {data.basicSEO.technical?.robots ? '存在' : '缺失'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span>Sitemap</span>
                    <span className={`font-semibold ${
                      data.basicSEO.technical?.sitemap ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {data.basicSEO.technical?.sitemap ? '存在' : '缺失'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span>Canonical标签</span>
                    <span className={`font-semibold ${
                      data.basicSEO.technical?.canonical ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {data.basicSEO.technical?.canonical ? '存在' : '缺失'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span>HTTPS</span>
                    <span className="font-semibold text-gray-600">
                      {/* HTTPS信息需要从其他数据源获取 */}
                      -
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 对比视图 */}
      {activeView === 'comparison' && showComparison && historicalData?.length > 0 && (
        <div className="space-y-6">
          <div className="text-center text-gray-600">
            <p>对比功能开发中...</p>
            <p>将显示与历史数据的对比分析</p>
          </div>
        </div>
      )}

      {/* 趋势视图 */}
      {activeView === 'trends' && historicalData?.length > 0 && (
        <div className="space-y-6">
          <div className="text-center text-gray-600">
            <p>趋势分析功能开发中...</p>
            <p>将显示SEO指标的历史变化趋势</p>
          </div>
        </div>
      )}

      {/* 快速洞察 */}
      <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <h4 className="font-semibold mb-3 flex items-center">
          <TrendingUp className="mr-2" />
          快速洞察
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {data.basicSEO && (
            <>
              <div className="flex items-center">
                {data.basicSEO.score >= 80 ? 
                  <CheckCircle className="text-green-500 mr-2" size={16} /> :
                  <AlertCircle className="text-yellow-500 mr-2" size={16} />
                }
                <span>
                  SEO总分: {data.basicSEO.score >= 80 ? '表现优秀' : '有待改进'}
                </span>
              </div>
              
              <div className="flex items-center">
                {data.basicSEO.issues.filter(i => i.impact === 'high').length === 0 ? 
                  <CheckCircle className="text-green-500 mr-2" size={16} /> :
                  <AlertCircle className="text-red-500 mr-2" size={16} />
                }
                <span>
                  {data.basicSEO.issues.filter(i => i.impact === 'high').length === 0 ? 
                    '无高优先级问题' : 
                    `${data.basicSEO.issues.filter(i => i.impact === 'high').length}个高优先级问题`
                  }
                </span>
              </div>
            </>
          )}
          
          {data.mobileSEO && (
            <div className="flex items-center">
              {data.mobileSEO.viewport.isOptimal ? 
                <CheckCircle className="text-green-500 mr-2" size={16} /> :
                <AlertCircle className="text-yellow-500 mr-2" size={16} />
              }
              <span>
                移动优化: {data.mobileSEO.viewport.isOptimal ? '配置良好' : '需要优化'}
              </span>
            </div>
          )}
          
          {data.coreWebVitals && (
            <div className="flex items-center">
              {getRatingIcon(data.coreWebVitals.overallRating)}
              <span className="ml-2">
                Core Web Vitals: {
                  data.coreWebVitals.overallRating === 'good' ? '优秀' :
                  data.coreWebVitals.overallRating === 'needs-improvement' ? '需改进' : '较差'
                }
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SEOResultVisualization;
