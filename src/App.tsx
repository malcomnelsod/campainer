import React, { useState, useEffect } from 'react';
import { LinkIcon, BarChart3, Settings, Globe, Shield, Download, Upload, Plus, Copy, Eye, EyeOff, ExternalLink, Trash2 } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description: string;
  created_at: string;
  total_links: number;
  total_clicks: number;
  active: boolean;
}

interface Link {
  id: string;
  campaign_id: string;
  campaign_name: string;
  original_url: string;
  short_code: string;
  clicks: number;
  cloaked: boolean;
  created_at: string;
  active: boolean;
  domain?: string;
}

interface Domain {
  domain: string;
  verified: boolean;
  added_at: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0);

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: ''
  });

  const [newLink, setNewLink] = useState({
    campaign_id: '',
    original_url: '',
    cloaked: false,
    domain: '',
    expires_days: 0
  });

  const [newDomain, setNewDomain] = useState('');

  // Mock data for demonstration
  useEffect(() => {
    // Initialize with some sample data
    const sampleCampaigns: Campaign[] = [
      {
        id: '1',
        name: 'Holiday Sale 2024',
        description: 'Black Friday and Cyber Monday campaign',
        created_at: new Date().toISOString(),
        total_links: 3,
        total_clicks: 127,
        active: true
      }
    ];

    const sampleLinks: Link[] = [
      {
        id: '1',
        campaign_id: '1',
        campaign_name: 'Holiday Sale 2024',
        original_url: 'https://example.com/holiday-sale',
        short_code: 'a1b2c3d4',
        clicks: 127,
        cloaked: true,
        created_at: new Date().toISOString(),
        active: true
      }
    ];

    setCampaigns(sampleCampaigns);
    setLinks(sampleLinks);
  }, []);

  const stats = {
    totalCampaigns: campaigns.length,
    totalLinks: links.length,
    totalClicks: links.reduce((sum, link) => sum + link.clicks, 0),
    todayClicks: Math.floor(Math.random() * 50),
    totalDomains: domains.length,
    activeLinks: links.filter(l => l.active).length
  };

  const createCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    const campaign: Campaign = {
      id: Date.now().toString(),
      name: newCampaign.name,
      description: newCampaign.description,
      created_at: new Date().toISOString(),
      total_links: 0,
      total_clicks: 0,
      active: true
    };
    setCampaigns([...campaigns, campaign]);
    setNewCampaign({ name: '', description: '' });
    setIsCreatingCampaign(false);
    
    if (tutorialStep === 1) {
      setTutorialStep(2);
      setActiveTab('links');
    }
  };

  const createLink = (e: React.FormEvent) => {
    e.preventDefault();
    const campaign = campaigns.find(c => c.id === newLink.campaign_id);
    const shortCode = Math.random().toString(36).substring(2, 10);
    
    const link: Link = {
      id: Date.now().toString(),
      campaign_id: newLink.campaign_id,
      campaign_name: campaign?.name || 'Unknown',
      original_url: newLink.original_url,
      short_code: shortCode,
      clicks: 0,
      cloaked: newLink.cloaked,
      created_at: new Date().toISOString(),
      active: true,
      domain: newLink.domain
    };
    
    setLinks([...links, link]);
    setNewLink({ campaign_id: '', original_url: '', cloaked: false, domain: '', expires_days: 0 });
    setIsCreatingLink(false);
    
    if (tutorialStep === 2) {
      setTutorialStep(3);
      setShowTutorial(false);
    }
  };

  const addDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const domain: Domain = {
      domain: newDomain,
      verified: true,
      added_at: new Date().toISOString()
    };
    setDomains([...domains, domain]);
    setNewDomain('');
    setIsAddingDomain(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  };

  const getShortUrl = (link: Link) => {
    const baseUrl = link.domain || window.location.origin;
    return `${baseUrl}/${link.short_code}`;
  };

  const startTutorial = () => {
    setShowTutorial(false);
    setTutorialStep(1);
    setActiveTab('campaigns');
  };

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'campaigns', name: 'Campaigns', icon: Settings },
    { id: 'links', name: 'Links', icon: LinkIcon },
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
                <span>Campaigns: <strong>{stats.totalCampaigns}</strong></span>
                <span>Links: <strong>{stats.totalLinks}</strong></span>
                <span>Clicks: <strong>{stats.totalClicks}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tutorial Banner */}
      {showTutorial && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-blue-900 font-semibold">🚀 Welcome to ClickTracker Pro!</h3>
                <p className="text-blue-700 text-sm">Create your first email campaign and tracking link in just 2 steps.</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={startTutorial}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Start Tutorial
                </button>
                <button
                  onClick={() => setShowTutorial(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center">
                      <Settings className="h-8 w-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm text-gray-600">Total Campaigns</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalCampaigns}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center">
                      <LinkIcon className="h-8 w-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm text-gray-600">Total Links</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalLinks}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center">
                      <BarChart3 className="h-8 w-8 text-purple-600" />
                      <div className="ml-4">
                        <p className="text-sm text-gray-600">Total Clicks</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalClicks}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold mb-4">Recent Links</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Short URL</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {links.map((link) => (
                          <tr key={link.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {link.campaign_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <code className="text-sm text-blue-600">{getShortUrl(link)}</code>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {link.clicks}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                link.cloaked ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {link.cloaked ? 'Cloaked' : 'Direct'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Campaigns */}
            {activeTab === 'campaigns' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold text-gray-900">Campaigns</h2>
                  <button
                    onClick={() => setIsCreatingCampaign(true)}
                    className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
                      tutorialStep === 1 ? 'ring-4 ring-orange-300 animate-pulse' : ''
                    }`}
                  >
                    <Plus className="h-5 w-5" />
                    <span>Create Campaign</span>
                  </button>
                </div>

                {tutorialStep === 1 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-orange-800 font-medium">👈 Step 1: Click "Create Campaign" to start!</p>
                  </div>
                )}

                {/* Campaigns List */}
                <div className="grid gap-6">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{campaign.name}</h3>
                          <p className="text-gray-600 mt-1">{campaign.description}</p>
                          <div className="flex space-x-4 mt-3 text-sm text-gray-500">
                            <span>Links: {campaign.total_links}</span>
                            <span>Clicks: {campaign.total_clicks}</span>
                            <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          campaign.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {campaign.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {activeTab === 'links' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold text-gray-900">Tracking Links</h2>
                  <button
                    onClick={() => setIsCreatingLink(true)}
                    className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
                      tutorialStep === 2 ? 'ring-4 ring-orange-300 animate-pulse' : ''
                    }`}
                  >
                    <Plus className="h-5 w-5" />
                    <span>Create Link</span>
                  </button>
                </div>

                {tutorialStep === 2 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-orange-800 font-medium">👈 Step 2: Now create your tracking link!</p>
                  </div>
                )}

                {/* Links Table */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Short URL</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Original URL</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {links.map((link) => (
                          <tr key={link.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {link.campaign_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <code className="text-sm text-blue-600">{getShortUrl(link)}</code>
                                <button
                                  onClick={() => copyToClipboard(getShortUrl(link))}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 max-w-xs truncate text-sm text-gray-900">
                              {link.original_url}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {link.clicks}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {link.cloaked ? (
                                  <EyeOff className="h-4 w-4 text-orange-500" />
                                ) : (
                                  <Eye className="h-4 w-4 text-green-500" />
                                )}
                                <span className="text-sm text-gray-600">
                                  {link.cloaked ? 'Cloaked' : 'Direct'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button className="text-blue-600 hover:text-blue-900 mr-3">
                                <ExternalLink className="h-4 w-4" />
                              </button>
                              <button className="text-red-600 hover:text-red-900">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Domains */}
            {activeTab === 'domains' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold text-gray-900">Custom Domains</h2>
                  <button
                    onClick={() => setIsAddingDomain(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Add Domain</span>
                  </button>
                </div>

                {/* Setup Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Domain Setup Instructions</h3>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800">
                    <li>Point your domain/subdomain to your server's IP address using an A record</li>
                    <li>Add the domain using the button above</li>
                    <li>The domain will be available for use in your tracking links</li>
                  </ol>
                </div>

                {/* Domains List */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold">Your Domains</h3>
                  </div>
                  {domains.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <Globe className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No custom domains added yet.</p>
                      <p className="text-sm">Add your first domain to get started.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {domains.map((domain) => (
                            <tr key={domain.domain}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {domain.domain}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  domain.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {domain.verified ? 'Verified' : 'Not Verified'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(domain.added_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Create Campaign Modal */}
      {isCreatingCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Create New Campaign</h3>
            <form onSubmit={createCampaign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  required
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="My Email Campaign"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Campaign description..."
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Campaign
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingCampaign(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Link Modal */}
      {isCreatingLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Create Tracking Link</h3>
            <form onSubmit={createLink} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign
                </label>
                <select
                  required
                  value={newLink.campaign_id}
                  onChange={(e) => setNewLink({ ...newLink, campaign_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Campaign</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Original URL
                </label>
                <input
                  type="url"
                  required
                  value={newLink.original_url}
                  onChange={(e) => setNewLink({ ...newLink, original_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/product"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="cloaked"
                  checked={newLink.cloaked}
                  onChange={(e) => setNewLink({ ...newLink, cloaked: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="cloaked" className="ml-2 text-sm text-gray-700">
                  Enable URL cloaking (hide destination from recipients)
                </label>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Link
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingLink(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Domain Modal */}
      {isAddingDomain && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Add Custom Domain</h3>
            <form onSubmit={addDomain} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain Name
                </label>
                <input
                  type="text"
                  required
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="links.yourdomain.com"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Domain
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingDomain(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Message */}
      {tutorialStep === 3 && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg shadow-lg">
          <h4 className="font-semibold">🎉 Tutorial Complete!</h4>
          <p className="text-sm">Your tracking link is ready to use in email campaigns!</p>
        </div>
      )}
    </div>
  );
}

export default App;