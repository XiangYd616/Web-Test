import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  color, 
  subtitle,
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-700 rounded w-20"></div>
            <div className="h-8 w-8 bg-gray-700 rounded"></div>
          </div>
          <div className="h-8 bg-gray-700 rounded w-16 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 hover:bg-gray-800/70 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-2xl font-bold text-white">{value}</div>
        
        {subtitle && (
          <div className="text-xs text-gray-500">{subtitle}</div>
        )}
        
        {change !== undefined && (
          <div className="flex items-center space-x-1">
            {change > 0 ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : change < 0 ? (
              <TrendingDown className="w-4 h-4 text-red-400" />
            ) : null}
            <span className={`text-sm font-medium ${
              change > 0 ? 'text-green-400' : 
              change < 0 ? 'text-red-400' : 
              'text-gray-400'
            }`}>
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
