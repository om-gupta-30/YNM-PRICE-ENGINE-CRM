'use client';

import { useState, useEffect, useMemo } from 'react';
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
  address: string | null;
  pincode: string | null;
  gstNumber: string | null;
  website: string | null;
  isHeadquarter: boolean;
  officeType: 'Headquarter' | 'Zonal Office' | 'Regional Office' | 'Site Office' | null;
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
  const [filteredSubAccounts, setFilteredSubAccounts] = useState<SubAccount[]>([]);
  const [officeTypeFilter, setOfficeTypeFilter] = useState<'all' | 'Headquarter' | 'Zonal Office' | 'Regional Office' | 'Site Office'>('all');
  const [stateFilter, setStateFilter] = useState<number | null>(null);
  const [cityFilter, setCityFilter] = useState<number | null>(null);
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
    address: '',
    pincode: '',
    gstNumber: '',
    website: '',
    isHeadquarter: false,
    officeType: null as 'Headquarter' | 'Zonal Office' | 'Regional Office' | 'Site Office' | null,
  });

  // Fetch sub-accounts
  const fetchSubAccounts = async () => {
    if (!accountId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/subaccounts?account_id=${accountId}`);
      const data = await response.json();
      
      if (data.success) {
        const accounts = Array.isArray(data.subAccounts) ? data.subAccounts : [];
        setSubAccounts(accounts);
        applyFilters(accounts, officeTypeFilter, stateFilter, cityFilter);
        // Only show error toast if there's a critical error, not for empty results
        if (data.error && !data.subAccounts) {
          console.error('Sub-accounts API error:', data.error);
          // Don't show toast for empty results - that's normal if no sub-accounts exist
        }
      } else {
        // If not successful but no error thrown, still set empty array
        setSubAccounts([]);
        setFilteredSubAccounts([]);
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
      const adminValue = localStorage.getItem('isAdmin') === 'true';
      setIsAdmin(adminValue);
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
      
      if (!response.ok) {
        console.error('Failed to fetch account info:', response.status);
        return;
      }
      
      const data = await response.json();
      
      if (data && data.data) {
        // Fetch state name (optional - not critical if it fails)
        let stateName = null;
        if (data.data.state_id) {
          try {
            const stateResponse = await fetch(`/api/states`);
            if (stateResponse.ok) {
              const stateData = await stateResponse.json();
              if (stateData && stateData.success && Array.isArray(stateData.states)) {
                const state = stateData.states.find((s: any) => s && s.id === data.data.state_id);
                stateName = state?.name || null;
              }
            }
          } catch (err) {
            console.error('Error fetching state name:', err);
            // Non-critical error, continue without state name
          }
        }
        
        setAccountInfo({
          accountName: data.data.account_name || 'Unknown Account',
          stateName,
        });
      }
    } catch (error: any) {
      console.error('Error fetching account info:', error);
      // Set default account info on error
      setAccountInfo({
        accountName: 'Unknown Account',
        stateName: null,
      });
    }
  };

  // Apply all filters (office type, state, city)
  const applyFilters = (
    accounts: SubAccount[], 
    officeType: 'all' | 'Headquarter' | 'Zonal Office' | 'Regional Office' | 'Site Office',
    stateId: number | null,
    cityId: number | null
  ) => {
    if (!accounts || accounts.length === 0) {
      setFilteredSubAccounts([]);
      return;
    }
    
    let filtered = [...accounts].filter(acc => acc != null);
    
    // Filter by office type
    if (officeType !== 'all') {
      filtered = filtered.filter(acc => acc && acc.officeType === officeType);
    }
    
    // Filter by state
    if (stateId) {
      filtered = filtered.filter(acc => acc && acc.stateId === stateId);
    }
    
    // Filter by city
    if (cityId) {
      filtered = filtered.filter(acc => acc && acc.cityId === cityId);
    }
    
    setFilteredSubAccounts(filtered);
  };

  // Update filtered list when filters change
  useEffect(() => {
    applyFilters(subAccounts, officeTypeFilter, stateFilter, cityFilter);
  }, [officeTypeFilter, stateFilter, cityFilter, subAccounts]);
  
  // Get unique states and cities for filters
  const uniqueStates = useMemo(() => {
    if (!subAccounts || subAccounts.length === 0) return [];
    return Array.from(new Map(subAccounts
      .filter(acc => acc && acc.stateId && acc.stateName)
      .map(acc => [acc.stateId, { id: acc.stateId!, name: acc.stateName! }]))
      .values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [subAccounts]);
  
  const uniqueCities = useMemo(() => {
    if (!subAccounts || subAccounts.length === 0) return [];
    return Array.from(new Map(subAccounts
      .filter(acc => {
        if (!acc) return false;
        if (!stateFilter) return acc.cityId && acc.cityName;
        return acc.stateId === stateFilter && acc.cityId && acc.cityName;
      })
      .map(acc => [acc.cityId, { id: acc.cityId!, name: acc.cityName! }]))
      .values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [subAccounts, stateFilter]);

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
      if (!response.ok) {
        console.error('Failed to fetch states:', response.status);
        setStates([]);
        return;
      }
      const data = await response.json();
      if (data && data.success && Array.isArray(data.states)) {
        setStates(data.states.filter((s: any) => s != null));
      } else {
        setStates([]);
      }
    } catch (error) {
      console.error('Error fetching states:', error);
      setStates([]);
    }
  };

  // Fetch cities for selected state
  const fetchCities = async (stateId: number) => {
    if (!stateId) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    try {
      const response = await fetch(`/api/cities?state_id=${stateId}`);
      if (!response.ok) {
        console.error('Failed to fetch cities:', response.status);
        setCities([]);
        return;
      }
      const data = await response.json();
      if (data && data.success && Array.isArray(data.cities)) {
        setCities(data.cities.filter((c: any) => c != null));
      } else {
        setCities([]);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCities([]);
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

      if (editSubAccount && editSubAccount.id) {
        // Update sub-account
        const response = await fetch('/api/subaccounts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editSubAccount.id,
            subAccountName: formData.subAccountName || '',
            stateId: formData.stateId,
            cityId: formData.cityId,
            address: formData.address || null,
            pincode: formData.pincode || null,
            gstNumber: formData.gstNumber || null,
            website: formData.website || null,
            isHeadquarter: formData.isHeadquarter || false,
            officeType: formData.officeType || null,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data || !data.success) {
          throw new Error(data?.error || 'Failed to update sub-account');
        }

        setToast({ message: 'Sub-account updated successfully', type: 'success' });
      } else {
        // Create sub-account
        if (!formData.subAccountName || !formData.stateId || !formData.cityId) {
          setToast({ message: 'Please fill all required fields', type: 'error' });
          return;
        }

        const response = await fetch('/api/subaccounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            subAccountName: formData.subAccountName,
            stateId: formData.stateId,
            cityId: formData.cityId,
            address: formData.address || null,
            pincode: formData.pincode || null,
            gstNumber: formData.gstNumber || null,
            website: formData.website || null,
            isHeadquarter: formData.isHeadquarter || false,
            officeType: formData.officeType || null,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data || !data.success) {
          throw new Error(data?.error || 'Failed to create sub-account');
        }

        setToast({ message: 'Sub-account created successfully', type: 'success' });
      }

      setIsModalOpen(false);
      setFormData({ subAccountName: '', stateId: null, cityId: null, address: '', pincode: '', gstNumber: '', website: '', isHeadquarter: false, officeType: null });
      setEditSubAccount(null);
      setCities([]);
      await fetchSubAccounts();
    } catch (error: any) {
      console.error('Error saving sub-account:', error);
      setToast({ message: error?.message || 'Failed to save sub-account', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle open modal
  const handleOpenModal = () => {
    setEditSubAccount(null);
    setFormData({ subAccountName: '', stateId: null, cityId: null, address: '', pincode: '', gstNumber: '', website: '', isHeadquarter: false, officeType: null });
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
      address: subAccount.address || '',
      pincode: subAccount.pincode || '',
      gstNumber: subAccount.gstNumber || '',
      website: subAccount.website || '',
      isHeadquarter: subAccount.isHeadquarter || false,
      officeType: subAccount.officeType || null,
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
    setFormData({ subAccountName: '', stateId: null, cityId: null, address: '', pincode: '', gstNumber: '', website: '', isHeadquarter: false, officeType: null });
    setCities([]);
  };
  
  // Reset city filter when state filter changes
  useEffect(() => {
    if (stateFilter) {
      setCityFilter(null);
    }
  }, [stateFilter]);

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
          {/* Filter Section */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <label className="text-sm font-semibold text-slate-200">Filters:</label>
              
              {/* Office Type Filter */}
              <select
                value={officeTypeFilter}
                onChange={(e) => setOfficeTypeFilter(e.target.value as typeof officeTypeFilter)}
                className="input-premium px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
              >
                <option value="all">All Office Types</option>
                <option value="Headquarter">Headquarter</option>
                <option value="Zonal Office">Zonal Office</option>
                <option value="Regional Office">Regional Office</option>
                <option value="Site Office">Site Office</option>
              </select>
              
              {/* State Filter */}
              <select
                value={stateFilter || ''}
                onChange={(e) => setStateFilter(e.target.value ? parseInt(e.target.value) : null)}
                className="input-premium px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
              >
                <option value="">All States</option>
                {uniqueStates && uniqueStates.length > 0 ? uniqueStates.map((state) => (
                  <option key={state.id} value={String(state.id)}>
                    {state.name}
                  </option>
                )) : null}
              </select>
              
              {/* City Filter */}
              <select
                value={cityFilter || ''}
                onChange={(e) => setCityFilter(e.target.value ? parseInt(e.target.value) : null)}
                disabled={!stateFilter}
                className="input-premium px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {stateFilter ? 'All Cities' : 'Select State First'}
                </option>
                {uniqueCities && uniqueCities.length > 0 ? uniqueCities.map((city) => (
                  <option key={city.id} value={String(city.id)}>
                    {city.name}
                  </option>
                )) : null}
              </select>
              
              {/* Clear Filters Button */}
              {(officeTypeFilter !== 'all' || stateFilter || cityFilter) && (
                <button
                  onClick={() => {
                    setOfficeTypeFilter('all');
                    setStateFilter(null);
                    setCityFilter(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-all duration-200"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="text-4xl text-slate-400 mb-4 animate-pulse">⏳</div>
              <p className="text-slate-300">Loading sub-accounts...</p>
            </div>
          ) : filteredSubAccounts.length === 0 ? (
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
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">GST Number</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Website</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Headquarter</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Engagement Score</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubAccounts && filteredSubAccounts.length > 0 ? filteredSubAccounts.map((subAccount) => (
                    <tr 
                      key={subAccount?.id || Math.random()} 
                      className="border-b border-white/10 hover:bg-white/5 transition-all duration-200"
                    >
                      <td className="py-4 px-4 text-slate-200 font-semibold">{subAccount?.subAccountName || 'N/A'}</td>
                      <td className="py-4 px-4 text-slate-200 text-sm">
                        {subAccount?.cityName && subAccount?.stateName ? (
                          <span>{subAccount.cityName}, {subAccount.stateName}</span>
                        ) : subAccount?.cityName ? (
                          <span>{subAccount.cityName}</span>
                        ) : subAccount?.stateName ? (
                          <span>{subAccount.stateName}</span>
                        ) : (
                          <span className="text-slate-500 italic">Not set</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-200 text-sm">{subAccount?.gstNumber || '—'}</td>
                      <td className="py-4 px-4 text-slate-200 text-sm">
                        {subAccount?.website ? (
                          <a
                            href={subAccount.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-premium-gold hover:underline"
                          >
                            {subAccount.website.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {subAccount?.officeType ? (
                          <span className="px-2 py-1 text-xs font-semibold bg-premium-gold/20 text-premium-gold rounded-lg border border-premium-gold/30">
                            {subAccount.officeType}
                          </span>
                        ) : subAccount?.isHeadquarter ? (
                          <span className="px-2 py-1 text-xs font-semibold bg-premium-gold/20 text-premium-gold rounded-lg border border-premium-gold/30">
                            ✓ HQ
                          </span>
                        ) : (
                          <span className="text-slate-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <EngagementScoreBadge score={subAccount?.engagementScore || 0} />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => subAccount?.id && router.push(`/crm/subaccounts/${subAccount.id}`)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-all duration-200"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => subAccount?.id && router.push(`/crm/subaccounts/${subAccount.id}/contacts`)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-500/80 hover:bg-purple-500 rounded-lg transition-all duration-200"
                          >
                            View Contacts
                          </button>
                          <button
                            onClick={() => subAccount && handleEdit(subAccount)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-premium-gold/80 hover:bg-premium-gold rounded-lg transition-all duration-200"
                          >
                            ✏️ Edit
                          </button>
                          {isAdmin && subAccount?.id && (
                            <button
                              onClick={async () => {
                                if (!subAccount?.subAccountName || !confirm(`Are you sure you want to delete "${subAccount.subAccountName}"? This action cannot be undone.`)) {
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
                  )) : null}
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
                      {states && states.length > 0 ? states.map((state) => (
                        <option key={state.id} value={String(state.id)}>
                          {state.name}
                        </option>
                      )) : <option value="">No states available</option>}
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
                      {cities && cities.length > 0 ? cities.map((city) => (
                        <option key={city.id} value={String(city.id)}>
                          {city.name}
                        </option>
                      )) : <option value="">No cities available</option>}
                    </select>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent min-h-[100px] resize-y"
                    placeholder="Enter full address..."
                    rows={3}
                  />
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                    className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent"
                    placeholder="Enter pincode"
                    maxLength={10}
                  />
                </div>

                {/* GST Number and Website - Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, gstNumber: e.target.value }))}
                      className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent"
                      placeholder="Enter GST number"
                      maxLength={15}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                {/* Office Type Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Office Type
                  </label>
                  <select
                    value={formData.officeType || ''}
                    onChange={(e) => {
                      const value = e.target.value as typeof formData.officeType;
                      setFormData(prev => ({ 
                        ...prev, 
                        officeType: value || null,
                        isHeadquarter: value === 'Headquarter' // Auto-set isHeadquarter if Headquarter is selected
                      }));
                    }}
                    className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                  >
                    <option value="">Select Office Type (Optional)</option>
                    {/* Only show Headquarter option if account doesn't already have one (and not editing existing headquarter) */}
                    {(!subAccounts.some(sa => sa.isHeadquarter && sa.officeType === 'Headquarter') || editSubAccount?.isHeadquarter) && (
                      <option value="Headquarter">Headquarter</option>
                    )}
                    <option value="Zonal Office">Zonal Office</option>
                    <option value="Regional Office">Regional Office</option>
                    <option value="Site Office">Site Office</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    {subAccounts.some(sa => sa.isHeadquarter && sa.officeType === 'Headquarter') && !editSubAccount?.isHeadquarter
                      ? 'This account already has a headquarter. Only one headquarter is allowed per account.'
                      : 'Select the type of office for this sub-account location'}
                  </p>
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

