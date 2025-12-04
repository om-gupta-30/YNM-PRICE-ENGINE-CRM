'use client';

import React, { useEffect, useState } from 'react';
import { Lead } from '@/app/crm/leads/page';
import LeadQuickActions from '@/components/crm/LeadQuickActions';
import LeadActivityTimeline from '@/components/crm/LeadActivityTimeline';
import AddNoteModal from '@/components/crm/AddNoteModal';
import SetFollowUpModal from '@/components/crm/SetFollowUpModal';
import { calculateLeadScore } from '@/lib/utils/leadScore';

interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onEdit: (lead: Lead) => void;
  onQuickAction?: (action: string, lead: Lead) => void;
  onLeadUpdate?: () => void;
}

export default function LeadDetailsModal({ isOpen, onClose, lead, onEdit, onQuickAction, onLeadUpdate }: LeadDetailsModalProps) {
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [setFollowUpOpen, setSetFollowUpOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingEmployee, setUpdatingEmployee] = useState(false);
  const [employees, setEmployees] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const modalRef = React.useRef<HTMLDivElement>(null);

  // Prevent body scroll when modal is open and auto-scroll to top
  useEffect(() => {
    if (isOpen) {
      // Immediately scroll window to top so modal is visible
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
      
      loadEmployees();
      
      // Auto-scroll to top of modal when opened
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.scrollTop = 0;
        }
      }, 10);
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
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

  if (!isOpen || !lead) return null;

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

      if (onLeadUpdate) onLeadUpdate();
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

      if (onLeadUpdate) onLeadUpdate();
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error updating employee:', error);
      alert(error.message || 'Failed to update employee');
    } finally {
      setUpdatingEmployee(false);
    }
  };

  const handleQuickAction = (action: string) => {
    if (action === 'note') {
      setAddNoteOpen(true);
    } else if (action === 'followup') {
      setSetFollowUpOpen(true);
    } else if (onQuickAction) {
      onQuickAction(action, lead);
    }
  };

  const handleNoteAdded = () => {
    setRefreshKey(prev => prev + 1);
    if (onLeadUpdate) onLeadUpdate();
  };

  const handleFollowUpSet = () => {
    setRefreshKey(prev => prev + 1);
    if (onLeadUpdate) onLeadUpdate();
  };

  const leadScore = calculateLeadScore(lead);

  return (
    <>
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up"
      onClick={onClose}
      style={{ overflowY: 'auto' }}
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
            {/* Lead Name with Score and Follow-Up Badge */}
          <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <label className="block text-sm font-semibold text-slate-400">Lead Name</label>
                <div className="flex items-center gap-2">
                  {lead.follow_up_date && (
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      isFollowUpOverdue(lead.follow_up_date) 
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                        : isFollowUpDueToday(lead.follow_up_date)
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {isFollowUpOverdue(lead.follow_up_date) ? '⚠️ Overdue' : isFollowUpDueToday(lead.follow_up_date) ? '📅 Due Today' : `📅 ${formatDateOnly(lead.follow_up_date)}`}
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    leadScore >= 80 ? 'bg-green-500/20 text-green-300' :
                    leadScore >= 60 ? 'bg-blue-500/20 text-blue-300' :
                    leadScore >= 40 ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    Score: {leadScore}
                  </span>
                </div>
              </div>
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

              {/* Status - Editable */}
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Status</label>
                <select
                  value={lead.status || 'New'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updatingStatus}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border-2 bg-transparent ${getStatusColor(lead.status)} focus:outline-none focus:ring-2 focus:ring-premium-gold disabled:opacity-50`}
                >
                  <option value="New">New</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Quotation Sent">Quotation Sent</option>
                  <option value="Follow-Up">Follow-Up</option>
                  <option value="Closed Won">Closed Won</option>
                  <option value="Closed Lost">Closed Lost</option>
                </select>
              </div>

              {/* Assigned Employee - Editable */}
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Assigned Employee</label>
                <select
                  value={lead.assigned_employee || ''}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  disabled={updatingEmployee}
                  className="w-full px-3 py-2 text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold disabled:opacity-50"
                >
                  <option value="">Unassigned</option>
                  {employees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              {lead.priority && (
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-2">Priority</label>
                  <div className="p-3">
                    <span className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold ${
                      lead.priority === 'High Priority' ? 'bg-red-500/20 text-red-300' :
                      lead.priority === 'Medium Priority' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-green-500/20 text-green-300'
                    }`}>
                      {lead.priority}
                    </span>
                  </div>
              </div>
            )}

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

            {/* Follow-Up Date Display */}
            {lead.follow_up_date && (
            <div>
                <label className="block text-sm font-semibold text-slate-400 mb-2">Follow-Up Date</label>
                <div className={`p-3 rounded-lg ${
                  isFollowUpOverdue(lead.follow_up_date) 
                    ? 'bg-red-500/10 border border-red-500/30' 
                    : isFollowUpDueToday(lead.follow_up_date)
                    ? 'bg-orange-500/10 border border-orange-500/30'
                    : 'bg-blue-500/10 border border-blue-500/30'
                }`}>
                  <p className="text-white font-semibold">{formatDateOnly(lead.follow_up_date)}</p>
                  {isFollowUpOverdue(lead.follow_up_date) && (
                    <p className="text-xs text-red-300 mt-1">⚠️ This follow-up is overdue</p>
                  )}
                  {isFollowUpDueToday(lead.follow_up_date) && (
                    <p className="text-xs text-orange-300 mt-1">📅 Follow-up is due today</p>
                  )}
                </div>
            </div>
          )}
        </div>

          {/* Activity Timeline Section */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📋</span>
                <span>Activity Timeline</span>
              </h3>
              <button
                onClick={() => setAddNoteOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-500/80 hover:bg-blue-500 rounded-lg transition-all duration-200 flex items-center gap-1.5"
              >
                <span>📝</span>
                <span>Add Note</span>
              </button>
            </div>
            <LeadActivityTimeline key={refreshKey} leadId={lead.id} />
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

      {/* Set Follow-Up Modal */}
      <SetFollowUpModal
        isOpen={setFollowUpOpen}
        onClose={() => setSetFollowUpOpen(false)}
        leadId={lead.id}
        leadName={lead.lead_name}
        currentFollowUpDate={lead.follow_up_date}
        onFollowUpSet={handleFollowUpSet}
      />
    </>
  );
}
