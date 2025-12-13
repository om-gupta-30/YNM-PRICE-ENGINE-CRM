'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Quote } from '@/lib/constants/types';
import Toast from '@/components/ui/Toast';
import CelebrationEffect from '@/components/crm/CelebrationEffect';
import CelebrationToast from '@/components/crm/CelebrationToast';

type SectionTab = 'mbcb' | 'signages' | 'paint';

export default function QuotationStatusPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SectionTab>('mbcb');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedQuoteHistory, setSelectedQuoteHistory] = useState<Quote | null>(null);
  
  // Filter states
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>('');
  const [filterCustomerName, setFilterCustomerName] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('auth');
      if (auth !== 'true') {
        router.replace('/login');
        return;
      }
      
      const storedUsername = localStorage.getItem('username') || '';
      
      // Only Admin can access
      if (storedUsername !== "Admin") {
        router.replace("/");
        return;
      }
      
      setUsername(storedUsername);
      setLoading(false);
    }
  }, [router]);

  // Load quotes from API route (never query Supabase directly)
  const loadStatusData = async () => {
    try {
      setLoading(true);
      setError(null);

      const storedUsername = localStorage.getItem("username") || "";
      const username = storedUsername;
      const isAdmin = username === "Admin";
      const productType = activeTab; // 'mbcb', 'signages', or 'paint'

      const url = isAdmin
        ? `/api/quotes?product_type=${productType}`
        : `/api/quotes?product_type=${productType}&created_by=${username}`;

      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");

      const quotes = json.data || [];

      // Keep existing transform/mapping logic the same
      // In this case, quotes are already in the correct format from API
      setQuotes(quotes);
    } catch (err: any) {
      setError(err.message || 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (username) {
      loadStatusData();
    }
  }, [activeTab, username]);

  // Filter quotes
  const filteredQuotes = useMemo(() => {
    let filtered = [...quotes];
    
    if (filterCreatedBy) {
      filtered = filtered.filter(q => q.created_by === filterCreatedBy);
    }
    
    if (filterCustomerName) {
      filtered = filtered.filter(q => 
        q.customer_name.toLowerCase().includes(filterCustomerName.toLowerCase())
      );
    }
    
    if (filterStatus) {
      filtered = filtered.filter(q => (q.status || 'draft') === filterStatus);
    }
    
    if (filterDate) {
      filtered = filtered.filter(q => q.date === filterDate);
    }
    
    return filtered;
  }, [quotes, filterCreatedBy, filterCustomerName, filterStatus, filterDate]);

  // Get unique values for filters
  const uniqueValues = useMemo(() => {
    return {
      createdBy: Array.from(new Set(quotes.map(q => q.created_by).filter((v): v is string => Boolean(v)))).sort(),
      customerNames: Array.from(new Set(quotes.map(q => q.customer_name))).sort(),
      statuses: Array.from(new Set(quotes.map(q => q.status || 'draft'))).sort(),
      dates: Array.from(new Set(quotes.map(q => q.date))).sort().reverse(),
    };
  }, [quotes]);

  // Quotes are already filtered by table, so we just use filteredQuotes directly
  const quotesForActiveTab = useMemo(() => {
    return filteredQuotes;
  }, [filteredQuotes]);

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
            Quotation Status
          </h1>
          <div className="gold-divider mt-6"></div>
          <p className="text-slate-300 mt-4">View all quotation statuses across all employees</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Filter by Employee
              </label>
              <select
                value={filterCreatedBy}
                onChange={(e) => setFilterCreatedBy(e.target.value)}
                className="input-premium w-full px-4 py-2 text-white"
              >
                <option value="">All Employees</option>
                {uniqueValues.createdBy.map((emp) => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Filter by Customer
              </label>
              <input
                type="text"
                value={filterCustomerName}
                onChange={(e) => setFilterCustomerName(e.target.value)}
                placeholder="Search customer..."
                className="input-premium w-full px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-premium w-full px-4 py-2 text-white"
              >
                <option value="">All Statuses</option>
                {uniqueValues.statuses.map((status) => (
                  <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Filter by Date
              </label>
              <input
                type="text"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                placeholder="YYYY-MM-DD or DD/MM/YYYY"
                className="input-premium w-full px-4 py-2 text-white"
              />
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

        {/* Quotations Table */}
        {!loading && !error && (
          <div className="glassmorphic-premium rounded-2xl p-6">
            {quotesForActiveTab.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-4xl text-slate-400 mb-4">📊</div>
                <p className="text-slate-300">No quotations found for this section</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-white/20">
                    <tr>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">#</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Created By</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Customer</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Section</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Date</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Total Amount</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Status</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Comments</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotesForActiveTab.map((quote) => {
                      const statusHistory = (quote as any).status_history || [];
                      const commentsHistory = (quote as any).comments_history || [];
                      const allComments = commentsHistory.map((h: any) => h.comment).filter((c: string) => c && c.trim());
                      
                      return (
                        <tr 
                          key={quote.id} 
                          className="border-b border-white/10 hover:bg-white/5 transition-all"
                        >
                          <td className="py-4 px-4 text-slate-200 font-semibold">{quote.id}</td>
                          <td className="py-4 px-4 text-slate-200">{quote.created_by || '-'}</td>
                          <td className="py-4 px-4 text-slate-200">{quote.customer_name}</td>
                          <td className="py-4 px-4 text-slate-200">{quote.section}</td>
                          <td className="py-4 px-4 text-slate-200">
                            {quote.date.includes('-') 
                              ? (() => {
                                  const [year, month, day] = quote.date.split('-');
                                  return `${day}-${month}-${year}`;
                                })()
                              : quote.date}
                          </td>
                          <td className="py-4 px-4 text-premium-gold font-bold">
                            {quote.final_total_cost 
                              ? `₹${quote.final_total_cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                              : '-'}
                          </td>
                          <td className="py-4 px-4">
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
                          </td>
                          <td className="py-4 px-4 text-slate-200 max-w-xs">
                            <div className="max-h-20 overflow-y-auto">
                              {quote.comments ? (
                                <p className="text-xs whitespace-pre-wrap">{quote.comments}</p>
                              ) : allComments.length > 0 ? (
                                <p className="text-xs whitespace-pre-wrap">{allComments[allComments.length - 1]}</p>
                              ) : (
                                <span className="text-slate-400 italic text-xs">No comments</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => setSelectedQuoteHistory(quote)}
                              className="px-3 py-1 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-accent rounded-lg transition-all"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                            <div key={idx} className="bg-slate-700/50 rounded-lg p-3 text-sm">
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
                            <div key={idx} className="bg-slate-700/50 rounded-lg p-3 text-sm">
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
