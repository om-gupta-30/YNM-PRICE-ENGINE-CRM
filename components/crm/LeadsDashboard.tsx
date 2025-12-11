'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { Lead } from '@/app/crm/leads/page';

interface LeadsDashboardProps {
  leads: Lead[];
  loading: boolean;
  onFilterChange?: (filterType: string, filterValue: string) => void;
}

interface Analytics {
  totalLeads: number;
  newLeadsThisWeek: number;
  leadsByStatus: Record<string, number>;
  leadsBySource: Record<string, number>;
  followUpsDueToday: number;
}

function LeadsDashboard({ leads, loading, onFilterChange }: LeadsDashboardProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [leads.length]); // Only re-fetch if leads count changes

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await fetch('/api/crm/leads/analytics', {
        cache: 'no-store',
      });
      const data = await response.json();
      
      if (data.success && data.analytics) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Calculate statistics from leads (fallback) - memoized
  const { totalLeads, statusCounts, newLeadsThisWeek, followUpsDueToday } = useMemo(() => {
    const total = leads.length;
    const counts = {
      'New': leads.filter(l => l.status === 'New').length,
      'In Progress': leads.filter(l => l.status === 'In Progress').length,
      'Quotation Sent': leads.filter(l => l.status === 'Quotation Sent').length,
      'Follow-Up': leads.filter(l => l.status === 'Follow-up' || l.status === 'Follow-Up').length,
      'Closed Won': leads.filter(l => l.status === 'Closed Won' || l.status === 'Closed').length,
      'Closed Lost': leads.filter(l => l.status === 'Closed Lost' || l.status === 'Lost').length,
    };
    
    // Calculate new leads this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = leads.filter(l => {
      const createdDate = new Date(l.created_at);
      return createdDate >= oneWeekAgo;
    }).length;
    
    // Calculate follow-ups due today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueToday = leads.filter(l => {
      if (!l.follow_up_date) return false;
      const followUpDate = new Date(l.follow_up_date);
      followUpDate.setHours(0, 0, 0, 0);
      return followUpDate.getTime() === today.getTime();
    }).length;
    
    return { totalLeads: total, statusCounts: counts, newLeadsThisWeek: newThisWeek, followUpsDueToday: dueToday };
  }, [leads]);

  const defaultAnalytics: Analytics = {
    totalLeads,
    newLeadsThisWeek: newLeadsThisWeek,
    leadsByStatus: statusCounts,
    leadsBySource: {},
    followUpsDueToday: followUpsDueToday,
  };

  const displayAnalytics = analytics || defaultAnalytics;
  
  // Handle card clicks
  const handleCardClick = (filterType: string, filterValue: string) => {
    if (onFilterChange) {
      onFilterChange(filterType, filterValue);
    }
  };

  // Get unique lead sources with counts (use analytics if available, otherwise calculate) - memoized
  const leadSourceCounts = useMemo(() => {
    if (Object.keys(displayAnalytics.leadsBySource || {}).length) {
      return displayAnalytics.leadsBySource;
    }
    const counts: Record<string, number> = {};
    leads.forEach(lead => {
      if (lead.lead_source) {
        counts[lead.lead_source] = (counts[lead.lead_source] || 0) + 1;
      }
    });
    return counts;
  }, [displayAnalytics.leadsBySource, leads]);

  // Get recent leads (last 5) - memoized
  const recentLeads = useMemo(() => {
    return [...leads]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [leads]);

  const formatDate = useMemo(() => (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }, []);

  if (loading) {
    return (
      <div className="glassmorphic-premium rounded-3xl p-6 mb-6 slide-up card-hover-gold border-2 border-premium-gold/30 shadow-2xl">
        <div className="text-center py-10">
          <div className="text-4xl text-slate-400 mb-4 animate-pulse">⏳</div>
          <p className="text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      {/* Analytics Row - Total Leads and New This Week */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Leads Count */}
      <div className="glassmorphic-premium rounded-3xl p-6 slide-up card-hover-gold border-2 border-premium-gold/30 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 mb-1">Total Leads</p>
              <p className="text-4xl font-extrabold text-premium-gold">{displayAnalytics.totalLeads}</p>
            </div>
            <div className="text-5xl">📊</div>
          </div>
        </div>

        {/* New Leads This Week */}
        <div 
          onClick={() => handleCardClick('new_this_week', 'new_this_week')}
          className="glassmorphic-premium rounded-3xl p-6 slide-up card-hover-gold border-2 border-premium-gold/30 shadow-2xl cursor-pointer hover:scale-105 transition-transform duration-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">New This Week</p>
              <p className="text-4xl font-extrabold text-green-400">{displayAnalytics.newLeadsThisWeek}</p>
            </div>
            <div className="text-5xl">📈</div>
          </div>
        </div>

        {/* Follow-Ups Due Today */}
        <div 
          onClick={() => handleCardClick('follow_up_due_today', 'follow_up_due_today')}
          className="glassmorphic-premium rounded-3xl p-6 slide-up card-hover-gold border-2 border-premium-gold/30 shadow-2xl cursor-pointer hover:scale-105 transition-transform duration-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Follow-Ups Due Today</p>
              <p className="text-4xl font-extrabold text-orange-400">{displayAnalytics.followUpsDueToday}</p>
            </div>
            <div className="text-5xl">📅</div>
          </div>
        </div>
      </div>

      {/* Status Counts - Clickable Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* In Progress */}
        <div 
          onClick={() => handleCardClick('status', 'In Progress')}
          className="glassmorphic-premium rounded-xl p-4 slide-up card-hover-gold border-2 border-premium-gold/20 shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200"
        >
          <p className="text-xs text-slate-400 mb-1 truncate">In Progress</p>
          <p className="text-2xl font-bold text-white">{displayAnalytics.leadsByStatus['In Progress'] || 0}</p>
        </div>
        
        {/* Follow Up */}
        <div 
          onClick={() => handleCardClick('status', 'Follow-Up')}
          className="glassmorphic-premium rounded-xl p-4 slide-up card-hover-gold border-2 border-premium-gold/20 shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200"
        >
          <p className="text-xs text-slate-400 mb-1 truncate">Follow Up</p>
          <p className="text-2xl font-bold text-white">{displayAnalytics.leadsByStatus['Follow-Up'] || 0}</p>
        </div>
        
        {/* Quotation Sent */}
        <div 
          onClick={() => handleCardClick('status', 'Quotation Sent')}
          className="glassmorphic-premium rounded-xl p-4 slide-up card-hover-gold border-2 border-premium-gold/20 shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200"
        >
          <p className="text-xs text-slate-400 mb-1 truncate">Quotation Sent</p>
          <p className="text-2xl font-bold text-white">{displayAnalytics.leadsByStatus['Quotation Sent'] || 0}</p>
        </div>
        
        {/* Closed Won */}
        <div 
          onClick={() => handleCardClick('status', 'Closed Won')}
          className="glassmorphic-premium rounded-xl p-4 slide-up card-hover-gold border-2 border-premium-gold/20 shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200"
        >
          <p className="text-xs text-slate-400 mb-1 truncate">Closed Won</p>
          <p className="text-2xl font-bold text-white">{displayAnalytics.leadsByStatus['Closed Won'] || 0}</p>
        </div>
        
        {/* Closed Lost */}
        <div 
          onClick={() => handleCardClick('status', 'Closed Lost')}
          className="glassmorphic-premium rounded-xl p-4 slide-up card-hover-gold border-2 border-premium-gold/20 shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200"
        >
          <p className="text-xs text-slate-400 mb-1 truncate">Closed Lost</p>
          <p className="text-2xl font-bold text-white">{displayAnalytics.leadsByStatus['Closed Lost'] || 0}</p>
        </div>
        
        {/* New (if exists) */}
        {displayAnalytics.leadsByStatus['New'] !== undefined && (
          <div 
            onClick={() => handleCardClick('status', 'New')}
            className="glassmorphic-premium rounded-xl p-4 slide-up card-hover-gold border-2 border-premium-gold/20 shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200"
          >
            <p className="text-xs text-slate-400 mb-1 truncate">New</p>
            <p className="text-2xl font-bold text-white">{displayAnalytics.leadsByStatus['New'] || 0}</p>
          </div>
        )}
      </div>

      {/* Lead Source Chart and Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Source Chart */}
        <div className="glassmorphic-premium rounded-3xl p-6 slide-up card-hover-gold border-2 border-premium-gold/30 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>📈</span>
            <span>Lead Source Distribution</span>
          </h3>
          <div className="space-y-3">
            {Object.keys(leadSourceCounts).length > 0 ? (
              Object.entries(leadSourceCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => {
                  const percentage = displayAnalytics.totalLeads > 0 ? (count / displayAnalytics.totalLeads) * 100 : 0;
                  return (
                    <div key={source} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-300">{source}</span>
                        <span className="text-sm font-semibold text-premium-gold">{count}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-premium-gold to-dark-gold transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No lead sources available</p>
            )}
          </div>
        </div>

        {/* Recent Leads List */}
        <div className="glassmorphic-premium rounded-3xl p-6 slide-up card-hover-gold border-2 border-premium-gold/30 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>🕒</span>
            <span>Recent Leads</span>
          </h3>
          <div className="space-y-3">
            {recentLeads.length > 0 ? (
              recentLeads.map((lead) => (
                <div 
                  key={lead.id}
                  className="bg-slate-800/50 rounded-lg p-3 hover:bg-slate-700/50 transition-all duration-200 border border-white/5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{lead.lead_name}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {lead.contact_person || 'No contact'}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-xs text-slate-400">{formatDate(lead.created_at)}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${
                        lead.status === 'New' ? 'bg-blue-500/20 text-blue-300' :
                        lead.status === 'In Progress' ? 'bg-yellow-500/20 text-yellow-300' :
                        lead.status === 'Quotation Sent' ? 'bg-purple-500/20 text-purple-300' :
                        (lead.status === 'Follow-up' || lead.status === 'Follow-Up') ? 'bg-orange-500/20 text-orange-300' :
                        (lead.status === 'Closed' || lead.status === 'Closed Won') ? 'bg-green-500/20 text-green-300' :
                        (lead.status === 'Lost' || lead.status === 'Closed Lost') ? 'bg-red-500/20 text-red-300' :
                        'bg-slate-500/20 text-slate-300'
                      }`}>
                        {lead.status || 'New'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No recent leads</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(LeadsDashboard);

