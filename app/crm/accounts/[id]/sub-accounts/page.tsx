'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Toast from '@/components/ui/Toast';
import EngagementScoreBadge from '@/components/crm/EngagementScoreBadge';

interface SubAccount {
  id: number;
  accountId: number;
  subAccountName: string;
  stateId: number | null;
  cityId: number | null;
  stateName: string | null;
  cityName: string | null;
  engagementScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SubAccountsPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params?.id ? parseInt(params.id as string) : null;

  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [accountInfo, setAccountInfo] = useState<{ accountName: string; stateName: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSubAccount, setEditSubAccount] = useState<SubAccount | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // States and cities
  const [states, setStates] = useState<Array<{ id: number; name: string }>>([]);
  const [cities, setCities] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    subAccountName: '',
    stateId: null as number | null,
    cityId: null as number | null,
  });

  // Fetch sub-accounts
  const fetchSubAccounts = async () => {
    if (!accountId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/subaccounts?account_id=${accountId}`);
      const data = await response.json();
      
      if (data.success) {
        setSubAccounts(data.subAccounts || []);
        // Only show error toast if there's a critical error, not for empty results
        if (data.error && !data.subAccounts) {
          console.error('Sub-accounts API error:', data.error);
          // Don't show toast for empty results - that's normal if no sub-accounts exist
        }
      } else {
        // If not successful but no error thrown, still set empty array
        setSubAccounts([]);
        // Only show error if it's a critical failure, not just empty results
        if (data.error && !data.error.includes('does not exist')) {
          console.error('Sub-accounts fetch failed:', data.error);
        }
      }
    } catch (error: any) {
      console.error('Error fetching sub-accounts:', error);
      // Don't show error toast on fetch failure - just set empty array
      setSubAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  // User info state
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');

  // Load user info on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
      setUsername(localStorage.getItem('username') || '');
    }
  }, []);

  // Fetch account info
  const fetchAccountInfo = async () => {
    if (!accountId) return;
    
    try {
      const params = new URLSearchParams();
      if (!isAdmin && username) {
        params.append('employee', username);
      }
      if (isAdmin) {
        params.append('isAdmin', 'true');
      }
      
      const response = await fetch(`/api/accounts/${accountId}?${params}`);
      const data = await response.json();
      
      if (data.data) {
        // Fetch state name
        let stateName = null;
        if (data.data.state_id) {
          try {
            const stateResponse = await fetch(`/api/states`);
            const stateData = await stateResponse.json();
            if (stateData.success) {
              const state = stateData.states.find((s: any) => s.id === data.data.state_id);
              stateName = state?.name || null;
            }
          } catch (err) {
            console.error('Error fetching state name:', err);
          }
        }
        
        setAccountInfo({
          accountName: data.data.account_name,
          stateName,
        });
      }
    } catch (error: any) {
      console.error('Error fetching account info:', error);
    }
  };

  useEffect(() => {
    if (accountId && (username || isAdmin)) {
      fetchAccountInfo();
      fetchSubAccounts();
      fetchStates();
    }
  }, [accountId, username, isAdmin]);

  // Fetch cities when state changes
  useEffect(() => {
    if (formData.stateId) {
      fetchCities(formData.stateId);
    } else {
      setCities([]);
      setFormData(prev => ({ ...prev, cityId: null }));
    }
  }, [formData.stateId]);

  // Fetch states
  const fetchStates = async () => {
    try {
      const response = await fetch('/api/states');
      const data = await response.json();
      if (data.success) {
        setStates(data.states || []);
      }
    } catch (error) {
      console.error('Error fetching states:', error);
    }
  };

  // Fetch cities for selected state
  const fetchCities = async (stateId: number) => {
    setLoadingCities(true);
    try {
      const response = await fetch(`/api/cities?state_id=${stateId}`);
      const data = await response.json();
      if (data.success) {
        setCities(data.cities || []);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoadingCities(false);
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;

    try {
      setSubmitting(true);

      if (editSubAccount) {
        // Update sub-account
        const response = await fetch('/api/subaccounts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editSubAccount.id,
            subAccountName: formData.subAccountName,
            stateId: formData.stateId,
            cityId: formData.cityId,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to update sub-account');
        }

        setToast({ message: 'Sub-account updated successfully', type: 'success' });
      } else {
        // Create sub-account
        const response = await fetch('/api/subaccounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            subAccountName: formData.subAccountName,
            stateId: formData.stateId,
            cityId: formData.cityId,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to create sub-account');
        }

        setToast({ message: 'Sub-account created successfully', type: 'success' });
      }

      setIsModalOpen(false);
      setFormData({ subAccountName: '', stateId: null, cityId: null });
      setEditSubAccount(null);
      setCities([]);
      await fetchSubAccounts();
    } catch (error: any) {
      console.error('Error saving sub-account:', error);
      setToast({ message: error.message || 'Failed to save sub-account', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle open modal
  const handleOpenModal = () => {
    setEditSubAccount(null);
    setFormData({ subAccountName: '', stateId: null, cityId: null });
    setCities([]);
    setIsModalOpen(true);
  };

  // Handle edit
  const handleEdit = (subAccount: SubAccount) => {
    setEditSubAccount(subAccount);
    setFormData({
      subAccountName: subAccount.subAccountName,
      stateId: subAccount.stateId || null,
      cityId: subAccount.cityId || null,
    });
    // Fetch cities if state is set
    if (subAccount.stateId) {
      fetchCities(subAccount.stateId);
    } else {
      setCities([]);
    }
    setIsModalOpen(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditSubAccount(null);
    setFormData({ subAccountName: '', stateId: null, cityId: null });
    setCities([]);
  };

  if (!accountId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-300">Invalid account ID</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-start py-12 pb-32 relative">
      <div className="w-full max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="w-full flex flex-col items-center mb-10 title-glow fade-up relative">
          <div className="w-full flex items-center justify-between mb-4 relative">
            <button
              onClick={() => router.push('/crm/accounts')}
              className="px-4 py-2 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200"
            >
              ← Back
            </button>
            <div className="text-center">
              <h1 
                className="text-6xl md:text-8xl font-extrabold text-white text-center tracking-tight drop-shadow-2xl text-neon-gold"
                style={{ 
                  textShadow: '0 0 40px rgba(209, 168, 90, 0.4), 0 0 80px rgba(209, 168, 90, 0.2), 0 0 120px rgba(116, 6, 13, 0.1)',
                  letterSpacing: '-0.02em'
                }}
              >
                Sub-Accounts
              </h1>
              {accountInfo && (
                <p className="text-xl text-slate-300 mt-2">
                  {accountInfo.accountName}
                  {accountInfo.stateName && ` - ${accountInfo.stateName}`}
                </p>
              )}
            </div>
            <button 
              onClick={handleOpenModal}
              disabled={submitting}
              className="px-6 py-3 text-lg font-bold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-xl transition-all duration-300 shadow-lg shadow-premium-gold/50 hover:shadow-xl hover:shadow-premium-gold/70 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>+</span>
              <span>Add Sub-Account</span>
            </button>
          </div>
        </div>

        {/* Sub-Accounts Table */}
        <div className="glassmorphic-premium rounded-3xl p-8 slide-up card-hover-gold border-2 border-premium-gold/30 shadow-2xl">
          {loading ? (
            <div className="text-center py-20">
              <div className="text-4xl text-slate-400 mb-4 animate-pulse">⏳</div>
              <p className="text-slate-300">Loading sub-accounts...</p>
            </div>
          ) : subAccounts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl text-slate-400 mb-4">📋</div>
              <p className="text-slate-300">No sub-accounts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#1A103C]/95 backdrop-blur-sm z-10">
                  <tr className="border-b border-white/20">
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Sub-Account Name</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">City + State</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Engagement Score</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subAccounts.map((subAccount) => (
                    <tr 
                      key={subAccount.id} 
                      className="border-b border-white/10 hover:bg-white/5 transition-all duration-200"
                    >
                      <td className="py-4 px-4 text-slate-200 font-semibold">{subAccount.subAccountName}</td>
                      <td className="py-4 px-4 text-slate-200 text-sm">
                        {subAccount.cityName && subAccount.stateName ? (
                          <span>{subAccount.cityName}, {subAccount.stateName}</span>
                        ) : subAccount.cityName ? (
                          <span>{subAccount.cityName}</span>
                        ) : subAccount.stateName ? (
                          <span>{subAccount.stateName}</span>
                        ) : (
                          <span className="text-slate-500 italic">Not set</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <EngagementScoreBadge score={subAccount.engagementScore || 0} />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/crm/subaccounts/${subAccount.id}/contacts`)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-all duration-200"
                          >
                            View Contacts
                          </button>
                          <button
                            onClick={() => handleEdit(subAccount)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-premium-gold/80 hover:bg-premium-gold rounded-lg transition-all duration-200"
                          >
                            ✏️ Edit
                          </button>
                          {isAdmin && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Are you sure you want to delete "${subAccount.subAccountName}"? This action cannot be undone.`)) {
                                  return;
                                }
                                
                                try {
                                  const response = await fetch(`/api/subaccounts/${subAccount.id}`, {
                                    method: 'DELETE',
                                  });
                                  
                                  const data = await response.json();
                                  
                                  if (!response.ok || !data.success) {
                                    throw new Error(data.error || 'Failed to delete sub-account');
                                  }
                                  
                                  setToast({ message: 'Sub-account deleted successfully', type: 'success' });
                                  await fetchSubAccounts();
                                } catch (error: any) {
                                  console.error('Error deleting sub-account:', error);
                                  setToast({ message: error.message || 'Failed to delete sub-account', type: 'error' });
                                }
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-all duration-200"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Account Form Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-up overflow-hidden"
          onClick={handleCloseModal}
        >
          <div 
            className="glassmorphic-premium rounded-3xl max-w-2xl w-full border-2 border-premium-gold/30 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 flex-shrink-0">
              <h2 className="text-2xl font-extrabold text-white drop-shadow-lg">
                {editSubAccount ? 'Edit Sub-Account' : 'Add Sub-Account'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-300 hover:text-white text-2xl font-bold transition-colors"
              >
                ×
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 modal-scrollable">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Sub-Account Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Sub-Account Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subAccountName}
                    onChange={(e) => setFormData(prev => ({ ...prev, subAccountName: e.target.value }))}
                    className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent"
                    placeholder="Enter sub-account name"
                    required
                  />
                </div>

                {/* State and City - Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      State <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.stateId || ''}
                      onChange={(e) => {
                        const stateId = e.target.value ? parseInt(e.target.value) : null;
                        setFormData(prev => ({ ...prev, stateId, cityId: null }));
                      }}
                      className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                      required
                    >
                      <option value="">Select State</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      City <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.cityId || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, cityId: e.target.value ? parseInt(e.target.value) : null }))}
                      className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                      required
                      disabled={!formData.stateId || loadingCities}
                    >
                      <option value="">
                        {loadingCities ? 'Loading cities...' : formData.stateId ? 'Select City' : 'Select State first'}
                      </option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex gap-4 pt-4 border-t border-white/20">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-6 py-3 text-lg font-semibold text-slate-200 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 border border-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-3 text-lg font-bold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-xl transition-all duration-300 shadow-lg shadow-premium-gold/50 hover:shadow-xl hover:shadow-premium-gold/70 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Saving...' : editSubAccount ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

