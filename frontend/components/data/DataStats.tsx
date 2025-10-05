
import { PaginationInfo, TestRecord } from '@/hooks/useDataStorage';
import { BarChart3, CheckCircle, Database, XCircle } from 'lucide-react';
import React from 'react';
import StatCard from '../ui/StatCard'; // 使用支持subtitle的StatCard

interface DataStatsProps {
  records: TestRecord[];
  pagination: PaginationInfo;
  loading: boolean;
}

const DataStats: React.FC<DataStatsProps> = ({ records, pagination, loading }) => {
  // 计算当前页统计
  const currentPageStats = {
    total: records.length,
    completed: records.filter(r => r.status === 'completed').length,
    failed: records.filter(r => r.status === 'failed').length,
    running: records.filter(r => r.status === 'running').length,
    avgScore: records.length > 0 ?
      Math.round(
        records
          .filter(r => r.result?.score || 0)
          .reduce((sum, r) => sum + (r.result?.score || 0 || 0), 0) /
        records.filter(r => r.result?.score || 0).length
      ) || 0 : 0
  };

  // 计算成功率
  const successRate = currentPageStats.total > 0 ?
    ((currentPageStats.completed / currentPageStats.total) * 100).toFixed(1) : '0.0';

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" aria-label="数据统计概览">
      <StatCard
        title={`总记录数 (当前页: ${currentPageStats.total})`}
        value={pagination.total}
        icon={Database}
        color="blue"
      />

      <StatCard
        title={`成功测试 (成功率: ${successRate}%)`}
        value={currentPageStats.completed}
        icon={CheckCircle}
        color="green"
        trend={{
          value: parseFloat(successRate) > 80 ? 5.2 : -2.1,
          isPositive: parseFloat(successRate) > 80
        }}
      />

      <StatCard
        title={`失败测试 (失败率: ${(100 - parseFloat(successRate)).toFixed(1)}%)`}
        value={currentPageStats.failed}
        icon={XCircle}
        color="red"
        trend={{
          value: currentPageStats.failed > currentPageStats.completed ? 3.1 : -1.5,
          isPositive: currentPageStats.failed <= currentPageStats.completed
        }}
      />

      <StatCard
        title="平均分数 (当前页平均)"
        value={currentPageStats.avgScore}
        icon={BarChart3}
        color="purple"
        trend={{
          value: currentPageStats.avgScore > 70 ? 8.3 : -3.7,
          isPositive: currentPageStats.avgScore > 70
        }}
      />
    </section>
  );
};

export default DataStats;
