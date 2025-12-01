'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/ui/Toast';
import AccountForm, { AccountFormData } from '@/components/crm/AccountForm';
import EngagementScoreBadge from '@/components/crm/EngagementScoreBadge';
import StateCitySelect from '@/components/forms/StateCitySelect';

interface SelectedIndustry {
  industry_id: number;
  industry_name: string;
  sub_industry_id: number;
  sub_industry_name: string;
}

// Account interface matching API response
interface Account {
  id: number;
  accountName: string;
  companyStage: string;
  companyTag: string;
  assignedEmployee?: string | null;
  stateId: number | null;
  cityId: number | null;
  stateName: string | null;
  cityName: string | null;
  engagementScore: number;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  website: string | null;
  notes: string | null;
  industries?: SelectedIndustry[];
  createdAt: string;
  updatedAt: string;
}

export default function AccountsPage() {
  const router = useRouter();
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Accounts state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Pagination for performance on large lists
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30; // Render max 30 items at a time for performance

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

  // Fetch accounts from API
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (!isAdmin && username) {
        params.append('employee', username);
      }
      if (isAdmin) {
        params.append('isAdmin', 'true');
      }
      
      const response = await fetch(`/api/accounts?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setAccounts(data.accounts || []);
      } else {
        throw new Error(data.error || 'Failed to fetch accounts');
      }
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      setToast({ message: error.message || 'Failed to load accounts', type: 'error' });
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch accounts on mount and when user info changes
  useEffect(() => {
    if (username || isAdmin) {
      fetchAccounts();
    }
  }, [username, isAdmin]);

  // Filter states
  const [filterStateId, setFilterStateId] = useState<number | null>(null);
  const [filterStateName, setFilterStateName] = useState<string>('');
  const [filterCityId, setFilterCityId] = useState<number | null>(null);
  const [filterCityName, setFilterCityName] = useState<string>('');
  
  // Account details modal state
  const [selectedAccountDetails, setSelectedAccountDetails] = useState<Account | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Sort states
  type SortField = 'accountName' | 'engagementScore' | null;
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default direction
      setSortField(field);
      setSortDirection(field === 'engagementScore' ? 'desc' : 'asc');
    }
  };

  // Filtered and sorted accounts
  const filteredAndSortedAccounts = useMemo(() => {
    let filtered = [...accounts];
    
    if (filterStateId) {
      filtered = filtered.filter(acc => acc.stateId === filterStateId);
    }
    
    if (filterCityId) {
      filtered = filtered.filter(acc => acc.cityId === filterCityId);
    }
    
    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let comparison = 0;
        
        if (sortField === 'accountName') {
          comparison = a.accountName.localeCompare(b.accountName);
        } else if (sortField === 'engagementScore') {
          comparison = (a.engagementScore || 0) - (b.engagementScore || 0);
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    return filtered;
  }, [accounts, filterStateId, filterCityId, sortField, sortDirection]);
  
  // Paginated accounts for performance (only render visible items)
  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedAccounts.slice(startIndex, endIndex);
  }, [filteredAndSortedAccounts, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredAndSortedAccounts.length / itemsPerPage);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStateId, filterCityId, sortField, sortDirection]);
  
  // Get unique states and cities for filters
  const uniqueStates = useMemo(() => {
    const stateMap = new Map<number, { id: number; name: string }>();
    accounts.forEach(acc => {
      if (acc.stateId && acc.stateName) {
        stateMap.set(acc.stateId, { id: acc.stateId, name: acc.stateName });
      }
    });
    return Array.from(stateMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts]);
  
  const uniqueCities = useMemo(() => {
    if (!filterStateId) return [];
    const cityMap = new Map<number, { id: number; name: string }>();
    accounts
      .filter(acc => acc.stateId === filterStateId && acc.cityId && acc.cityName)
      .forEach(acc => {
        if (acc.cityId && acc.cityName) {
          cityMap.set(acc.cityId, { id: acc.cityId, name: acc.cityName });
        }
      });
    return Array.from(cityMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts, filterStateId]);

  // Handle modal open for create
  const handleOpenModal = () => {
    setEditAccount(null);
    setIsModalOpen(true);
  };

  // Handle modal open for edit
  const handleEditAccount = (account: Account) => {
    setEditAccount(account);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditAccount(null);
  };

  // Handle form submit
  const handleSubmit = async (formData: AccountFormData) => {
    try {
      setSubmitting(true);
      
      if (editAccount) {
        // Update account
        try {
          const assignedEmployee = !isAdmin && username ? username : formData.assignedEmployee;
          
          const response = await fetch(`/api/accounts/${editAccount.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountName: formData.accountName,
              companyStage: formData.companyStage,
              companyTag: formData.companyTag,
              assignedEmployee: assignedEmployee,
              website: formData.website || null,
              gstNumber: formData.gstNumber || null,
              notes: formData.notes || null,
              industries: formData.industries || [],
              updatedBy: username || 'System',
            }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to update account');
          }

          setToast({ message: 'Account updated successfully', type: 'success' });
          handleCloseModal();
          await fetchAccounts(); // Refresh list
          return;
        } catch (error: any) {
          console.error('Error updating account:', error);
          setToast({ message: error.message || 'Failed to update account', type: 'error' });
          return;
        }
      }

      // For employees, always use their username as assignedEmployee
      // For admin, use the selected employee from the form
      const assignedEmployee = !isAdmin && username ? username : formData.assignedEmployee;

      // Create new account
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountName: formData.accountName,
            companyStage: formData.companyStage,
            companyTag: formData.companyTag,
            assignedEmployee: assignedEmployee,
            website: formData.website || null,
            gstNumber: formData.gstNumber || null,
            notes: formData.notes || null,
            industries: formData.industries || [],
            createdBy: username || 'System',
          }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create account');
      }

      setToast({ message: 'Account created successfully', type: 'success' });
      handleCloseModal();
      await fetchAccounts(); // Refresh list
    } catch (error: any) {
      console.error('Error creating account:', error);
      setToast({ message: error.message || 'Failed to create account', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle view sub-accounts
  const handleViewSubAccounts = (accountId: number) => {
    router.push(`/crm/accounts/${accountId}/sub-accounts`);
  };
  
  // Handle delete account
  const handleDeleteAccount = async (accountId: number) => {
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete account');
      }
      
      setToast({ message: 'Account deleted successfully', type: 'success' });
      await fetchAccounts(); // Refresh list
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setToast({ message: error.message || 'Failed to delete account', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen py-6 sm:py-8 md:py-12 pb-20 sm:pb-24 md:pb-32 relative w-full">
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4">
        {/* Header with Title and Add Button */}
        <div className="w-full flex flex-col items-center mb-10 title-glow fade-up relative">
          <div className="w-full flex items-center justify-center mb-4 relative">
            <h1 
              className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-extrabold text-white text-center tracking-tight drop-shadow-md text-neon-gold"
              style={{ 
                textShadow: '0 0 10px rgba(209, 168, 90, 0.3)', /* Reduced for performance */
                letterSpacing: '-0.02em'
              }}
            >
              Accounts
            </h1>
            <button 
              onClick={handleOpenModal}
              disabled={submitting}
              className="absolute right-0 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base md:text-lg font-bold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-lg sm:rounded-xl transition-all duration-200 shadow-md shadow-premium-gold/30 flex items-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span>+</span>
              <span className="hidden sm:inline">Create New Account</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        <div className="gold-divider w-full"></div>
      </div>

        {/* Filters - More Prominent */}
        <div className="glassmorphic-premium rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 mb-4 sm:mb-5 md:mb-6 slide-up card-hover-gold border-2 border-premium-gold/30 shadow-md">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-2xl">🔍</div>
              <h2 className="text-xl font-bold text-white">Filter Accounts</h2>
              {(filterStateId || filterCityId) && (
                <span className="px-3 py-1 bg-premium-gold/20 text-premium-gold text-xs font-semibold rounded-full animate-pulse">
                  Active Filters
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 ml-10">Select State and City to filter the accounts list</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <StateCitySelect
                stateId={filterStateId}
                cityId={filterCityId}
                onStateChange={(newStateId, newStateName) => {
                  setFilterStateId(newStateId);
                  setFilterStateName(newStateName);
                  setFilterCityId(null); // Reset city when state changes
                  setFilterCityName('');
                }}
                onCityChange={(newCityId, newCityName) => {
                  setFilterCityId(newCityId);
                  setFilterCityName(newCityName);
                }}
                required={false}
              />
            </div>
            <div className="md:col-span-2 flex justify-between items-center">
              {(filterStateId || filterCityId) && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="font-semibold">Current filters:</span>
                  {filterStateName && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">State: {filterStateName}</span>
                  )}
                  {filterCityName && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded">City: {filterCityName}</span>
                  )}
                </div>
              )}
              <button
                onClick={() => {
                  setFilterStateId(null);
                  setFilterStateName('');
                  setFilterCityId(null);
                  setFilterCityName('');
                }}
                disabled={!filterStateId && !filterCityId}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 disabled:bg-slate-600/50 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                <span>✕</span>
                <span>Clear Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="rounded-xl sm:rounded-2xl md:rounded-3xl bg-black/20 border border-premium-gold/20 shadow-md overflow-x-auto w-full -mx-2 sm:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Sorting Instructions */}
          <div className="mb-4 p-3 bg-premium-gold/10 border border-premium-gold/30 rounded-lg">
            <p className="text-sm text-slate-300 mb-2">
              <span className="font-semibold text-premium-gold">💡 Tip:</span> Click on <span className="font-semibold text-white">"Account Name"</span> or <span className="font-semibold text-white">"Engagement Score"</span> column headers to sort ascending (↑) or descending (↓)
            </p>
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-premium-gold">💡 Tip:</span> Click on any <span className="font-semibold text-white">engagement score badge</span> to view detailed score breakdown and improvement tips
            </p>
          </div>
          {loading ? (
            <div className="text-center py-20">
              <div className="text-4xl text-slate-400 mb-4 animate-pulse">⏳</div>
              <p className="text-slate-300">Loading accounts...</p>
            </div>
          ) : filteredAndSortedAccounts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl text-slate-400 mb-4">📋</div>
              <p className="text-slate-300">No accounts found</p>
            </div>
          ) : (
            <div
              className="accounts-table-wrapper rounded-xl sm:rounded-2xl md:rounded-3xl bg-black/20 border border-premium-gold/20 shadow-md w-full"
              style={{
                overflowX: 'auto',
                overflowY: 'visible',
                WebkitOverflowScrolling: 'touch',
                pointerEvents: 'auto',
                touchAction: 'pan-x',
                overscrollBehaviorX: 'contain',
                minWidth: '100%',
              }}
            >
              <table
                className="crm-accounts-table"
                style={{
                  tableLayout: 'fixed',
                  borderCollapse: 'collapse',
                  borderSpacing: 0,
                  width: 'max-content'
                }}
              >
                <colgroup>
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '300px' }} />
                  <col style={{ width: '200px' }} />
                  <col style={{ width: '200px' }} />
                  <col style={{ width: '280px' }} />
                </colgroup>
                <thead>
                  <tr className="crm-thead-row">
                    <th className="crm-th sr-col">SR No</th>
                    <th className="crm-th acc-col">
                      <button onClick={() => handleSort('accountName')} className="hover:text-premium-gold transition-colors">
                        <span>Account Name</span>
                        {sortField === 'accountName' && <span className="text-premium-gold ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                    </th>
                    <th className="crm-th score-col">
                      <button onClick={() => handleSort('engagementScore')} className="hover:text-premium-gold transition-colors">
                        <span>Engagement Score</span>
                        {sortField === 'engagementScore' && <span className="text-premium-gold ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                    </th>
                    <th className="crm-th assigned-col">Assigned To</th>
                    <th className="crm-th actions-col text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAccounts.map((account, idx) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + idx;
                    return (
                    <tr key={account.id} className="crm-tr">
                      <td className="crm-td sr-col">{globalIndex + 1}</td>
                      <td className="crm-td acc-col" title={account.accountName}>{account.accountName}</td>
                      <td className="crm-td score-col">
                        <EngagementScoreBadge score={account.engagementScore || 0} />
                      </td>
                      <td className="crm-td assigned-col">
                        {account.assignedEmployee ? <span>{account.assignedEmployee}</span> : <span className="text-orange-400 italic badge-pulse px-2 py-0.5 rounded-full bg-orange-500/10 text-sm">Unassigned</span>}
                      </td>
                      <td className="crm-td actions-col text-right">
                        <div className="grid grid-cols-2 gap-2 w-full text-right">
                          <button onClick={() => router.push(`/crm/accounts/${account.id}`)} className="px-2 sm:px-3 py-1.5 text-xs sm:text-xs font-semibold text-white bg-green-500/80 rounded-lg touch-manipulation min-h-[36px] sm:min-h-[40px]" style={{ WebkitTapHighlightColor: 'transparent' }}>Details</button>
                          <button onClick={() => handleViewSubAccounts(account.id)} className="px-2 sm:px-3 py-1.5 text-xs sm:text-xs font-semibold text-white bg-blue-500/80 rounded-lg touch-manipulation min-h-[36px] sm:min-h-[40px]" style={{ WebkitTapHighlightColor: 'transparent' }}>Sub-Accounts</button>
                          <button onClick={() => handleEditAccount(account)} className="px-2 sm:px-3 py-1.5 text-xs sm:text-xs font-semibold text-white bg-yellow-500/80 rounded-lg touch-manipulation min-h-[36px] sm:min-h-[40px]" style={{ WebkitTapHighlightColor: 'transparent' }}>Edit</button>
                          {isAdmin && <button onClick={() => handleDeleteAccount(account.id)} className="px-2 sm:px-3 py-1.5 text-xs sm:text-xs font-semibold text-white bg-red-500/80 rounded-lg touch-manipulation min-h-[36px] sm:min-h-[40px]" style={{ WebkitTapHighlightColor: 'transparent' }}>Delete</button>}
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-4 py-3 border-t border-slate-700/50">
                  <div className="text-sm text-slate-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedAccounts.length)} of {filteredAndSortedAccounts.length} accounts
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm font-semibold text-white bg-slate-700/50 hover:bg-slate-600/50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-slate-300 px-3">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm font-semibold text-white bg-slate-700/50 hover:bg-slate-600/50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Account Form Modal */}
      <AccountForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialData={editAccount ? {
          accountName: editAccount.accountName || '',
          companyStage: editAccount.companyStage || '',
          companyTag: editAccount.companyTag || '',
          assignedEmployee: editAccount.assignedEmployee || '',
          website: editAccount.website || '',
          gstNumber: editAccount.gstNumber || '',
          notes: editAccount.notes || '',
          industries: editAccount.industries || [],
        } : null}
        mode={editAccount ? 'edit' : 'create'}
        isAdmin={isAdmin}
        currentUser={username}
      />

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
