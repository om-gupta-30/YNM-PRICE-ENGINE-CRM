'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lead } from '@/app/crm/leads/page';
import LeadQuickActions from '@/components/crm/LeadQuickActions';
import AddNoteModal from '@/components/crm/AddNoteModal';
import { bringElementIntoView } from '@/lib/utils/bringElementIntoView';

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onEdit: (lead: Lead) => void;
  onQuickAction?: (action: string, lead: Lead) => void;
  onLeadUpdate?: (updatedLead: Lead) => void;
}

export default function LeadDetailsModal({ isOpen, onClose, lead, onEdit, onQuickAction, onLeadUpdate }: LeadDetailsModalProps) {
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingEmployee, setUpdatingEmployee] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [employees, setEmployees] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  const LEAD_PRIORITIES = ['High Priority', 'Medium Priority', 'Low Priority'];

  const modalRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bring modal into view when it opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      bringElementIntoView(modalRef.current);
      loadEmployees();
    }
  }, [isOpen]);

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.employees) {
          setEmployees(data.employees);
        } else {
          setEmployees(['Admin', 'Sales_Shweta', 'Sales_Saumya', 'Sales_Nagender', 'Sales_Abhijeet']);
        }
      } else {
        setEmployees(['Admin', 'Sales_Shweta', 'Sales_Saumya', 'Sales_Nagender', 'Sales_Abhijeet']);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees(['Admin', 'Sales_Shweta', 'Sales_Saumya', 'Sales_Nagender', 'Sales_Abhijeet']);
    }
  };

  if (!isOpen || !lead || !mounted) return null;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric'
    });
  };

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


  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === lead.status) return;

    try {
      setUpdatingStatus(true);
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin';

      // Update status
      const response = await fetch('/api/crm/leads/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lead.id,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update status');
      }

      // Create activity
      try {
        await fetch('/api/crm/leads/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: lead.id,
            activity_type: 'status_change',
            description: `Status changed from ${lead.status || 'New'} to ${newStatus}`,
            created_by: username,
          }),
        });
      } catch (activityError) {
        console.error('Error creating activity:', activityError);
      }

      // Optimistic update - update lead immediately
      const updatedLead = { ...lead, status: newStatus };
      if (onLeadUpdate) onLeadUpdate(updatedLead);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert(error.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleEmployeeChange = async (newEmployee: string) => {
    if (newEmployee === lead.assigned_employee) return;

    try {
      setUpdatingEmployee(true);
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin';

      const response = await fetch('/api/crm/leads/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lead.id,
          assigned_employee: newEmployee || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update employee');
      }

      // Create activity
      try {
        await fetch('/api/crm/leads/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: lead.id,
            activity_type: 'employee_reassigned',
            description: `Reassigned from ${lead.assigned_employee || 'Unassigned'} to ${newEmployee || 'Unassigned'}`,
            created_by: username,
          }),
        });
      } catch (activityError) {
        console.error('Error creating activity:', activityError);
      }

      // Optimistic update - update lead immediately
      const updatedLead = { ...lead, assigned_employee: newEmployee };
      if (onLeadUpdate) onLeadUpdate(updatedLead);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error updating employee:', error);
      alert(error.message || 'Failed to update employee');
    } finally {
      setUpdatingEmployee(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    // Normalize priority value
    const normalizedPriority = newPriority === '' || newPriority === 'null' 
      ? null 
      : LEAD_PRIORITIES.includes(newPriority) 
        ? newPriority 
        : null;

    if (normalizedPriority === lead.priority) return;

    try {
      setUpdatingPriority(true);
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin';

      const response = await fetch('/api/crm/leads/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lead.id,
          priority: normalizedPriority,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update priority');
      }

      // Create activity
      try {
        await fetch('/api/crm/leads/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: lead.id,
            activity_type: 'priority_changed',
            description: `Priority changed from ${lead.priority || 'None'} to ${normalizedPriority || 'None'}`,
            created_by: username,
          }),
        });
      } catch (activityError) {
        console.error('Error creating activity:', activityError);
      }

      // Optimistic update - update lead immediately
      const updatedLead = { ...lead, priority: normalizedPriority as 'High Priority' | 'Medium Priority' | 'Low Priority' | null };
      if (onLeadUpdate) onLeadUpdate(updatedLead);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error updating priority:', error);
      alert(error.message || 'Failed to update priority');
    } finally {
      setUpdatingPriority(false);
    }
  };

  const handleQuickAction = (action: string) => {
    if (action === 'note') {
      setAddNoteOpen(true);
    } else if (onQuickAction) {
      onQuickAction(action, lead);
    }
  };

  const handleNoteAdded = () => {
    setRefreshKey(prev => prev + 1);
    // Note added - no need to update lead, just refresh key for UI
    if (onLeadUpdate && lead) {
      onLeadUpdate(lead);
    }
  };


  const modalContent = (
    <>
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up"
      onClick={onClose}
    >
      <div 
          ref={modalRef}
          className="glassmorphic-premium rounded-3xl p-6 md:p-8 max-w-4xl w-full border-2 border-premium-gold/30 shadow-2xl relative"
        style={{ 
          maxHeight: '90vh', 
          overflowY: 'auto',
          margin: '2rem auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-lg">Lead Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-3xl font-bold transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
            {/* Lead Name */}
          <div>
              <label className="block text-sm font-semibold text-slate-400 mb-2">Lead Name</label>
            <p className="text-xl font-bold text-white bg-slate-800/50 rounded-lg p-3">{lead.lead_name}</p>
          </div>

          {/* Grid Layout for Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Contact Person */}
            {lead.contact_person && (
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Contact Person</label>
                <p className="text-white bg-slate-800/30 rounded-lg p-3">{lead.contact_person}</p>
              </div>
            )}

            {/* Phone */}
            {lead.phone && (
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Phone</label>
                <p className="text-white bg-slate-800/30 rounded-lg p-3">{lead.phone}</p>
              </div>
            )}

            {/* Email */}
            {lead.email && (
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Email</label>
                <p className="text-white bg-slate-800/30 rounded-lg p-3 break-all">{lead.email}</p>
              </div>
            )}

            {/* Lead Source */}
            {lead.lead_source && (
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Lead Source</label>
                <p className="text-white bg-slate-800/30 rounded-lg p-3">{lead.lead_source}</p>
              </div>
            )}

              {/* Status - Read Only */}
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Status</label>
                <p className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border-2 bg-transparent ${getStatusColor(lead.status)}`}>
                  {lead.status || 'New'}
                </p>
              </div>

              {/* Assigned Employee - Read Only */}
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Assigned Employee</label>
                <p className="w-full px-3 py-2 text-white bg-slate-800/30 rounded-lg text-sm">
                  {lead.assigned_employee || 'Unassigned'}
                </p>
              </div>

              {/* Priority - Read Only */}
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Priority</label>
                <p className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border-2 bg-slate-800/30 text-white border-slate-500`}>
                  {lead.priority || 'No Priority'}
                </p>
              </div>

            {/* Linked Account */}
            {lead.account_name && (
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Linked Account</label>
                <p className="text-white bg-slate-800/30 rounded-lg p-3">{lead.account_name}</p>
              </div>
            )}

            {/* Linked Sub-Account */}
            {lead.sub_account_name && (
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Linked Sub-Account</label>
                <p className="text-white bg-slate-800/30 rounded-lg p-3">{lead.sub_account_name}</p>
              </div>
            )}

            {/* Created By */}
            {lead.created_by && (
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Created By</label>
                <p className="text-white bg-slate-800/30 rounded-lg p-3">{lead.created_by}</p>
              </div>
            )}

            {/* Created At */}
            {lead.created_at && (
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Created At</label>
                <p className="text-white bg-slate-800/30 rounded-lg p-3">{formatDate(lead.created_at)}</p>
              </div>
            )}
          </div>

          {/* Requirements - Full Width */}
          {lead.requirements && (
            <div>
              <label className="block text-sm font-semibold text-slate-400 mb-2">Requirements</label>
              <p className="text-white whitespace-pre-wrap bg-slate-800/50 rounded-lg p-4 min-h-[100px]">{lead.requirements}</p>
            </div>
          )}

        </div>

          {/* Quick Actions */}
          {onQuickAction && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>⚡</span>
                <span>Quick Actions</span>
              </h3>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <LeadQuickActions lead={lead} onActionClick={handleQuickAction} />
              </div>
            </div>
          )}

        {/* Footer Actions */}
        <div className="mt-8 flex gap-4 border-t border-white/10 pt-6">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-slate-600/80 hover:bg-slate-700 rounded-lg transition-all duration-200"
          >
            Close
          </button>
          <button
            onClick={() => {
              onEdit(lead);
              onClose();
            }}
            className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-lg transition-all duration-200 shadow-lg shadow-premium-gold/30"
          >
            Edit Lead
          </button>
        </div>
      </div>
    </div>

      {/* Add Note Modal */}
      <AddNoteModal
        isOpen={addNoteOpen}
        onClose={() => setAddNoteOpen(false)}
        leadId={lead.id}
        leadName={lead.lead_name}
        onNoteAdded={handleNoteAdded}
      />

    </>
  );

  return createPortal(modalContent, document.body);
}
