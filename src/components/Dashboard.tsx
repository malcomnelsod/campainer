import React from 'react';
import { TrendingUp, MousePointer, Link2, Globe } from 'lucide-react';

interface DashboardProps {
  stats: {
    totalLinks: number;
    totalClicks: number;
    totalDomains: number;
    todayClicks: number;
  };
  onRefresh: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, onRefresh }) => {
  const statCards = [
    {
      title: 'Total Links',
      value: stats.totalLinks,
      icon: Link2,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: 'Total Clicks',
      value: stats.totalClicks,
      icon: MousePointer,
      color: 'bg-green-500',
      change: '+8%'
    },
    {
      title: 'Active Domains',
      value: stats.totalDomains,
      icon: Globe,
      color: 'bg-purple-500',
      change: '+3%'
    },
    {
      title: 'Today\'s Clicks',
      value: stats.todayClicks,
      icon: TrendingUp,
      color: 'bg-orange-500',
      change: '+24%'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderColor: stat.color.replace('bg-', '') }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
                  <p className="text-sm text-green-600 mt-1">{stat.change} from last week</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">New click from United States</span>
            </div>
            <span className="text-sm text-gray-500">2 minutes ago</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700">New tracking link created</span>
            </div>
            <span className="text-sm text-gray-500">5 minutes ago</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-gray-700">Custom domain verified</span>
            </div>
            <span className="text-sm text-gray-500">1 hour ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;