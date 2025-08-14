import React from 'react';

interface ModernChartProps {
  data: any[];
  type: 'line' | 'bar' | 'pie';
  className?: string;
}

const ModernChart: React.FC<ModernChartProps> = ({ data, type, className = '' }) => {
  return (
    <div className={`${className}`}>
      <div className="p-4 border rounded-lg bg-white">
        <h3 className="text-lg font-medium mb-4">现代图表 ({type})</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
          <p className="text-gray-500">图表组件 - 数据点: {data.length}</p>
        </div>
      </div>
    </div>
  );
};

export { ModernChart };
export default ModernChart;
