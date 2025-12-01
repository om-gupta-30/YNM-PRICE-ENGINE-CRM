'use client';

import { useState } from 'react';
import { Lead } from '@/app/crm/leads/page';
import { calculateLeadScore, getLeadScoreColor } from '@/lib/utils/leadScore';

interface LeadsKanbanProps {
  leads: Lead[];
  onStatusChange: (leadId: number, newStatus: string) => Promise<void>;
  onLeadClick: (lead: Lead) => void;
  onPriorityChange?: (leadId: number, priority: 'High Priority' | 'Medium Priority' | 'Low Priority' | null) => Promise<void>;
}

const STATUS_COLUMNS = [
  { id: 'New', label: 'New', color: 'bg-blue-500/20 border-blue-500/30' },
  { id: 'In Progress', label: 'In Progress', color: 'bg-yellow-500/20 border-yellow-500/30' },
  { id: 'Quotation Sent', label: 'Quotation Sent', color: 'bg-purple-500/20 border-purple-500/30' },
  { id: 'Follow-up', label: 'Follow-Up', color: 'bg-orange-500/20 border-orange-500/30' },
  { id: 'Closed Won', label: 'Closed Won', color: 'bg-green-500/20 border-green-500/30' },
  { id: 'Closed Lost', label: 'Closed Lost', color: 'bg-red-500/20 border-red-500/30' },
];

export default function LeadsKanban({ leads, onStatusChange, onLeadClick, onPriorityChange }: LeadsKanbanProps) {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Map statuses to columns (handle variations)
  const getStatusColumn = (status: string | null): string => {
    if (!status) return 'New';
    if (status === 'Closed' || status === 'Closed Won') return 'Closed Won';
    if (status === 'Lost' || status === 'Closed Lost') return 'Closed Lost';
    if (status === 'Follow-up' || status === 'Follow-Up') return 'Follow-up';
    return status;
  };

  // Group leads by status
  const leadsByStatus = leads.reduce((acc, lead) => {
    const columnStatus = getStatusColumn(lead.status);
    if (!acc[columnStatus]) {
      acc[columnStatus] = [];
    }
    acc[columnStatus].push(lead);
    return acc;
  }, {} as Record<string, Lead[]>);

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lead.id.toString());
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedLead && draggedLead.status !== targetColumnId) {
      await onStatusChange(draggedLead.id, targetColumnId);
    }

    setDraggedLead(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const getPriorityColor = (priority: 'High Priority' | 'Medium Priority' | 'Low Priority' | null | undefined) => {
    switch (priority) {
      case 'High Priority':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'Medium Priority':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'Low Priority':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4">
      <div className="flex gap-3 md:gap-4 min-w-max">
        {STATUS_COLUMNS.map((column) => {
          const columnLeads = leadsByStatus[column.id] || [];
          const isDragOver = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              className={`flex-shrink-0 w-72 md:w-80 ${column.color} rounded-xl p-3 md:p-4 border-2 transition-all duration-200 ${
                isDragOver ? 'border-premium-gold scale-105 shadow-xl' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h3 className="font-bold text-white text-xs md:text-sm">
                  {column.label} <span className="text-slate-400">({columnLeads.length})</span>
                </h3>
              </div>

              {/* Column Cards */}
              <div className="space-y-2 md:space-y-3 min-h-[200px]">
                {columnLeads.map((lead) => {
                  const score = calculateLeadScore(lead);
                  const priority = lead.priority || null;
                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
                      onClick={() => onLeadClick(lead)}
                      className="bg-slate-800/80 rounded-lg p-3 md:p-4 cursor-move hover:bg-slate-700/80 transition-all duration-200 border border-white/10 hover:border-premium-gold/50 hover:shadow-lg hover:shadow-premium-gold/20 active:scale-95"
                    >
                      {/* Lead Name with Follow-Up Badge */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-semibold text-white text-xs md:text-sm line-clamp-2 flex-1">
                        {lead.lead_name}
                      </p>
                        {lead.follow_up_date && (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ${
                            (() => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const followUp = new Date(lead.follow_up_date);
                              followUp.setHours(0, 0, 0, 0);
                              if (followUp.getTime() < today.getTime()) {
                                return 'bg-red-500/20 text-red-300';
                              } else if (followUp.getTime() === today.getTime()) {
                                return 'bg-orange-500/20 text-orange-300';
                              }
                              return 'bg-blue-500/20 text-blue-300';
                            })()
                          }`} title={`Follow-up: ${formatDate(lead.follow_up_date)}`}>
                            📅
                          </span>
                        )}
                      </div>

                      {/* Contact Person */}
                      {lead.contact_person && (
                        <p className="text-xs text-slate-300 mb-1 truncate">
                          👤 {lead.contact_person}
                        </p>
                      )}

                      {/* Contact Info */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {lead.phone && (
                          <span className="text-xs text-slate-400">📞 {lead.phone}</span>
                        )}
                        {lead.email && (
                          <span className="text-xs text-slate-400">✉️ {lead.email.split('@')[0]}...</span>
                        )}
                      </div>

                      {/* Lead Score and Priority */}
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">Score:</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${getLeadScoreColor(score)}`}>
                          {score}
                        </span>
                        </div>
                        {onPriorityChange && (
                          <select
                            value={priority || ''}
                            onChange={async (e) => {
                              e.stopPropagation();
                              await onPriorityChange(lead.id, e.target.value as 'High Priority' | 'Medium Priority' | 'Low Priority' || null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={`px-1.5 py-0.5 rounded text-xs font-semibold border bg-transparent ${getPriorityColor(priority)} focus:outline-none focus:ring-1 focus:ring-premium-gold`}
                          >
                            <option value="">Priority</option>
                            <option value="High Priority">High</option>
                            <option value="Medium Priority">Med</option>
                            <option value="Low Priority">Low</option>
                          </select>
                        )}
                      </div>

                      {/* Lead Source & Date */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 truncate">{lead.lead_source || 'No source'}</span>
                        <span className="text-slate-400 ml-2">{formatDate(lead.created_at)}</span>
                      </div>
                    </div>
                  );
                })}

                {columnLeads.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No leads in this column
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

