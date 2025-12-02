'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Quote, Lead, Task, Contact, Activity } from '@/lib/constants/types';
import Toast from '@/components/ui/Toast';
import ActivityTimeline from '@/components/crm/ActivityTimeline';
import ContactFormModal from '@/components/crm/ContactFormModal';
import CRMLayout from '@/components/layout/CRMLayout';
import QuotationDetailsModal from '@/components/modals/QuotationDetailsModal';
import { formatTimestampIST, formatDateIST } from '@/lib/utils/dateFormatters';
import EngagementScoreBadge from '@/components/crm/EngagementScoreBadge';

type TabType = 'overview' | 'contacts' | 'leads' | 'quotations';

interface SubAccount {
  id: number;
  accountId: number;
  accountName: string | null;
  assignedEmployee: string | null;
  subAccountName: string;
  stateId: number | null;
  cityId: number | null;
  stateName: string | null;
  cityName: string | null;
  address: string | null;
  pincode: string | null;
  gstNumber: string | null;
  website: string | null;
  isHeadquarter: boolean;
  officeType: string | null;
  engagementScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SubAccountDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const subAccountId = parseInt(params.id as string);

  const [subAccount, setSubAccount] = useState<SubAccount | null>(null);
  const [quotations, setQuotations] = useState<Quote[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  // User info state
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
    if (subAccountId) {
      loadSubAccount();
      loadRelatedData();
    }
  }, [subAccountId]);

  // Update page title
  useEffect(() => {
    if (subAccount?.subAccountName) {
      document.title = `${subAccount.subAccountName} - YNM Safety CRM`;
    } else if (subAccountId) {
      document.title = `Sub-Account ${subAccountId} - YNM Safety CRM`;
    }
  }, [subAccount, subAccountId]);

  const loadSubAccount = async () => {
    try {
      const response = await fetch(`/api/subaccounts/${subAccountId}`);
      const result = await response.json();

      if (result.error) {
        setError(result.error);
        if (response.status === 404) {
          router.push('/crm/accounts');
        }
      } else {
        setSubAccount(result.subAccount);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedData = async () => {
    try {
      const [relatedRes, contactsRes, activitiesRes] = await Promise.all([
        fetch(`/api/subaccounts/${subAccountId}/related`),
        fetch(`/api/subaccounts/${subAccountId}/contacts`),
        fetch(`/api/subaccounts/${subAccountId}/activities`),
      ]);

      const [relatedData, contactsData, activitiesData] = await Promise.all([
        relatedRes.json(),
        contactsRes.json(),
        activitiesRes.json(),
      ]);

      if (relatedData.success) {
        setQuotations(relatedData.data.quotations || []);
        setLeads(relatedData.data.leads || []);
        setTasks(relatedData.data.tasks || []);
      }

      if (contactsData.success) {
        setContacts(contactsData.contacts || []);
      }

      if (activitiesData.success) {
        setActivities(activitiesData.data || []);
      }
    } catch (err: any) {
      console.error('Error loading related data:', err);
    }
  };

  const formatDate = formatDateIST;
  const formatTimestamp = formatTimestampIST;

  if (loading) {
    return (
      <CRMLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-20">
              <p className="text-slate-300">Loading sub-account details...</p>
            </div>
          </div>
        </div>
      </CRMLayout>
    );
  }

  if (error || !subAccount) {
    return (
      <CRMLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-4">
              <p className="text-red-200 text-center">{error || 'Sub-account not found'}</p>
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
      <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="fixed inset-0 z-0" style={{ backgroundColor: '#0a0a0f' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0d1117] to-slate-900"></div>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-premium-gold/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-premium-gold/3 to-transparent rounded-full blur-2xl"></div>
          <div className="absolute inset-0 opacity-[0.02]" style={{ 
            backgroundImage: `linear-gradient(rgba(209, 168, 90, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(209, 168, 90, 0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        <div className="relative z-10 p-6" style={{ animation: 'fadeIn 0.3s ease-in' }}>
          <div className="max-w-7xl mx-auto">
            {/* Hero Header */}
            <div className="relative mb-8">
              <button
                onClick={() => router.push(`/crm/accounts/${subAccount.accountId}`)}
                className="group inline-flex items-center gap-2 text-slate-400 hover:text-premium-gold mb-6 transition-all"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Back to Account</span>
              </button>
              
              <div className="relative bg-gradient-to-r from-slate-800/90 via-slate-800/70 to-slate-900/90 rounded-3xl border border-slate-700/50 overflow-hidden backdrop-blur-sm">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-premium-gold via-amber-500 to-premium-gold"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-premium-gold/10 to-transparent rounded-bl-full"></div>
                
                <div className="relative p-8">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-premium-gold/30 to-amber-600/20 flex items-center justify-center border border-premium-gold/30 shadow-lg shadow-premium-gold/10">
                          <span className="text-3xl font-bold text-premium-gold">
                            {subAccount.subAccountName?.charAt(0)?.toUpperCase() || 'S'}
                          </span>
                        </div>
                        <div>
                          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{subAccount.subAccountName}</h1>
                          <p className="text-slate-400 text-sm mt-1">
                            {subAccount.accountName ? `Part of ${subAccount.accountName}` : 'Sub-Account'}
                            {subAccount.assignedEmployee && ` • Managed by ${subAccount.assignedEmployee}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-4">
                        {subAccount.officeType && (
                          <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {subAccount.officeType}
                          </span>
                        )}
                        {subAccount.isHeadquarter && (
                          <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-premium-gold/20 text-premium-gold border border-premium-gold/30">
                            ✓ Headquarter
                          </span>
                        )}
                        <EngagementScoreBadge score={subAccount.engagementScore} />
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                          subAccount.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${subAccount.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                          {subAccount.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
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
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="group relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700/50 overflow-hidden hover:border-slate-600 transition-all">
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
                    <div className="group relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700/50 overflow-hidden hover:border-slate-600 transition-all">
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                            <span className="text-sm">👥</span>
                          </div>
                          <p className="text-slate-400 text-sm font-medium">Contacts</p>
                        </div>
                        <p className="text-3xl font-bold text-white">{contacts.length}</p>
                      </div>
                    </div>
                    <div className="group relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700/50 overflow-hidden hover:border-slate-600 transition-all">
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                            <span className="text-sm">🎯</span>
                          </div>
                          <p className="text-slate-400 text-sm font-medium">Leads</p>
                        </div>
                        <p className="text-3xl font-bold text-white">{leads.length}</p>
                      </div>
                    </div>
                    <div className="group relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700/50 overflow-hidden hover:border-slate-600 transition-all">
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                            <span className="text-sm">💰</span>
                          </div>
                          <p className="text-slate-400 text-sm font-medium">Total Value</p>
                        </div>
                        <p className="text-3xl font-bold text-premium-gold">
                          ₹{totalQuotationValue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Location & Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm">📍</span>
                        Location Details
                      </h3>
                      <div className="space-y-3">
                        {subAccount.cityName && subAccount.stateName ? (
                          <div>
                            <p className="text-slate-400 text-xs mb-1">City, State</p>
                            <p className="text-white font-medium">{subAccount.cityName}, {subAccount.stateName}</p>
                          </div>
                        ) : null}
                        {subAccount.address && (
                          <div>
                            <p className="text-slate-400 text-xs mb-1">Address</p>
                            <p className="text-white font-medium">{subAccount.address}</p>
                          </div>
                        )}
                        {subAccount.pincode && (
                          <div>
                            <p className="text-slate-400 text-xs mb-1">Pincode</p>
                            <p className="text-white font-medium">{subAccount.pincode}</p>
                          </div>
                        )}
                        {subAccount.gstNumber && (
                          <div>
                            <p className="text-slate-400 text-xs mb-1">GST Number</p>
                            <p className="text-white font-medium">{subAccount.gstNumber}</p>
                          </div>
                        )}
                        {subAccount.website && (
                          <div>
                            <p className="text-slate-400 text-xs mb-1">Website</p>
                            <a
                              href={subAccount.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-premium-gold hover:underline font-medium"
                            >
                              {subAccount.website.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm">📅</span>
                        Timeline
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 py-2 border-b border-slate-700/50">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          <div className="flex-1">
                            <p className="text-slate-400 text-xs">Created</p>
                            <p className="text-white font-medium text-sm">{formatTimestamp(subAccount.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 py-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          <div className="flex-1">
                            <p className="text-slate-400 text-xs">Last Updated</p>
                            <p className="text-white font-medium text-sm">{formatTimestamp(subAccount.updatedAt)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Activities Timeline */}
                  {activities.length > 0 && (
                    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm">📝</span>
                        Recent Activities
                      </h3>
                      <ActivityTimeline activities={activities.slice(0, 10)} />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'contacts' && (
                <div>
                  <div className="mb-4 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-white">Contacts</h2>
                      <p className="text-sm text-slate-400 mt-1">View all contacts for this sub-account</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingContact(null);
                        setShowAddContactModal(true);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-premium-gold to-amber-600 hover:from-amber-600 hover:to-premium-gold text-white font-semibold rounded-lg transition-all duration-300"
                    >
                      + Add Contact
                    </button>
                  </div>
                  {contacts.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-slate-300">No contacts found for this sub-account</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-4 px-4 text-sm font-bold text-white">Name</th>
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

              {activeTab === 'leads' && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-4">Leads</h2>
                  {leads.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-slate-300">No leads found for this sub-account</p>
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
                      <p className="text-slate-300">No quotations found for this sub-account</p>
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
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Contact Modal */}
      {showAddContactModal && (
        <ContactFormModal
          accountId={subAccount.accountId}
          subAccountId={subAccountId}
          contact={editingContact || undefined}
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
