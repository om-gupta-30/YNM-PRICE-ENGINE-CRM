'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Account, Quote, Lead, Task, Contact, Activity } from '@/lib/constants/types';
import Toast from '@/components/ui/Toast';
import ActivityTimeline from '@/components/crm/ActivityTimeline';
import QuotationStatusChart from '@/components/crm/QuotationStatusChart';
import ContactFormModal from '@/components/crm/ContactFormModal';
import AccountForm, { AccountFormData } from '@/components/crm/AccountForm';
import CRMLayout from '@/components/layout/CRMLayout';
import CelebrationEffect from '@/components/crm/CelebrationEffect';
import CelebrationToast from '@/components/crm/CelebrationToast';
import QuotationDetailsModal from '@/components/modals/QuotationDetailsModal';
import { formatTimestampIST, formatDateIST } from '@/lib/utils/dateFormatters';

type TabType = 'overview' | 'contacts' | 'leads' | 'quotations';

export default function AccountDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = parseInt(params.id as string);

  const [account, setAccount] = useState<Account | null>(null);
  const [quotations, setQuotations] = useState<Quote[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [subAccounts, setSubAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  // User info state - MUST be declared before useEffects that use them
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');

  // Load user info on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
      setUsername(localStorage.getItem('username') || '');
    }
  }, []);

  useEffect(() => {
    if (accountId && (username || isAdmin)) {
      loadAccount();
      loadRelatedData();
    }
  }, [accountId, username, isAdmin]);

  // Update page title with account name
  useEffect(() => {
    if (account?.account_name) {
      document.title = `${account.account_name} - YNM Safety CRM`;
    } else if (accountId) {
      document.title = `Account ${accountId} - YNM Safety CRM`;
    }
  }, [account, accountId]);

  const loadAccount = async () => {
    try {
      const params = new URLSearchParams();
      if (!isAdmin && username) {
        params.append('employee', username);
      }
      if (isAdmin) {
        params.append('isAdmin', 'true');
      }
      
      const response = await fetch(`/api/accounts/${accountId}?${params}`);
      const result = await response.json();

      if (result.error) {
        setError(result.error);
        if (response.status === 403) {
          // Access denied - redirect to accounts page
          router.push('/crm/accounts');
        }
      } else {
        setAccount(result.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedData = async () => {
    try {
      const [relatedRes, contactsRes, activitiesRes, subAccountsRes] = await Promise.all([
        fetch(`/api/accounts/${accountId}/related`),
        fetch(`/api/accounts/${accountId}/contacts`),
        fetch(`/api/accounts/${accountId}/activities`),
        fetch(`/api/subaccounts?account_id=${accountId}`),
      ]);

      const [relatedData, contactsData, activitiesData, subAccountsData] = await Promise.all([
        relatedRes.json(),
        contactsRes.json(),
        activitiesRes.json(),
        subAccountsRes.json(),
      ]);

      if (relatedData.data) {
        setQuotations(relatedData.data.quotations || []);
        setLeads(relatedData.data.leads || []);
        setTasks(relatedData.data.tasks || []);
      }

      if (contactsData.data) {
        setContacts(contactsData.data);
      }

      if (activitiesData.data) {
        setActivities(activitiesData.data);
      }

      if (subAccountsData.success && subAccountsData.subAccounts) {
        setSubAccounts(subAccountsData.subAccounts);
      }
    } catch (err: any) {
      console.error('Error loading related data:', err);
    }
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'Enterprise': 'bg-purple-500/20 text-purple-300',
      'SMB': 'bg-blue-500/20 text-blue-300',
      'Pan India': 'bg-green-500/20 text-green-300',
      'APAC': 'bg-yellow-500/20 text-yellow-300',
      'Middle East & Africa': 'bg-orange-500/20 text-orange-300',
      'Europe': 'bg-indigo-500/20 text-indigo-300',
      'North America': 'bg-pink-500/20 text-pink-300',
      'LATAM_SouthAmerica': 'bg-red-500/20 text-red-300',
    };
    return colors[stage] || 'bg-slate-500/20 text-slate-300';
  };

  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      'New': 'bg-blue-500/20 text-blue-300',
      'Prospect': 'bg-yellow-500/20 text-yellow-300',
      'Customer': 'bg-green-500/20 text-green-300',
      'Onboard': 'bg-purple-500/20 text-purple-300',
      'Lapsed': 'bg-red-500/20 text-red-300',
      'Needs Attention': 'bg-orange-500/20 text-orange-300',
      'Retention': 'bg-indigo-500/20 text-indigo-300',
      'Renewal': 'bg-pink-500/20 text-pink-300',
      'Upselling': 'bg-teal-500/20 text-teal-300',
    };
    return colors[tag] || 'bg-slate-500/20 text-slate-300';
  };

  // Use centralized formatters from dateFormatters.ts
  const formatDate = formatDateIST;
  const formatTimestamp = formatTimestampIST;

  if (loading) {
    return (
      <CRMLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <p className="text-slate-300">Loading account details...</p>
            </div>
          </div>
        </div>
      </CRMLayout>
    );
  }

  if (error || !account) {
    return (
      <CRMLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-4">
              <p className="text-red-200 text-center">{error || 'Account not found'}</p>
              <div className="text-center mt-4">
                <button
                  onClick={() => router.push('/crm/accounts')}
                  className="px-4 py-2 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-accent rounded-lg"
                >
                  Back to Accounts
                </button>
              </div>

            </div>
          </div>
        </div>
      </CRMLayout>
    );
  }

  const totalQuotationValue = quotations.reduce((sum, q) => sum + (q.final_total_cost || 0), 0);
  const sentQuotations = quotations.filter(q => q.status === 'sent' || q.status === 'negotiation').length;
  const closedWonQuotations = quotations.filter(q => q.status === 'closed_won').length;

  return (
    <CRMLayout>
      {/* Animated Background - Pre-rendered to prevent flash */}
      <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
        {/* Dynamic gradient background - rendered immediately */}
        <div className="fixed inset-0 z-0" style={{ backgroundColor: '#0a0a0f' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0d1117] to-slate-900"></div>
          {/* Animated orbs */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-premium-gold/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-premium-gold/3 to-transparent rounded-full blur-2xl"></div>
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.02]" style={{ 
            backgroundImage: `linear-gradient(rgba(209, 168, 90, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(209, 168, 90, 0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        <div className="relative z-10 p-6" style={{ animation: 'fadeIn 0.3s ease-in' }}>
          <div className="max-w-7xl mx-auto">
            {/* Hero Header */}
            <div className="relative mb-8">
              {/* Back button */}
              <button
                onClick={() => router.push('/crm/accounts')}
                className="group inline-flex items-center gap-2 text-slate-400 hover:text-premium-gold mb-6 transition-all"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Back to Accounts</span>
              </button>
              
              {/* Main header card */}
              <div className="relative bg-gradient-to-r from-slate-800/90 via-slate-800/70 to-slate-900/90 rounded-3xl border border-slate-700/50 overflow-hidden backdrop-blur-sm">
                {/* Decorative accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-premium-gold via-amber-500 to-premium-gold"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-premium-gold/10 to-transparent rounded-bl-full"></div>
                
                <div className="relative p-8">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex-1">
                      {/* Company Icon & Name */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-premium-gold/30 to-amber-600/20 flex items-center justify-center border border-premium-gold/30 shadow-lg shadow-premium-gold/10">
                          <span className="text-3xl font-bold text-premium-gold">
                            {account.account_name?.charAt(0)?.toUpperCase() || 'A'}
                          </span>
                        </div>
                        <div>
                          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{account?.account_name || 'Account'}</h1>
                          <p className="text-slate-400 text-sm mt-1">
                            {account?.assigned_employee ? `Managed by ${account.assigned_employee}` : 'Unassigned'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {account?.company_stage && (
                          <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${getStageColor(account.company_stage)} border border-current/20`}>
                            {account.company_stage}
                          </span>
                        )}
                        {account?.company_tag && (
                          <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${getTagColor(account.company_tag)} border border-current/20`}>
                            {account.company_tag}
                          </span>
                        )}
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                          account?.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${account?.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                          {account?.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="group px-6 py-3 bg-gradient-to-r from-premium-gold/20 to-amber-600/20 hover:from-premium-gold/30 hover:to-amber-600/30 text-white font-semibold rounded-xl border border-premium-gold/30 transition-all duration-300 flex items-center gap-2 shadow-lg shadow-premium-gold/10 hover:shadow-premium-gold/20"
                      >
                        <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs - Floating Style */}
            <div className="mb-8">
              <div className="inline-flex bg-slate-800/50 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-700/50">
                {(['overview', 'contacts', 'leads', 'quotations'] as TabType[]).map((tab) => {
                  const icons: Record<TabType, string> = {
                    overview: '📊',
                    contacts: '👥',
                    leads: '🎯',
                    quotations: '📋',
                  };
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        activeTab === tab
                          ? 'bg-gradient-to-r from-premium-gold to-amber-600 text-white shadow-lg shadow-premium-gold/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                    >
                      <span>{icons[tab]}</span>
                      <span className="hidden sm:inline">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

        {/* Tab Content */}
        <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Quick Stats - Hero Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="group relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700/50 overflow-hidden hover:border-slate-600 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                        <span className="text-sm">📋</span>
                      </div>
                      <p className="text-slate-400 text-sm font-medium">Quotations</p>
                    </div>
                    <p className="text-3xl font-bold text-white">{quotations.length}</p>
                  </div>
                </div>
                <div className="group relative bg-gradient-to-br from-premium-gold/10 to-amber-900/10 rounded-2xl p-5 border border-premium-gold/20 overflow-hidden hover:border-premium-gold/40 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-premium-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-premium-gold/20 flex items-center justify-center">
                        <span className="text-sm">💰</span>
                      </div>
                      <p className="text-amber-300/80 text-sm font-medium">Total Value</p>
                    </div>
                    <p className="text-3xl font-bold text-premium-gold">
                      ₹{totalQuotationValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
                <div className="group relative bg-gradient-to-br from-blue-900/20 to-slate-900 rounded-2xl p-5 border border-blue-500/20 overflow-hidden hover:border-blue-500/40 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <span className="text-sm">🎯</span>
                      </div>
                      <p className="text-blue-300/80 text-sm font-medium">Leads</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-300">{leads.length}</p>
                  </div>
                </div>
                <div className="group relative bg-gradient-to-br from-emerald-900/20 to-slate-900 rounded-2xl p-5 border border-emerald-500/20 overflow-hidden hover:border-emerald-500/40 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <span className="text-sm">✅</span>
                      </div>
                      <p className="text-emerald-300/80 text-sm font-medium">Tasks</p>
                    </div>
                    <p className="text-3xl font-bold text-emerald-300">{tasks.length}</p>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm">🏢</span>
                    Business Details
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                      <span className="text-slate-400 text-sm">GST Number</span>
                      <span className="text-white font-medium">{account?.gst_number || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                      <span className="text-slate-400 text-sm">Website</span>
                      {account?.website ? (
                        <a href={account.website} target="_blank" rel="noopener noreferrer" className="text-premium-gold hover:underline font-medium">
                          {account.website.replace(/^https?:\/\//, '')}
                        </a>
                      ) : <span className="text-slate-500">—</span>}
                    </div>
                    <div className="py-2">
                      <span className="text-slate-400 text-sm block mb-2">Related Products</span>
                      <div className="flex flex-wrap gap-2">
                        {account?.related_products && account.related_products.length > 0 ? (
                          account.related_products.map((product, idx) => (
                            <span key={`${product}-${idx}`} className="px-3 py-1 bg-slate-700/70 rounded-full text-xs text-white font-medium">
                              {product}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-sm">No products linked</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm">📅</span>
                    Timeline
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 py-2 border-b border-slate-700/50">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <div className="flex-1">
                        <p className="text-slate-400 text-xs">Created</p>
                        <p className="text-white font-medium text-sm">{account?.created_at ? formatTimestamp(account.created_at) : '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 py-2 border-b border-slate-700/50">
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      <div className="flex-1">
                        <p className="text-slate-400 text-xs">Last Updated</p>
                        <p className="text-white font-medium text-sm">{account?.updated_at ? formatTimestamp(account.updated_at) : '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 py-2">
                      <div className="w-2 h-2 rounded-full bg-premium-gold"></div>
                      <div className="flex-1">
                        <p className="text-slate-400 text-xs">Last Activity</p>
                        <p className="text-white font-medium text-sm">{account?.last_activity_at ? formatTimestamp(account.last_activity_at) : '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {account?.address && (
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm">📍</span>
                    Address
                  </h3>
                  <p className="text-slate-300 whitespace-pre-wrap">{account.address}</p>
                </div>
              )}

              {account?.notes && (
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm">📝</span>
                    Notes
                  </h3>
                  <p className="text-slate-300 whitespace-pre-wrap">{account.notes}</p>
                </div>
              )}

              {/* Industries */}
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm">🏭</span>
                  Industries & Sub-Industries
                </h3>
                {account?.industries && account.industries.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {account.industries.map((item: any, idx: number) => (
                      <span
                        key={`industry-${item.industry_id}-${item.sub_industry_id}-${idx}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-gradient-to-r from-premium-gold/10 to-amber-600/10 text-premium-gold rounded-xl border border-premium-gold/20"
                      >
                        <span className="opacity-70">{item.industry_name}:</span>
                        <span className="font-semibold">{item.sub_industry_name}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </div>
            </div>
          )}

          {activeTab === 'leads' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Leads</h2>
              {leads.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-300">No leads found for this account</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Lead Name</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Status</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Contact</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Created</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead, idx) => (
                        <tr key={`lead-${lead.id}-${idx}`} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-4 px-4 text-slate-200 font-semibold">{lead.lead_name}</td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                              lead.status === 'Closed' ? 'bg-green-500/20 text-green-300' :
                              lead.status === 'Lost' ? 'bg-red-500/20 text-red-300' :
                              'bg-slate-500/20 text-slate-300'
                            }`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-200">
                            <div className="text-xs">
                              {lead.phone && <div>{lead.phone}</div>}
                              {lead.email && <div className="text-slate-400">{lead.email}</div>}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-slate-200 text-xs">{formatTimestamp(lead.created_at)}</td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => router.push(`/crm/leads`)}
                              className="px-3 py-1 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-accent rounded-lg"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'quotations' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Quotations</h2>
              {quotations.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-300">No quotations found for this account</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">ID</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Section</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Date</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Amount</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Status</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotations.map((quote, idx) => (
                        <tr key={`quote-${quote.id}-${idx}`} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-4 px-4 text-slate-200 font-semibold">{quote.id}</td>
                          <td className="py-4 px-4 text-slate-200">{quote.section}</td>
                          <td className="py-4 px-4 text-slate-200 text-xs">
                            {quote.date.includes('-') 
                              ? (() => {
                                  const [year, month, day] = quote.date.split('-');
                                  return `${day}-${month}-${year}`;
                                })()
                              : quote.date}
                          </td>
                          <td className="py-4 px-4 text-premium-gold font-bold">
                            {quote.final_total_cost 
                              ? `₹${quote.final_total_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
                              : '-'}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                              quote.status === 'closed_won' ? 'bg-green-500/20 text-green-300' :
                              quote.status === 'closed_lost' ? 'bg-red-500/20 text-red-300' :
                              quote.status === 'sent' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-slate-500/20 text-slate-300'
                            }`}>
                              {(quote.status || 'draft').toUpperCase().replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => {
                                setSelectedQuote(quote);
                                setShowQuoteModal(true);
                              }}
                              className="px-3 py-1 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-accent rounded-lg transition-all duration-200"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'contacts' && (
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white">Contacts</h2>
                <p className="text-sm text-slate-400 mt-1">View all contacts associated with this account</p>
              </div>
              {contacts.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-300">No contacts found for this account</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Name</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Sub-Account</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Designation</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Email</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Phone</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Call Status</th>
                        <th className="text-left py-4 px-4 text-sm font-bold text-white">Follow-up Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((contact: any, idx) => (
                        <tr key={`contact-${contact.id}-${idx}`} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-4 px-4 text-slate-200 font-semibold">{contact.name}</td>
                          <td className="py-4 px-4 text-slate-300 text-sm">
                            {contact.sub_accounts?.sub_account_name || '-'}
                          </td>
                          <td className="py-4 px-4 text-slate-200">{contact.designation || '-'}</td>
                          <td className="py-4 px-4 text-slate-200">{contact.email || '-'}</td>
                          <td className="py-4 px-4 text-slate-200">{contact.phone || '-'}</td>
                          <td className="py-4 px-4">
                            {contact.call_status ? (
                              <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                                contact.call_status === 'Connected' ? 'bg-green-500/20 text-green-300' :
                                contact.call_status === 'DNP' ? 'bg-yellow-500/20 text-yellow-300' :
                                contact.call_status === 'ATCBL' ? 'bg-blue-500/20 text-blue-300' :
                                'bg-red-500/20 text-red-300'
                              }`}>
                                {contact.call_status}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-4 px-4 text-slate-200 text-xs">
                            {contact.follow_up_date ? formatDate(contact.follow_up_date) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
          </div>
        </div>
      </div>

      {/* Edit Account Modal */}
      {showEditModal && account && (
        <AccountForm
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={async (formData: AccountFormData) => {
            try {
              // Admin can assign to any employee, employees cannot change assignment
              const assignedEmployee = isAdmin ? formData.assignedEmployee : (!isAdmin && username ? username : (account?.assigned_employee || null));
              
              const response = await fetch(`/api/accounts/${accountId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  accountName: formData.accountName,
                  companyStage: formData.companyStage && formData.companyStage.trim() !== '' ? formData.companyStage : null,
                  companyTag: formData.companyTag && formData.companyTag.trim() !== '' ? formData.companyTag : null,
                  assignedEmployee: assignedEmployee || null,
                  stateId: formData.stateId || null,
                  cityId: formData.cityId || null,
                  address: formData.address || null,
                  website: formData.website || null,
                  gstNumber: formData.gstNumber || null,
                  notes: formData.notes || null,
                  industries: formData.industries || [],
                  updatedBy: username || 'System',
                }),
              });

              const data = await response.json();

              if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to update account');
              }

              setToast({ message: 'Account updated successfully', type: 'success' });
              setShowEditModal(false);
              await loadAccount(); // Refresh account data
            } catch (error: any) {
              console.error('Error updating account:', error);
              setToast({ message: error.message || 'Failed to update account', type: 'error' });
            }
          }}
          initialData={{
            accountName: account?.account_name || '',
            companyStage: account?.company_stage || '',
            companyTag: account?.company_tag || '',
            assignedEmployee: account?.assigned_employee || '',
            stateId: account?.state_id || null,
            cityId: account?.city_id || null,
            address: account?.address || '',
            website: account?.website || '',
            gstNumber: account?.gst_number || '',
            notes: account?.notes || '',
            industries: account?.industries || [],
          }}
          mode="edit"
          isAdmin={isAdmin}
          currentUser={username}
        />
      )}

      {/* Add/Edit Contact Modal */}
      {showAddContactModal && (
        <ContactFormModal
          accountId={accountId}
          contact={editingContact || undefined}
          subAccounts={subAccounts}
          onClose={() => {
            setShowAddContactModal(false);
            setEditingContact(null);
          }}
          onSuccess={() => {
            setShowAddContactModal(false);
            setEditingContact(null);
            loadRelatedData();
            setToast({ 
              message: editingContact ? 'Contact updated successfully' : 'Contact added successfully', 
              type: 'success' 
            });
          }}
        />
      )}

      {/* Quotation Details Modal */}
      {showQuoteModal && selectedQuote && (
        <QuotationDetailsModal
          quote={selectedQuote}
          onClose={() => {
            setShowQuoteModal(false);
            setSelectedQuote(null);
          }}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </CRMLayout>
  );
}

