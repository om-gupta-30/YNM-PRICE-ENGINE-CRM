'use client';

import { Lead } from '@/app/crm/leads/page';

interface LeadQuickActionsProps {
  lead: Lead;
  onActionClick: (action: string, lead: Lead) => void;
}

export default function LeadQuickActions({ lead, onActionClick }: LeadQuickActionsProps) {
  const actions = [
    {
      id: 'note',
      label: 'Add Note',
      icon: '📝',
      color: 'bg-blue-500/80 hover:bg-blue-500',
    },
    {
      id: 'followup',
      label: 'Set Follow-Up',
      icon: '📅',
      color: 'bg-purple-500/80 hover:bg-purple-500',
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={(e) => {
            e.stopPropagation();
            onActionClick(action.id, lead);
          }}
          className={`px-3 py-1.5 text-xs font-semibold text-white ${action.color} rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-1.5`}
        >
          <span>{action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

