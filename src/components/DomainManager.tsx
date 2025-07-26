import React, { useState, useEffect } from 'react';
import { Plus, Check, X, AlertCircle, Globe } from 'lucide-react';

interface Domain {
  domain: string;
  verified: boolean;
  added_at: string;
}

interface DomainManagerProps {
  onStatsUpdate: () => void;
}

const DomainManager: React.FC<DomainManagerProps> = ({ onStatsUpdate }) => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newDomain, setNewDomain] = useState('');

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const response = await fetch('/api/domains');
      const data = await response.json();
      setDomains(data);
    } catch (error) {
      console.error('Failed to fetch domains:', error);
    }
  };

  const addDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain })
      });
      
      if (response.ok) {
        setNewDomain('');
        setIsAdding(false);
        fetchDomains();
        onStatsUpdate();
      }
    } catch (error) {
      console.error('Failed to add domain:', error);
    }
  };

  const verifyDomain = async (domain: string) => {
    try {
      const response = await fetch(`/api/domains/${domain}/verify`, {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchDomains();
      }
    } catch (error) {
      console.error('Failed to verify domain:', error);
    }
  };

  const deleteDomain = async (domain: string) => {
    if (confirm('Are you sure you want to delete this domain?')) {
      try {
        await fetch(`/api/domains/${domain}`, { method: 'DELETE' });
        fetchDomains();
        onStatsUpdate();
      } catch (error) {
        console.error('Failed to delete domain:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Domain Manager</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Add Domain</span>
        </button>
      </div>

      {/* Add Domain Modal */}
      {isAdding && (
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
                <p className="text-sm text-gray-500 mt-1">
                  Make sure to point this domain to your server's IP address
                </p>
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
                  onClick={() => setIsAdding(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-6 w-6 text-blue-500 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-blue-900">Domain Setup Instructions</h3>
            <div className="mt-2 text-sm text-blue-700 space-y-2">
              <p>To use a custom domain for your tracking links, follow these steps:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Point your domain/subdomain to your server's IP address using an A record</li>
                <li>Add the domain in the form above</li>
                <li>Click "Verify" once DNS propagation is complete</li>
                <li>The domain will be available for use in your tracking links</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Domains List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Your Domains</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {domains.map((domain) => (
                <tr key={domain.domain} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{domain.domain}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {domain.verified ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">Verified</span>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-600">Not Verified</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(domain.added_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      {!domain.verified && (
                        <button
                          onClick={() => verifyDomain(domain.domain)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => deleteDomain(domain.domain)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {domains.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            <Globe className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No custom domains added yet.</p>
            <p className="text-sm">Add your first domain to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DomainManager;