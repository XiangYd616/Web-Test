import React from 'react';
import DataTableCompat, { Column } from './DataTableCompat';

interface TestRecord {
  id: string;
  name: string;
  age: number;
  email: string;
  status: 'active' | 'inactive';
}

const testData: TestRecord[] = [
  { id: '1', name: '张三', age: 25, email: 'zhang@example.com', status: 'active' },
  { id: '2', name: '李四', age: 30, email: 'li@example.com', status: 'inactive' },
  { id: '3', name: '王五', age: 28, email: 'wang@example.com', status: 'active' }
];

const testColumns: Column<TestRecord>[] = [
  {
    key: 'name',
    title: '姓名',
    sortable: true
  },
  {
    key: 'age',
    title: '年龄',
    sortable: true,
    align: 'center'
  },
  {
    key: 'email',
    title: '邮箱',
    width: '200px'
  },
  {
    key: 'status',
    title: '状态',
    align: 'center',
    render: (value: string) => (
      <span className={value === 'active' ? 'text-green-400' : 'text-red-400'}>
        {value === 'active' ? '活跃' : '非活跃'}
      </span>
    )
  }
];

const DataTableCompatTest: React.FC = () => {
  const [sortBy, setSortBy] = React.useState<keyof TestRecord>('name');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  const handleSort = (key: keyof TestRecord, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
    console.log('排序变化:', key, order);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">
          DataTable兼容层测试
        </h1>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-300">
            基础功能测试
          </h2>

          <DataTableCompat
            columns={testColumns}
            data={testData}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            rowKey="id"
            className="mb-6"
          />

          <h2 className="text-lg font-semibold text-gray-300">
            加载状态测试
          </h2>

          <DataTableCompat
            columns={testColumns}
            data={[]}
            loading={true}
            rowKey="id"
            className="mb-6"
          />

          <h2 className="text-lg font-semibold text-gray-300">
            空状态测试
          </h2>

          <DataTableCompat
            columns={testColumns}
            data={[]}
            emptyText="没有找到任何数据"
            emptyIcon={
              <div className="w-16 h-16 bg-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-2xl">📊</span>
              </div>
            }
            rowKey="id"
          />
        </div>

        <div className="mt-8 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-md font-semibold text-gray-300 mb-2">
            当前排序状态
          </h3>
          <p className="text-gray-400">
            排序字段: <span className="text-blue-400">{sortBy}</span>
          </p>
          <p className="text-gray-400">
            排序顺序: <span className="text-blue-400">{sortOrder}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataTableCompatTest;
