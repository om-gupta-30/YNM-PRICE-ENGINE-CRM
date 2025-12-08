'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  stateId?: number | null;
  cityId?: number | null;
  stateName?: string | null;
  cityName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AccountsPage() {
  const router = useRouter();
  
  // ========== ALL STATE DECLARATIONS FIRST ==========
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

  // User info state - initialize from localStorage immediately to avoid uninitialized variable errors
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isAdmin') === 'true';
    }
    return false;
  });
  const [isDataAnalyst, setIsDataAnalyst] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isDataAnalyst') === 'true';
    }
    return false;
  });
  const [username, setUsername] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('username') || '';
    }
    return '';
  });

  // Filter states - MUST be declared before functions that use them
  const [filterIndustryId, setFilterIndustryId] = useState<number | null>(null);
  const [filterSubIndustryId, setFilterSubIndustryId] = useState<number | null>(null);
  const [industries, setIndustries] = useState<Array<{ id: number; name: string; subIndustries: Array<{ id: number; name: string }> }>>([]);
  const [subIndustries, setSubIndustries] = useState<Array<{ id: number; name: string }>>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStateId, setFilterStateId] = useState<number | null>(null);
  const [filterCityId, setFilterCityId] = useState<number | null>(null);
  const [states, setStates] = useState<Array<{ id: number; name: string }>>([]);
  const [cities, setCities] = useState<Array<{ id: number; name: string; state_id: number }>>([]);

  // Account details modal state
  const [selectedAccountDetails, setSelectedAccountDetails] = useState<Account | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Projects breakdown modal state
  const [projectsBreakdownAccount, setProjectsBreakdownAccount] = useState<Account | null>(null);
  const [isProjectsBreakdownOpen, setIsProjectsBreakdownOpen] = useState(false);

  // Sort states
  type SortField = 'accountName' | 'engagementScore' | null;
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Bulk assign states
  const [isBulkAssignMode, setIsBulkAssignMode] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<number>>(new Set());
  const [employees, setEmployees] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // ========== FUNCTIONS AFTER STATE ==========
  // Fetch accounts from API
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      // Get current values from localStorage to avoid stale closure
      if (typeof window !== 'undefined') {
        const currentIsAdmin = localStorage.getItem('isAdmin') === 'true';
        const currentIsDataAnalyst = localStorage.getItem('isDataAnalyst') === 'true';
        const currentUsername = localStorage.getItem('username') || '';
        // Data analysts should see all accounts like admins, but with restrictions
        const effectiveIsAdmin = currentIsAdmin || currentIsDataAnalyst;
        if (!effectiveIsAdmin && currentUsername) {
          params.append('employee', currentUsername);
        }
        if (effectiveIsAdmin) {
          params.append('isAdmin', 'true');
        }
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

  // Fetch states
  const fetchStates = async () => {
    try {
      const response = await fetch('/api/states');
      const data = await response.json();
      if (data.success && Array.isArray(data.states)) {
        setStates(data.states);
      }
    } catch (error) {
      console.error('Error fetching states:', error);
    }
  };

  // Fetch cities for selected state
  const fetchCities = async (stateId: number) => {
    try {
      const response = await fetch(`/api/cities?state_id=${stateId}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.cities)) {
        setCities(data.cities);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

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
      
      // Get current values to avoid stale closure
      const currentIsAdmin = typeof window !== 'undefined' ? localStorage.getItem('isAdmin') === 'true' : false;
      const currentIsDataAnalyst = typeof window !== 'undefined' ? localStorage.getItem('isDataAnalyst') === 'true' : false;
      const currentUsername = typeof window !== 'undefined' ? localStorage.getItem('username') || '' : '';
      
      // Determine assigned employee based on user role:
      // - Admin (not data analyst): Can assign to any employee via form, use formData.assignedEmployee
      // - Data analyst: Cannot assign accounts - keep existing or null
      // - Employee: Auto-assign to themselves
      const determineAssignedEmployee = (existingAssignment?: string | null) => {
        if (currentIsDataAnalyst) {
          // Data analysts cannot assign - keep existing
          return existingAssignment || null;
        }
        if (currentIsAdmin) {
          // Admin can assign via form - use the value from form (can be null for unassigned)
          return formData.assignedEmployee || null;
        }
        // Regular employee - auto-assign to themselves
        return currentUsername || null;
      };
      
      if (editAccount) {
        // Update account
        try {
          const assignedEmployee = determineAssignedEmployee(editAccount?.assignedEmployee);
          const response = await fetch(`/api/accounts/${editAccount.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountName: formData.accountName,
              companyStage: formData.companyStage && formData.companyStage.trim() !== '' ? formData.companyStage : null,
              companyTag: formData.companyTag && formData.companyTag.trim() !== '' ? formData.companyTag : null,
              assignedEmployee: assignedEmployee,
              notes: formData.notes || null,
              industries: formData.industries || [],
              industryProjects: formData.industryProjects || {},
              updatedBy: currentUsername || 'System',
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

      // Create new account
      const assignedEmployee = determineAssignedEmployee(null);
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountName: formData.accountName,
            companyStage: formData.companyStage && formData.companyStage.trim() !== '' ? formData.companyStage : null,
            companyTag: formData.companyTag && formData.companyTag.trim() !== '' ? formData.companyTag : null,
            assignedEmployee: assignedEmployee,
            notes: formData.notes || null,
            industries: formData.industries || [],
            industryProjects: formData.industryProjects || {},
            createdBy: currentUsername || 'System',
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
    // Data analysts cannot delete accounts
    if (typeof window !== 'undefined') {
      const currentIsDataAnalyst = localStorage.getItem('isDataAnalyst') === 'true';
      if (currentIsDataAnalyst) {
        setToast({ message: 'Data analysts cannot delete accounts', type: 'error' });
        return;
      }
    }
    
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return;
    }
    
    try {
      const params = new URLSearchParams();
      const currentUsername = typeof window !== 'undefined' ? localStorage.getItem('username') || '' : '';
      if (currentUsername) {
        params.append('deletedBy', currentUsername);
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

  // Fetch employees for bulk assign
  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await fetch('/api/employees?type=sales');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.employees) {
          setEmployees(data.employees);
        }
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Toggle bulk assign mode
  const toggleBulkAssignMode = () => {
    try {
      const newMode = !isBulkAssignMode;
      console.log('Toggling bulk assign mode:', { current: isBulkAssignMode, new: newMode });
      
      if (newMode) {
        // Entering bulk assign mode - fetch employees
        fetchEmployees();
      } else {
        // Exiting bulk assign mode - clear selections
        setSelectedAccountIds(new Set());
        setSelectedEmployee('');
      }
      setIsBulkAssignMode(newMode);
    } catch (error) {
      console.error('Error toggling bulk assign mode:', error);
      setToast({ message: 'Failed to toggle bulk assign mode', type: 'error' });
    }
  };

  // Toggle account selection
  const toggleAccountSelection = (accountId: number) => {
    setSelectedAccountIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  // Select all visible accounts
  const selectAllVisible = () => {
    const visibleIds = new Set(paginatedAccounts.map(acc => acc.id));
    setSelectedAccountIds(visibleIds);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedAccountIds(new Set());
  };

  // Handle bulk assign
  const handleBulkAssign = async () => {
    if (selectedAccountIds.size === 0) {
      setToast({ message: 'Please select at least one account', type: 'error' });
      return;
    }

    // selectedEmployee can be empty string (for unassigning) or a valid employee name
    // No need to validate it further - empty string means unassign

    const confirmMessage = selectedEmployee
      ? `Are you sure you want to assign ${selectedAccountIds.size} account(s) to ${selectedEmployee}?`
      : `Are you sure you want to unassign ${selectedAccountIds.size} account(s)?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setBulkAssigning(true);
      const currentUsername = typeof window !== 'undefined' ? localStorage.getItem('username') || '' : '';
      
      const response = await fetch('/api/admin/accounts/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountIds: Array.from(selectedAccountIds),
          assignedEmployee: selectedEmployee || null,
          updatedBy: currentUsername || 'System',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to assign accounts');
      }

      setToast({ 
        message: data.message || `Successfully assigned ${data.updatedCount} account(s)`, 
        type: 'success' 
      });
      
      // Reset bulk assign mode
      setIsBulkAssignMode(false);
      setSelectedAccountIds(new Set());
      setSelectedEmployee('');
      
      // Refresh accounts list
      await fetchAccounts();
    } catch (error: any) {
      console.error('Error bulk assigning accounts:', error);
      setToast({ message: error.message || 'Failed to assign accounts', type: 'error' });
    } finally {
      setBulkAssigning(false);
    }
  };

  // ========== COMPUTED VALUES ==========
  // Filtered and sorted accounts
  const filteredAndSortedAccounts = useMemo(() => {
    let filtered = [...accounts];
    
    // Apply search query filter (by company name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(account => 
        account.accountName.toLowerCase().includes(query)
      );
    }
    
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
    
    // Apply state filter
    if (filterStateId) {
      filtered = filtered.filter(account => account.stateId === filterStateId);
    }
    
    // Apply city filter
    if (filterCityId) {
      filtered = filtered.filter(account => account.cityId === filterCityId);
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
  }, [accounts, sortField, sortDirection, filterIndustryId, filterSubIndustryId, searchQuery, filterStateId, filterCityId]);
  
  // Paginated accounts for performance (only render visible items)
  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedAccounts.slice(startIndex, endIndex);
  }, [filteredAndSortedAccounts, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredAndSortedAccounts.length / itemsPerPage);

  // ========== EFFECTS ==========
  // Load user info on mount (update if changed)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
      setIsDataAnalyst(localStorage.getItem('isDataAnalyst') === 'true');
      setUsername(localStorage.getItem('username') || '');
    }
  }, []);

  // Fetch accounts on mount and when user info changes
  useEffect(() => {
    // Wait for user info to be loaded before fetching
    // Check localStorage directly to avoid uninitialized variable errors
    if (typeof window === 'undefined') return;
    
    const currentUsername = localStorage.getItem('username') || '';
    const currentIsAdmin = localStorage.getItem('isAdmin') === 'true';
    const currentIsDataAnalyst = localStorage.getItem('isDataAnalyst') === 'true';
    
    // Always fetch if we have any user info (username, admin, or data analyst)
    if (currentUsername || currentIsAdmin || currentIsDataAnalyst) {
      fetchAccounts();
      fetchIndustries();
      fetchStates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, isAdmin, isDataAnalyst]);

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

  // Fetch cities when state filter changes
  useEffect(() => {
    if (filterStateId) {
      fetchCities(filterStateId);
    } else {
      setCities([]);
      setFilterCityId(null);
    }
  }, [filterStateId]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortField, sortDirection, filterIndustryId, filterSubIndustryId, searchQuery, filterStateId, filterCityId]);

  // ========== RENDER ==========
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
            <div className="absolute right-0 flex flex-col items-end gap-2 sm:gap-3">
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
              {isAdmin && !isDataAnalyst && (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleBulkAssignMode();
                  }}
                  type="button"
                  className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base md:text-lg font-bold rounded-lg sm:rounded-xl transition-all duration-200 flex items-center gap-1 sm:gap-2 touch-manipulation min-h-[44px] ${
                    isBulkAssignMode
                      ? 'text-white bg-blue-600 hover:bg-blue-700'
                      : 'text-white bg-blue-500/80 hover:bg-blue-600'
                  }`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <span>{isBulkAssignMode ? '✓' : '📋'}</span>
                  <span className="hidden sm:inline">{isBulkAssignMode ? 'Exit Bulk Assign' : 'Bulk Assign'}</span>
                  <span className="sm:hidden">{isBulkAssignMode ? 'Exit' : 'Bulk'}</span>
                </button>
              )}
            </div>
          </div>
        <div className="gold-divider w-full"></div>
      </div>


        {/* Search Bar */}
        <div className="mb-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-white mb-3">Search</h3>
          <div className="w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company name..."
              className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-white mb-3">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* State Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">State</label>
              <select
                value={filterStateId || ''}
                onChange={(e) => {
                  const newStateId = e.target.value ? parseInt(e.target.value) : null;
                  setFilterStateId(newStateId);
                  setFilterCityId(null); // Reset city when state changes
                }}
                className="input-premium w-full px-3 py-2 text-sm text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
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
              <label className="block text-xs font-semibold text-slate-300 mb-2">City</label>
              <select
                value={filterCityId || ''}
                onChange={(e) => setFilterCityId(e.target.value ? parseInt(e.target.value) : null)}
                disabled={!filterStateId}
                className="input-premium w-full px-3 py-2 text-sm text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Cities</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(filterIndustryId || filterSubIndustryId || filterStateId || filterCityId || searchQuery.trim()) && (
              <div className="flex items-end md:col-span-2 lg:col-span-4">
                <button
                  onClick={() => {
                    setFilterIndustryId(null);
                    setFilterSubIndustryId(null);
                    setFilterStateId(null);
                    setFilterCityId(null);
                    setSearchQuery('');
                  }}
                  className="w-full px-4 py-2 text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-all duration-200"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Assign Toolbar */}
        {isBulkAssignMode && isAdmin && !isDataAnalyst && (
          <div className="mb-6 bg-blue-600/20 border border-blue-500/50 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">Bulk Assign Accounts</h3>
                <p className="text-sm text-slate-300">
                  {selectedAccountIds.size > 0 
                    ? `${selectedAccountIds.size} account(s) selected`
                    : 'Select accounts using the checkboxes below'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="flex-1 sm:flex-initial">
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    disabled={loadingEmployees || bulkAssigning}
                    className="input-premium w-full sm:w-64 px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Employee (or Unassigned)</option>
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp} value={emp}>
                        {emp}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleBulkAssign}
                  disabled={selectedAccountIds.size === 0 || bulkAssigning || loadingEmployees}
                  className="px-6 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkAssigning ? 'Assigning...' : 'Confirm Assign'}
                </button>
                <button
                  onClick={selectedAccountIds.size > 0 ? deselectAll : selectAllVisible}
                  className="px-4 py-2 text-sm font-semibold text-white bg-slate-600 hover:bg-slate-700 rounded-lg transition-all duration-200"
                >
                  {selectedAccountIds.size > 0 ? 'Deselect All' : 'Select All Visible'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Accounts Table */}
        <div className="rounded-xl sm:rounded-2xl md:rounded-3xl bg-black/20 border border-premium-gold/20 shadow-md overflow-x-auto w-full -mx-2 sm:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Sorting Instructions */}
          <div className="mb-4 p-3 bg-premium-gold/10 border border-premium-gold/30 rounded-lg">
            <p className="text-sm text-slate-300 mb-2">
              <span className="font-semibold text-premium-gold">💡 Tip:</span> Click on <span className="font-semibold text-white">"Account Name"</span> or <span className="font-semibold text-white">"Engagement Score"</span> column headers to sort ascending (↑) or descending (↓)
            </p>
            <p className="text-sm text-slate-300 mb-2">
              <span className="font-semibold text-premium-gold">💡 Tip:</span> Click on any <span className="font-semibold text-white">engagement score badge</span> to view detailed score breakdown and improvement tips
            </p>
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-premium-gold">💡 Tip:</span> Click on <span className="font-semibold text-white">Total Projects</span> number (with 📊 icon) to see breakdown by industry and sub-industry
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
                  <col style={{ width: isBulkAssignMode ? '50px' : '0px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '280px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '200px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '280px' }} />
                </colgroup>
                <thead>
                  <tr className="crm-thead-row">
                    {isBulkAssignMode && (
                      <th className="crm-th" style={{ width: '50px' }}>
                        <input
                          type="checkbox"
                          checked={paginatedAccounts.length > 0 && paginatedAccounts.every(acc => selectedAccountIds.has(acc.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              selectAllVisible();
                            } else {
                              deselectAll();
                            }
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                    )}
                    <th className="crm-th sr-col">SR No</th>
                    <th className="crm-th acc-col">
                      <button onClick={() => handleSort('accountName')} className="hover:text-premium-gold transition-colors">
                        <span>Account Name</span>
                        {sortField === 'accountName' && <span className="text-premium-gold ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                    </th>
                    <th className="crm-th">Total Projects</th>
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
                    // Calculate total number of projects
                    const totalProjects = account.industryProjects ? Object.values(account.industryProjects).reduce((sum: number, count: any) => sum + (Number(count) || 0), 0) : 0;
                    const hasProjectsBreakdown = account.industries && account.industries.length > 0 && totalProjects > 0;
                    return (
                    <tr key={account.id} className="crm-tr">
                      {isBulkAssignMode && (
                        <td className="crm-td" style={{ width: '50px' }}>
                          <input
                            type="checkbox"
                            checked={selectedAccountIds.has(account.id)}
                            onChange={() => toggleAccountSelection(account.id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                      )}
                      <td className="crm-td sr-col">{globalIndex + 1}</td>
                      <td className="crm-td acc-col" title={account.accountName}>{account.accountName}</td>
                      <td className="crm-td">
                        {hasProjectsBreakdown ? (
                          <button
                            onClick={() => {
                              setProjectsBreakdownAccount(account);
                              setIsProjectsBreakdownOpen(true);
                            }}
                            className="px-3 py-1 bg-premium-gold/20 hover:bg-premium-gold/30 border border-premium-gold/40 rounded-lg text-premium-gold font-semibold transition-all duration-200 flex items-center gap-1.5"
                            title="Click to view breakdown by industry"
                          >
                            <span>{totalProjects}</span>
                            <span className="text-xs">📊</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">{totalProjects}</span>
                        )}
                      </td>
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
                          {isAdmin && !isDataAnalyst && <button onClick={() => handleDeleteAccount(account.id)} className="px-2 sm:px-3 py-1.5 text-xs sm:text-xs font-semibold text-white bg-red-500/80 rounded-lg touch-manipulation min-h-[36px] sm:min-h-[40px]" style={{ WebkitTapHighlightColor: 'transparent' }}>Delete</button>}
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
          notes: editAccount.notes || '',
          industries: editAccount.industries || [],
          assignedEmployee: editAccount.assignedEmployee || null,
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

      {/* Projects Breakdown Modal */}
      {isProjectsBreakdownOpen && projectsBreakdownAccount && (
        <ProjectsBreakdownModal
          isOpen={isProjectsBreakdownOpen}
          onClose={() => {
            setIsProjectsBreakdownOpen(false);
            setProjectsBreakdownAccount(null);
          }}
          account={projectsBreakdownAccount}
        />
      )}
    </div>
  );
}

// Projects Breakdown Modal Component
function ProjectsBreakdownModal({ 
  isOpen, 
  onClose, 
  account 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  account: Account;
}) {
  const modalRef = React.useRef<HTMLDivElement>(null);

  // Bring modal into view when it opens
  React.useEffect(() => {
    if (isOpen && modalRef.current) {
      // Dynamic import to avoid SSR issues
      import('@/lib/utils/bringElementIntoView').then(({ bringElementIntoView }) => {
        bringElementIntoView(modalRef.current);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Get project breakdown data
  const industries = account.industries || [];
  const industryProjects = account.industryProjects || {};
  
  // Calculate total
  const totalProjects = Object.values(industryProjects).reduce((sum: number, count: any) => sum + (Number(count) || 0), 0);

  // Group projects by industry
  const groupedByIndustry: Record<string, { name: string; subIndustries: Array<{ name: string; projects: number }> }> = {};
  
  industries.forEach((ind) => {
    const key = `${ind.industry_id}-${ind.sub_industry_id}`;
    const projectCount = industryProjects[key] || 0;
    
    if (!groupedByIndustry[ind.industry_name]) {
      groupedByIndustry[ind.industry_name] = {
        name: ind.industry_name,
        subIndustries: []
      };
    }
    
    groupedByIndustry[ind.industry_name].subIndustries.push({
      name: ind.sub_industry_name,
      projects: projectCount
    });
  });

  return (
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className="glassmorphic-premium rounded-3xl p-6 md:p-8 max-w-2xl w-full border-2 border-premium-gold/30 shadow-2xl"
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-white drop-shadow-lg">Projects Breakdown</h2>
            <p className="text-slate-400 text-sm mt-1">{account.accountName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-3xl font-bold transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
          >
            ×
          </button>
        </div>

        {/* Total Projects Summary */}
        <div className="bg-premium-gold/20 border border-premium-gold/40 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-white font-semibold">Total Projects</span>
            <span className="text-2xl font-bold text-premium-gold">{totalProjects}</span>
          </div>
        </div>

        {/* Breakdown by Industry */}
        <div className="space-y-4">
          {Object.entries(groupedByIndustry).length > 0 ? (
            Object.entries(groupedByIndustry).map(([industryName, data]) => {
              const industryTotal = data.subIndustries.reduce((sum, si) => sum + si.projects, 0);
              return (
                <div key={industryName} className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                  {/* Industry Header */}
                  <div className="bg-slate-700/50 px-4 py-3 flex items-center justify-between">
                    <span className="text-white font-semibold flex items-center gap-2">
                      <span className="text-lg">🏭</span>
                      {industryName}
                    </span>
                    <span className="text-premium-gold font-bold bg-premium-gold/20 px-3 py-1 rounded-full text-sm">
                      {industryTotal} projects
                    </span>
                  </div>
                  
                  {/* Sub-industries */}
                  <div className="p-4 space-y-2">
                    {data.subIndustries.map((si, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-700/30"
                      >
                        <span className="text-slate-300 flex items-center gap-2">
                          <span className="text-slate-500">↳</span>
                          {si.name}
                        </span>
                        <span className="text-white font-semibold bg-slate-700/50 px-2 py-0.5 rounded text-sm">
                          {si.projects}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-slate-400">
              <div className="text-4xl mb-3">📋</div>
              <p>No industry breakdown available</p>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 text-sm font-semibold text-white bg-slate-600/80 hover:bg-slate-700 rounded-lg transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
