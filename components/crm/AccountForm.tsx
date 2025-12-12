'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import IndustrySelector from './IndustrySelector';
import { bringElementIntoView } from '@/lib/utils/bringElementIntoView';

interface SelectedIndustry {
  industry_id: number;
  industry_name: string;
  sub_industry_id: number;
  sub_industry_name: string;
}

export interface AccountFormData {
  accountName: string;
  companyStage: string;
  companyTag: string;
  notes?: string;
  industries?: SelectedIndustry[];
  industryProjects?: Record<string, number>; // Key: "industry_id-sub_industry_id", Value: number of projects
  assignedEmployee?: string | null; // For admin to assign accounts to employees
}

interface AccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AccountFormData) => void;
  initialData?: AccountFormData | null;
  mode?: 'create' | 'edit';
  isAdmin?: boolean;
  currentUser?: string;
}

export default function AccountForm({ isOpen, onClose, onSubmit, initialData, mode = 'create', isAdmin = false, currentUser = '' }: AccountFormProps) {
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

  // Company Stage options (from enum)
  const companyStageOptions = [
    'Enterprise',
    'SMB',
    'Pan India',
    'APAC',
    'Middle East & Africa',
    'Europe',
    'North America',
    'LATAM_SouthAmerica'
  ];

  // Company Tag options (from enum)
  const companyTagOptions = [
    'New',
    'Prospect',
    'Customer',
    'Onboard',
    'Lapsed',
    'Needs Attention',
    'Retention',
    'Renewal',
    'Upselling'
  ];

  // Form state
  const [formData, setFormData] = useState<AccountFormData>({
    accountName: '',
    companyStage: '',
    companyTag: '',
    notes: '',
    industries: [],
    industryProjects: {},
    assignedEmployee: null,
  });
  const [industryProjects, setIndustryProjects] = useState<Record<string, number>>({});
  
  // Employees list for admin assignment
  const [employees, setEmployees] = useState<string[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Load employees list for admin assignment
  const loadEmployees = async () => {
    if (!isAdmin) return; // Only admin can assign
    
    setLoadingEmployees(true);
    try {
      // Get sales employees
      const response = await fetch('/api/employees?type=sales');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.employees) {
          setEmployees(data.employees);
        }
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Load employees when modal opens for admin
  useEffect(() => {
    if (isOpen && isAdmin) {
      loadEmployees();
    }
  }, [isOpen, isAdmin]);

  // Initialize form data when modal opens or initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        industries: initialData.industries || [],
        industryProjects: initialData.industryProjects || {},
        assignedEmployee: (initialData as any).assignedEmployee || null,
      });
      setIndustryProjects(initialData.industryProjects || {});
    } else {
      setFormData({
        accountName: '',
        companyStage: '',
        companyTag: '',
        notes: '',
        industries: [],
        industryProjects: {},
        assignedEmployee: null,
      });
      setIndustryProjects({});
    }
  }, [initialData, isOpen, isAdmin, currentUser]);

  // Handle input change
  const handleInputChange = (field: keyof AccountFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, industryProjects });
  };

  // Handle industry selection change - show project input when selected
  const handleIndustryChange = (selected: SelectedIndustry[]) => {
    setFormData(prev => ({ ...prev, industries: selected }));
    
    // Update industryProjects to match selected industries
    const newProjects: Record<string, number> = {};
    selected.forEach(item => {
      const key = `${item.industry_id}-${item.sub_industry_id}`;
      newProjects[key] = industryProjects[key] || 0;
    });
    setIndustryProjects(newProjects);
  };

  // Handle project count change
  const handleProjectCountChange = (industryId: number, subIndustryId: number, count: number) => {
    const key = `${industryId}-${subIndustryId}`;
    setIndustryProjects(prev => ({
      ...prev,
      [key]: count || 0,
    }));
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-up"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className="glassmorphic-premium rounded-3xl max-w-4xl w-full border-2 border-premium-gold/30 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - Fixed */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-2xl font-extrabold text-white drop-shadow-lg">
            {mode === 'edit' ? 'Edit Account' : 'Create New Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div ref={modalContentRef} className="flex-1 overflow-y-auto px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Details Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-premium-gold border-b border-premium-gold/30 pb-2">
              Company Details
            </h3>

            {/* Account Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Company Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => handleInputChange('accountName', e.target.value)}
                className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent"
                placeholder="Enter company name"
                required
              />
            </div>

            {/* Stage and Tag - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Stage {!isAdmin && <span className="text-red-400">*</span>}
                </label>
                <select
                  value={formData.companyStage || ''}
                  onChange={(e) => handleInputChange('companyStage', e.target.value)}
                  className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                  required={!isAdmin}
                >
                  <option value="">Select Stage</option>
                  {companyStageOptions.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage.replace('_', '/')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Tag {!isAdmin && <span className="text-red-400">*</span>}
                </label>
                <select
                  value={formData.companyTag || ''}
                  onChange={(e) => handleInputChange('companyTag', e.target.value)}
                  className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                  required={!isAdmin}
                >
                  <option value="">Select Tag</option>
                  {companyTagOptions.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent min-h-[120px] resize-y"
                placeholder="Enter any additional notes about this account..."
                rows={4}
              />
            </div>

            {/* Assign Employee - Only visible for Admin */}
            {isAdmin && (
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Assign to Employee
                </label>
                <select
                  value={formData.assignedEmployee || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignedEmployee: e.target.value || null }))}
                  className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                  disabled={loadingEmployees}
                >
                  <option value="">Unassigned</option>
                  {employees.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  {loadingEmployees ? 'Loading employees...' : 'Select an employee to assign this account to, or leave unassigned'}
                </p>
              </div>
            )}

          </div>

          {/* Industries Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-premium-gold border-b border-premium-gold/30 pb-2">
              Industries & Sub-Industries
            </h3>
            <p className="text-sm text-slate-400">
              Select the industries and sub-industries this account operates in. You can select multiple options.
            </p>
            <IndustrySelector
              value={formData.industries || []}
              onChange={handleIndustryChange}
            />
            
            {/* Number of Projects for Selected Industries */}
            {formData.industries && formData.industries.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-lg font-semibold text-white">Number of Projects</h4>
                <p className="text-xs text-slate-400">
                  Enter the number of projects for each selected industry/sub-industry combination.
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {formData.industries.map((item) => {
                    const key = `${item.industry_id}-${item.sub_industry_id}`;
                    const projectCount = industryProjects[key] || 0;
                    return (
                      <div key={key} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">
                            {item.industry_name} - {item.sub_industry_name}
                          </p>
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            min="0"
                            value={projectCount}
                            onChange={(e) => handleProjectCountChange(item.industry_id, item.sub_industry_id, parseInt(e.target.value) || 0)}
                            className="input-premium w-full px-3 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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
                {mode === 'edit' ? 'Update Account' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

