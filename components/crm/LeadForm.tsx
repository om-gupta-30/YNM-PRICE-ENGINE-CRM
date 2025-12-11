'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { bringElementIntoView } from '@/lib/utils/bringElementIntoView';

export interface LeadFormData {
  lead_name: string;
  contact_person: string;
  phone: string;
  email: string;
  requirements: string;
  lead_source: string;
  status: string;
  priority: 'High Priority' | 'Medium Priority' | 'Low Priority' | null;
  assigned_employee: string;
  accounts: number | null;
  sub_accounts: number | null;
  contact_id: number | null;
}

interface LeadFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeadFormData) => void;
  initialData?: LeadFormData | null;
  mode?: 'create' | 'edit';
}

const LEAD_SOURCES = ['Website', 'Referral', 'Inbound Call', 'Existing Customer', 'Marketing', 'Email', 'India Mart', 'Dollar Business', 'WhatsApp', 'Exhibition', 'Other'];
const LEAD_STATUSES = ['New', 'In Progress', 'Quotation Sent', 'Follow-up', 'Closed', 'Lost'];
const LEAD_PRIORITIES = ['High Priority', 'Medium Priority', 'Low Priority'];

export default function LeadForm({ isOpen, onClose, onSubmit, initialData, mode = 'create' }: LeadFormProps) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bring modal into view when it opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      bringElementIntoView(modalRef.current);
    }
  }, [isOpen]);

  const [formData, setFormData] = useState<LeadFormData>({
    lead_name: '',
    contact_person: '',
    phone: '',
    email: '',
    requirements: '',
    lead_source: '',
    status: 'New',
    priority: null,
    assigned_employee: '',
    accounts: null,
    sub_accounts: null,
    contact_id: null,
  });

  const [accounts, setAccounts] = useState<Array<{ id: number; account_name: string }>>([]);
  const [subAccounts, setSubAccounts] = useState<Array<{ id: number; sub_account_name: string }>>([]);
  const [contacts, setContacts] = useState<Array<{ id: number; name: string; email: string | null; phone: string | null; designation: string | null }>>([]);
  const [employees, setEmployees] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const hasInitializedRef = useRef(false);

  // Load user info on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
      setUsername(localStorage.getItem('username') || '');
    }
  }, []);

  // Initialize form data when modal opens
  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      setLoadingData(false);
      // Reset form when modal closes
      if (mode === 'create') {
        const autoAssignedEmployee = !isAdmin && username ? username : '';
        setFormData({
          lead_name: '',
          contact_person: '',
          phone: '',
          email: '',
          requirements: '',
          lead_source: '',
          status: 'New',
          priority: null,
          assigned_employee: autoAssignedEmployee,
          accounts: null,
          sub_accounts: null,
          contact_id: null,
        });
        setSubAccounts([]);
        setContacts([]);
      }
      return;
    }
    
    if (!hasInitializedRef.current && isOpen) {
      hasInitializedRef.current = true;
      setLoadingData(true);
      
      if (initialData) {
        setFormData(initialData);
        // Pre-populate selected account/sub-account in dropdowns immediately for instant display
        // This ensures the selected values show up right away even before API calls complete
        if (initialData.accounts && mode === 'edit') {
          // We'll add the selected account to the accounts list if it's not there yet
          // The loadAccounts will populate the full list, but this ensures immediate display
        }
        
        // Load all data in parallel for faster loading
        Promise.all([
          initialData.accounts ? loadSubAccounts(initialData.accounts, true) : Promise.resolve(),
          initialData.sub_accounts ? loadContacts(initialData.sub_accounts) : Promise.resolve()
        ]).catch(error => {
          console.error('Error loading form data:', error);
        }).finally(() => {
          setLoadingData(false);
        });
      } else {
        // For sales employees creating a new lead, auto-assign to themselves
        const autoAssignedEmployee = !isAdmin && username ? username : '';
        
        setFormData({
          lead_name: '',
          contact_person: '',
          phone: '',
          email: '',
          requirements: '',
          lead_source: '',
          status: 'New',
          priority: null,
          assigned_employee: autoAssignedEmployee,
          accounts: null,
          sub_accounts: null,
          contact_id: null,
        });
        // Reset dropdowns
        setSubAccounts([]);
        setContacts([]);
        setLoadingData(false);
      }
    }
  }, [isOpen, initialData, mode, isAdmin, username]);

  // Load accounts and employees on mount
  useEffect(() => {
    if (isOpen) {
      Promise.all([
        loadAccounts(),
        loadEmployees()
      ]).catch(error => {
        console.error('Error loading initial data:', error);
      });
    }
  }, [isOpen, isAdmin, username]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAccounts = async () => {
    try {
      // Always fetch all accounts - no filtering by employee
      const params = new URLSearchParams();
      // Still pass isAdmin for any future admin-specific logic if needed
      if (isAdmin) {
        params.append('isAdmin', 'true');
      }
      
      const response = await fetch(`/api/accounts?${params.toString()}`, {
        cache: 'no-store', // Ensure fresh data
      });
      const data = await response.json();
      if (data.success && data.accounts) {
        setAccounts(data.accounts.map((acc: any) => ({
          id: acc.id,
          account_name: acc.accountName || acc.account_name,
        })));
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadSubAccounts = async (accountId: number, preserveSelection: boolean = false) => {
    try {
      const response = await fetch(`/api/subaccounts?account_id=${accountId}`, {
        cache: 'no-store', // Ensure fresh data
      });
      const data = await response.json();
      if (data.success && data.subAccounts) {
        const subAccountsList = data.subAccounts.map((sa: any) => ({
          id: sa.id,
          sub_account_name: sa.subAccountName || sa.sub_account_name,
        }));
        setSubAccounts(subAccountsList);
        
        // If preserving selection (during edit mode initialization), don't clear
        if (!preserveSelection) {
          // Clear contacts when subaccount changes
          setContacts([]);
          setFormData(prev => ({ ...prev, sub_accounts: null, contact_id: null }));
        }
      } else {
        setSubAccounts([]);
      }
    } catch (error) {
      console.error('Error loading sub-accounts:', error);
      setSubAccounts([]);
      if (!preserveSelection) {
        setContacts([]);
      }
    }
  };

  const loadContacts = async (subAccountId: number) => {
    try {
      const response = await fetch(`/api/subaccounts/${subAccountId}/contacts`, {
        cache: 'no-store', // Ensure fresh data
      });
      const data = await response.json();
      if (data.success && data.contacts) {
        setContacts(data.contacts.map((contact: any) => ({
          id: contact.id,
          name: contact.name,
          email: contact.email || null,
          phone: contact.phone || null,
          designation: contact.designation || null,
        })));
      } else {
        setContacts([]);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      setContacts([]);
    }
  };

  const loadEmployees = async () => {
    try {
      // For admins, fetch only sales employees
      // For non-admins, we don't need to load employees (they can't assign)
      if (!isAdmin) {
        setEmployees([]);
        return;
      }
      
      // Fetch only sales employees for admin
      const response = await fetch('/api/employees?type=sales');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.employees) {
          setEmployees(data.employees);
        } else {
          // Fallback: use sales employee names only
          setEmployees(['Sales_Shweta', 'Sales_Saumya', 'Sales_Nagender', 'Sales_Abhijeet']);
        }
      } else {
        // Fallback list (sales employees only)
        setEmployees(['Sales_Shweta', 'Sales_Saumya', 'Sales_Nagender', 'Sales_Abhijeet']);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      // Fallback list (sales employees only)
      setEmployees(['Sales_Shweta', 'Sales_Saumya', 'Sales_Nagender', 'Sales_Abhijeet']);
    }
  };

  // Fetch assigned employee for an account
  const fetchAccountAssignedEmployee = async (accountId: number): Promise<string | null> => {
    try {
      // Add isAdmin param to ensure we can access the account
      const response = await fetch(`/api/accounts/${accountId}?isAdmin=true`);
      if (response.ok) {
        const data = await response.json();
        // API returns { data: {...} } structure
        if (data && data.data && data.data.assigned_employee) {
          return data.data.assigned_employee;
        }
        // Also check if data is directly the account object
        if (data && data.assigned_employee) {
          return data.assigned_employee;
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch account:', response.status, errorData);
      }
      return null;
    } catch (error) {
      console.error('Error fetching account assigned employee:', error);
      return null;
    }
  };

  const handleInputChange = (field: keyof LeadFormData, value: string | number | null) => {
    setFormData(prev => {
      let updated: LeadFormData;
      
      // Handle priority field with proper type casting
      if (field === 'priority') {
        updated = { 
          ...prev, 
          priority: value as 'High Priority' | 'Medium Priority' | 'Low Priority' | null 
        };
      } else {
        // Handle other fields - use type assertion for the entire object
        updated = { 
          ...prev, 
          [field]: value 
        } as LeadFormData;
      }
      
      // When account changes, reload sub-accounts and clear sub_account/contact selection
      if (field === 'accounts') {
        if (value) {
          loadSubAccounts(value as number);
          // For admins: Auto-assign employee from account
          if (isAdmin) {
            // Reset assigned_employee first to show loading state
            updated.assigned_employee = '';
            // Fetch and set employee asynchronously
            fetchAccountAssignedEmployee(value as number).then((employee) => {
              if (employee) {
                setFormData(prev => ({ ...prev, assigned_employee: employee }));
              } else {
                // Account has no assigned employee - clear it
                setFormData(prev => ({ ...prev, assigned_employee: '' }));
              }
            }).catch((error) => {
              console.error('Error in fetchAccountAssignedEmployee:', error);
              setFormData(prev => ({ ...prev, assigned_employee: '' }));
            });
          }
        } else {
          setSubAccounts([]);
          setContacts([]);
          updated.sub_accounts = null;
          updated.contact_id = null;
          if (isAdmin) {
            updated.assigned_employee = '';
          }
        }
      }
      
      // When sub-account changes, reload contacts and clear contact selection
      if (field === 'sub_accounts') {
        if (value) {
          loadContacts(value as number);
        } else {
          setContacts([]);
          updated.contact_id = null;
        }
      }
      
      return updated;
    });
  };

  // Handle contact selection - auto-fill form fields
  const handleContactChange = (contactId: number | null) => {
    if (contactId) {
      const selectedContact = contacts.find(c => c.id === contactId);
      if (selectedContact) {
        setFormData(prev => ({
          ...prev,
          contact_id: contactId,
          lead_name: selectedContact.name || prev.lead_name,
          contact_person: selectedContact.name || prev.contact_person,
          phone: selectedContact.phone || prev.phone,
          email: selectedContact.email || prev.email,
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        contact_id: null,
      }));
    }
  };

  const validateForm = (): string | null => {
    // For edit mode, only validate fields that are being changed
    // For create mode, validate all required fields
    if (mode === 'create') {
      if (!formData.accounts) {
        return 'Account is required';
      }
      if (!formData.sub_accounts) {
        return 'Sub-Account is required';
      }
      // Priority is optional - no validation needed
      if (!formData.contact_id) {
        return 'Contact is required. Please create a contact in the sub-account first.';
      }
      if (!formData.lead_name.trim()) {
        return 'Lead name is required';
      }
      if (!formData.phone.trim()) {
        return 'Phone is required';
      }
      // Note: For admins, assigned_employee validation is handled in the API
      // The API will auto-assign from account if not provided
    } else {
      // Edit mode - only validate fields that have values or are required
      if (formData.lead_name !== undefined && !formData.lead_name.trim()) {
        return 'Lead name cannot be empty';
      }
      if (formData.phone !== undefined && !formData.phone.trim()) {
        return 'Phone cannot be empty';
      }
    }
    
    // Email validation applies to both modes
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        return 'Invalid email format';
      }
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      // Use a better error display method
      const errorDiv = document.createElement('div');
      errorDiv.className = 'fixed top-4 right-4 z-[10002] bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg max-w-md';
      errorDiv.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-semibold">${validationError}</span>
          <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-red-200">×</button>
        </div>
      `;
      document.body.appendChild(errorDiv);
      setTimeout(() => {
        if (errorDiv.parentElement) {
          errorDiv.remove();
        }
      }, 5000);
      return;
    }

    // Ensure all required fields are present
    if (mode === 'create') {
      if (!formData.accounts || !formData.sub_accounts || !formData.contact_id || !formData.lead_name.trim() || !formData.phone.trim()) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 z-[10002] bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg max-w-md';
        errorDiv.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="font-semibold">Please fill in all required fields</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-red-200">×</button>
          </div>
        `;
        document.body.appendChild(errorDiv);
        setTimeout(() => {
          if (errorDiv.parentElement) {
            errorDiv.remove();
          }
        }, 5000);
        return;
      }
    }

    // Sanitize form data - ensure priority is null or valid value (never empty string)
    // CRITICAL: Remove priority entirely if it's null to avoid any database constraint violations
    const sanitizedFormData: any = {
      ...formData,
    };
    
    // Only include priority if it's a valid value
    if (formData.priority && LEAD_PRIORITIES.includes(formData.priority)) {
      sanitizedFormData.priority = formData.priority;
    } else {
      // Remove priority field completely if it's null or invalid
      delete sanitizedFormData.priority;
    }

    onSubmit(sanitizedFormData);
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-up"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className="glassmorphic-premium rounded-3xl max-w-2xl w-full border-2 border-premium-gold/30 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-2xl font-extrabold text-white drop-shadow-lg">
            {mode === 'edit' ? 'Edit Lead' : 'Add Lead'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div ref={modalContentRef} className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Selection - Required - FIRST */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Account * <span className="text-xs text-slate-400">(Required)</span>
                {loadingData && formData.accounts && (
                  <span className="ml-2 text-xs text-amber-400 animate-pulse">Loading...</span>
                )}
              </label>
              <select
                value={formData.accounts || ''}
                onChange={(e) => handleInputChange('accounts', e.target.value ? parseInt(e.target.value) : null)}
                required
                disabled={loadingData && !accounts.length}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold disabled:opacity-50 disabled:cursor-wait"
              >
                <option value="">Select Account *</option>
                {accounts.length === 0 && !loadingData ? (
                  <option value="" disabled>
                    {!isAdmin && username 
                      ? `No accounts assigned to you. Please contact admin to assign accounts.`
                      : 'No accounts available. Please create an account first.'}
                  </option>
                ) : (
                  accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.account_name}</option>
                  ))
                )}
                {/* Show selected account even if not in list yet (for edit mode) */}
                {formData.accounts && !accounts.find(a => a.id === formData.accounts) && (
                  <option value={formData.accounts} disabled>
                    {initialData?.accounts ? `Account ID: ${formData.accounts}` : 'Loading...'}
                  </option>
                )}
              </select>
              {!formData.accounts && accounts.length === 0 && !loadingData && (
                <p className="text-xs text-yellow-400 mt-1">
                  {!isAdmin && username 
                    ? '⚠️ No accounts are assigned to you. Please contact admin to assign accounts before creating leads.'
                    : '⚠️ No accounts available. Please create an account first.'}
                </p>
              )}
              {!formData.accounts && accounts.length > 0 && (
                <p className="text-xs text-slate-400 mt-1">Please select an account first</p>
              )}
            </div>

            {/* Sub-Account Selection - Required (only shown after account selected) */}
            {formData.accounts && (
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Sub-Account * <span className="text-xs text-slate-400">(Required)</span>
                  {loadingData && formData.sub_accounts && subAccounts.length === 0 && (
                    <span className="ml-2 text-xs text-amber-400 animate-pulse">Loading...</span>
                  )}
                </label>
                <select
                  value={formData.sub_accounts || ''}
                  onChange={(e) => handleInputChange('sub_accounts', e.target.value ? parseInt(e.target.value) : null)}
                  required
                  disabled={loadingData && subAccounts.length === 0}
                  className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold disabled:opacity-50 disabled:cursor-wait"
                >
                  <option value="">Select Sub-Account *</option>
                  {subAccounts.length === 0 && !loadingData ? (
                    <option value="" disabled>No sub-accounts found. Please create a sub-account first.</option>
                  ) : (
                    subAccounts.map(sa => (
                      <option key={sa.id} value={sa.id}>{sa.sub_account_name}</option>
                    ))
                  )}
                  {/* Show selected sub-account even if not in list yet (for edit mode) */}
                  {formData.sub_accounts && !subAccounts.find(sa => sa.id === formData.sub_accounts) && (
                    <option value={formData.sub_accounts} disabled>
                      {initialData?.sub_accounts ? `Sub-Account ID: ${formData.sub_accounts}` : 'Loading...'}
                    </option>
                  )}
                </select>
                {!formData.sub_accounts && subAccounts.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">Please select a sub-account</p>
                )}
                {subAccounts.length === 0 && formData.accounts && !loadingData && (
                  <p className="text-xs text-yellow-400 mt-1">⚠️ No sub-accounts found for this account. Please create a sub-account first.</p>
                )}
              </div>
            )}

            {/* Contact Selection - Required (only shown after sub-account selected) */}
            {formData.sub_accounts && (
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Contact * <span className="text-xs text-slate-400">(Required - will auto-fill details)</span>
                  {loadingData && formData.contact_id && contacts.length === 0 && (
                    <span className="ml-2 text-xs text-amber-400 animate-pulse">Loading...</span>
                  )}
                </label>
                <select
                  value={formData.contact_id || ''}
                  onChange={(e) => handleContactChange(e.target.value ? parseInt(e.target.value) : null)}
                  required
                  disabled={loadingData && contacts.length === 0}
                  className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold disabled:opacity-50 disabled:cursor-wait"
                >
                  <option value="">Select Contact *</option>
                  {contacts.length === 0 && !loadingData ? (
                    <option value="" disabled>No contacts found. Please create a contact in this sub-account first.</option>
                  ) : (
                    contacts.map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} {contact.designation ? `(${contact.designation})` : ''}
                      </option>
                    ))
                  )}
                  {/* Show selected contact even if not in list yet (for edit mode) */}
                  {formData.contact_id && !contacts.find(c => c.id === formData.contact_id) && (
                    <option value={formData.contact_id} disabled>
                      {initialData?.contact_id ? `Contact ID: ${formData.contact_id}` : 'Loading...'}
                    </option>
                  )}
                </select>
                {!formData.contact_id && contacts.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">Select a contact to auto-fill lead details</p>
                )}
                {contacts.length === 0 && formData.sub_accounts && !loadingData && (
                  <p className="text-xs text-yellow-400 mt-1">
                    ⚠️ No contacts found for this sub-account. Please create a contact first in the Sub-Accounts section.
                  </p>
                )}
              </div>
            )}

            {/* Divider */}
            {(formData.accounts && formData.sub_accounts && formData.contact_id) && (
              <div className="border-t border-white/10 pt-4">
                <p className="text-xs text-slate-400 mb-4">📝 Lead Details (Auto-filled from contact, can be edited)</p>
              </div>
            )}

            {/* Lead Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Lead Name *
              </label>
              <input
                type="text"
                value={formData.lead_name}
                onChange={(e) => handleInputChange('lead_name', e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold"
              />
            </div>

            {/* Contact Person */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => handleInputChange('contact_person', e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Phone *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold"
              />
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Requirements
              </label>
              <textarea
                value={formData.requirements}
                onChange={(e) => handleInputChange('requirements', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold"
              />
            </div>

            {/* Lead Source */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Lead Source
              </label>
              <select
                value={formData.lead_source || ''}
                onChange={(e) => handleInputChange('lead_source', e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold"
              >
                <option value="">Select Lead Source</option>
                {LEAD_SOURCES.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Status
              </label>
              <select
                value={formData.status || 'New'}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold"
              >
                {LEAD_STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Priority - Optional */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Priority <span className="text-xs text-slate-400">(Optional)</span>
              </label>
              <select
                value={formData.priority || ''}
                onChange={(e) => {
                  // Ensure we send null for empty string, or the exact priority value
                  const value = e.target.value;
                  // Only set if it's a valid priority value, otherwise null
                  if (value === '' || value === null || value === 'null' || !LEAD_PRIORITIES.includes(value as any)) {
                    handleInputChange('priority', null);
                  } else {
                    handleInputChange('priority', value as 'High Priority' | 'Medium Priority' | 'Low Priority');
                  }
                }}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold"
              >
                <option value="">Select Priority (Optional)</option>
                {LEAD_PRIORITIES.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
              {formData.priority && (
                <p className="text-xs text-slate-400 mt-1">Selected: {formData.priority}</p>
              )}
            </div>

            {/* Assigned Employee - Only visible to admins */}
            {isAdmin && (
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Assigned Employee <span className="text-xs text-slate-400">(Admin only)</span>
                </label>
                <select
                  value={formData.assigned_employee || ''}
                  onChange={(e) => handleInputChange('assigned_employee', e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold"
                >
                  <option value="">Select Employee (Auto-assigned from account)</option>
                  {employees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
                {formData.assigned_employee ? (
                  <p className="text-xs text-green-400 mt-1">
                    ✓ Assigned to: {formData.assigned_employee}
                  </p>
                ) : formData.accounts ? (
                  <p className="text-xs text-red-400 mt-1 font-semibold">
                    ⚠️ This account has no assigned employee. Please assign an employee to this account first before creating a lead.
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">
                    Select an account to auto-assign employee.
                  </p>
                )}
              </div>
            )}


            {/* Created By - Auto-filled, read-only */}
            {mode === 'create' && (
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Created By
                </label>
                <input
                  type="text"
                  value={typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin'}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 text-sm font-semibold text-slate-400 bg-slate-800/50 border border-slate-600 rounded-lg cursor-not-allowed opacity-60"
                />
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-sm font-semibold text-white bg-slate-600 hover:bg-slate-700 rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-lg transition-all duration-200"
              >
                {mode === 'edit' ? 'Update Lead' : 'Create Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

