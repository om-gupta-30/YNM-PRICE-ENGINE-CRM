'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useDebounce } from '@/hooks/useDebounce';
import Toast from '@/components/ui/Toast';
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal';
import { getCachedData, setCachedData, clearCachedData } from '@/lib/utils/crmCache';

// Dynamic imports for better performance - load heavy components only when needed
const LeadForm = dynamic(() => import('@/components/crm/LeadForm'), { ssr: false });
const LeadDetailsModal = dynamic(() => import('@/components/crm/LeadDetailsModal'), { ssr: false });
const LeadsDashboard = dynamic(() => import('@/components/crm/LeadsDashboard'), { ssr: false });
const LeadsKanban = dynamic(() => import('@/components/crm/LeadsKanban'), { ssr: false });
const ComingSoonModal = dynamic(() => import('@/components/modals/ComingSoonModal'), { ssr: false });

import type { LeadFormData } from '@/components/crm/LeadForm';

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
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // No blocking needed - all users can access leads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // All authenticated users can access leads
    }
  }, [router]);

  // Handle leadId query param to open lead details
  useEffect(() => {
    if (!searchParams) return;
    const leadIdParam = searchParams.get('leadId');
    if (leadIdParam && leads.length > 0) {
      const leadId = parseInt(leadIdParam);
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        setSelectedLead(lead);
        setDetailsModalOpen(true);
        // Remove query param from URL
        router.replace('/crm/leads');
      }
    }
  }, [searchParams, leads, router]);

  // Listen for openLeadDetails custom event
  useEffect(() => {
    const handleOpenLeadDetails = (event: CustomEvent) => {
      const { leadId } = event.detail;
      if (leadId && leads.length > 0) {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
          setSelectedLead(lead);
          setDetailsModalOpen(true);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('openLeadDetails', handleOpenLeadDetails as EventListener);
      return () => {
        window.removeEventListener('openLeadDetails', handleOpenLeadDetails as EventListener);
      };
    }
  }, [leads]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce search by 300ms
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterLeadSource, setFilterLeadSource] = useState<string>('');
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  const [specialFilter, setSpecialFilter] = useState<string>(''); // For "new_this_week", "follow_up_due_today"
  
  // Sorting state
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');
  
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

  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [leadHistory, setLeadHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  // Fetch leads from API - memoized with useCallback
  // PERFORMANCE OPTIMIZATION: Check cache first for instant page switching
  const fetchLeads = useCallback(async () => {
    try {
      // Check cache first
      const cacheKey = `leads_${isAdmin ? 'admin' : username}`;
      const cachedLeads = getCachedData<Lead[]>(cacheKey);
      
      if (cachedLeads) {
        setLeads(cachedLeads);
        setLoading(false);
        // Still fetch in background to refresh data
        // (but don't show loading state)
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams();
      if (!isAdmin && username) {
        params.append('employee', username);
      }
      if (isAdmin) {
        params.append('isAdmin', 'true');
      }
      // Add cache busting timestamp to ensure fresh data
      params.append('_t', Date.now().toString());
      
      const response = await fetch(`/api/crm/leads/list?${params}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch leads' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.leads) {
        setLeads(data.leads);
        // PERFORMANCE OPTIMIZATION: Cache the results
        setCachedData(cacheKey, data.leads);
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
  }, [isAdmin, username]);

  // Load leads on mount and when user info changes
  useEffect(() => {
    if (username || isAdmin) {
      fetchLeads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Handle dashboard filter changes
  const handleDashboardFilter = useCallback((filterType: string, filterValue: string) => {
    if (filterType === 'status') {
      setFilterStatus(filterValue);
      setSpecialFilter(''); // Clear special filter
    } else if (filterType === 'new_this_week') {
      setSpecialFilter('new_this_week');
      setFilterStatus(''); // Clear status filter
    } else if (filterType === 'follow_up_due_today') {
      setSpecialFilter('follow_up_due_today');
      setFilterStatus(''); // Clear status filter
    }
  }, []);

  // Filtered and sorted leads - use debounced search query
  const filteredLeads = useMemo(() => {
    let filtered = leads.filter(lead => {
      // Search filter - use debounced query for better performance
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const matchesSearch = 
          lead.lead_name?.toLowerCase().includes(query) ||
          lead.contact_person?.toLowerCase().includes(query) ||
          lead.phone?.toLowerCase().includes(query) ||
          lead.email?.toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
      }

      // Special filters (new_this_week, follow_up_due_today)
      if (specialFilter === 'new_this_week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const createdDate = new Date(lead.created_at);
        if (createdDate < oneWeekAgo) return false;
      } else if (specialFilter === 'follow_up_due_today') {
        if (!lead.follow_up_date) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const followUpDate = new Date(lead.follow_up_date);
        followUpDate.setHours(0, 0, 0, 0);
        if (followUpDate.getTime() !== today.getTime()) return false;
      }

      // Status filter
      if (filterStatus) {
        // Handle status variations
        if (filterStatus === 'Follow-Up') {
          if (lead.status !== 'Follow-up' && lead.status !== 'Follow-Up') return false;
        } else if (filterStatus === 'Closed Won') {
          if (lead.status !== 'Closed Won' && lead.status !== 'Closed') return false;
        } else if (filterStatus === 'Closed Lost') {
          if (lead.status !== 'Closed Lost' && lead.status !== 'Lost') return false;
        } else {
          if (lead.status !== filterStatus) return false;
        }
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
  }, [leads, debouncedSearchQuery, filterStatus, filterLeadSource, filterEmployee, sortBy, specialFilter]);
  
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
  }, [searchQuery, filterStatus, filterLeadSource, filterEmployee, sortBy, specialFilter]);


  // Handle open modal for create - memoized
  const handleOpenModal = useCallback(() => {
    setEditingLead(null);
    setIsModalOpen(true);
  }, []);

  // Handle open modal for edit - memoized
  const handleEditLead = useCallback((lead: Lead) => {
    setEditingLead(lead);
    setIsModalOpen(true);
  }, []);

  // Handle view details - memoized
  const handleViewDetails = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setDetailsModalOpen(true);
  }, []);

  // Handle close modal - memoized
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingLead(null);
  }, []);

  // Load lead history - optimized
  const loadLeadHistory = useCallback(async (leadId: number) => {
    try {
      setLoadingHistory(true);
      const response = await fetch(`/api/crm/leads/${leadId}/history`, {
        cache: 'no-store',
      });
      
      if (!response.ok) {
        setLeadHistory([]);
        return;
      }
      
      const data = await response.json();
      setLeadHistory(data.success ? (data.history || []) : []);
    } catch (err: any) {
      setLeadHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Handle form submit
  const handleSubmit = async (formData: LeadFormData) => {
    try {
      setSubmitting(true);
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin';
      
      if (editingLead) {
        // Update lead - only send fields that are actually being updated
        const updatePayload: any = {
          id: editingLead.id,
        };
        
        // Only include fields that have changed or are being set
        if (formData.lead_name !== undefined) updatePayload.lead_name = formData.lead_name;
        if (formData.contact_person !== undefined) updatePayload.contact_person = formData.contact_person;
        if (formData.phone !== undefined) updatePayload.phone = formData.phone;
        if (formData.email !== undefined) updatePayload.email = formData.email;
        if (formData.requirements !== undefined) updatePayload.requirements = formData.requirements;
        if (formData.lead_source !== undefined) updatePayload.lead_source = formData.lead_source;
        if (formData.status !== undefined) updatePayload.status = formData.status;
        // Always include priority if it's in formData (even if null) - API will normalize it
        if (formData.priority !== undefined) {
          // Ensure we send a valid priority value or null
          if (formData.priority && ['High Priority', 'Medium Priority', 'Low Priority'].includes(formData.priority)) {
            updatePayload.priority = formData.priority;
          } else {
            updatePayload.priority = null;
          }
        }
        if (formData.assigned_employee !== undefined) updatePayload.assigned_employee = formData.assigned_employee;
        if (formData.accounts !== undefined) updatePayload.accounts = formData.accounts;
        if (formData.sub_accounts !== undefined) updatePayload.sub_accounts = formData.sub_accounts;
        if (formData.contact_id !== undefined) updatePayload.contact_id = formData.contact_id;
        
        const response = await fetch('/api/crm/leads/update', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          cache: 'no-store',
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to update lead' }));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to update lead');
        }

        // Optimistic update - update lead in list immediately
        if (data.data && editingLead) {
          const updatedLead: Lead = {
            ...data.data,
            accounts: data.data.account_id,
            sub_accounts: data.data.sub_account_id,
          };
          setLeads(prevLeads => 
            prevLeads.map(lead => 
              lead.id === editingLead.id ? updatedLead : lead
            )
          );
        }

        handleCloseModal();
        setToast({ message: 'Lead updated successfully', type: 'success' });
        
        // Clear cache and refresh in background (non-blocking) to ensure sync
        const cacheKey = `leads_${isAdmin ? 'admin' : username}`;
        clearCachedData(cacheKey);
        fetchLeads().catch(() => {
          // Silently fail - we already updated optimistically
        });
        return;
      } else {
        // Create new lead
        // CRITICAL: Handle priority correctly - never send empty string or null
        const normalizedFormData: any = {
          ...formData,
          created_by: username,
        };
        
        // Only include priority if it's a valid value
        const validPriorities = ['High Priority', 'Medium Priority', 'Low Priority'];
        if (formData.priority && validPriorities.includes(formData.priority)) {
          normalizedFormData.priority = formData.priority;
        } else {
          // Remove priority field completely if it's null, empty, or invalid
          delete normalizedFormData.priority;
        }
        
        const response = await fetch('/api/crm/leads/create', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(normalizedFormData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to create lead' }));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to create lead');
        }

        // Optimistic update - add lead to list immediately
        if (data.data) {
          const newLead: Lead = {
            ...data.data,
            accounts: data.data.account_id,
            sub_accounts: data.data.sub_account_id,
            account_name: null, // Will be populated on next fetch
            sub_account_name: null, // Will be populated on next fetch
          };
          setLeads(prev => [newLead, ...prev]);
        }

        handleCloseModal();
        setToast({ message: 'Lead Created Successfully!', type: 'success' });
        
        // Clear cache and refresh in background (non-blocking)
        const cacheKey = `leads_${isAdmin ? 'admin' : username}`;
        clearCachedData(cacheKey);
        fetchLeads().catch(() => {
          // Silently fail - we already updated optimistically
        });
        return;
      }

      // For updates, refresh immediately (optimistic update already handled above)
      handleCloseModal();
      setToast({ message: 'Lead updated successfully', type: 'success' });
      
      // Refresh in background (non-blocking) to ensure sync
      fetchLeads().catch(() => {
        // Silently fail - we already updated optimistically
      });
    } catch (error: any) {
      console.error('Error saving lead:', error);
      setToast({ message: error.message || 'Failed to save lead', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle status change (for Kanban drag-and-drop) - memoized
  const handleStatusChange = useCallback(async (leadId: number, newStatus: string) => {
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
      // Revert optimistic update on error
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId ? { ...lead, status: lead.status } : lead
        )
      );
      // Refresh in background to get correct state
      fetchLeads().catch(() => {});
    }
  }, [fetchLeads]);

  // Handle delete click - memoized (only for admins)
  const handleDeleteClick = useCallback((lead: Lead) => {
    // Double-check admin status before allowing delete
    if (!isAdmin) {
      setToast({ message: 'Only admins can delete leads', type: 'error' });
      return;
    }
    setLeadToDelete(lead);
    setDeleteConfirmOpen(true);
  }, [isAdmin]);

  // Handle delete confirm - memoized
  const handleDeleteConfirm = useCallback(async () => {
    if (!leadToDelete) return;

    const leadIdToDelete = leadToDelete.id;
    
    setIsDeleting(true);
    
    // Optimistic update - remove from list immediately
    setLeads(prev => prev.filter(lead => lead.id !== leadIdToDelete));
    setDeleteConfirmOpen(false);
    setLeadToDelete(null);
    setToast({ message: 'Lead deleted successfully', type: 'success' });

    try {
      const response = await fetch('/api/crm/leads/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: leadIdToDelete,
          isAdmin: isAdmin,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Revert optimistic update on error
        await fetchLeads();
        setToast({ message: data.error || 'Failed to delete lead', type: 'error' });
        return;
      }

      // Refresh in background to ensure sync (non-blocking)
      fetchLeads().catch(() => {
        // Silently fail - we already removed it optimistically
      });
    } catch (error: any) {
      // Revert on error
      await fetchLeads();
      setToast({ message: error.message || 'Failed to delete lead', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  }, [fetchLeads, leadToDelete]);

  // Handle delete cancel - memoized
  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmOpen(false);
    setLeadToDelete(null);
  }, []);

  // Handle quick action click - memoized
  const handleQuickAction = useCallback((action: string, lead: Lead) => {
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
  }, []);

  // Handle priority change (save to database) - memoized
  const handlePriorityChange = useCallback(async (leadId: number, priority: Priority) => {
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

      setToast({ message: 'Priority updated successfully', type: 'success' });
      
      // Clear cache and refresh in background (non-blocking) to ensure sync
      const cacheKey = `leads_${isAdmin ? 'admin' : username}`;
      clearCachedData(cacheKey);
      fetchLeads().catch(() => {
        // Silently fail - we already updated optimistically
      });
    } catch (error: any) {
      console.error('Error updating lead priority:', error);
      // Revert optimistic update on error
      await fetchLeads();
      setToast({ message: error.message || 'Failed to update priority', type: 'error' });
    }
  }, [fetchLeads]);

  // Get priority color - memoized
  const getPriorityColor = useCallback((priority: Priority) => {
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
  }, []);

  // Format date helper - memoized
  const formatDate = useCallback((dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }, []);

  // Get status color - memoized
  const getStatusColor = useCallback((status: string | null) => {
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
  }, []);

  // Prepare form data for editing - memoized
  const getFormDataFromLead = useCallback((lead: Lead): LeadFormData => {
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
  }, []);

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
          <LeadsDashboard leads={leads} loading={loading} onFilterChange={handleDashboardFilter} />

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
                    onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'priority')}
                    className="w-full px-4 py-3 text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold transition-all duration-200"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="priority">Priority (High to Low)</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              {(searchQuery || filterStatus || filterLeadSource || filterEmployee || specialFilter) && (
                <div className="flex justify-between items-center pt-2 border-t border-white/10 flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-sm text-slate-300 flex-wrap">
                    <span className="font-semibold">Active filters:</span>
                    {searchQuery && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">Search: "{searchQuery}"</span>
                    )}
                    {specialFilter === 'new_this_week' && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">New This Week</span>
                    )}
                    {specialFilter === 'follow_up_due_today' && (
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">Follow-Ups Due Today</span>
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
                      setSpecialFilter('');
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
                        <th className="text-left py-4 px-2 md:px-4 text-xs md:text-sm font-bold text-white">Priority</th>
                        <th className="text-left py-4 px-2 md:px-4 text-xs md:text-sm font-bold text-white hidden lg:table-cell">Employee</th>
                        <th className="text-left py-4 px-2 md:px-4 text-xs md:text-sm font-bold text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                      {paginatedLeads.map((lead) => {
                        const priority = lead.priority || null;
                        return (
                      <tr 
                        key={lead.id} 
                            className="border-b border-white/10 hover:bg-white/5 transition-all duration-200"
                          >
                            <td className="py-4 px-2 md:px-4 text-slate-200 font-semibold text-xs md:text-sm">
                              <span>{lead.lead_name}</span>
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
                              onClick={async () => {
                                setSelectedLead(lead);
                                setShowHistoryModal(true);
                                await loadLeadHistory(lead.id);
                              }}
                                  className="px-2 sm:px-3 py-1.5 text-xs font-semibold text-white bg-purple-500/80 hover:bg-purple-500 rounded-lg transition-all duration-200 touch-manipulation min-h-[36px] sm:min-h-[40px]"
                                  style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                              History
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteClick(lead)}
                                disabled={isDeleting}
                                className="px-2 sm:px-3 py-1.5 text-xs font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-all duration-200 touch-manipulation min-h-[36px] sm:min-h-[40px] disabled:opacity-50"
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                              >
                                Del
                              </button>
                            )}
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
        onLeadUpdate={(updatedLead: Lead) => {
          // Optimistic update - update lead in list immediately
          setLeads(prevLeads => 
            prevLeads.map(l => l.id === updatedLead.id ? updatedLead : l)
          );
          // Refresh in background (non-blocking)
          fetchLeads().catch(() => {});
        }}
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

      {/* Lead History Modal */}
      {showHistoryModal && selectedLead && (
        <LeadHistoryModal
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedLead(null);
            setLeadHistory([]);
          }}
          lead={selectedLead}
          history={leadHistory}
          loading={loadingHistory}
        />
      )}

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

// Lead History Modal Component
function LeadHistoryModal({
  isOpen,
  onClose,
  lead,
  history,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  history?: any[];
  loading?: boolean;
}) {
  if (!isOpen) return null;

  const displayHistory = history || [];

  const getStatusColor = (status: string | null) => {
    if (!status) return 'text-slate-400';
    switch (status) {
      case 'New': return 'text-blue-400';
      case 'In Progress': return 'text-yellow-400';
      case 'Quotation Sent': return 'text-purple-400';
      case 'Follow-up':
      case 'Follow-Up': return 'text-orange-400';
      case 'Closed Won':
      case 'Closed': return 'text-green-400';
      case 'Closed Lost':
      case 'Lost': return 'text-red-400';
      default: return 'text-slate-300';
    }
  };

  const getPriorityColor = (priority: string | null) => {
    if (!priority) return 'text-slate-400';
    switch (priority) {
      case 'High Priority': return 'text-red-400';
      case 'Medium Priority': return 'text-yellow-400';
      case 'Low Priority': return 'text-green-400';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-6 w-full max-w-lg shadow-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Lead History</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Lead Info */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-5 border border-slate-700/50">
          <p className="text-sm text-slate-400 mb-1">Lead</p>
          <p className="text-white font-medium">{lead.lead_name}</p>
        </div>
        
        {loading ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-slate-400">Loading history...</p>
          </div>
        ) : displayHistory.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-400">No history available</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {displayHistory.map((entry: any, idx: number) => {
              const isCreated = entry.type === 'created';
              const isStatusChange = entry.type === 'status_change';
              const isPriorityChange = entry.type === 'priority_change';
              
              return (
                <div key={`${entry.changed_at}-${entry.changed_by}-${idx}`} className="relative pl-6 pb-4 border-l-2 border-slate-700 last:border-transparent">
                  {/* Timeline dot */}
                  <div className={`absolute left-[-5px] top-0 w-2 h-2 rounded-full ${
                    isCreated ? 'bg-green-500' : 
                    isStatusChange ? 'bg-blue-500' : 
                    isPriorityChange ? 'bg-purple-500' :
                    'bg-slate-600'
                  }`}></div>
                  
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        {isCreated ? (
                          <span className="text-green-400 font-semibold">✨ {entry.action}</span>
                        ) : isStatusChange && entry.metadata?.old_status && entry.metadata?.new_status ? (
                          <>
                            <span className={getStatusColor(entry.metadata.old_status)}>{entry.metadata.old_status || 'Unknown'}</span>
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <span className={`font-semibold ${getStatusColor(entry.metadata.new_status)}`}>{entry.metadata.new_status || 'Unknown'}</span>
                          </>
                        ) : isPriorityChange && entry.metadata?.old_priority !== undefined ? (
                          <>
                            <span className={getPriorityColor(entry.metadata.old_priority)}>{entry.metadata.old_priority || 'None'}</span>
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <span className={`font-semibold ${getPriorityColor(entry.metadata.new_priority)}`}>{entry.metadata.new_priority || 'None'}</span>
                          </>
                        ) : (
                          <span className="text-slate-300 font-semibold">{entry.action}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-slate-300 mb-2">
                      {entry.description}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">by <span className="text-slate-300">{entry.changed_by}</span></span>
                      <span className="text-slate-500">{entry.changed_at}</span>
                    </div>
                    {entry.metadata?.status_note && (
                      <div className="mt-3 text-sm text-slate-300 bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                        <span className="text-slate-500 text-xs block mb-1">Note:</span>
                        {entry.metadata.status_note}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
