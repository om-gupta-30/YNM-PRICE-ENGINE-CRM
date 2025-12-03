'use client';

import { useEffect, useRef } from 'react';
import { Quote } from '@/lib/constants/types';

interface QuotationDetailsModalProps {
  quote: Quote;
  onClose: () => void;
}

export default function QuotationDetailsModal({ quote, onClose }: QuotationDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const formatIndianUnits = (value: number): string => {
    const formatted = value.toLocaleString('en-IN', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });

    if (value < 100000) {
      return formatted;
    }

    if (value >= 100000 && value < 10000000) {
      const lakhs = value / 100000;
      return `${lakhs.toFixed(1)} Lakhs`;
    }

    const crores = value / 10000000;
    return `${crores.toFixed(1)} Crores`;
  };
  
  // Prevent body scroll when modal is open and auto-scroll to top
  useEffect(() => {
    // Scroll window to top so modal is visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.style.overflow = 'hidden';
    // Auto-scroll to top of modal when opened
    setTimeout(() => {
      if (modalRef.current) {
        modalRef.current.scrollTop = 0;
      }
    }, 100);
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up"
      onClick={onClose}
      style={{ overflowY: 'auto' }}
    >
      <div 
        ref={modalRef}
        className="glassmorphic-premium rounded-3xl p-8 max-w-4xl w-full border-2 border-premium-gold/30 shadow-2xl relative"
        style={{ 
          maxHeight: '90vh', 
          overflowY: 'auto',
          margin: '2rem auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-extrabold text-white drop-shadow-lg">Quotation Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>
        
        {/* Main Details */}
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">ID</label>
              <p className="text-white font-bold">{quote.id}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">Section</label>
              <p className="text-white font-bold">
                {(() => {
                  const section = quote.section.toLowerCase();
                  if (section.includes('signages') || section.includes('reflective')) {
                    const payload = quote.raw_payload || {};
                    return payload.msEnabled ? 'Reflective Part + MS Part' : 'Reflective Part';
                  }
                  return quote.section;
                })()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">Created By</label>
              <p className="text-white">{quote.created_by || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">Customer Name</label>
              <p className="text-white">{quote.customer_name}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">Place of Supply</label>
              <p className="text-white">{quote.place_of_supply}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">Purpose</label>
              <p className="text-white">{quote.purpose || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">Date</label>
              <p className="text-white">{quote.date}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">Created At</label>
              <p className="text-white">{new Date(quote.created_at).toLocaleString('en-IN')}</p>
            </div>
          </div>
          
          {/* Separator */}
          <div className="border-t border-white/20 my-6"></div>
          
          {/* Quantity and Weight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">Quantity (rm)</label>
              <p className="text-white font-bold">{quote.quantity_rm || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">Total Weight per rm</label>
              <p className="text-white font-bold">{quote.total_weight_per_rm ? `${quote.total_weight_per_rm.toFixed(3)} kg/rm` : '-'}</p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="btn-premium-gold px-6 py-3 shimmer"
          >
            Back to History
          </button>
        </div>
      </div>
    </div>
  );
}

