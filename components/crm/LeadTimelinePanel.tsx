'use client';

import { Lead } from '@/app/crm/leads/page';
import LeadQuickActions from '@/components/crm/LeadQuickActions';

interface LeadTimelinePanelProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onEdit: (lead: Lead) => void;
  onQuickAction?: (action: string, lead: Lead) => void;
}

export default function LeadTimelinePanel({ isOpen, onClose, lead, onEdit, onQuickAction }: LeadTimelinePanelProps) {
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

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[10000] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-[#1d0f0a] border-l-2 border-premium-gold/30 shadow-2xl z-[10001] transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#2a1a15]">
            <h2 className="text-2xl font-extrabold text-white">Lead Timeline</h2>
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white text-2xl font-bold transition-colors"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Lead Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-400 mb-2">Lead Name</label>
              <p className="text-lg font-bold text-white">{lead.lead_name}</p>
            </div>

            {/* Timeline Section */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>📅</span>
                <span>Timeline</span>
              </h3>
              
              <div className="space-y-4">
                {/* Notes Timeline Item */}
                <div className="bg-slate-800/50 rounded-lg p-4 border-l-4 border-blue-500">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-300">Notes</span>
                    <span className="text-xs text-slate-400">Temporary UI</span>
                  </div>
                  <p className="text-sm text-slate-300">
                    {lead.requirements || 'No notes available'}
                  </p>
                </div>

                {/* Call Status Timeline Item */}
                <div className="bg-slate-800/50 rounded-lg p-4 border-l-4 border-green-500">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-semibold text-green-300">Call Status</span>
                    <span className="text-xs text-slate-400">Temporary UI</span>
                  </div>
                  <p className="text-sm text-slate-300">Not called yet</p>
                  <p className="text-xs text-slate-400 mt-1">Call status tracking coming soon</p>
                </div>

                {/* Follow-up Schedule Timeline Item */}
                <div className="bg-slate-800/50 rounded-lg p-4 border-l-4 border-orange-500">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-semibold text-orange-300">Follow-up Schedule</span>
                    <span className="text-xs text-slate-400">Temporary UI</span>
                  </div>
                  <p className="text-sm text-slate-300">No follow-up scheduled</p>
                  <p className="text-xs text-slate-400 mt-1">Follow-up scheduling coming soon</p>
                </div>

                {/* Status History */}
                <div className="bg-slate-800/50 rounded-lg p-4 border-l-4 border-purple-500">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-semibold text-purple-300">Status History</span>
                    <span className="text-xs text-slate-400">Temporary UI</span>
                  </div>
                  <p className="text-sm text-slate-300">Current: {lead.status || 'New'}</p>
                  <p className="text-xs text-slate-400 mt-1">Status history tracking coming soon</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>📞</span>
                <span>Contact Information</span>
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                {lead.contact_person && (
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Contact Person</p>
                    <p className="text-white">{lead.contact_person}</p>
                  </div>
                )}
                {lead.phone && (
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Phone</p>
                    <p className="text-white">{lead.phone}</p>
                  </div>
                )}
                {lead.email && (
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Email</p>
                    <p className="text-white break-all">{lead.email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            {onQuickAction && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span>⚡</span>
                  <span>Quick Actions</span>
                </h3>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <LeadQuickActions lead={lead} onActionClick={onQuickAction} />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-white/10 bg-[#2a1a15] flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-slate-600 hover:bg-slate-700 rounded-lg transition-all duration-200"
            >
              Close
            </button>
            <button
              onClick={() => {
                onEdit(lead);
                onClose();
              }}
              className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-lg transition-all duration-200"
            >
              Edit Lead
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

