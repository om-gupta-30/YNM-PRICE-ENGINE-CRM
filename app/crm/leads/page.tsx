'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import LeadForm, { LeadFormData } from '@/components/crm/LeadForm';
import LeadDetailsModal from '@/components/crm/LeadDetailsModal';
import LeadsDashboard from '@/components/crm/LeadsDashboard';
import LeadsKanban from '@/components/crm/LeadsKanban';
import ComingSoonModal from '@/components/modals/ComingSoonModal';
import Toast from '@/components/ui/Toast';
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal';
import { calculateLeadScore, getLeadScoreColor, getScoreBasedPriority } from '@/lib/utils/leadScore';

export interface Lead {
  id: number;
  lead_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  requirements: string | null;
  lead_source: string | null;
  status: string | null;
  priority: 'High Priority' | 'Medium Priority' | 'Low Priority' | null;
  assigned_employee: string | null;
  accounts: number | null;
  sub_accounts: number | null;
  contact_id: number | null;
  follow_up_date: string | null;
  account_name: string | null;
  sub_account_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

type ViewMode = 'table' | 'pipeline';
type Priority = 'High Priority' | 'Medium Priority' | 'Low Priority' | null;

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Block data analysts from accessing leads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDataAnalyst = localStorage.getItem('isDataAnalyst') === 'true';
      if (isDataAnalyst) {
        router.replace('/crm');
      }
    }
  }, [router]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterLeadSource, setFilterLeadSource] = useState<string>('');
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  
  // Sorting state
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'score' | 'priority'>('newest');
  
  // Pagination for performance on large lists
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30; // Render max 30 items at a time for performance
  
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  
  // Details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Coming soon modal state
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState('');

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

  // Fetch leads from API
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (!isAdmin && username) {
        params.append('employee', username);
      }
      if (isAdmin) {
        params.append('isAdmin', 'true');
      }
      
      const response = await fetch(`/api/crm/leads/list?${params}`);
      const data = await response.json();
      
      if (data.success && data.leads) {
        setLeads(data.leads);
      } else {
        throw new Error(data.error || 'Failed to fetch leads');
      }
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      setToast({ message: error.message || 'Failed to load leads', type: 'error' });
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  // Load leads on mount and when user info changes
  useEffect(() => {
    if (username || isAdmin) {
      fetchLeads();
    }
  }, [username, isAdmin]);

  // Get unique values for filters
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(leads.map(lead => lead.status).filter(Boolean));
    return Array.from(statuses).sort();
  }, [leads]);

  const uniqueLeadSources = useMemo(() => {
    const sources = new Set(leads.map(lead => lead.lead_source).filter(Boolean));
    return Array.from(sources).sort();
  }, [leads]);

  const uniqueEmployees = useMemo(() => {
    const employees = new Set(leads.map(lead => lead.assigned_employee).filter(Boolean));
    return Array.from(employees).sort();
  }, [leads]);

  const isFollowUpDueToday = (followUpDate: string | null) => {
    if (!followUpDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUp = new Date(followUpDate);
    followUp.setHours(0, 0, 0, 0);
    return followUp.getTime() === today.getTime();
  };

  const isFollowUpOverdue = (followUpDate: string | null) => {
    if (!followUpDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUp = new Date(followUpDate);
    followUp.setHours(0, 0, 0, 0);
    return followUp.getTime() < today.getTime();
  };

  // Filtered and sorted leads
  const filteredLeads = useMemo(() => {
    let filtered = leads.filter(lead => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          lead.lead_name?.toLowerCase().includes(query) ||
          lead.contact_person?.toLowerCase().includes(query) ||
          lead.phone?.toLowerCase().includes(query) ||
          lead.email?.toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filterStatus && lead.status !== filterStatus) {
        return false;
      }

      // Lead Source filter
      if (filterLeadSource && lead.lead_source !== filterLeadSource) {
        return false;
      }

      // Employee filter
      if (filterEmployee && lead.assigned_employee !== filterEmployee) {
        return false;
      }

      return true;
    });

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'score':
          const scoreA = calculateLeadScore(a);
          const scoreB = calculateLeadScore(b);
          return scoreB - scoreA;
        case 'priority':
          const priorityOrder: Record<string, number> = {
            'High Priority': 3,
            'Medium Priority': 2,
            'Low Priority': 1,
            'none': 0,
          };
          const priorityKeyA = a.priority ?? 'none';
          const priorityKeyB = b.priority ?? 'none';
          const priorityA = priorityOrder[priorityKeyA] ?? 0;
          const priorityB = priorityOrder[priorityKeyB] ?? 0;
          return priorityB - priorityA;
        default:
          return 0;
      }
    });

    return filtered;
  }, [leads, searchQuery, filterStatus, filterLeadSource, filterEmployee, sortBy]);
  
  // Paginated leads for performance (only render visible items)
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLeads.slice(startIndex, endIndex);
  }, [filteredLeads, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterLeadSource, filterEmployee, sortBy]);


  // Handle open modal for create
  const handleOpenModal = () => {
    setEditingLead(null);
    setIsModalOpen(true);
  };

  // Handle open modal for edit
  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setIsModalOpen(true);
  };

  // Handle view details
  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailsModalOpen(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLead(null);
  };

  // Handle form submit
  const handleSubmit = async (formData: LeadFormData) => {
    try {
      setSubmitting(true);
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin';
      
      if (editingLead) {
        // Update lead
        const response = await fetch('/api/crm/leads/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingLead.id,
            ...formData,
            created_by: editingLead.created_by || username,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to update lead');
        }

        setToast({ message: 'Lead updated successfully', type: 'success' });
      } else {
        // Create new lead
        const response = await fetch('/api/crm/leads/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            created_by: username,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to create lead');
        }

        setToast({ message: 'Lead Created Successfully', type: 'success' });
      }

      handleCloseModal();
      await fetchLeads(); // Refresh list
    } catch (error: any) {
      console.error('Error saving lead:', error);
      setToast({ message: error.message || 'Failed to save lead', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle status change (for Kanban drag-and-drop)
  const handleStatusChange = async (leadId: number, newStatus: string) => {
    try {
      const response = await fetch('/api/crm/leads/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: leadId,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update lead status');
      }

      // Update local state
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        )
      );

      setToast({ message: 'Lead status updated successfully', type: 'success' });
    } catch (error: any) {
      console.error('Error updating lead status:', error);
      setToast({ message: error.message || 'Failed to update lead status', type: 'error' });
      // Refresh leads to revert UI
      await fetchLeads();
    }
  };

  // Handle delete click
  const handleDeleteClick = (lead: Lead) => {
    setLeadToDelete(lead);
    setDeleteConfirmOpen(true);
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch('/api/crm/leads/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadToDelete.id }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete lead');
      }

      setToast({ message: 'Lead deleted successfully', type: 'success' });
      setDeleteConfirmOpen(false);
      setLeadToDelete(null);
      await fetchLeads(); // Refresh list
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      setToast({ message: error.message || 'Failed to delete lead', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setLeadToDelete(null);
  };

  // Handle quick action click
  const handleQuickAction = (action: string, lead: Lead) => {
    // Note and followup are handled in the modal itself
    if (action === 'note' || action === 'followup') {
      // These are handled in LeadDetailsModal
      return;
    }
    
    const actionNames: Record<string, string> = {
      'convert': 'Convert to Account',
      'quotation': 'Send Quotation',
    };
    
    if (actionNames[action]) {
      setComingSoonFeature(actionNames[action]);
      setComingSoonOpen(true);
    }
  };

  // Handle priority change (save to database)
  const handlePriorityChange = async (leadId: number, priority: Priority) => {
    try {
      // Optimistic update - update UI immediately
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId ? { ...lead, priority: priority } : lead
        )
      );

      const response = await fetch('/api/crm/leads/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: leadId,
          priority: priority,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update priority' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update lead priority');
      }

      // Refresh leads to ensure sync (non-blocking)
      fetchLeads().catch(err => {
        console.error('Error refreshing leads after priority update:', err);
      });

      setToast({ message: 'Priority updated successfully', type: 'success' });
    } catch (error: any) {
      console.error('Error updating lead priority:', error);
      // Revert optimistic update on error
      await fetchLeads();
      setToast({ message: error.message || 'Failed to update priority', type: 'error' });
    }
  };

  // Get priority color
  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'High Priority':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'Medium Priority':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'Low Priority':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  // Format date helper
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Get status color
  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-slate-500/20 text-slate-300';
    switch (status) {
      case 'New':
        return 'bg-blue-500/20 text-blue-300';
      case 'In Progress':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'Quotation Sent':
        return 'bg-purple-500/20 text-purple-300';
      case 'Follow-up':
      case 'Follow-Up':
        return 'bg-orange-500/20 text-orange-300';
      case 'Closed Won':
      case 'Closed':
        return 'bg-green-500/20 text-green-300';
      case 'Closed Lost':
      case 'Lost':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-slate-500/20 text-slate-300';
    }
  };

  // Prepare form data for editing
  const getFormDataFromLead = (lead: Lead): LeadFormData => {
    return {
      lead_name: lead.lead_name || '',
      contact_person: lead.contact_person || '',
      phone: lead.phone || '',
      email: lead.email || '',
      requirements: lead.requirements || '',
      lead_source: lead.lead_source || '',
      status: lead.status || 'New',
      priority: lead.priority || null,
      assigned_employee: lead.assigned_employee || '',
      accounts: lead.accounts,
      sub_accounts: lead.sub_accounts,
      contact_id: lead.contact_id,
    };
  };

  return (
    <>
      <div className="min-h-screen flex flex-col items-start py-6 sm:py-8 md:py-12 pb-20 sm:pb-24 md:pb-32 relative">
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
                Leads
              </h1>
              <button 
                onClick={handleOpenModal}
                disabled={submitting}
                className="absolute right-0 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base md:text-lg font-bold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-lg sm:rounded-xl transition-all duration-200 shadow-md shadow-premium-gold/30 flex items-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span>+</span>
                <span className="hidden sm:inline">Add Lead</span>
              </button>
            </div>
            <div className="gold-divider w-full"></div>
          </div>

          {/* Dashboard Widgets */}
          <LeadsDashboard leads={leads} loading={loading} />

          {/* View Mode Toggle - Compact */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="inline-flex bg-slate-800/50 backdrop-blur-sm rounded-xl p-1 border border-slate-700/50">
              <button
                onClick={() => setViewMode('table')}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  viewMode === 'table'
                    ? 'bg-gradient-to-r from-premium-gold to-amber-600 text-white shadow-lg shadow-premium-gold/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Table
              </button>
              <button
                onClick={() => setViewMode('pipeline')}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  viewMode === 'pipeline'
                    ? 'bg-gradient-to-r from-premium-gold to-amber-600 text-white shadow-lg shadow-premium-gold/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                Pipeline
              </button>
            </div>
            
            <div className="text-sm text-slate-400">
              {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'} found
              {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="glassmorphic-premium rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 mb-4 sm:mb-5 md:mb-6 slide-up card-hover-gold border-2 border-premium-gold/30 shadow-md">
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">🔍</div>
                <h2 className="text-xl font-bold text-white">Filter Leads</h2>
                {(searchQuery || filterStatus || filterLeadSource || filterEmployee) && (
                  <span className="px-3 py-1 bg-premium-gold/20 text-premium-gold text-xs font-semibold rounded-full animate-pulse">
                    Active Filters
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 ml-10">Search and filter leads by various criteria</p>
            </div>
            <div className="space-y-4">
              {/* Search Bar */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Search Leads</label>
                <input
                  type="text"
                  placeholder="Search by name, contact, phone, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold transition-all duration-200"
                />
              </div>

              {/* Filters and Sorting */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Filter by Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-3 text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold transition-all duration-200"
                  >
                    <option value="">All Statuses</option>
                    {uniqueStatuses.map(status => (
                      <option key={status} value={status || ''}>{status}</option>
                    ))}
                  </select>
                </div>

                {/* Lead Source Filter */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Filter by Lead Source</label>
                  <select
                    value={filterLeadSource}
                    onChange={(e) => setFilterLeadSource(e.target.value)}
                    className="w-full px-4 py-3 text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold transition-all duration-200"
                  >
                    <option value="">All Lead Sources</option>
                    {uniqueLeadSources.map(source => (
                      <option key={source} value={source || ''}>{source}</option>
                    ))}
                  </select>
                </div>

                {/* Employee Filter */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Filter by Employee</label>
                  <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="w-full px-4 py-3 text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold transition-all duration-200"
                  >
                    <option value="">All Employees</option>
                    {uniqueEmployees.map(employee => (
                      <option key={employee} value={employee || ''}>{employee}</option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'score' | 'priority')}
                    className="w-full px-4 py-3 text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold transition-all duration-200"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="score">Score (High to Low)</option>
                    <option value="priority">Priority (High to Low)</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              {(searchQuery || filterStatus || filterLeadSource || filterEmployee) && (
                <div className="flex justify-between items-center pt-2 border-t border-white/10 flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-sm text-slate-300 flex-wrap">
                    <span className="font-semibold">Active filters:</span>
                    {searchQuery && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">Search: "{searchQuery}"</span>
                    )}
                    {filterStatus && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">Status: {filterStatus}</span>
                    )}
                    {filterLeadSource && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">Source: {filterLeadSource}</span>
                    )}
                    {filterEmployee && (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded text-xs">Employee: {filterEmployee}</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStatus('');
                      setFilterLeadSource('');
                      setFilterEmployee('');
                    }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-all duration-200 flex items-center gap-2"
                  >
                    <span>✕</span>
                    <span>Clear All Filters</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Leads Table View */}
          {viewMode === 'table' && (
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
            {loading ? (
              <div className="text-center py-20">
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-premium-gold border-t-transparent animate-spin"></div>
                  <div className="absolute inset-2 rounded-full border-4 border-slate-700"></div>
                  <div className="absolute inset-2 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.6s' }}></div>
                </div>
                <p className="text-slate-300 font-medium">Loading leads...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                  <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-xl font-medium text-slate-300 mb-2">
                  {searchQuery || filterStatus || filterLeadSource || filterEmployee
                    ? 'No leads match your filters' 
                    : 'No leads found'}
                </p>
                <p className="text-sm text-slate-500 mb-6">
                  {searchQuery || filterStatus || filterLeadSource || filterEmployee
                    ? 'Try adjusting your search or filters'
                    : 'Create a new lead to get started'}
                </p>
                {(searchQuery || filterStatus || filterLeadSource || filterEmployee) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStatus('');
                      setFilterLeadSource('');
                      setFilterEmployee('');
                    }}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-premium-gold/80 hover:bg-premium-gold rounded-lg transition-all duration-200"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2 sm:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full min-w-[800px] sm:min-w-0">
                  <thead className="sticky top-0 bg-[#1A103C]/95 backdrop-blur-sm z-10">
                    <tr className="border-b border-white/20">
                        <th className="text-left py-4 px-2 md:px-4 text-xs md:text-sm font-bold text-white">Lead Name</th>
                        <th className="text-left py-4 px-2 md:px-4 text-xs md:text-sm font-bold text-white">Contact</th>
                        <th className="text-left py-4 px-2 md:px-4 text-xs md:text-sm font-bold text-white hidden md:table-cell">Phone</th>
                        <th className="text-left py-4 px-2 md:px-4 text-xs md:text-sm font-bold text-white hidden lg:table-cell">Email</th>
                        <th className="text-left py-4 px-2 md:px-4 text-xs md:text-sm font-bold text-white hidden md:table-cell">Source</th>
                        <th className="text-left py-4 px-2 md:px-4 text-xs md:text-sm font-bold text-white">Status</th>
                        <th className="text-left py-4 px-2 md:px-4 text-xs md:text-sm font-bold text-white">Score</th>
                        <th className="text-left py-4 px-2 md:px-4 text-xs md:text-sm font-bold text-white">Priority</th>
                        <th className="text-left py-4 px-2 md:px-4 text-xs md:text-sm font-bold text-white hidden lg:table-cell">Employee</th>
                        <th className="text-left py-4 px-2 md:px-4 text-xs md:text-sm font-bold text-white">Follow-Up</th>
                        <th className="text-left py-4 px-2 md:px-4 text-xs md:text-sm font-bold text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                      {paginatedLeads.map((lead) => {
                        const score = calculateLeadScore(lead);
                        const priority = lead.priority || null;
                        return (
                      <tr 
                        key={lead.id} 
                            className="border-b border-white/10 hover:bg-white/5 transition-all duration-200"
                          >
                            <td className="py-4 px-2 md:px-4 text-slate-200 font-semibold text-xs md:text-sm">
                              <div className="flex items-center gap-2">
                                <span>{lead.lead_name}</span>
                                {lead.follow_up_date && (
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                    isFollowUpOverdue(lead.follow_up_date) 
                                      ? 'bg-red-500/20 text-red-300' 
                                      : isFollowUpDueToday(lead.follow_up_date)
                                      ? 'bg-orange-500/20 text-orange-300'
                                      : 'bg-blue-500/20 text-blue-300'
                                  }`} title={`Follow-up: ${formatDate(lead.follow_up_date)}`}>
                                    {isFollowUpOverdue(lead.follow_up_date) ? '⚠️' : '📅'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-2 md:px-4 text-slate-200 text-xs md:text-sm">{lead.contact_person || '-'}</td>
                            <td className="py-4 px-2 md:px-4 text-slate-200 text-xs md:text-sm hidden md:table-cell">{lead.phone || '-'}</td>
                            <td className="py-4 px-2 md:px-4 text-slate-200 text-xs md:text-sm hidden lg:table-cell truncate max-w-[200px]">{lead.email || '-'}</td>
                            <td className="py-4 px-2 md:px-4 text-slate-200 text-xs md:text-sm hidden md:table-cell">{lead.lead_source || '-'}</td>
                            <td className="py-4 px-2 md:px-4">
                              <span className={`px-2 md:px-3 py-1 rounded-lg text-xs font-semibold ${getStatusColor(lead.status)}`}>
                            {lead.status || '-'}
                          </span>
                        </td>
                            <td className="py-4 px-2 md:px-4">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${getLeadScoreColor(score)}`}>
                                  {score}
                                </span>
                                {(() => {
                                  const scorePriority = getScoreBasedPriority(score);
                                  return (
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${scorePriority.color}`}>
                                      {scorePriority.label}
                                    </span>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="py-4 px-2 md:px-4">
                              {priority ? (
                                <span className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(priority)}`}>
                                  {priority}
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded text-xs font-semibold border bg-slate-500/20 text-slate-400 border-slate-500/30">
                                  No Priority
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-2 md:px-4 text-slate-200 text-xs md:text-sm hidden lg:table-cell">{lead.assigned_employee || '-'}</td>
                            <td className="py-4 px-2 md:px-4">
                              {lead.follow_up_date ? (
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  isFollowUpOverdue(lead.follow_up_date) 
                                    ? 'bg-red-500/20 text-red-300' 
                                    : isFollowUpDueToday(lead.follow_up_date)
                                    ? 'bg-orange-500/20 text-orange-300'
                                    : 'bg-blue-500/20 text-blue-300'
                                }`}>
                                  {isFollowUpOverdue(lead.follow_up_date) ? '⚠️ Overdue' : isFollowUpDueToday(lead.follow_up_date) ? '📅 Today' : formatDate(lead.follow_up_date)}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                        </td>
                            <td className="py-4 px-2 md:px-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                            <button
                              onClick={() => handleViewDetails(lead)}
                                  className="px-2 sm:px-3 py-1.5 text-xs font-semibold text-white bg-green-500/80 hover:bg-green-500 rounded-lg transition-all duration-200 touch-manipulation min-h-[36px] sm:min-h-[40px]"
                                  style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleEditLead(lead)}
                                  className="px-2 sm:px-3 py-1.5 text-xs font-semibold text-white bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-all duration-200 touch-manipulation min-h-[36px] sm:min-h-[40px]"
                                  style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(lead)}
                                  disabled={isDeleting}
                                  className="px-2 sm:px-3 py-1.5 text-xs font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-all duration-200 touch-manipulation min-h-[36px] sm:min-h-[40px] disabled:opacity-50"
                                  style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                  Del
                            </button>
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
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
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
          )}

          {/* Pipeline/Kanban View */}
          {viewMode === 'pipeline' && (
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 md:p-6">
              {loading ? (
                <div className="text-center py-20">
                  <div className="relative w-16 h-16 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-premium-gold border-t-transparent animate-spin"></div>
                    <div className="absolute inset-2 rounded-full border-4 border-slate-700"></div>
                    <div className="absolute inset-2 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.6s' }}></div>
                  </div>
                  <p className="text-slate-300 font-medium">Loading leads...</p>
                </div>
              ) : (
                <>
                  <LeadsKanban 
                    leads={paginatedLeads} 
                    onStatusChange={handleStatusChange}
                    onLeadClick={handleViewDetails}
                    onPriorityChange={handlePriorityChange}
                  />
                  
                  {/* Pagination Controls for Kanban */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 px-4 py-3 border-t border-slate-700/50">
                      <div className="text-sm text-slate-400">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
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
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lead Form Modal */}
      <LeadForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialData={editingLead ? getFormDataFromLead(editingLead) : null}
        mode={editingLead ? 'edit' : 'create'}
      />

      {/* Lead Details Modal */}
      <LeadDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedLead(null);
        }}
        lead={selectedLead}
        onEdit={handleEditLead}
        onQuickAction={handleQuickAction}
        onLeadUpdate={fetchLeads}
      />

      {/* Coming Soon Modal */}
      <ComingSoonModal
        isOpen={comingSoonOpen}
        onClose={() => setComingSoonOpen(false)}
        feature={comingSoonFeature}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Lead"
        message={`Are you sure you want to delete the lead "${leadToDelete?.lead_name}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
