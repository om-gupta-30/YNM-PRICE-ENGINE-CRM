'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';
import CoachButton from '@/components/CoachButton';

interface AdminInsightsData {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  coachingAdvice: string[];
  suggestedFocusAccounts: Array<{
    accountName: string;
    reason: string;
  }>;
}

interface AdminNotification {
  id: number;
  employee: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  target_role: 'employee' | 'admin';
  is_read: boolean;
  created_at: string;
}


export default function DashboardPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [errorInsights, setErrorInsights] = useState<string | null>(null);
  const [insightsData, setInsightsData] = useState<AdminInsightsData | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [employees, setEmployees] = useState<string[]>([]);
  
  // Admin notifications state
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [errorNotifications, setErrorNotifications] = useState<string | null>(null);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<Array<{
    employee: string;
    score: number;
    calls: number;
    followups: number;
    closedWon: number;
    streak: number;
    totalActivities: number;
    quotations: number;
  }>>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [errorLeaderboard, setErrorLeaderboard] = useState<string | null>(null);


  // Load admin status and employees on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
      loadEmployees();
      if (localStorage.getItem('isAdmin') === 'true') {
        fetchAdminNotifications();
        fetchLeaderboard();
      }
    }
  }, []);


  // Fetch admin notifications
  const fetchAdminNotifications = async () => {
    setLoadingNotifications(true);
    setErrorNotifications(null);
    try {
      const res = await fetch('/api/notifications-admin');
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch admin notifications');
      }
      
      setAdminNotifications(data.notifications || []);
    } catch (err: any) {
      setErrorNotifications(err.message || 'Failed to load admin notifications');
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: number) => {
    try {
      const res = await fetch('/api/notifications-admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId, is_read: true }),
      });

      const data = await res.json();
      
      if (data.success) {
        // Update local state
        setAdminNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
      }
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    const unreadNotifications = adminNotifications.filter(n => !n.is_read);
    if (unreadNotifications.length === 0) return;

    try {
      // Mark all unread notifications as read
      const promises = unreadNotifications.map(notification =>
        fetch('/api/notifications-admin', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: notification.id, is_read: true }),
        }).then(res => res.json())
      );

      const results = await Promise.all(promises);
      const allSuccess = results.every(data => data.success);

      if (allSuccess) {
        // Update local state
        setAdminNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        );
      }
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Navigate based on notification content
  const handleNotificationClick = (notification: AdminNotification) => {
    // Mark as read first
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on notification content
    // Try to extract account/lead/task references from message
    const message = notification.message.toLowerCase();
    
    // Navigate to employee's page if employee is mentioned
    if (notification.employee) {
      // Navigate to CRM main page - employee-specific views can be added later
      router.push('/crm');
    } else {
      // Default navigation to CRM
      router.push('/crm');
    }
  };

  // Helper function to check if an employee is an admin (should not be in leaderboard)
  const isAdminUser = (employeeName: string): boolean => {
    const lowerName = employeeName.toLowerCase().trim();
    return lowerName === 'admin' || 
           lowerName.startsWith('admin_') || 
           lowerName.endsWith('_admin') ||
           lowerName.includes('administrator');
  };

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    setErrorLeaderboard(null);
    try {
      const res = await fetch('/api/leaderboard?days=30');
      const data = await res.json();
      if (data.success && data.data) {
        // Filter out admin users - admin should not be part of gamification/leaderboard
        const filteredLeaderboard = data.data.filter(
          (entry: any) => !isAdminUser(entry.employee)
        );
        setLeaderboard(filteredLeaderboard);
      } else {
        setErrorLeaderboard(data.error || 'Failed to load leaderboard');
      }
    } catch (err: any) {
      setErrorLeaderboard(err.message || 'Failed to load leaderboard');
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-yellow-500/30">
          🥇
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-gray-400/30">
          🥈
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-amber-600/30">
          🥉
        </div>
      );
    } else {
      return (
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
          {rank}
        </div>
      );
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
      case 'normal':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'low':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
    }
  };

  const getPrioritySortOrder = (priority: string): number => {
    switch (priority) {
      case 'critical':
        return 0;
      case 'high':
        return 1;
      case 'normal':
        return 2;
      case 'low':
        return 3;
      default:
        return 4;
    }
  };

  // Sort notifications by priority (critical first, then high, normal, low)
  const sortedNotifications = [...adminNotifications].sort((a, b) => {
    const orderA = getPrioritySortOrder(a.priority);
    const orderB = getPrioritySortOrder(b.priority);
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    // If same priority, sort by created_at (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const hasCriticalNotifications = adminNotifications.some(n => n.priority === 'critical' && !n.is_read);

  const loadEmployees = async () => {
    try {
      // Fetch employees from the employees API (returns only valid sales employees)
      const response = await fetch('/api/employees');
      const data = await response.json();
      
      if (data.success && data.employees && data.employees.length > 0) {
        setEmployees(data.employees);
        
        // Auto-select first employee if available
        if (data.employees.length > 0 && !selectedEmployee) {
          setSelectedEmployee(data.employees[0]);
        }
      } else {
        // Fallback to default employees
        const defaultEmployees = ['Sales_Shweta', 'Sales_Saumya', 'Sales_Nagender', 'Sales_Abhijeet'];
        setEmployees(defaultEmployees);
        if (!selectedEmployee) {
          setSelectedEmployee(defaultEmployees[0]);
        }
      }
    } catch (err: any) {
      console.error('Error loading employees:', err);
      // Fallback to default employees on error
      const defaultEmployees = ['Sales_Shweta', 'Sales_Saumya', 'Sales_Nagender', 'Sales_Abhijeet'];
      setEmployees(defaultEmployees);
      if (!selectedEmployee) {
        setSelectedEmployee(defaultEmployees[0]);
      }
    }
  };

  const fetchTeamInsights = async () => {
    if (!selectedEmployee) {
      setErrorInsights('Please select an employee first');
      return;
    }

    setLoadingInsights(true);
    setErrorInsights(null);
    setInsightsData(null);

    try {
      const res = await fetch(`/api/ai/admin-insights?employeeUsername=${selectedEmployee}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch team insights');
      }

      setInsightsData(data.data);
    } catch (err: any) {
      setErrorInsights(err.message || 'Failed to load team insights');
    } finally {
      setLoadingInsights(false);
    }
  };

  if (!isAdmin) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center py-20 px-4 relative">
          <div className="glassmorphic-premium rounded-3xl p-12 max-w-2xl w-full relative z-10 text-center">
            <div className="text-4xl text-slate-400 mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-white mb-4">Access Restricted</h2>
            <p className="text-slate-300">
              You don't have access to AI team insights.
            </p>
          </div>
        </div>
    );
  }

  return (
    <>
      <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="fixed inset-0 z-0" style={{ backgroundColor: '#0a0a0f' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0d1117] to-slate-900"></div>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-premium-gold/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
                AI Coaching Dashboard
              </h1>
              <p className="text-slate-400 text-sm">
                Performance-coaching intelligence hub for your team
              </p>
            </div>

            {/* Team Insights Section */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white mb-2">Team Performance Insights</h2>
                  <p className="text-slate-400 text-sm">
                    Generate AI-powered coaching insights for your team members
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {employees.length > 0 && (
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-premium-gold/50"
                    >
                      <option value="">Select Employee</option>
                      {employees.map((emp) => (
                        <option key={emp} value={emp}>
                          {emp}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={fetchTeamInsights}
                    disabled={loadingInsights || !selectedEmployee}
                    className="px-6 py-2 bg-gradient-to-r from-premium-gold to-amber-600 hover:from-amber-600 hover:to-premium-gold disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-300 text-sm"
                  >
                    {loadingInsights ? 'Generating...' : 'Generate Team Insights'}
                  </button>
                </div>
              </div>

              {loadingInsights && (
                <div className="mt-4 text-slate-400 text-sm">Loading AI insights...</div>
              )}

              {errorInsights && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                  {errorInsights}
                </div>
              )}

              {insightsData && (
                <div className="mt-6 space-y-6">
                  {/* Summary */}
                  {insightsData.summary && (
                    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <span className="text-premium-gold">📊</span>
                        Summary
                      </h3>
                      <p className="text-slate-300 leading-relaxed">{insightsData.summary}</p>
                    </div>
                  )}

                  {/* Strengths */}
                  {insightsData.strengths && insightsData.strengths.length > 0 && (
                    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <span className="text-green-400">✨</span>
                        Strengths
                      </h3>
                      <ul className="list-disc ml-5 text-slate-300 space-y-2">
                        {insightsData.strengths.map((strength, i) => (
                          <li key={i}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weaknesses */}
                  {insightsData.weaknesses && insightsData.weaknesses.length > 0 && (
                    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <span className="text-amber-400">📈</span>
                        Areas for Improvement
                      </h3>
                      <ul className="list-disc ml-5 text-slate-300 space-y-2">
                        {insightsData.weaknesses.map((weakness, i) => (
                          <li key={i}>{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Coaching Advice */}
                  {insightsData.coachingAdvice && insightsData.coachingAdvice.length > 0 && (
                    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <span className="text-blue-400">💡</span>
                        Coaching Advice
                      </h3>
                      <ul className="list-disc ml-5 text-slate-300 space-y-2">
                        {insightsData.coachingAdvice.map((advice, i) => (
                          <li key={i}>{advice}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Focus Accounts */}
                  {insightsData.suggestedFocusAccounts && insightsData.suggestedFocusAccounts.length > 0 && (
                    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <span className="text-purple-400">🎯</span>
                        Focus Accounts
                      </h3>
                      <ul className="space-y-3">
                        {insightsData.suggestedFocusAccounts.map((account, i) => (
                          <li key={i} className="text-slate-300">
                            <span className="font-semibold text-white">{account.accountName}</span>
                            {account.reason && (
                              <span className="text-slate-400 text-sm ml-2">— {account.reason}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Alerts & Escalations Section */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">AI Alerts & Escalations</h2>
                  <p className="text-slate-400 text-sm">
                    Engagement alerts and escalation notifications from AI monitoring
                  </p>
                </div>
                {sortedNotifications.filter(n => !n.is_read).length > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="px-4 py-2 text-sm font-semibold text-premium-gold hover:text-amber-400 bg-premium-gold/10 hover:bg-premium-gold/20 border border-premium-gold/30 hover:border-premium-gold/50 rounded-lg transition-all duration-200"
                  >
                    Mark all as seen
                  </button>
                )}
              </div>

              {loadingNotifications && (
                <div className="text-slate-400 text-sm py-4">Loading notifications...</div>
              )}

              {errorNotifications && (
                <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                  {errorNotifications}
                </div>
              )}

              {!loadingNotifications && !errorNotifications && (
                <div className="space-y-3">
                  {/* Critical Escalation Banner */}
                  {hasCriticalNotifications && (
                    <div className="bg-red-600 text-white p-3 rounded-lg mb-4 flex items-center gap-2 font-semibold">
                      <span className="text-xl">⚠️</span>
                      <span>Critical Escalations Detected — Review Immediately</span>
                    </div>
                  )}

                  {sortedNotifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-slate-300 text-sm">No AI alerts at this time.</p>
                    </div>
                  ) : (
                    sortedNotifications.map((notification) => {
                      const isHighPriority = notification.priority === 'high' || notification.priority === 'critical';
                      const isCritical = notification.priority === 'critical';
                      
                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer group ${
                            !notification.is_read
                              ? 'bg-slate-800/80 border-premium-gold/50 hover:border-premium-gold hover:bg-slate-800/95 shadow-lg shadow-premium-gold/10'
                              : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/70'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Priority Badge with Warning Icon for Critical */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${getPriorityColor(notification.priority)}`}>
                                  {isCritical && <span className="text-red-400">⚠️</span>}
                                  {notification.priority.toUpperCase()}
                                </span>
                                {!notification.is_read && (
                                  <span className="w-2 h-2 rounded-full bg-premium-gold animate-pulse"></span>
                                )}
                                {notification.employee && (
                                  <span className="text-slate-400 text-xs">
                                    Employee: {notification.employee}
                                  </span>
                                )}
                              </div>
                              
                              {/* Message - Bold for high/critical */}
                              <p className={`text-sm mb-2 ${
                                isHighPriority 
                                  ? 'text-white font-bold' 
                                  : !notification.is_read 
                                    ? 'text-white font-semibold' 
                                    : 'text-slate-300'
                              }`}>
                                {notification.message}
                              </p>
                              
                              {/* Timestamp - Smaller and Muted */}
                              <p className="text-slate-500 text-xs flex items-center gap-1">
                                <span>🕒</span>
                                <span>{formatTimestampIST(notification.created_at)}</span>
                              </p>
                            </div>
                            
                            {/* Click indicator */}
                            <div className="text-premium-gold opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-200">
                              {!notification.is_read ? 'Click to mark as read and navigate →' : 'Click to navigate →'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Team Leaderboard Section */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white mb-2">Employee Leaderboard</h2>
                <p className="text-slate-400 text-sm">
                  Employee performance rankings based on activity, closures, and streaks (Last 30 days)
                </p>
              </div>

              {loadingLeaderboard && (
                <div className="text-slate-400 text-sm py-4">Loading leaderboard...</div>
              )}

              {errorLeaderboard && (
                <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                  {errorLeaderboard}
                </div>
              )}

              {!loadingLeaderboard && !errorLeaderboard && (
                <div className="space-y-3">
                  {leaderboard.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-slate-300 text-sm">No leaderboard data available.</p>
                    </div>
                  ) : (
                    leaderboard.map((entry, index) => {
                      const rank = index + 1;
                      return (
                        <div
                          key={entry.employee}
                          className={`p-4 rounded-xl border transition-all duration-300 ${
                            rank <= 3
                              ? 'bg-gradient-to-r from-slate-800/90 to-slate-800/70 border-premium-gold/50 shadow-lg shadow-premium-gold/10'
                              : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/70'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {/* Rank Badge */}
                            <div className="flex-shrink-0">
                              {getRankBadge(rank)}
                            </div>

                            {/* Employee Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-white font-bold text-lg">{entry.employee}</h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  rank === 1 ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' :
                                  rank === 2 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/50' :
                                  rank === 3 ? 'bg-amber-600/20 text-amber-300 border border-amber-600/50' :
                                  'bg-slate-700/50 text-slate-300'
                                }`}>
                                  Score: {entry.score.toFixed(1)}
                                </span>
                              </div>

                              {/* Stats Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 text-xs">🔥</span>
                                  <div>
                                    <p className="text-slate-400 text-xs">Streak</p>
                                    <p className="text-white font-semibold text-sm">{entry.streak} days</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 text-xs">✅</span>
                                  <div>
                                    <p className="text-slate-400 text-xs">Closed Won</p>
                                    <p className="text-white font-semibold text-sm">{entry.closedWon}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 text-xs">📞</span>
                                  <div>
                                    <p className="text-slate-400 text-xs">Calls</p>
                                    <p className="text-white font-semibold text-sm">{entry.calls}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 text-xs">🔄</span>
                                  <div>
                                    <p className="text-slate-400 text-xs">Followups</p>
                                    <p className="text-white font-semibold text-sm">{entry.followups}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* AI Coach Button */}
      {(() => {
        const storedUsername = typeof window !== 'undefined' ? localStorage.getItem('username') || '' : '';
        const storedIsAdmin = typeof window !== 'undefined' ? localStorage.getItem('isAdmin') === 'true' : false;
        return storedUsername ? (
          <CoachButton
            user={storedUsername}
            role={storedIsAdmin ? 'admin' : 'employee'}
          />
        ) : null;
      })()}
    </>
  );
}
