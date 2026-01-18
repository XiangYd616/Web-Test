/**
 * 数据可视化服务
 * 提供图表生成、数据分析、可视化配置功能
 */

const Logger = require('../../middleware/logger');

type ChartConfig = {
  type: string;
  data: Array<Record<string, unknown>>;
  options?: Record<string, unknown>;
};

type ChartResponse = {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
};

type ExportResponse = {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
};

class DataVisualizationService {
  private logger = Logger;
  private chartTypes = [
    'line',
    'bar',
    'pie',
    'area',
    'scatter',
    'radar',
    'heatmap',
    'gauge',
    'funnel',
    'treemap',
  ];
  private colorSchemes: Record<string, string[]> = {
    default: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'],
    blue: ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE'],
    green: ['#065F46', '#10B981', '#34D399', '#6EE7B7', '#D1FAE5'],
    red: ['#991B1B', '#EF4444', '#F87171', '#FCA5A5', '#FEE2E2'],
    purple: ['#581C87', '#8B5CF6', '#A78BFA', '#C4B5FD', '#EDE9FE'],
  };

  /**
   * 生成图表数据
   */
  async generateChart(chartConfig: ChartConfig): Promise<ChartResponse> {
    try {
      this.logger.info('生成图表数据:', chartConfig);

      const { type, data, options = {} } = chartConfig;

      if (!this.chartTypes.includes(type)) {
        throw new Error(`不支持的图表类型: ${type}`);
      }

      if (!data || !Array.isArray(data)) {
        throw new Error('图表数据必须是数组格式');
      }

      const processedData = this.processChartData(data, type, options);
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
            chartId: this.generateChartId(),
          },
        },
      };
    } catch (error) {
      this.logger.error('生成图表数据失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 处理图表数据
   */
  processChartData(
    data: Array<Record<string, unknown>>,
    type: string,
    options: Record<string, unknown>
  ) {
    switch (type) {
      case 'line':
      case 'area':
        return this.processTimeSeriesData(data);
      case 'bar':
        return this.processBarData(data, options);
      case 'pie':
        return this.processPieData(data, options);
      case 'scatter':
        return this.processScatterData(data, options);
      case 'radar':
        return this.processRadarData(data, options);
      case 'heatmap':
        return this.processHeatmapData(data);
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
  processTimeSeriesData(data: Array<Record<string, unknown>>) {
    return data
      .map(item => ({
        x: item.timestamp || item.date || item.x,
        y: item.value || item.y,
        label: item.label || item.name,
      }))
      .sort((a, b) => new Date(String(a.x)).getTime() - new Date(String(b.x)).getTime());
  }

  /**
   * 处理柱状图数据
   */
  processBarData(data: Array<Record<string, unknown>>, options: Record<string, unknown>) {
    const scheme = typeof options.colorScheme === 'string' ? options.colorScheme : 'default';
    return data.map(item => ({
      label: item.label || item.name || item.category,
      value: item.value || item.count || item.y,
      color: item.color || this.getNextColor(scheme),
    }));
  }

  /**
   * 处理饼图数据
   */
  processPieData(data: Array<Record<string, unknown>>, options: Record<string, unknown>) {
    const total = data.reduce((sum, item) => sum + Number(item.value || item.count || 0), 0);
    const scheme = typeof options.colorScheme === 'string' ? options.colorScheme : 'default';

    return data.map((item, index) => ({
      label: item.label || item.name,
      value: item.value || item.count || 0,
      percentage:
        total > 0 ? ((Number(item.value || item.count || 0) / total) * 100).toFixed(1) : 0,
      color: item.color || this.getColorByIndex(index, scheme),
    }));
  }

  /**
   * 处理散点图数据
   */
  processScatterData(data: Array<Record<string, unknown>>, options: Record<string, unknown>) {
    const scheme = typeof options.colorScheme === 'string' ? options.colorScheme : 'default';
    return data.map(item => ({
      x: item.x || item.value1,
      y: item.y || item.value2,
      size: item.size || item.weight || 5,
      label: item.label || item.name,
      color: item.color || this.getNextColor(scheme),
    }));
  }

  /**
   * 处理雷达图数据
   */
  processRadarData(data: Array<Record<string, unknown>>, options: Record<string, unknown>) {
    return {
      labels: data.map(item => item.metric || item.label),
      datasets: [
        {
          label: (options.title as string) || '数据集',
          data: data.map(item => item.value),
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        },
      ],
    };
  }

  /**
   * 处理热力图数据
   */
  processHeatmapData(data: Array<Record<string, unknown>>) {
    const matrix: Record<string, Record<string, number>> = {};
    let maxValue = 0;

    data.forEach(item => {
      const x = Number(item.x || 0);
      const y = Number(item.y || 0);
      const value = Number(item.value || 0);

      if (!matrix[String(y)]) matrix[String(y)] = {};
      matrix[String(y)][String(x)] = value;

      if (value > maxValue) maxValue = value;
    });

    return {
      matrix,
      maxValue,
      dimensions: {
        width: Math.max(...data.map(item => Number(item.x || 0))) + 1,
        height: Math.max(...data.map(item => Number(item.y || 0))) + 1,
      },
    };
  }

  /**
   * 处理仪表盘数据
   */
  processGaugeData(
    data: Array<Record<string, unknown>> | Record<string, unknown>,
    options: Record<string, unknown>
  ) {
    const value = Array.isArray(data) ? Number(data[0]?.value || 0) : Number(data.value || 0);
    const min = Number(options.min || 0);
    const max = Number(options.max || 100);

    return {
      value,
      min,
      max,
      percentage: ((value - min) / (max - min)) * 100,
      ranges: (options.ranges as Array<Record<string, unknown>>) || [
        { min: 0, max: 30, color: '#EF4444', label: '低' },
        { min: 30, max: 70, color: '#F59E0B', label: '中' },
        { min: 70, max: 100, color: '#10B981', label: '高' },
      ],
    };
  }

  /**
   * 处理漏斗图数据
   */
  processFunnelData(data: Array<Record<string, unknown>>, options: Record<string, unknown>) {
    const total = Number(data[0]?.value || 1);
    const scheme = typeof options.colorScheme === 'string' ? options.colorScheme : 'default';

    return data.map((item, index) => ({
      label: item.label || item.name,
      value: item.value || 0,
      percentage: ((Number(item.value || 0) / total) * 100).toFixed(1),
      conversionRate:
        index > 0
          ? ((Number(item.value || 0) / Number(data[index - 1]?.value || 1)) * 100).toFixed(1)
          : 100,
      color: item.color || this.getColorByIndex(index, scheme),
    }));
  }

  /**
   * 处理树状图数据
   */
  processTreemapData(
    data: Array<Record<string, unknown>>,
    options: Record<string, unknown>
  ): Array<Record<string, unknown>> {
    const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
    const scheme = typeof options.colorScheme === 'string' ? options.colorScheme : 'default';

    return data.map(item => ({
      name: item.name || item.label,
      value: item.value || 0,
      percentage: total > 0 ? ((Number(item.value || 0) / total) * 100).toFixed(1) : 0,
      color: item.color || this.getNextColor(scheme),
      children: item.children
        ? this.processTreemapData(item.children as Array<Record<string, unknown>>, options)
        : undefined,
    }));
  }

  /**
   * 生成图表配置选项
   */
  generateChartOptions(type: string, userOptions: Record<string, unknown>) {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: userOptions.showLegend !== false,
          position: userOptions.legendPosition || 'top',
        },
        title: {
          display: !!userOptions.title,
          text: userOptions.title || '',
        },
      },
    };

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
                text: userOptions.xAxisLabel || 'Time',
              },
            },
            y: {
              display: true,
              title: {
                display: true,
                text: userOptions.yAxisLabel || 'Value',
              },
            },
          },
          elements: {
            line: {
              tension: userOptions.smooth ? 0.4 : 0,
            },
          },
        };
      case 'bar':
        return {
          ...baseOptions,
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: userOptions.xAxisLabel || 'Category',
              },
            },
            y: {
              display: true,
              title: {
                display: true,
                text: userOptions.yAxisLabel || 'Value',
              },
              beginAtZero: true,
            },
          },
        };
      case 'pie':
        return {
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            tooltip: {
              callbacks: {
                label(context: {
                  parsed: number;
                  label: string;
                  dataset: { data: number[] };
                  dataIndex: number;
                }) {
                  const value = context.parsed;
                  return `${context.label}: ${value} (${context.dataset.data[context.dataIndex]}%)`;
                },
              },
            },
          },
        };
      default:
        return baseOptions;
    }
  }

  /**
   * 获取颜色
   */
  getColorByIndex(index: number, scheme = 'default') {
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
        description: this.getChartTypeDescription(type),
      })),
    };
  }

  /**
   * 获取图表类型名称
   */
  getChartTypeName(type: string) {
    const names: Record<string, string> = {
      line: '折线图',
      bar: '柱状图',
      pie: '饼图',
      area: '面积图',
      scatter: '散点图',
      radar: '雷达图',
      heatmap: '热力图',
      gauge: '仪表盘',
      funnel: '漏斗图',
      treemap: '树状图',
    };
    return names[type] || type;
  }

  /**
   * 获取图表类型描述
   */
  getChartTypeDescription(type: string) {
    const descriptions: Record<string, string> = {
      line: '用于显示数据随时间变化的趋势',
      bar: '用于比较不同类别的数值',
      pie: '用于显示各部分占整体的比例',
      area: '用于显示数量随时间变化的趋势和累积效果',
      scatter: '用于显示两个变量之间的关系',
      radar: '用于显示多个维度的数据对比',
      heatmap: '用于显示数据的密度分布',
      gauge: '用于显示单个指标的当前状态',
      funnel: '用于显示流程中各阶段的转化情况',
      treemap: '用于显示层次结构数据的比例关系',
    };
    return descriptions[type] || '数据可视化图表';
  }

  /**
   * 导出图表数据
   */
  async exportChart(chartId: string, format = 'json'): Promise<ExportResponse> {
    try {
      const chartData = {
        id: chartId,
        type: 'line',
        data: [],
        options: {},
        createdAt: new Date().toISOString(),
      };

      let content: string;
      let filename: string;

      switch (format.toLowerCase()) {
        case 'json':
          content = JSON.stringify(chartData, null, 2);
          filename = `chart_${chartId}.json`;
          break;
        case 'csv':
          content = this.convertToCSV(chartData.data as Array<Record<string, unknown>>);
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
          format,
        },
      };
    } catch (error) {
      this.logger.error('导出图表数据失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 转换为CSV格式
   */
  convertToCSV(data: Array<Record<string, unknown>>) {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * 获取图表统计信息
   */
  getStatistics(): ChartResponse {
    try {
      return {
        success: true,
        data: {
          supportedTypes: this.chartTypes.length,
          colorSchemes: Object.keys(this.colorSchemes).length,
          features: ['多种图表类型', '自定义颜色方案', '响应式设计', '数据导出', '实时更新'],
        },
      };
    } catch (error) {
      this.logger.error('获取统计信息失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

const dataVisualizationService = new DataVisualizationService();

export { DataVisualizationService, dataVisualizationService };

// 兼容 CommonJS require
module.exports = dataVisualizationService;
