/**
 * 数据可视化服务
 * 提供图表生成、数据分析、可视化配置功能
 */

const Logger = require('../../middleware/logger.js');

class DataVisualizationService {
  constructor() {
    this.logger = Logger;
    this.chartTypes = [
      'line', 'bar', 'pie', 'area', 'scatter', 'radar', 
      'heatmap', 'gauge', 'funnel', 'treemap'
    ];
    this.colorSchemes = {
      default: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'],
      blue: ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE'],
      green: ['#065F46', '#10B981', '#34D399', '#6EE7B7', '#D1FAE5'],
      red: ['#991B1B', '#EF4444', '#F87171', '#FCA5A5', '#FEE2E2'],
      purple: ['#581C87', '#8B5CF6', '#A78BFA', '#C4B5FD', '#EDE9FE']
    };
  }

  /**
   * 生成图表数据
   */
  async generateChart(chartConfig) {
    try {
      this.logger.info('生成图表数据:', chartConfig);

      const { type, data, options = {} } = chartConfig;

      // 验证图表类型
      if (!this.chartTypes.includes(type)) {
        throw new Error(`不支持的图表类型: ${type}`);
      }

      // 验证数据
      if (!data || !Array.isArray(data)) {
        throw new Error('图表数据必须是数组格式');
      }

      // 处理数据
      const processedData = this.processChartData(data, type, options);

      // 生成图表配置
      const chartOptions = this.generateChartOptions(type, options);

      return {
        success: true,
        data: {
          type,
          data: processedData,
          options: chartOptions,
          metadata: {
            dataPoints: data.length,
            generatedAt: new Date().toISOString(),
            chartId: this.generateChartId()
          }
        }
      };
    } catch (error) {
      this.logger.error('生成图表数据失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 处理图表数据
   */
  processChartData(data, type, options) {
    switch (type) {
      case 'line':
      case 'area':
        return this.processTimeSeriesData(data, options);
      case 'bar':
        return this.processBarData(data, options);
      case 'pie':
        return this.processPieData(data, options);
      case 'scatter':
        return this.processScatterData(data, options);
      case 'radar':
        return this.processRadarData(data, options);
      case 'heatmap':
        return this.processHeatmapData(data, options);
      case 'gauge':
        return this.processGaugeData(data, options);
      case 'funnel':
        return this.processFunnelData(data, options);
      case 'treemap':
        return this.processTreemapData(data, options);
      default:
        return data;
    }
  }

  /**
   * 处理时间序列数据
   */
  processTimeSeriesData(data, options) {
    return data.map(item => ({
      x: item.timestamp || item.date || item.x,
      y: item.value || item.y,
      label: item.label || item.name
    })).sort((a, b) => new Date(a.x) - new Date(b.x));
  }

  /**
   * 处理柱状图数据
   */
  processBarData(data, options) {
    return data.map(item => ({
      label: item.label || item.name || item.category,
      value: item.value || item.count || item.y,
      color: item.color || this.getNextColor(options.colorScheme)
    }));
  }

  /**
   * 处理饼图数据
   */
  processPieData(data, options) {
    const total = data.reduce((sum, item) => sum + (item.value || item.count || 0), 0);
    
    return data.map((item, index) => ({
      label: item.label || item.name,
      value: item.value || item.count || 0,
      percentage: total > 0 ? ((item.value || item.count || 0) / total * 100).toFixed(1) : 0,
      color: item.color || this.getColorByIndex(index, options.colorScheme)
    }));
  }

  /**
   * 处理散点图数据
   */
  processScatterData(data, options) {
    return data.map(item => ({
      x: item.x || item.value1,
      y: item.y || item.value2,
      size: item.size || item.weight || 5,
      label: item.label || item.name,
      color: item.color || this.getNextColor(options.colorScheme)
    }));
  }

  /**
   * 处理雷达图数据
   */
  processRadarData(data, options) {
    // 假设数据格式为 [{ metric: 'CPU', value: 80 }, ...]
    return {
      labels: data.map(item => item.metric || item.label),
      datasets: [{
        label: options.title || '数据集',
        data: data.map(item => item.value),
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        pointBackgroundColor: 'rgba(59, 130, 246, 1)'
      }]
    };
  }

  /**
   * 处理热力图数据
   */
  processHeatmapData(data, options) {
    // 假设数据格式为 [{ x: 0, y: 0, value: 10 }, ...]
    const matrix = {};
    let maxValue = 0;

    data.forEach(item => {
      const x = item.x || 0;
      const y = item.y || 0;
      const value = item.value || 0;
      
      if (!matrix[y]) matrix[y] = {};
      matrix[y][x] = value;
      
      if (value > maxValue) maxValue = value;
    });

    return {
      matrix,
      maxValue,
      dimensions: {
        width: Math.max(...data.map(item => item.x || 0)) + 1,
        height: Math.max(...data.map(item => item.y || 0)) + 1
      }
    };
  }

  /**
   * 处理仪表盘数据
   */
  processGaugeData(data, options) {
    const value = Array.isArray(data) ? data[0]?.value || 0 : data.value || 0;
    const min = options.min || 0;
    const max = options.max || 100;
    
    return {
      value,
      min,
      max,
      percentage: ((value - min) / (max - min)) * 100,
      ranges: options.ranges || [
        { min: 0, max: 30, color: '#EF4444', label: '低' },
        { min: 30, max: 70, color: '#F59E0B', label: '中' },
        { min: 70, max: 100, color: '#10B981', label: '高' }
      ]
    };
  }

  /**
   * 处理漏斗图数据
   */
  processFunnelData(data, options) {
    const total = data[0]?.value || 1;
    
    return data.map((item, index) => ({
      label: item.label || item.name,
      value: item.value || 0,
      percentage: ((item.value || 0) / total * 100).toFixed(1),
      conversionRate: index > 0 ? 
        ((item.value || 0) / (data[index - 1]?.value || 1) * 100).toFixed(1) : 100,
      color: item.color || this.getColorByIndex(index, options.colorScheme)
    }));
  }

  /**
   * 处理树状图数据
   */
  processTreemapData(data, options) {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    
    return data.map(item => ({
      name: item.name || item.label,
      value: item.value || 0,
      percentage: total > 0 ? ((item.value || 0) / total * 100).toFixed(1) : 0,
      color: item.color || this.getNextColor(options.colorScheme),
      children: item.children ? this.processTreemapData(item.children, options) : undefined
    }));
  }

  /**
   * 生成图表配置选项
   */
  generateChartOptions(type, userOptions) {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: userOptions.showLegend !== false,
          position: userOptions.legendPosition || 'top'
        },
        title: {
          display: !!userOptions.title,
          text: userOptions.title || ''
        }
      }
    };

    // 根据图表类型添加特定配置
    switch (type) {
      case 'line':
      case 'area':
        return {
          ...baseOptions,
          scales: {
            x: {
              type: 'time',
              display: true,
              title: {
                display: true,
                text: userOptions.xAxisLabel || 'Time'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: userOptions.yAxisLabel || 'Value'
              }
            }
          },
          elements: {
            line: {
              tension: userOptions.smooth ? 0.4 : 0
            }
          }
        };

      case 'bar':
        return {
          ...baseOptions,
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: userOptions.xAxisLabel || 'Category'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: userOptions.yAxisLabel || 'Value'
              },
              beginAtZero: true
            }
          }
        };

      case 'pie':
        return {
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            tooltip: {
              callbacks: {
                label: function(context) {
                  const data = context.parsed;
                  return `${context.label}: ${data} (${context.dataset.data[context.dataIndex]}%)`;
                }
              }
            }
          }
        };

      default:
        return baseOptions;
    }
  }

  /**
   * 获取颜色
   */
  getColorByIndex(index, scheme = 'default') {
    const colors = this.colorSchemes[scheme] || this.colorSchemes.default;
    return colors[index % colors.length];
  }

  /**
   * 获取下一个颜色
   */
  getNextColor(scheme = 'default') {
    const colors = this.colorSchemes[scheme] || this.colorSchemes.default;
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 生成图表ID
   */
  generateChartId() {
    return `chart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 获取支持的图表类型
   */
  getSupportedChartTypes() {
    return {
      success: true,
      data: this.chartTypes.map(type => ({
        type,
        name: this.getChartTypeName(type),
        description: this.getChartTypeDescription(type)
      }))
    };
  }

  /**
   * 获取图表类型名称
   */
  getChartTypeName(type) {
    const names = {
      line: '折线图',
      bar: '柱状图',
      pie: '饼图',
      area: '面积图',
      scatter: '散点图',
      radar: '雷达图',
      heatmap: '热力图',
      gauge: '仪表盘',
      funnel: '漏斗图',
      treemap: '树状图'
    };
    return names[type] || type;
  }

  /**
   * 获取图表类型描述
   */
  getChartTypeDescription(type) {
    const descriptions = {
      line: '用于显示数据随时间变化的趋势',
      bar: '用于比较不同类别的数值',
      pie: '用于显示各部分占整体的比例',
      area: '用于显示数量随时间变化的趋势和累积效果',
      scatter: '用于显示两个变量之间的关系',
      radar: '用于显示多个维度的数据对比',
      heatmap: '用于显示数据的密度分布',
      gauge: '用于显示单个指标的当前状态',
      funnel: '用于显示流程中各阶段的转化情况',
      treemap: '用于显示层次结构数据的比例关系'
    };
    return descriptions[type] || '数据可视化图表';
  }

  /**
   * 导出图表数据
   */
  async exportChart(chartId, format = 'json') {
    try {
      // 这里应该从数据库或缓存中获取图表数据
      // 暂时返回模拟数据
      const chartData = {
        id: chartId,
        type: 'line',
        data: [],
        options: {},
        createdAt: new Date().toISOString()
      };

      let content;
      let filename;

      switch (format.toLowerCase()) {
        case 'json':
          content = JSON.stringify(chartData, null, 2);
          filename = `chart_${chartId}.json`;
          break;
        case 'csv':
          content = this.convertToCSV(chartData.data);
          filename = `chart_${chartId}.csv`;
          break;
        default:
          throw new Error('不支持的导出格式');
      }

      return {
        success: true,
        data: {
          content,
          filename,
          format
        }
      };
    } catch (error) {
      this.logger.error('导出图表数据失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 转换为CSV格式
   */
  convertToCSV(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => 
          JSON.stringify(row[header] || '')
        ).join(',')
      )
    ].join('/n');

    return csvContent;
  }

  /**
   * 获取图表统计信息
   */
  getStatistics() {
    try {
      return {
        success: true,
        data: {
          supportedTypes: this.chartTypes.length,
          colorSchemes: Object.keys(this.colorSchemes).length,
          features: [
            '多种图表类型',
            '自定义颜色方案',
            '响应式设计',
            '数据导出',
            '实时更新'
          ]
        }
      };
    } catch (error) {
      this.logger.error('获取统计信息失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new DataVisualizationService();
