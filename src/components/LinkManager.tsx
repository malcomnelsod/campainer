import React, { useState, useEffect } from 'react';
import { Plus, Copy, Eye, EyeOff, ExternalLink, Trash2 } from 'lucide-react';

interface Link {
  id: string;
  original_url: string;
  short_code: string;
  campaign: string;
  clicks: number;
  cloaked: boolean;
  created_at: string;
  domain?: string;
}

interface LinkManagerProps {
  onStatsUpdate: () => void;
}

const LinkManager: React.FC<LinkManagerProps> = ({ onStatsUpdate }) => {
  const [links, setLinks] = useState<Link[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [domains, setDomains] = useState<{ domain: string }[]>([]);
  const [newLink, setNewLink] = useState({
    original_url: '',
    campaign: '',
    cloaked: false,
    domain: ''
  });

  useEffect(() => {
    fetchLinks();
    fetchDomains();
  }, []);

  const fetchLinks = async () => {
    try {
      const response = await fetch('/api/links');
      const data = await response.json();
      setLinks(data);
    } catch (error) {
      console.error('Failed to fetch links:', error);
    }
  };

  const fetchDomains = async () => {
    try {
      const response = await fetch('/api/domains');
      const data = await response.json();
      setDomains(data);
    } catch (error) {
      console.error('Failed to fetch domains:', error);
    }
  };

  const createLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLink)
      });
      
      if (response.ok) {
        setNewLink({ original_url: '', campaign: '', cloaked: false, domain: '' });
        setIsCreating(false);
        fetchLinks();
        onStatsUpdate();
      }
    } catch (error) {
      console.error('Failed to create link:', error);
    }
  };

  const deleteLink = async (id: string) => {
    if (confirm('Are you sure you want to delete this link?')) {
      try {
        await fetch(`/api/links/${id}`, { method: 'DELETE' });
        fetchLinks();
        onStatsUpdate();
      } catch (error) {
        console.error('Failed to delete link:', error);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  };

  const getShortUrl = (link: Link) => {
    const baseUrl = link.domain || window.location.origin;
    return `${baseUrl}/${link.short_code}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Link Manager</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Create Link</span>
        </button>
      </div>

      {/* Create Link Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Create New Tracking Link</h3>
            <form onSubmit={createLink} className="space-y-4">
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
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  required
                  value={newLink.campaign}
                  onChange={(e) => setNewLink({ ...newLink, campaign: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Black Friday 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Domain (Optional)
                </label>
                <select
                  value={newLink.domain}
                  onChange={(e) => setNewLink({ ...newLink, domain: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Use default domain</option>
                  {domains.map((domain) => (
                    <option key={domain.domain} value={domain.domain}>
                      {domain.domain}
                    </option>
                  ))}
                </select>
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
                  Enable URL cloaking (hide destination in browser)
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
                  onClick={() => setIsCreating(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Links Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Short URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Original URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{link.campaign}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(link.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-blue-600 font-mono">
                        {getShortUrl(link)}
                      </span>
                      <button
                        onClick={() => copyToClipboard(getShortUrl(link))}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {link.original_url}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {link.clicks.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {link.cloaked ? (
                        <EyeOff className="h-4 w-4 text-orange-500" title="Cloaked" />
                      ) : (
                        <Eye className="h-4 w-4 text-green-500" title="Visible" />
                      )}
                      <span className="text-xs text-gray-500">
                        {link.cloaked ? 'Cloaked' : 'Visible'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => window.open(getShortUrl(link), '_blank')}
                        className="text-blue-600 hover:text-blue-900"
                        title="Test Link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteLink(link.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LinkManager;