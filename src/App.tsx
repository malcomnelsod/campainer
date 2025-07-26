import React, { useState, useEffect } from 'react';
import { LinkIcon, BarChart3, Settings, Globe, Shield, Download, Upload } from 'lucide-react';
import Dashboard from './components/Dashboard';
import LinkManager from './components/LinkManager';
import Analytics from './components/Analytics';
import DomainManager from './components/DomainManager';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalLinks: 0,
    totalClicks: 0,
    totalDomains: 0,
    todayClicks: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'links', name: 'Link Manager', icon: LinkIcon },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'domains', name: 'Domains', icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">ClickTracker Pro</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <span>Links: <strong>{stats.totalLinks}</strong></span>
                <span>Clicks: <strong>{stats.totalClicks}</strong></span>
                <span>Today: <strong>{stats.todayClicks}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* Sidebar Navigation */}
          <nav className="w-64 bg-white rounded-lg shadow-md p-6">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeTab === item.id
                          ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            {activeTab === 'dashboard' && <Dashboard stats={stats} onRefresh={fetchStats} />}
            {activeTab === 'links' && <LinkManager onStatsUpdate={fetchStats} />}
            {activeTab === 'analytics' && <Analytics />}
            {activeTab === 'domains' && <DomainManager onStatsUpdate={fetchStats} />}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;