'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/ui/Toast';
import AccountForm, { AccountFormData } from '@/components/crm/AccountForm';
import EngagementScoreBadge from '@/components/crm/EngagementScoreBadge';

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
  engagementScore: number;
  notes: string | null;
  industries?: SelectedIndustry[];
  industryProjects?: Record<string, number>;
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
  const [isDataAnalyst, setIsDataAnalyst] = useState(false);
  const [username, setUsername] = useState('');

  // Load user info on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
      setIsDataAnalyst(localStorage.getItem('isDataAnalyst') === 'true');
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

  // Fetch industries
  const fetchIndustries = async () => {
    try {
      const response = await fetch('/api/industries');
      const data = await response.json();
      if (data.success) {
        setIndustries(data.industries || []);
      }
    } catch (error) {
      console.error('Error fetching industries:', error);
    }
  };

  // Fetch accounts on mount and when user info changes
  useEffect(() => {
    if (username || isAdmin) {
      fetchAccounts();
      fetchIndustries();
    }
  }, [username, isAdmin]);

  // Update sub-industries when industry filter changes
  useEffect(() => {
    if (filterIndustryId) {
      const selectedIndustry = industries.find(ind => ind.id === filterIndustryId);
      setSubIndustries(selectedIndustry?.subIndustries || []);
    } else {
      setSubIndustries([]);
      setFilterSubIndustryId(null);
    }
  }, [filterIndustryId, industries]);

  
  // Account details modal state
  const [selectedAccountDetails, setSelectedAccountDetails] = useState<Account | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Sort states
  type SortField = 'accountName' | 'engagementScore' | null;
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter states
  const [filterIndustryId, setFilterIndustryId] = useState<number | null>(null);
  const [filterSubIndustryId, setFilterSubIndustryId] = useState<number | null>(null);
  const [industries, setIndustries] = useState<Array<{ id: number; name: string; subIndustries: Array<{ id: number; name: string }> }>>([]);
  const [subIndustries, setSubIndustries] = useState<Array<{ id: number; name: string }>>([]);

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
    
    // Apply industry filter
    if (filterIndustryId) {
      filtered = filtered.filter(account => {
        if (!account.industries || account.industries.length === 0) return false;
        return account.industries.some((ind: any) => ind.industry_id === filterIndustryId);
      });
    }
    
    // Apply sub-industry filter
    if (filterSubIndustryId) {
      filtered = filtered.filter(account => {
        if (!account.industries || account.industries.length === 0) return false;
        return account.industries.some((ind: any) => 
          ind.industry_id === filterIndustryId && ind.sub_industry_id === filterSubIndustryId
        );
      });
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
  }, [accounts, sortField, sortDirection, filterIndustryId, filterSubIndustryId]);
  
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
  }, [sortField, sortDirection, filterIndustryId, filterSubIndustryId]);

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
          // Data analysts cannot assign accounts - keep existing assignment or set to null
          // Admin can assign to any employee, employees cannot change assignment
          const assignedEmployee = isDataAnalyst ? (editAccount?.assignedEmployee || null) : (isAdmin ? formData.assignedEmployee : (!isAdmin && username ? username : formData.assignedEmployee));
          const response = await fetch(`/api/accounts/${editAccount.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountName: formData.accountName,
              companyStage: formData.companyStage && formData.companyStage.trim() !== '' ? formData.companyStage : null,
              companyTag: formData.companyTag && formData.companyTag.trim() !== '' ? formData.companyTag : null,
              assignedEmployee: assignedEmployee || null,
              notes: formData.notes || null,
              industries: formData.industries || [],
              industryProjects: formData.industryProjects || {},
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

      // For employees, always use their username as assignedEmployee (auto-assigned)
      // For admin, use the selected employee from the form (or null if not selected)
      // The backend will handle auto-assignment if createdBy is an employee
      // Data analysts cannot assign accounts - always set to null
      // The backend will handle auto-assignment if createdBy is an employee
      const assignedEmployee = isDataAnalyst ? null : (isAdmin ? formData.assignedEmployee : (!isAdmin && username ? username : null));
      // Create new account
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountName: formData.accountName,
            companyStage: formData.companyStage && formData.companyStage.trim() !== '' ? formData.companyStage : null,
            companyTag: formData.companyTag && formData.companyTag.trim() !== '' ? formData.companyTag : null,
            assignedEmployee: assignedEmployee || null,
            notes: formData.notes || null,
            industries: formData.industries || [],
            industryProjects: formData.industryProjects || {},
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
      const params = new URLSearchParams();
      if (username) {
        params.append('deletedBy', username);
      }
      
      const response = await fetch(`/api/accounts/${accountId}?${params}`, {
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
            <div className="absolute right-0 flex items-center gap-2 sm:gap-3">
              <button 
                onClick={handleOpenModal}
                disabled={submitting}
                className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base md:text-lg font-bold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-lg sm:rounded-xl transition-all duration-200 shadow-md shadow-premium-gold/30 flex items-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span>+</span>
                <span className="hidden sm:inline">Create New Account</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>
        <div className="gold-divider w-full"></div>
      </div>


        {/* Filters */}
        <div className="mb-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-white mb-3">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Industry Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Industry</label>
              <select
                value={filterIndustryId || ''}
                onChange={(e) => {
                  setFilterIndustryId(e.target.value ? parseInt(e.target.value) : null);
                  setFilterSubIndustryId(null);
                }}
                className="input-premium w-full px-3 py-2 text-sm text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
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
              <label className="block text-xs font-semibold text-slate-300 mb-2">Sub-Industry</label>
              <select
                value={filterSubIndustryId || ''}
                onChange={(e) => setFilterSubIndustryId(e.target.value ? parseInt(e.target.value) : null)}
                disabled={!filterIndustryId}
                className="input-premium w-full px-3 py-2 text-sm text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Sub-Industries</option>
                {subIndustries.map((subIndustry) => (
                  <option key={subIndustry.id} value={subIndustry.id}>
                    {subIndustry.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(filterIndustryId || filterSubIndustryId) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterIndustryId(null);
                    setFilterSubIndustryId(null);
                  }}
                  className="w-full px-4 py-2 text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-all duration-200"
                >
                  Clear Filters
                </button>
              </div>
            )}
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
        isAdmin={isAdmin}
        isDataAnalyst={isDataAnalyst}
        currentUser={username}
        initialData={editAccount ? {
          accountName: editAccount.accountName || '',
          companyStage: editAccount.companyStage || '',
          companyTag: editAccount.companyTag || '',
          assignedEmployee: editAccount.assignedEmployee || '',
          notes: editAccount.notes || '',
          industries: editAccount.industries || [],
        } : null}
        mode={editAccount ? 'edit' : 'create'}
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
