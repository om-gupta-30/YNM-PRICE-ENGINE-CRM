'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Toast from '@/components/ui/Toast';
import EngagementScoreBadge from '@/components/crm/EngagementScoreBadge';
import StateCitySelect from '@/components/forms/StateCitySelect';

interface SubAccount {
  id: number;
  accountId: number;
  accountName: string | null;
  assignedEmployee: string | null;
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
  officeType: string | null;
  engagementScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminSubAccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Helper function to parse URL params
  const getInitialFiltersFromURL = () => {
    if (!searchParams) {
      return {
        accountId: null,
        stateId: null,
        cityId: null,
        officeType: 'all',
        isActive: 'all',
        industryId: null,
        subIndustryId: null,
      };
    }
    return {
      accountId: searchParams.get('accountId') ? parseInt(searchParams.get('accountId')!) : null,
      stateId: searchParams.get('stateId') ? parseInt(searchParams.get('stateId')!) : null,
      cityId: searchParams.get('cityId') ? parseInt(searchParams.get('cityId')!) : null,
      officeType: searchParams.get('officeType') || 'all',
      isActive: searchParams.get('isActive') || 'all',
      industryId: searchParams.get('industryId') ? parseInt(searchParams.get('industryId')!) : null,
      subIndustryId: searchParams.get('subIndustryId') ? parseInt(searchParams.get('subIndustryId')!) : null,
    };
  };

  // Active filter states (applied filters) - initialized from URL
  const initialFilters = getInitialFiltersFromURL();
  const [filterAccountId, setFilterAccountId] = useState<number | null>(initialFilters.accountId);
  const [filterStateId, setFilterStateId] = useState<number | null>(initialFilters.stateId);
  const [filterCityId, setFilterCityId] = useState<number | null>(initialFilters.cityId);
  const [filterOfficeType, setFilterOfficeType] = useState<string>(initialFilters.officeType);
  const [filterIsActive, setFilterIsActive] = useState<string>(initialFilters.isActive);
  const [filterIndustryId, setFilterIndustryId] = useState<number | null>(initialFilters.industryId);
  const [filterSubIndustryId, setFilterSubIndustryId] = useState<number | null>(initialFilters.subIndustryId);

  // Pending filter states (what user is selecting, not yet applied)
  const [pendingFilterAccountId, setPendingFilterAccountId] = useState<number | null>(initialFilters.accountId);
  const [pendingFilterStateId, setPendingFilterStateId] = useState<number | null>(initialFilters.stateId);
  const [pendingFilterCityId, setPendingFilterCityId] = useState<number | null>(initialFilters.cityId);
  const [pendingFilterOfficeType, setPendingFilterOfficeType] = useState<string>(initialFilters.officeType);
  const [pendingFilterIsActive, setPendingFilterIsActive] = useState<string>(initialFilters.isActive);
  const [pendingFilterIndustryId, setPendingFilterIndustryId] = useState<number | null>(initialFilters.industryId);
  const [pendingFilterSubIndustryId, setPendingFilterSubIndustryId] = useState<number | null>(initialFilters.subIndustryId);

  // Sort states
  type SortField = 'subAccountName' | 'accountName' | null;
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('subAccountName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Accounts list for filter
  const [accounts, setAccounts] = useState<Array<{ id: number; accountName: string }>>([]);
  const [states, setStates] = useState<Array<{ id: number; name: string }>>([]);
  const [cities, setCities] = useState<Array<{ id: number; name: string }>>([]);
  const [industries, setIndustries] = useState<Array<{ id: number; name: string; subIndustries: Array<{ id: number; name: string }> }>>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminStatus = localStorage.getItem('isAdmin') === 'true';
      setIsAdmin(adminStatus);
      if (!adminStatus) {
        router.push('/crm/accounts');
      }
    }
  }, [router]);

  // Apply pending filters (called when user clicks confirm)
  const applyFilters = () => {
    setFilterAccountId(pendingFilterAccountId);
    setFilterStateId(pendingFilterStateId);
    setFilterCityId(pendingFilterCityId);
    setFilterOfficeType(pendingFilterOfficeType);
    setFilterIsActive(pendingFilterIsActive);
    setFilterIndustryId(pendingFilterIndustryId);
    setFilterSubIndustryId(pendingFilterSubIndustryId);
    
    // Update URL with new filters
    const params = new URLSearchParams();
    if (pendingFilterAccountId) params.set('accountId', pendingFilterAccountId.toString());
    if (pendingFilterStateId) params.set('stateId', pendingFilterStateId.toString());
    if (pendingFilterCityId) params.set('cityId', pendingFilterCityId.toString());
    if (pendingFilterOfficeType !== 'all') params.set('officeType', pendingFilterOfficeType);
    if (pendingFilterIsActive !== 'all') params.set('isActive', pendingFilterIsActive);
    if (pendingFilterIndustryId) params.set('industryId', pendingFilterIndustryId.toString());
    if (pendingFilterSubIndustryId) params.set('subIndustryId', pendingFilterSubIndustryId.toString());
    
    // Update URL without page reload
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  };

  // Check if there are pending filter changes
  const hasPendingFilterChanges = useMemo(() => {
    return (
      pendingFilterAccountId !== filterAccountId ||
      pendingFilterStateId !== filterStateId ||
      pendingFilterCityId !== filterCityId ||
      pendingFilterOfficeType !== filterOfficeType ||
      pendingFilterIsActive !== filterIsActive ||
      pendingFilterIndustryId !== filterIndustryId ||
      pendingFilterSubIndustryId !== filterSubIndustryId
    );
  }, [pendingFilterAccountId, pendingFilterStateId, pendingFilterCityId, pendingFilterOfficeType, pendingFilterIsActive, pendingFilterIndustryId, pendingFilterSubIndustryId, filterAccountId, filterStateId, filterCityId, filterOfficeType, filterIsActive, filterIndustryId, filterSubIndustryId]);

  // Clear all filters
  const clearAllFilters = () => {
    setPendingFilterAccountId(null);
    setPendingFilterStateId(null);
    setPendingFilterCityId(null);
    setPendingFilterOfficeType('all');
    setPendingFilterIsActive('all');
    setPendingFilterIndustryId(null);
    setPendingFilterSubIndustryId(null);
    // Also clear active filters immediately
    setFilterAccountId(null);
    setFilterStateId(null);
    setFilterCityId(null);
    setFilterOfficeType('all');
    setFilterIsActive('all');
    setFilterIndustryId(null);
    setFilterSubIndustryId(null);
    router.replace(window.location.pathname, { scroll: false });
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSubAccounts();
      fetchAccounts();
      fetchStates();
      fetchIndustries();
    }
  }, [isAdmin, filterAccountId, filterStateId, filterCityId, filterOfficeType, filterIsActive, filterIndustryId, filterSubIndustryId]);

  useEffect(() => {
    if (pendingFilterStateId) {
      fetchCities(pendingFilterStateId);
    } else {
      setCities([]);
      if (!pendingFilterStateId) {
        setPendingFilterCityId(null);
      }
    }
  }, [pendingFilterStateId]);

  useEffect(() => {
    // Reset sub-industry filter when industry changes
    if (!pendingFilterIndustryId) {
      setPendingFilterSubIndustryId(null);
    }
  }, [pendingFilterIndustryId]);

  const fetchSubAccounts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('isAdmin', 'true');
      if (filterAccountId) params.append('account_id', filterAccountId.toString());
      if (filterStateId) params.append('state_id', filterStateId.toString());
      if (filterCityId) params.append('city_id', filterCityId.toString());
      if (filterOfficeType !== 'all') params.append('office_type', filterOfficeType);
      if (filterIsActive !== 'all') params.append('is_active', filterIsActive);
      if (filterIndustryId) params.append('industry_id', filterIndustryId.toString());
      if (filterSubIndustryId) params.append('sub_industry_id', filterSubIndustryId.toString());

      const response = await fetch(`/api/admin/subaccounts?${params}`);
      const data = await response.json();

      if (data.success) {
        setSubAccounts(data.subAccounts || []);
      } else {
        throw new Error(data.error || 'Failed to fetch sub-accounts');
      }
    } catch (error: any) {
      console.error('Error fetching sub-accounts:', error);
      setToast({ message: error.message || 'Failed to load sub-accounts', type: 'error' });
      setSubAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts?isAdmin=true');
      const data = await response.json();
      if (data.success) {
        setAccounts((data.accounts || []).map((acc: any) => ({
          id: acc.id,
          accountName: acc.accountName,
        })));
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchStates = async () => {
    try {
      const response = await fetch('/api/states');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStates((data.states || []).map((s: any) => ({
            id: s.id,
            name: s.name || s.state_name,
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching states:', error);
    }
  };

  const fetchCities = async (stateId: number) => {
    try {
      const response = await fetch(`/api/cities?state_id=${stateId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCities((data.cities || []).map((c: any) => ({
            id: c.id,
            name: c.name || c.city_name,
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchIndustries = async () => {
    try {
      const response = await fetch('/api/industries');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIndustries(data.industries || []);
        }
      }
    } catch (error) {
      console.error('Error fetching industries:', error);
    }
  };

  const uniqueOfficeTypes = useMemo(() => {
    return Array.from(new Set(subAccounts.map(sa => sa.officeType).filter(Boolean))).sort();
  }, [subAccounts]);

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sorted sub-accounts
  const sortedSubAccounts = useMemo(() => {
    if (!sortField) return subAccounts;
    
    return [...subAccounts].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'subAccountName') {
        comparison = (a.subAccountName || '').localeCompare(b.subAccountName || '');
      } else if (sortField === 'accountName') {
        comparison = (a.accountName || '').localeCompare(b.accountName || '');
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [subAccounts, sortField, sortDirection]);

  if (!isAdmin) {
    return null;
  }

  return (
      <div className="min-h-screen py-6 sm:py-8 md:py-12 pb-20 sm:pb-24 md:pb-32 relative w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">All Sub-Accounts</h1>
            <p className="text-slate-400">View and manage all sub-accounts across all accounts</p>
          </div>

          {/* Filters */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Filters</h2>
              {hasPendingFilterChanges && (
                <span className="text-xs text-yellow-400 font-semibold animate-pulse">
                  ⚠️ Changes pending
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Account Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Account</label>
                <select
                  value={pendingFilterAccountId || ''}
                  onChange={(e) => setPendingFilterAccountId(e.target.value ? parseInt(e.target.value) : null)}
                  className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                >
                  <option value="">All Accounts</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName}
                    </option>
                  ))}
                </select>
              </div>

              {/* State Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">State</label>
                <select
                  value={pendingFilterStateId || ''}
                  onChange={(e) => {
                    const newStateId = e.target.value ? parseInt(e.target.value) : null;
                    setPendingFilterStateId(newStateId);
                    setPendingFilterCityId(null);
                  }}
                  className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                >
                  <option value="">All States</option>
                  {states.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* City Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">City</label>
                <select
                  value={pendingFilterCityId || ''}
                  onChange={(e) => setPendingFilterCityId(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={!pendingFilterStateId}
                  className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">All Cities</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Office Type Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Office Type</label>
                <select
                  value={pendingFilterOfficeType}
                  onChange={(e) => setPendingFilterOfficeType(e.target.value)}
                  className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                >
                  <option value="all">All Types</option>
                  {uniqueOfficeTypes.map((type) => (
                    <option key={type} value={type || ''}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Active Status Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Status</label>
                <select
                  value={pendingFilterIsActive}
                  onChange={(e) => setPendingFilterIsActive(e.target.value)}
                  className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                >
                  <option value="all">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              {/* Industry Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Industry</label>
                <select
                  value={pendingFilterIndustryId || ''}
                  onChange={(e) => {
                    const newIndustryId = e.target.value ? parseInt(e.target.value) : null;
                    setPendingFilterIndustryId(newIndustryId);
                    setPendingFilterSubIndustryId(null);
                  }}
                  className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                >
                  <option value="">All Industries</option>
                  {industries.map((industry) => (
                    <option key={industry.id} value={industry.id}>
                      {industry.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-Industry Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Sub-Industry</label>
                <select
                  value={pendingFilterSubIndustryId || ''}
                  onChange={(e) => setPendingFilterSubIndustryId(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={!pendingFilterIndustryId}
                  className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">All Sub-Industries</option>
                  {pendingFilterIndustryId && industries.find(i => i.id === pendingFilterIndustryId)?.subIndustries.map((subIndustry) => (
                    <option key={subIndustry.id} value={subIndustry.id}>
                      {subIndustry.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Filter Actions */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-700/50">
              <button
                onClick={applyFilters}
                disabled={!hasPendingFilterChanges}
                className="px-6 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>✓</span>
                <span>Apply Filters</span>
              </button>
              {(filterAccountId || filterStateId || filterCityId || filterOfficeType !== 'all' || filterIsActive !== 'all' || filterIndustryId || filterSubIndustryId) && (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-all duration-200"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>

          {/* Sub-Accounts Table */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            {loading ? (
              <div className="text-center py-20">
                <div className="text-4xl text-slate-400 mb-4 animate-pulse">⏳</div>
                <p className="text-slate-300">Loading sub-accounts...</p>
              </div>
            ) : sortedSubAccounts.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-4xl text-slate-400 mb-4">📋</div>
                <p className="text-slate-300">No sub-accounts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-[#1A103C]/95 backdrop-blur-sm z-10">
                    <tr className="border-b border-white/20">
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">
                        <button onClick={() => handleSort('accountName')} className="hover:text-premium-gold transition-colors flex items-center gap-1">
                          <span>Account</span>
                          {sortField === 'accountName' && <span className="text-premium-gold">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                        </button>
                      </th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">
                        <button onClick={() => handleSort('subAccountName')} className="hover:text-premium-gold transition-colors flex items-center gap-1">
                          <span>Sub-Account</span>
                          {sortField === 'subAccountName' && <span className="text-premium-gold">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                        </button>
                      </th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Location</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">GST Number</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Website</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Office Type</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Engagement</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Status</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSubAccounts.map((subAccount) => (
                      <tr
                        key={subAccount.id}
                        className="border-b border-white/10 hover:bg-white/5 transition-all duration-200"
                      >
                        <td className="py-4 px-4 text-slate-200">
                          <div>
                            <div className="font-semibold">{subAccount.accountName || 'N/A'}</div>
                            {subAccount.assignedEmployee && (
                              <div className="text-xs text-slate-400">{subAccount.assignedEmployee}</div>
                            )}
                          </div>
                        </td>
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
                        <td className="py-4 px-4 text-slate-200 text-sm">{subAccount.gstNumber || '—'}</td>
                        <td className="py-4 px-4 text-slate-200 text-sm">
                          {subAccount.website ? (
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
                          {subAccount.officeType ? (
                            <span className="px-2 py-1 text-xs font-semibold bg-premium-gold/20 text-premium-gold rounded-lg border border-premium-gold/30">
                              {subAccount.officeType}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <EngagementScoreBadge score={subAccount.engagementScore} />
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${
                            subAccount.isActive
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}>
                            {subAccount.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => router.push(`/crm/subaccounts/${subAccount.id}`)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-all duration-200"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

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
