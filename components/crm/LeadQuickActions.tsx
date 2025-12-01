'use client';

import { Lead } from '@/app/crm/leads/page';

interface LeadQuickActionsProps {
  lead: Lead;
  onActionClick: (action: string, lead: Lead) => void;
}

export default function LeadQuickActions({ lead, onActionClick }: LeadQuickActionsProps) {
  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.phone) {
      window.location.href = `tel:${lead.phone}`;
    } else {
      alert('Phone number not available');
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.phone) {
      // Remove any non-digit characters and ensure it starts with country code
      const phone = lead.phone.replace(/\D/g, '');
      const whatsappNumber = phone.startsWith('91') ? phone : `91${phone}`;
      window.open(`https://wa.me/${whatsappNumber}`, '_blank');
    } else {
      alert('Phone number not available');
    }
  };

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
    {
      id: 'call',
      label: 'Call',
      icon: '📞',
      color: 'bg-green-500/80 hover:bg-green-500',
      onClick: handleCall,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: '💬',
      color: 'bg-green-600/80 hover:bg-green-600',
      onClick: handleWhatsApp,
    },
    {
      id: 'convert',
      label: 'Convert to Account',
      icon: '🔄',
      color: 'bg-orange-500/80 hover:bg-orange-500',
    },
    {
      id: 'quotation',
      label: 'Send Quotation',
      icon: '📄',
      color: 'bg-yellow-500/80 hover:bg-yellow-500',
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick || ((e) => {
            e.stopPropagation();
            onActionClick(action.id, lead);
          })}
          className={`px-3 py-1.5 text-xs font-semibold text-white ${action.color} rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-1.5`}
        >
          <span>{action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

