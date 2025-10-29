/**
 * FilterBar - 筛选栏组件
 * 
 * 文件路径: frontend/components/common/TestHistory/components/FilterBar.tsx
 * 创建时间: 2025-10-05
 */

import React from 'react';
import { Search } from 'lucide-react';
import { getStatusText } from '../../../../utils/testStatusUtils';
import type { SortField } from '../types';

interface FilterBarProps {
  searchTerm: string;
  statusFilter: string;
  dateFilter: string;
  sortBy: SortField;
  sortOrder: 'asc' | 'desc';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onSortByChange: (value: SortField) => void;
  onSortOrderToggle: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm,
  statusFilter,
  dateFilter,
  sortBy,
  sortOrder,
  onSearchChange,
  onStatusChange,
  onDateChange,
  onSortByChange,
  onSortOrderToggle
}) => {
  return (
    <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 mt-6 border border-gray-700/30">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 items-end">
        {/* 搜索框 */}
        <div className="md:col-span-2 xl:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            搜索测试记录
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
            <input
              type="text"
              placeholder="输入测试名称或URL..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="搜索测试记录"
              title="输入测试名称或URL进行搜索"
              className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-600/40 rounded-lg bg-gray-700/50 backdrop-blur-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
            />
          </div>
        </div>

        {/* 状态筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            测试状态
          </label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="筛选测试状态"
            title="选择要筛选的测试状态"
            className="w-full pl-4 pr-12 py-2.5 text-sm border border-gray-600/40 rounded-lg bg-gray-700/50 backdrop-blur-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 appearance-none bg-no-repeat bg-right bg-[length:14px_14px] bg-[position:right_16px_center] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAxNCAxNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMuNSA1LjI1TDcgOC43NUwxMC41IDUuMjUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIxLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')]"
          >
            <option value="all">全部状态</option>
            <option value="completed">{getStatusText('completed')}</option>
            <option value="failed">{getStatusText('failed')}</option>
            <option value="running">{getStatusText('running')}</option>
            <option value="cancelled">{getStatusText('cancelled')}</option>
            <option value="idle">{getStatusText('idle')}</option>
            <option value="starting">{getStatusText('starting')}</option>
          </select>
        </div>

        {/* 日期筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            时间范围
          </label>
          <select
            value={dateFilter}
            onChange={(e) => onDateChange(e.target.value)}
            aria-label="筛选测试日期"
            title="选择要筛选的测试日期范围"
            className="w-full pl-4 pr-12 py-2.5 text-sm border border-gray-600/40 rounded-lg bg-gray-700/50 backdrop-blur-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 appearance-none bg-no-repeat bg-right bg-[length:14px_14px] bg-[position:right_16px_center] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAxNCAxNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMuNSA1LjI1TDcgOC43NUwxMC41IDUuMjUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIxLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')]"
          >
            <option value="all">全部时间</option>
            <option value="today">今天</option>
            <option value="week">最近一周</option>
            <option value="month">最近一月</option>
          </select>
        </div>

        {/* 排序 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            排序方式
          </label>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortField)}
              aria-label="选择排序方式"
              title="选择测试记录的排序方式"
              className="flex-1 pl-4 pr-12 py-2.5 text-sm border border-gray-600/40 rounded-lg bg-gray-700/50 backdrop-blur-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 appearance-none bg-no-repeat bg-right bg-[length:14px_14px] bg-[position:right_16px_center] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAxNCAxNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMuNSA1LjI1TDcgOC43NUwxMC41IDUuMjUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIxLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')]"
            >
              <option value="created_at">创建时间</option>
              <option value="start_time">开始时间</option>
              <option value="duration">测试时长</option>
              <option value="status">状态</option>
            </select>
            <button
              type="button"
              onClick={onSortOrderToggle}
              aria-label={`当前排序: ${sortOrder === 'asc' ? '升序' : '降序'}，点击切换`}
              title={`切换排序顺序 (当前: ${sortOrder === 'asc' ? '升序' : '降序'})`}
              className="flex items-center justify-center w-10 h-10 text-sm border border-gray-600/40 rounded-lg bg-gray-700/50 backdrop-blur-sm text-white hover:bg-gray-600/40 hover:border-gray-500/60 transition-all duration-200"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


