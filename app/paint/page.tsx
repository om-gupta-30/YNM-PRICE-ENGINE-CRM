'use client';

import { useState } from 'react';
import SmartDropdown from '@/components/forms/SmartDropdown';
import CustomerSelect from '@/components/forms/CustomerSelect';
import PlaceOfSupplySelect from '@/components/forms/PlaceOfSupplySelect';

export default function PaintPage() {
  // Quotation header fields (mandatory)
  const [placeOfSupply, setPlaceOfSupply] = useState<string>('');
  const [quotationDate, setQuotationDate] = useState<string>(() => {
    // Default to today's date in DD/MM/YYYY format
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  });
  const [purpose, setPurpose] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  
  // Check if all quotation fields are filled
  const isQuotationComplete = placeOfSupply.trim() !== '' && 
                               quotationDate.trim() !== '' && 
                               purpose.trim() !== '' && 
                               customerName.trim() !== '';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 relative">
      <div className="w-full max-w-6xl mx-auto">
        {/* Quotation Header Fields - Mandatory */}
        <div className="glassmorphic-premium rounded-3xl p-8 mb-10 slide-up card-hover-gold border-2 border-premium-gold/30">
          <h3 className="text-2xl font-extrabold text-white mb-6 drop-shadow-lg">Quotation Details</h3>
          
          {!isQuotationComplete && (
            <div className="mb-6 p-4 bg-amber-500/20 border border-amber-400/50 rounded-xl backdrop-blur-sm">
              <p className="text-amber-200 text-sm font-medium">
                Please complete the mandatory quotation details to proceed.
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Place of Supply <span className="text-red-400">*</span>
              </label>
              <PlaceOfSupplySelect
                value={placeOfSupply}
                onChange={setPlaceOfSupply}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Date <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                pattern="\d{2}/\d{2}/\d{4}"
                className="input-premium w-full px-6 py-4 text-white placeholder-slate-400"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Purpose <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Enter purpose"
                className="input-premium w-full px-6 py-4 text-white placeholder-slate-400"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Customer Name <span className="text-red-400">*</span>
              </label>
              <CustomerSelect
                value={customerName}
                onChange={setCustomerName}
                placeholder="Select customer"
              />
            </div>
          </div>
        </div>
      </div>
      <div className={`text-center title-glow fade-up ${!isQuotationComplete ? 'opacity-50 pointer-events-none' : ''}`}>
        <h1 className="text-7xl md:text-8xl font-extrabold text-white mb-8 tracking-tight drop-shadow-2xl text-neon-gold" style={{ 
          textShadow: '0 0 40px rgba(209, 168, 90, 0.4), 0 0 80px rgba(209, 168, 90, 0.2), 0 0 120px rgba(116, 6, 13, 0.1)',
          letterSpacing: '-0.02em'
        }}>
          Paint Module
        </h1>
        <div className="gold-divider"></div>
        <p className="text-2xl text-slate-200 mt-12">Coming Soon</p>
      </div>
    </div>
  );
}
