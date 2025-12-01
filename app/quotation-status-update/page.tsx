'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Quote } from '@/lib/constants/types';
import Toast from '@/components/ui/Toast';
import CelebrationEffect from '@/components/crm/CelebrationEffect';
import CelebrationToast from '@/components/crm/CelebrationToast';

type SectionTab = 'mbcb' | 'signages' | 'paint';

export default function QuotationStatusUpdatePage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SectionTab>('mbcb');
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [updatingComments, setUpdatingComments] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [quoteComments, setQuoteComments] = useState<Record<number, string>>({});
  const [editingQuote, setEditingQuote] = useState<number | null>(null);
  const [tempStatus, setTempStatus] = useState<Record<number, string>>({});
  const [tempComments, setTempComments] = useState<Record<number, string>>({});
  const [selectedQuoteHistory, setSelectedQuoteHistory] = useState<Quote | null>(null);
  
  // Filter states
  const [filterCustomerName, setFilterCustomerName] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('auth');
      if (auth !== 'true') {
        router.replace('/login');
        return;
      }
      
      const storedUsername = localStorage.getItem('username') || '';
      const storedDepartment = localStorage.getItem('department') || 'Sales';
      const storedIsAdmin = localStorage.getItem('isAdmin') === 'true';
      
      // Redirect if not an Employee (only allow Employee1, Employee2, Employee3)
      // Do NOT allow Admin
      const isEmployee = (storedUsername === 'Employee1' || storedUsername === 'Employee2' || storedUsername === 'Employee3') && !storedIsAdmin;
      
      if (!isEmployee || storedDepartment !== 'Sales') {
        router.replace('/');
        return;
      }
      
      setUsername(storedUsername);
    }
  }, [router]);

  // Load quotes for current employee only
  const loadQuotes = async () => {
    if (!username) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Determine section name based on active tab
      let sectionName = '';
      if (activeTab === 'mbcb') {
        sectionName = 'mbcb';
      } else if (activeTab === 'signages') {
        sectionName = 'signages';
      } else if (activeTab === 'paint') {
        sectionName = 'paint';
      } else {
        setQuotes([]);
        setLoading(false);
        return;
      }
      
      // Fetch quotes from API
      const response = await fetch(`/api/quotes?section=${sectionName}&created_by=${encodeURIComponent(username)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load quotations: ${response.statusText}`);
      }
      
      const data = await response.json();
      // API returns { data: [...] } or { quotes: [...] }
      const quotesData = data.data || data.quotes || [];
      
      // Filter by employee who created the quotation (additional client-side filter for safety)
      const filteredQuotes = quotesData.filter((quote: Quote) => quote.created_by === username);
      
      setQuotes(filteredQuotes);
      
      // Initialize comments from quotes
      const commentsMap: Record<number, string> = {};
      const statusMap: Record<number, string> = {};
      filteredQuotes.forEach((quote: Quote) => {
        if (quote.comments) {
          commentsMap[quote.id] = quote.comments;
        }
        if (quote.status) {
          statusMap[quote.id] = quote.status;
        }
      });
      setQuoteComments(commentsMap);
      setTempStatus(statusMap);
      setTempComments(commentsMap);
    } catch (err: any) {
      console.error('Error loading quotes:', err);
      setError(err.message || 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (username) {
      loadQuotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, username]);

  // Handle edit button click
  const handleEditClick = (quote: Quote) => {
    setEditingQuote(quote.id);
    setTempStatus(prev => ({ ...prev, [quote.id]: quote.status || 'draft' }));
    setTempComments(prev => ({ ...prev, [quote.id]: quoteComments[quote.id] || '' }));
  };

  // Handle cancel edit
  const handleCancelEdit = (quote: Quote) => {
    setEditingQuote(null);
    setTempStatus(prev => {
      const newState = { ...prev };
      delete newState[quote.id];
      return newState;
    });
    setTempComments(prev => {
      const newState = { ...prev };
      delete newState[quote.id];
      return newState;
    });
  };

  // Handle confirm update (both status and comments)
  const handleConfirmUpdate = async (quote: Quote) => {
    try {
      setUpdatingStatus(quote.id);
      setUpdatingComments(quote.id);
      
      const newStatus = tempStatus[quote.id] || quote.status || 'draft';
      const newComments = tempComments[quote.id] || quoteComments[quote.id] || '';

      // Get current username for history tracking
      const currentUsername = username || (typeof window !== 'undefined' ? localStorage.getItem('username') || 'Unknown' : 'Unknown');

      // Update status
      const statusResponse = await fetch('/api/quotes/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteId: quote.id,
          section: quote.section || activeTab,
          status: newStatus,
          updated_by: currentUsername,
        }),
      });

      if (!statusResponse.ok) {
        const statusData = await statusResponse.json();
        setToast({ message: statusData.error || 'Failed to update status', type: 'error' });
        setUpdatingStatus(null);
        setUpdatingComments(null);
        return;
      }

      // Update comments
      const commentsResponse = await fetch('/api/quotes/update-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteId: quote.id,
          section: quote.section || activeTab,
          comments: newComments,
          updated_by: currentUsername,
        }),
      });

      if (!commentsResponse.ok) {
        const commentsData = await commentsResponse.json();
        setToast({ message: commentsData.error || 'Failed to update comments', type: 'error' });
        setUpdatingStatus(null);
        setUpdatingComments(null);
        return;
      }

      setToast({ message: 'Quotation updated successfully', type: 'success' });
      
      // Update local state
      setQuoteComments(prev => ({ ...prev, [quote.id]: newComments }));
      setEditingQuote(null);
      
      // Reload quotes to reflect the update
      await loadQuotes();
    } catch (error: any) {
      console.error('Error updating quotation:', error);
      setToast({ message: 'An error occurred while updating quotation', type: 'error' });
    } finally {
      setUpdatingStatus(null);
      setUpdatingComments(null);
    }
  };

  // Filter quotes
  const filteredQuotes = useMemo(() => {
    let filtered = [...quotes];
    
    if (filterCustomerName) {
      filtered = filtered.filter(q => 
        q.customer_name.toLowerCase().includes(filterCustomerName.toLowerCase())
      );
    }
    
    if (filterDate) {
      filtered = filtered.filter(q => q.date === filterDate);
    }
    
    return filtered;
  }, [quotes, filterCustomerName, filterDate]);

  // Get unique values for filters
  const uniqueValues = useMemo(() => {
    return {
      customerNames: Array.from(new Set(quotes.map(q => q.customer_name))).sort(),
      dates: Array.from(new Set(quotes.map(q => q.date))).sort().reverse(),
    };
  }, [quotes]);

  // Quotes are already filtered by table, so we just use filteredQuotes directly
  const quotesForActiveTab = useMemo(() => {
    return filteredQuotes;
  }, [filteredQuotes]);

  // Show loading state while checking authentication
  if (!username && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-300">Loading...</p>
      </div>
    );
  }
  
  // If no username after loading, don't show anything (will redirect)
  if (!username) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-start py-12 pt-16 pb-32 relative">
      <CelebrationEffect />
      <CelebrationToast />
      <div className="w-full max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="w-full flex flex-col items-center mb-10 title-glow fade-up">
          <h1 className="text-6xl md:text-8xl font-extrabold text-white mb-4 text-center tracking-tight drop-shadow-2xl text-neon-gold">
            Quotation Status Update
          </h1>
          <div className="gold-divider mt-6"></div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 justify-center">
          <button
            onClick={() => setActiveTab('mbcb')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'mbcb'
                ? 'bg-brand-primary text-white shadow-lg'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            MBCB
          </button>
          <button
            onClick={() => setActiveTab('signages')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'signages'
                ? 'bg-brand-primary text-white shadow-lg'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            Signages
          </button>
          <button
            onClick={() => setActiveTab('paint')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'paint'
                ? 'bg-brand-primary text-white shadow-lg'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            Paint
          </button>
        </div>

        {/* Filters */}
        <div className="glassmorphic-premium rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Filter by Customer
              </label>
              <select
                value={filterCustomerName}
                onChange={(e) => setFilterCustomerName(e.target.value)}
                className="input-premium w-full px-4 py-2 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
              >
                <option key="all-customers" value="">All Customers</option>
                {uniqueValues.customerNames.map((customerName, idx) => (
                  <option key={`customer-${customerName}-${idx}`} value={customerName}>
                    {customerName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Filter by Date
              </label>
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="input-premium w-full px-4 py-2 text-white [&>option]:bg-[#1A103C] [&>option]:text-white"
              >
                <option key="all-dates" value="">All Dates</option>
                {uniqueValues.dates.map((date, idx) => (
                  <option key={`date-${date}-${idx}`} value={date}>
                    {date.includes('-') 
                      ? (() => {
                          const [year, month, day] = date.split('-');
                          return `${day}-${month}-${year}`;
                        })()
                      : date}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <p className="text-slate-300">Loading quotations...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-4 mb-6">
            <p className="text-red-200 text-center">{error}</p>
          </div>
        )}

        {/* Quotations Display */}
        {!loading && !error && (
          <div className="glassmorphic-premium rounded-2xl p-6">
            {quotes.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl text-slate-400 mb-4">📋</div>
                <p className="text-2xl text-slate-300 mb-2 font-bold">No Quotation Made</p>
                <p className="text-slate-400 text-lg">You haven't created any quotations yet.</p>
                <p className="text-slate-500 text-sm mt-2">Create quotations from the MBCB, Signages, or Paint sections.</p>
              </div>
            ) : quotesForActiveTab.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl text-slate-400 mb-4">📋</div>
                <p className="text-2xl text-slate-300 mb-2 font-bold">No Quotation Made for {activeTab.toUpperCase()}</p>
                <p className="text-slate-400 text-lg">You haven't created any quotations for this section yet.</p>
                <p className="text-slate-500 text-sm mt-2">Try switching to another tab or create a new quotation.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {quotesForActiveTab.map((quote) => (
                  <div 
                    key={quote.id} 
                    className="glassmorphic-premium rounded-xl p-6 border border-white/10 hover:border-brand-gold/30 transition-all"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column - Quote Info */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-white">Quotation #{quote.id}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                              quote.status === 'closed_won' ? 'bg-green-500/20 text-green-300' :
                              quote.status === 'closed_lost' ? 'bg-red-500/20 text-red-300' :
                              quote.status === 'sent' ? 'bg-blue-500/20 text-blue-300' :
                              quote.status === 'negotiation' ? 'bg-purple-500/20 text-purple-300' :
                              quote.status === 'on_hold' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-slate-500/20 text-slate-300'
                            }`}>
                              {(quote.status || 'draft').toUpperCase().replace('_', ' ')}
                            </span>
                            <button
                              onClick={() => setSelectedQuoteHistory(quote)}
                              className="px-3 py-1 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-accent rounded-lg transition-all"
                              title="View History"
                            >
                              📜 History
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400 mb-1">Customer</p>
                            <p className="text-white font-semibold">{quote.customer_name}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 mb-1">Section</p>
                            <p className="text-white font-semibold">{quote.section}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 mb-1">Date</p>
                            <p className="text-white font-semibold">
                              {quote.date.includes('-') 
                                ? (() => {
                                    const [year, month, day] = quote.date.split('-');
                                    return `${day}-${month}-${year}`;
                                  })()
                                : quote.date}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 mb-1">Total Amount</p>
                            <p className="text-premium-gold font-bold">
                              {quote.final_total_cost 
                                ? `₹${quote.final_total_cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                : '-'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Status and Comments */}
                      <div className="space-y-4">
                        {editingQuote === quote.id ? (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-slate-200 mb-2">
                                Update Status
                              </label>
                              <select
                                value={tempStatus[quote.id] || quote.status || 'draft'}
                                onChange={(e) => setTempStatus(prev => ({ ...prev, [quote.id]: e.target.value }))}
                                disabled={updatingStatus === quote.id}
                                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option key={`status-draft-${quote.id}`} value="draft">Draft</option>
                                <option key={`status-sent-${quote.id}`} value="sent">Sent</option>
                                <option key={`status-negotiation-${quote.id}`} value="negotiation">Negotiation</option>
                                <option key={`status-on_hold-${quote.id}`} value="on_hold">On Hold</option>
                                <option key={`status-closed_won-${quote.id}`} value="closed_won">Closed Won</option>
                                <option key={`status-closed_lost-${quote.id}`} value="closed_lost">Closed Lost</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-slate-200 mb-2">
                                Comments
                              </label>
                              <textarea
                                value={tempComments[quote.id] || ''}
                                onChange={(e) => setTempComments(prev => ({ ...prev, [quote.id]: e.target.value }))}
                                disabled={updatingComments === quote.id}
                                placeholder="Add comments or notes about this quotation..."
                                rows={3}
                                className="w-full px-3 py-2 text-sm text-white bg-slate-700/50 border border-slate-500 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-400 resize-none"
                              />
                            </div>

                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleConfirmUpdate(quote)}
                                disabled={updatingStatus === quote.id || updatingComments === quote.id}
                                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {updatingStatus === quote.id || updatingComments === quote.id ? 'Saving...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => handleCancelEdit(quote)}
                                disabled={updatingStatus === quote.id || updatingComments === quote.id}
                                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-slate-600 hover:bg-slate-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sm font-semibold text-slate-200 mb-2">
                                Status
                              </label>
                              <div className="px-3 py-2 text-sm font-semibold text-white bg-slate-700/50 border border-slate-500 rounded-lg">
                                {(quote.status || 'draft').toUpperCase().replace('_', ' ')}
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-slate-200 mb-2">
                                Comments
                              </label>
                              <div className="px-3 py-2 text-sm text-white bg-slate-700/50 border border-slate-500 rounded-lg min-h-[80px] whitespace-pre-wrap">
                                {quoteComments[quote.id] || <span className="text-slate-400 italic">No comments</span>}
                              </div>
                            </div>

                            <button
                              onClick={() => handleEditClick(quote)}
                              className="w-full px-4 py-2 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-accent rounded-lg transition-all"
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Modal */}
        {selectedQuoteHistory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glassmorphic-premium rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Quotation #{selectedQuoteHistory.id} - History</h3>
                <button
                  onClick={() => setSelectedQuoteHistory(null)}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              {(() => {
                const quote = selectedQuoteHistory as any;
                const statusHistory = quote.status_history || [];
                const commentsHistory = quote.comments_history || [];
                
                return (
                  <>
                    {/* Status History */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-slate-200 mb-3">Status History</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {statusHistory.length > 0 ? (
                          statusHistory.map((entry: any, idx: number) => (
                            <div key={`status-${quote.id}-${idx}-${entry.updated_at || idx}`} className="bg-slate-700/50 rounded-lg p-3 text-sm">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-white font-semibold">
                                  {entry.status?.toUpperCase().replace('_', ' ') || 'N/A'}
                                </span>
                                <span className="text-slate-400 text-xs">
                                  {entry.updated_at ? new Date(entry.updated_at).toLocaleString() : 'N/A'}
                                </span>
                              </div>
                              {entry.updated_by && (
                                <p className="text-slate-400 text-xs">By: {entry.updated_by}</p>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 italic">No status history</p>
                        )}
                      </div>
                    </div>

                    {/* Comments History */}
                    <div>
                      <h4 className="text-lg font-semibold text-slate-200 mb-3">Comments History</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {commentsHistory.length > 0 ? (
                          commentsHistory.map((entry: any, idx: number) => (
                            <div key={`comment-${quote.id}-${idx}-${entry.updated_at || idx}`} className="bg-slate-700/50 rounded-lg p-3 text-sm">
                              <p className="text-white whitespace-pre-wrap mb-2">{entry.comment || 'No comment'}</p>
                              <div className="flex justify-between items-center">
                                {entry.updated_by && (
                                  <span className="text-slate-400 text-xs">By: {entry.updated_by}</span>
                                )}
                                <span className="text-slate-400 text-xs">
                                  {entry.updated_at ? new Date(entry.updated_at).toLocaleString() : 'N/A'}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 italic">No comments history</p>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedQuoteHistory(null)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-slate-600 hover:bg-slate-700 rounded-lg transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
}
