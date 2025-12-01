'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QuotationStatusChart from '@/components/crm/QuotationStatusChart';

interface DashboardData {
  totalCustomers?: number;
  totalLeads?: number;
  totalQuotations?: number;
  totalQuotationValue?: number;
  sentQuotations?: number;
  closedWonQuotations?: number;
  conversionRate?: string;
  productBreakdown?: {
    mbcb: { count: number; value: number };
    signages: { count: number; value: number };
    paint: { count: number; value: number };
  };
  topEmployees?: Array<{ employee: string; count: number; value: number }>;
  tasksDueToday?: number;
  assignedCustomers?: number;
  assignedLeads?: number;
  quotationsCreated?: number;
  pendingFollowUps?: number;
}


export default function DashboardOverview() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [generatingNotifications, setGeneratingNotifications] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const loadDashboard = async (employeeName: string, admin: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        employee: employeeName,
        isAdmin: admin.toString(),
      });
      const response = await fetch(`/api/crm/dashboard?${params}`);
      const result = await response.json();

      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNotifications = async () => {
    try {
      setGeneratingNotifications(true);
      setNotificationMessage(null);
      
      const response = await fetch('/api/notifications/generate-followups', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setNotificationMessage({
          type: 'success',
          text: `Successfully generated ${result.created || 0} notifications!`,
        });
        // Clear message after 5 seconds
        setTimeout(() => setNotificationMessage(null), 5000);
      } else {
        throw new Error(result.error || 'Failed to generate notifications');
      }
    } catch (err: any) {
      setNotificationMessage({
        type: 'error',
        text: err.message || 'Failed to generate notifications',
      });
      setTimeout(() => setNotificationMessage(null), 5000);
    } finally {
      setGeneratingNotifications(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const auth = localStorage.getItem('auth');
    if (auth !== 'true') {
      router.replace('/login');
      return;
    }

    const storedIsAdmin = localStorage.getItem('isAdmin') === 'true';
    const storedUsername = localStorage.getItem('username') || '';
    setIsAdmin(storedIsAdmin);
    setUsername(storedUsername);
    
    if (storedUsername) {
      loadDashboard(storedUsername, storedIsAdmin);
      
      // Auto-generate notifications for admin on dashboard load (once per day)
      if (storedIsAdmin) {
        const lastGeneration = localStorage.getItem('lastNotificationGeneration');
        const today = new Date().toDateString();
        
        // Only generate if not already generated today
        if (lastGeneration !== today) {
          // Generate in background (don't wait for it)
          fetch('/api/notifications/generate-followups', { method: 'POST' })
            .then(res => res.json())
            .then(result => {
              if (result.success) {
                localStorage.setItem('lastNotificationGeneration', today);
                console.log(`Auto-generated ${result.created || 0} notifications`);
              }
            })
            .catch(err => {
              console.error('Error auto-generating notifications:', err);
            });
        }
      }
    } else {
      setError('Username not found');
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-premium-gold mb-4"></div>
          <p className="text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-6">
          <p className="text-red-200 text-center">{error || 'Failed to load dashboard'}</p>
          <button
            onClick={() => {
              const storedIsAdmin = typeof window !== 'undefined' ? localStorage.getItem('isAdmin') === 'true' : false;
              const storedUsername = typeof window !== 'undefined' ? localStorage.getItem('username') || '' : '';
              if (storedUsername) {
                loadDashboard(storedUsername, storedIsAdmin);
              }
            }}
            className="mt-4 px-4 py-2 bg-red-500/30 hover:bg-red-500/40 rounded-lg text-white text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-xl p-6">
          <p className="text-yellow-200 text-center">No dashboard data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="glassmorphic-premium rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {isAdmin ? 'Admin Dashboard' : 'Employee Dashboard'}
            </h1>
            <p className="text-slate-300">Welcome back, {username}!</p>
          </div>
          {isAdmin && (
            <button
              onClick={handleGenerateNotifications}
              disabled={generatingNotifications}
              className="px-6 py-3 bg-premium-gold/20 hover:bg-premium-gold/30 border border-premium-gold/30 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {generatingNotifications ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>🔔</span>
                  <span>Generate Follow-up Notifications</span>
                </>
              )}
            </button>
          )}
        </div>
        {notificationMessage && (
          <div className={`mt-4 p-3 rounded-lg ${
            notificationMessage.type === 'success' 
              ? 'bg-green-500/20 border border-green-500/30 text-green-300' 
              : 'bg-red-500/20 border border-red-500/30 text-red-300'
          }`}>
            {notificationMessage.text}
          </div>
        )}
      </div>

      {isAdmin ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="glassmorphic-premium rounded-2xl p-6">
              <p className="text-slate-400 text-sm mb-1">Total Customers</p>
              <p className="text-3xl font-bold text-white">{data.totalCustomers || 0}</p>
            </div>
            <div className="glassmorphic-premium rounded-2xl p-6">
              <p className="text-slate-400 text-sm mb-1">Total Leads</p>
              <p className="text-3xl font-bold text-white">{data.totalLeads || 0}</p>
            </div>
            <div className="glassmorphic-premium rounded-2xl p-6">
              <p className="text-slate-400 text-sm mb-1">Total Quotations</p>
              <p className="text-3xl font-bold text-white">{data.totalQuotations || 0}</p>
            </div>
            <div className="glassmorphic-premium rounded-2xl p-6">
              <p className="text-slate-400 text-sm mb-1">Conversion Rate</p>
              <p className="text-3xl font-bold text-premium-gold">{data.conversionRate || '0.00'}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="glassmorphic-premium rounded-2xl p-6">
              <p className="text-slate-400 text-sm mb-1">Total Quotation Value</p>
              <p className="text-2xl font-bold text-premium-gold">
                ₹{(data.totalQuotationValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="glassmorphic-premium rounded-2xl p-6">
              <p className="text-slate-400 text-sm mb-1">Sent Quotations</p>
              <p className="text-2xl font-bold text-blue-300">{data.sentQuotations || 0}</p>
            </div>
            <div className="glassmorphic-premium rounded-2xl p-6">
              <p className="text-slate-400 text-sm mb-1">Closed Won</p>
              <p className="text-2xl font-bold text-green-300">{data.closedWonQuotations || 0}</p>
            </div>
          </div>

          {data.productBreakdown && (
            <div className="glassmorphic-premium rounded-2xl p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-4">Product-wise Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">MBCB</p>
                  <p className="text-xl font-bold text-white">{data.productBreakdown.mbcb.count} quotations</p>
                  <p className="text-premium-gold font-semibold">
                    ₹{data.productBreakdown.mbcb.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Signages</p>
                  <p className="text-xl font-bold text-white">{data.productBreakdown.signages.count} quotations</p>
                  <p className="text-premium-gold font-semibold">
                    ₹{data.productBreakdown.signages.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Paint</p>
                  <p className="text-xl font-bold text-white">{data.productBreakdown.paint.count} quotations</p>
                  <p className="text-premium-gold font-semibold">
                    ₹{data.productBreakdown.paint.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {data.topEmployees && data.topEmployees.length > 0 && (
            <div className="glassmorphic-premium rounded-2xl p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-4">Top Employees</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Employee</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Quotations</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topEmployees.map((emp, idx) => (
                      <tr key={idx} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-4 px-4 text-slate-200 font-semibold">{emp.employee}</td>
                        <td className="py-4 px-4 text-slate-200">{emp.count}</td>
                        <td className="py-4 px-4 text-premium-gold font-bold">
                          ₹{emp.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="glassmorphic-premium rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Quotation Status Overview</h2>
            <QuotationStatusChart />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="glassmorphic-premium rounded-2xl p-6">
              <p className="text-slate-400 text-sm mb-1">Assigned Customers</p>
              <p className="text-3xl font-bold text-white">{data.assignedCustomers || 0}</p>
            </div>
            <div className="glassmorphic-premium rounded-2xl p-6">
              <p className="text-slate-400 text-sm mb-1">Assigned Leads</p>
              <p className="text-3xl font-bold text-white">{data.assignedLeads || 0}</p>
            </div>
            <div className="glassmorphic-premium rounded-2xl p-6">
              <p className="text-slate-400 text-sm mb-1">Quotations Created</p>
              <p className="text-3xl font-bold text-white">{data.quotationsCreated || 0}</p>
            </div>
            <div className="glassmorphic-premium rounded-2xl p-6">
              <p className="text-slate-400 text-sm mb-1">Pending Follow-ups</p>
              <p className="text-3xl font-bold text-orange-300">{data.pendingFollowUps || 0}</p>
            </div>
          </div>

          <div className="glassmorphic-premium rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-2">Tasks Due Today</h2>
            <p className="text-4xl font-bold text-white">
              {data.tasksDueToday || 0}
            </p>
            <p className="text-slate-300 text-sm mt-2">
              Stay on track by completing your scheduled follow-ups and tasks.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

