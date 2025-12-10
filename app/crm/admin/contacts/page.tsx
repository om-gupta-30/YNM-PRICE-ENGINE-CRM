'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Toast from '@/components/ui/Toast';

interface Contact {
  id: number;
  accountId: number;
  accountName: string | null;
  assignedEmployee: string | null;
  subAccountId: number | null;
  subAccountName: string | null;
  stateName: string | null;
  cityName: string | null;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  callStatus: string | null;
  notes: string | null;
  followUpDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminContactsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Helper function to parse URL params
  const getInitialFiltersFromURL = () => {
    if (!searchParams) {
      return {
        accountId: null,
        subAccountId: null,
        callStatus: 'all',
        employeeId: 'all',
      };
    }
    return {
      accountId: searchParams.get('accountId') ? parseInt(searchParams.get('accountId')!) : null,
      subAccountId: searchParams.get('subAccountId') ? parseInt(searchParams.get('subAccountId')!) : null,
      callStatus: searchParams.get('callStatus') || 'all',
      employeeId: searchParams.get('employeeId') || 'all',
    };
  };

  // Helper to get initial filters from localStorage or URL
  const getInitialFilters = () => {
    if (typeof window === 'undefined') {
      return getInitialFiltersFromURL();
    }
    
    // First try localStorage (persisted filters)
    try {
      const stored = localStorage.getItem('crm_filters_contacts');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          accountId: parsed.accountId ?? null,
          subAccountId: parsed.subAccountId ?? null,
          callStatus: parsed.callStatus ?? 'all',
          employeeId: parsed.employeeId ?? 'all',
        };
      }
    } catch (error) {
      console.error('Error loading filters from storage:', error);
    }
    
    // Fallback to URL params
    return getInitialFiltersFromURL();
  };

  // Active filter states (applied filters) - initialized from localStorage or URL
  const initialFilters = getInitialFilters();
  const [filterAccountId, setFilterAccountId] = useState<number | null>(initialFilters.accountId);
  const [filterSubAccountId, setFilterSubAccountId] = useState<number | null>(initialFilters.subAccountId);
  const [filterCallStatus, setFilterCallStatus] = useState<string>(initialFilters.callStatus);
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>(initialFilters.employeeId);

  // Pending filter states (what user is selecting, not yet applied)
  const [pendingFilterAccountId, setPendingFilterAccountId] = useState<number | null>(initialFilters.accountId);
  const [pendingFilterSubAccountId, setPendingFilterSubAccountId] = useState<number | null>(initialFilters.subAccountId);
  const [pendingFilterCallStatus, setPendingFilterCallStatus] = useState<string>(initialFilters.callStatus);
  const [pendingFilterEmployeeId, setPendingFilterEmployeeId] = useState<string>(initialFilters.employeeId);

  // Sort states
  type SortField = 'name' | 'accountName' | 'subAccountName' | null;
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Options for filters
  const [accounts, setAccounts] = useState<Array<{ id: number; accountName: string }>>([]);
  const [subAccounts, setSubAccounts] = useState<Array<{ id: number; subAccountName: string; accountId: number }>>([]);
  const [employees, setEmployees] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminStatus = localStorage.getItem('isAdmin') === 'true';
      setIsAdmin(adminStatus);
      if (!adminStatus) {
        router.push('/crm/accounts');
      }
    }
  }, [router]);

  // Save filters to localStorage
  const saveFiltersToStorage = () => {
    if (typeof window === 'undefined') return;
    const filterData = {
      accountId: pendingFilterAccountId,
      subAccountId: pendingFilterSubAccountId,
      callStatus: pendingFilterCallStatus,
      employeeId: pendingFilterEmployeeId,
    };
    localStorage.setItem('crm_filters_contacts', JSON.stringify(filterData));
  };

  // Clear filters from localStorage
  const clearFiltersFromStorage = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('crm_filters_contacts');
  };

  // Apply pending filters (called when user clicks confirm)
  const applyFilters = () => {
    setFilterAccountId(pendingFilterAccountId);
    setFilterSubAccountId(pendingFilterSubAccountId);
    setFilterCallStatus(pendingFilterCallStatus);
    setFilterEmployeeId(pendingFilterEmployeeId);
    
    // Save to localStorage for persistence across pages
    saveFiltersToStorage();
    
    // Update URL with new filters
    const params = new URLSearchParams();
    if (pendingFilterAccountId) params.set('accountId', pendingFilterAccountId.toString());
    if (pendingFilterSubAccountId) params.set('subAccountId', pendingFilterSubAccountId.toString());
    if (pendingFilterCallStatus !== 'all') params.set('callStatus', pendingFilterCallStatus);
    if (pendingFilterEmployeeId !== 'all') params.set('employeeId', pendingFilterEmployeeId);
    
    // Update URL without page reload
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  };

  // Check if there are pending filter changes
  const hasPendingFilterChanges = useMemo(() => {
    return (
      pendingFilterAccountId !== filterAccountId ||
      pendingFilterSubAccountId !== filterSubAccountId ||
      pendingFilterCallStatus !== filterCallStatus ||
      pendingFilterEmployeeId !== filterEmployeeId
    );
  }, [pendingFilterAccountId, pendingFilterSubAccountId, pendingFilterCallStatus, pendingFilterEmployeeId, filterAccountId, filterSubAccountId, filterCallStatus, filterEmployeeId]);

  // Clear all filters
  const clearAllFilters = () => {
    setPendingFilterAccountId(null);
    setPendingFilterSubAccountId(null);
    setPendingFilterCallStatus('all');
    setPendingFilterEmployeeId('all');
    // Also clear active filters immediately
    setFilterAccountId(null);
    setFilterSubAccountId(null);
    setFilterCallStatus('all');
    setFilterEmployeeId('all');
    // Clear from localStorage
    clearFiltersFromStorage();
    router.replace(window.location.pathname, { scroll: false });
  };

  // Sync filters from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check localStorage (persisted filters)
    const storedFilters = (() => {
      try {
        const stored = localStorage.getItem('crm_filters_contacts');
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            accountId: parsed.accountId ?? null,
            subAccountId: parsed.subAccountId ?? null,
            callStatus: parsed.callStatus ?? 'all',
            employeeId: parsed.employeeId ?? 'all',
          };
        }
      } catch (error) {
        console.error('Error loading filters from storage:', error);
      }
      return null;
    })();
    
    // If we have stored filters, update states and URL
    if (storedFilters) {
      setFilterAccountId(storedFilters.accountId);
      setPendingFilterAccountId(storedFilters.accountId);
      setFilterSubAccountId(storedFilters.subAccountId);
      setPendingFilterSubAccountId(storedFilters.subAccountId);
      setFilterCallStatus(storedFilters.callStatus);
      setPendingFilterCallStatus(storedFilters.callStatus);
      setFilterEmployeeId(storedFilters.employeeId);
      setPendingFilterEmployeeId(storedFilters.employeeId);
      
      // Update URL to match
      const params = new URLSearchParams();
      if (storedFilters.accountId) params.set('accountId', storedFilters.accountId.toString());
      if (storedFilters.subAccountId) params.set('subAccountId', storedFilters.subAccountId.toString());
      if (storedFilters.callStatus !== 'all') params.set('callStatus', storedFilters.callStatus);
      if (storedFilters.employeeId !== 'all') params.set('employeeId', storedFilters.employeeId);
      const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, []); // Only run on mount

  useEffect(() => {
    if (isAdmin) {
      fetchContacts();
      fetchAccounts();
      fetchEmployees();
    }
  }, [isAdmin, filterAccountId, filterSubAccountId, filterCallStatus, filterEmployeeId]);

  useEffect(() => {
    if (pendingFilterAccountId) {
      fetchSubAccountsForAccount(pendingFilterAccountId);
    } else {
      setSubAccounts([]);
      if (!pendingFilterAccountId) {
        setPendingFilterSubAccountId(null);
      }
    }
  }, [pendingFilterAccountId]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('isAdmin', 'true');
      if (filterAccountId) params.append('account_id', filterAccountId.toString());
      if (filterSubAccountId) params.append('sub_account_id', filterSubAccountId.toString());
      if (filterCallStatus !== 'all') params.append('call_status', filterCallStatus);
      if (filterEmployeeId !== 'all') params.append('employee_id', filterEmployeeId);

      const response = await fetch(`/api/admin/contacts?${params}`);
      const data = await response.json();

      if (data.success) {
        setContacts(data.contacts || []);
      } else {
        throw new Error(data.error || 'Failed to fetch contacts');
      }
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      setToast({ message: error.message || 'Failed to load contacts', type: 'error' });
      setContacts([]);
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

  const fetchSubAccountsForAccount = async (accountId: number) => {
    try {
      const response = await fetch(`/api/subaccounts?account_id=${accountId}`);
      const data = await response.json();
      if (data.success) {
        setSubAccounts((data.subAccounts || []).map((sa: any) => ({
          id: sa.id,
          subAccountName: sa.subAccountName,
          accountId: sa.accountId,
        })));
      }
    } catch (error) {
      console.error('Error fetching sub-accounts:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      const data = await response.json();
      if (data.success && Array.isArray(data.employees)) {
        setEmployees(data.employees.filter((e: string) => e?.toLowerCase() !== 'admin'));
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const uniqueCallStatuses = Array.from(new Set(contacts.map(c => c.callStatus).filter(Boolean))).sort();

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

  // Sorted contacts
  const sortedContacts = useMemo(() => {
    if (!sortField) return contacts;
    
    return [...contacts].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (sortField === 'accountName') {
        comparison = (a.accountName || '').localeCompare(b.accountName || '');
      } else if (sortField === 'subAccountName') {
        comparison = (a.subAccountName || '').localeCompare(b.subAccountName || '');
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [contacts, sortField, sortDirection]);

  if (!isAdmin) {
    return null;
  }

  return (
      <div className="min-h-screen py-6 sm:py-8 md:py-12 pb-20 sm:pb-24 md:pb-32 relative w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">All Contacts</h1>
            <p className="text-slate-400">View and manage all contacts across all accounts and sub-accounts</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Account Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Account</label>
                <select
                  value={pendingFilterAccountId || ''}
                  onChange={(e) => {
                    const newAccountId = e.target.value ? parseInt(e.target.value) : null;
                    setPendingFilterAccountId(newAccountId);
                    setPendingFilterSubAccountId(null);
                  }}
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

              {/* Sub-Account Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Sub-Account</label>
                <select
                  value={pendingFilterSubAccountId || ''}
                  onChange={(e) => setPendingFilterSubAccountId(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={!pendingFilterAccountId}
                  className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">All Sub-Accounts</option>
                  {subAccounts.map((sa) => (
                    <option key={sa.id} value={sa.id}>
                      {sa.subAccountName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Call Status Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Call Status</label>
                <select
                  value={pendingFilterCallStatus}
                  onChange={(e) => setPendingFilterCallStatus(e.target.value)}
                  className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                >
                  <option value="all">All Statuses</option>
                  {uniqueCallStatuses.map((status) => (
                    <option key={status} value={status || ''}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Created By</label>
                <select
                  value={pendingFilterEmployeeId}
                  onChange={(e) => setPendingFilterEmployeeId(e.target.value)}
                  className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                >
                  <option value="all">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
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
              {(filterAccountId || filterSubAccountId || filterCallStatus !== 'all' || filterEmployeeId !== 'all') && (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-all duration-200"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>

          {/* Contacts Table */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            {loading ? (
              <div className="text-center py-20">
                <div className="text-4xl text-slate-400 mb-4 animate-pulse">⏳</div>
                <p className="text-slate-300">Loading contacts...</p>
              </div>
            ) : sortedContacts.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-4xl text-slate-400 mb-4">👥</div>
                <p className="text-slate-300">No contacts found</p>
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
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">
                        <button onClick={() => handleSort('name')} className="hover:text-premium-gold transition-colors flex items-center gap-1">
                          <span>Contact Name</span>
                          {sortField === 'name' && <span className="text-premium-gold">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                        </button>
                      </th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Designation</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Email</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Phone</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Call Status</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Location</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Created By</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedContacts.map((contact) => (
                      <tr
                        key={contact.id}
                        className="border-b border-white/10 hover:bg-white/5 transition-all duration-200"
                      >
                        <td className="py-4 px-4 text-slate-200">
                          <div>
                            <div className="font-semibold">{contact.accountName || 'N/A'}</div>
                            {contact.assignedEmployee && (
                              <div className="text-xs text-slate-400">{contact.assignedEmployee}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-200 text-sm">{contact.subAccountName || '—'}</td>
                        <td className="py-4 px-4 text-slate-200 font-semibold">{contact.name}</td>
                        <td className="py-4 px-4 text-slate-200 text-sm">{contact.designation || '—'}</td>
                        <td className="py-4 px-4 text-slate-200 text-sm">{contact.email || '—'}</td>
                        <td className="py-4 px-4 text-slate-200 text-sm">{contact.phone || '—'}</td>
                        <td className="py-4 px-4">
                          {contact.callStatus ? (
                            <span className="px-2 py-1 text-xs font-semibold bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30">
                              {contact.callStatus}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-200 text-sm">
                          {contact.cityName && contact.stateName ? (
                            <span>{contact.cityName}, {contact.stateName}</span>
                          ) : contact.cityName ? (
                            <span>{contact.cityName}</span>
                          ) : contact.stateName ? (
                            <span>{contact.stateName}</span>
                          ) : (
                            <span className="text-slate-500 italic">Not set</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-200 text-sm">{contact.createdBy}</td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => router.push(`/crm/accounts/${contact.accountId}`)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-premium-gold/80 hover:bg-premium-gold rounded-lg transition-all duration-200"
                          >
                            View Account
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
