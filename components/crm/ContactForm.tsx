'use client';

import { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import { PortalPopperContainer } from '@/components/ui/PortalPopperContainer';
import 'react-datepicker/dist/react-datepicker.css';

interface ContactFormData {
  name: string;
  designation: string;
  email: string;
  phone: string;
  callStatus: string;
  notes: string;
  followUpDate?: Date | null;
  accountName?: string;
}

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => void;
  initialData?: ContactFormData | null;
  mode?: 'create' | 'edit';
  accounts?: string[];
}

export default function ContactForm({ isOpen, onClose, onSubmit, initialData, mode = 'create', accounts = [] }: ContactFormProps) {
  // Call Status options
  const callStatusOptions = [
    'Connected',
    'DNP',
    'ATCBL',
    'Unable to connect',
    'Number doesn\'t exist',
    'Wrong number'
  ];

  // Form state
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    designation: '',
    email: '',
    phone: '',
    callStatus: '',
    notes: '',
    followUpDate: null,
    accountName: ''
  });

  // Track if form has been initialized to prevent re-initialization
  const hasInitializedRef = useRef(false);
  
  // Initialize form data when modal opens - only once
  useEffect(() => {
    if (!isOpen) {
      // Reset initialization flag when modal closes
      hasInitializedRef.current = false;
      return;
    }
    
    // Only initialize once when modal opens
    if (!hasInitializedRef.current && isOpen) {
      hasInitializedRef.current = true;
      
      if (initialData) {
        setFormData(initialData);
      } else {
        // Get first account if available
        const defaultAccountName = accounts && accounts.length > 0 ? accounts[0] : '';
        setFormData({
          name: '',
          designation: '',
          email: '',
          phone: '',
          callStatus: '',
          notes: '',
          followUpDate: null,
          accountName: defaultAccountName
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only depend on isOpen

  // Handle input change
  const handleInputChange = (field: keyof ContactFormData, value: string | Date | null) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Don't clear follow-up date for Connected status - user can set it
      if (field === 'callStatus') {
        if (value !== 'ATCBL' && value !== 'DNP' && value !== 'Unable to connect' && value !== 'Connected') {
          // Clear for other statuses that don't typically need follow-ups
          updated.followUpDate = null;
        }
      }
      return updated;
    });
  };

  // Get required fields based on mode
  const isFieldRequired = (field: keyof ContactFormData): boolean => {
    // For create mode, call status is not required
    if (field === 'callStatus' && mode === 'create') {
      return false;
    }
    // For edit mode, call status is optional
    if (field === 'callStatus' && mode === 'edit') {
      return false;
    }
    // Name, email, phone are always required
    if (field === 'name' || field === 'email' || field === 'phone') {
      return true;
    }
    return false;
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-up overflow-hidden"
      onClick={onClose}
    >
      <div 
        className="glassmorphic-premium rounded-3xl max-w-2xl w-full border-2 border-premium-gold/30 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - Fixed */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-2xl font-extrabold text-white drop-shadow-lg">
            {mode === 'edit' ? 'Edit Contact' : 'Add Contact'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 modal-scrollable">
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Name (if accounts provided) */}
          {accounts.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Account <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.accountName || ''}
                onChange={(e) => handleInputChange('accountName', e.target.value)}
                className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                required
              >
                <option value="">Select Account</option>
                {accounts.map((account) => (
                  <option key={account} value={account}>
                    {account}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent"
              placeholder="Enter contact name"
              required
              disabled={mode === 'edit'}
            />
          </div>

          {/* Designation and Call Status - Side by Side */}
          {/* Designation - Full width when creating, half width when editing with call status */}
          <div className={mode === 'edit' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Designation
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => handleInputChange('designation', e.target.value)}
                className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent"
                placeholder="Enter designation (optional)"
                disabled={mode === 'edit'}
              />
            </div>

            {/* Call Status - Only show in edit mode, not when creating new contact */}
            {mode === 'edit' && (
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Call Status
                </label>
                <select
                  value={formData.callStatus || ''}
                  onChange={(e) => handleInputChange('callStatus', e.target.value)}
                  className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                >
                  <option value="">No Call Status</option>
                  {callStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Email and Phone - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent"
                placeholder="Enter email"
                required
                disabled={mode === 'edit'}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Phone <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent"
                placeholder="Enter phone number"
                required
                disabled={mode === 'edit'}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent"
              placeholder="Enter notes"
              rows={4}
            />
          </div>

          {/* Follow-up Date - Show for Connected, ATCBL, DNP, and Unable to connect */}
          {(formData.callStatus === 'Connected' || formData.callStatus === 'ATCBL' || formData.callStatus === 'DNP' || formData.callStatus === 'Unable to connect') && (
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Follow-up Date <span className="text-blue-400">
                  {formData.callStatus === 'Connected' 
                    ? '(Optional - Set next follow-up)' 
                    : formData.callStatus === 'ATCBL' 
                    ? '(Schedule Callback)' 
                    : '(Required Follow-up)'}
                </span>
              </label>
              <DatePicker
                selected={formData.followUpDate || null}
                onChange={(date: Date | null) => handleInputChange('followUpDate', date)}
                dateFormat="dd/MM/yyyy"
                className="input-premium input-focus-glow w-full px-4 py-3 text-white placeholder-slate-400"
                wrapperClassName="w-full"
                popperPlacement="bottom-start"
                placeholderText="Select follow-up date"
                minDate={new Date()}
              />
            </div>
          )}

            {/* Form Buttons */}
            <div className="flex gap-4 pt-4 border-t border-white/20">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 text-lg font-semibold text-slate-200 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 border border-white/20"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 text-lg font-bold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-xl transition-all duration-300 shadow-lg shadow-premium-gold/50 hover:shadow-xl hover:shadow-premium-gold/70"
              >
                {mode === 'edit' ? 'Update Contact' : 'Save Contact'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

