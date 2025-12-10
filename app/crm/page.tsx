'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';
import CoachButton from '@/components/CoachButton';
import ActivityNotificationBadge from '@/components/crm/ActivityNotificationBadge';

// Interfaces
interface WeeklyInsights {
  summary: string;
  topOpportunity: string;
  improvementArea: string;
}

interface DailyCoaching {
  motivation: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  priorityAccounts: string[];
}

interface StreakData {
  streak_count: number;
  last_activity_date: string;
}

interface Notification {
  id: number;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  is_read: boolean;
  created_at: string;
}

interface LeaderboardEntry {
  employee: string;
  score: number;
  calls: number;
  followups: number;
  closedWon: number;
  streak: number;
  totalActivities: number;
}

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

export default function CRMDashboard() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDataAnalyst, setIsDataAnalyst] = useState(false);
  const [loading, setLoading] = useState(true);

  // Employee state
  const [weeklyInsights, setWeeklyInsights] = useState<WeeklyInsights | null>(null);
  const [dailyCoaching, setDailyCoaching] = useState<DailyCoaching | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);

  // Admin state
  const [employees, setEmployees] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [adminInsights, setAdminInsights] = useState<AdminInsightsData | null>(null);
  const [adminNotifications, setAdminNotifications] = useState<Notification[]>([]);

  // Loading states
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('username') || '';
      const admin = localStorage.getItem('isAdmin') === 'true';
      const analyst = localStorage.getItem('isDataAnalyst') === 'true';
      
      setUsername(user);
      setIsAdmin(admin);
      setIsDataAnalyst(analyst);
      
      if (user) {
        loadDashboardData(user, admin, analyst);
      }
      setLoading(false);
    }
  }, []);

  // Helper function to check if an employee is an admin (should not be in leaderboard)
  const isAdminUser = (employeeName: string): boolean => {
    const lowerName = employeeName.toLowerCase().trim();
    return lowerName === 'admin' || 
           lowerName.startsWith('admin_') || 
           lowerName.endsWith('_admin') ||
           lowerName.includes('administrator');
  };

  const loadDashboardData = async (user: string, admin: boolean, analyst: boolean) => {
    // Load leaderboard for everyone (filtered to exclude admin users)
    try {
      const leaderboardRes = await fetch('/api/leaderboard?days=30');
      const leaderboardData = await leaderboardRes.json();
      if (leaderboardData.success && leaderboardData.data) {
        // Filter out admin users from leaderboard - admin should not be part of gamification
        const filteredLeaderboard = leaderboardData.data.filter(
          (entry: LeaderboardEntry) => !isAdminUser(entry.employee)
        );
        setLeaderboard(filteredLeaderboard);
        // Only set rank if user is not admin (admins shouldn't have leaderboard rank)
        if (!isAdminUser(user)) {
          const rank = filteredLeaderboard.findIndex((e: LeaderboardEntry) => e.employee === user) + 1;
          if (rank > 0) setMyRank(rank);
        }
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    }

    // Load streak (only for non-admin users - admin should not be part of gamification)
    if (!isAdminUser(user)) {
      try {
        const streakRes = await fetch(`/api/streaks?employee=${user}`);
        const streakData = await streakRes.json();
        if (streakData.success && streakData.streak) {
          setStreak(streakData.streak);
        }
      } catch (err) {
        console.error('Error loading streak:', err);
      }
    }

    if (admin && !analyst) {
      // Load admin-specific data
      loadAdminData();
    } else {
      // Load employee/analyst notifications
      try {
        const notifRes = await fetch(`/api/notifications?employee=${user}`);
        const notifData = await notifRes.json();
        if (notifData.success) {
          setNotifications(notifData.notifications || []);
        }
      } catch (err) {
        console.error('Error loading notifications:', err);
      }
    }
  };

  const loadAdminData = async () => {
    // Load employee list from the employees API (returns only valid sales employees)
    try {
      const response = await fetch('/api/employees');
      const data = await response.json();
      
      if (data.success && data.employees && data.employees.length > 0) {
        setEmployees(data.employees);
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
    } catch (err) {
      console.error('Error loading employees:', err);
      // Fallback to default employees on error
      const defaultEmployees = ['Sales_Shweta', 'Sales_Saumya', 'Sales_Nagender', 'Sales_Abhijeet'];
      setEmployees(defaultEmployees);
      if (!selectedEmployee) {
        setSelectedEmployee(defaultEmployees[0]);
      }
    }

    // Load admin notifications
    try {
      const notifRes = await fetch('/api/notifications-admin');
      const notifData = await notifRes.json();
      if (notifData.success) {
        setAdminNotifications(notifData.notifications || []);
      }
    } catch (err) {
      console.error('Error loading admin notifications:', err);
    }
  };

  const fetchWeeklyInsights = async () => {
    if (!username) return;
    setLoadingWeekly(true);
    try {
      const res = await fetch(`/api/ai/weekly-insights?employee=${username}`);
      const data = await res.json();
      if (data.success) {
        setWeeklyInsights(data.insights);
      }
    } catch (err) {
      console.error('Error fetching weekly insights:', err);
    } finally {
      setLoadingWeekly(false);
    }
  };

  const fetchDailyCoaching = async () => {
    if (!username) return;
    setLoadingDaily(true);
    try {
      const res = await fetch(`/api/ai/daily-coaching?employee=${username}`);
      const data = await res.json();
      if (data.success) {
        setDailyCoaching(data.coaching);
      }
    } catch (err) {
      console.error('Error fetching daily coaching:', err);
    } finally {
      setLoadingDaily(false);
    }
  };

  const fetchAdminInsights = async () => {
    if (!selectedEmployee) return;
    setLoadingAdmin(true);
    try {
      const res = await fetch(`/api/ai/admin-insights?employeeUsername=${selectedEmployee}`);
      const data = await res.json();
      if (data.success) {
        setAdminInsights(data.data);
      }
    } catch (err) {
      console.error('Error fetching admin insights:', err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
      case 'normal': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-premium-gold/30 border-t-premium-gold rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen relative" style={{ backgroundColor: '#0a0a0f' }}>
        {/* Background Effects */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0d1117] to-slate-900"></div>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-premium-gold/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-premium-gold/20 via-amber-600/10 to-transparent rounded-2xl p-6 border border-premium-gold/30">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                    Welcome back, <span className="text-premium-gold">{username}</span>! 👋
                  </h1>
                  <p className="text-slate-400">
                    {isAdmin ? '🔐 Admin Dashboard' : isDataAnalyst ? '📊 Data Analyst Dashboard' : '💼 Sales Dashboard'} • AI-Powered Insights
                  </p>
                </div>
                {/* Only show gamification elements (streak & rank) for non-admin users */}
                {!isAdmin && (
                  <div className="flex items-center gap-4">
                    {streak && (
                      <div className="bg-orange-500/20 border border-orange-500/50 rounded-xl px-4 py-2 text-center">
                        <div className="text-2xl">🔥</div>
                        <div className="text-orange-300 font-bold">{streak.streak_count} day streak!</div>
                      </div>
                    )}
                    {myRank && (
                      <div className="bg-premium-gold/20 border border-premium-gold/50 rounded-xl px-4 py-2 text-center">
                        <div className="text-2xl">{getRankBadge(myRank)}</div>
                        <div className="text-premium-gold font-bold">Rank #{myRank}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-3xl">📊</div>
                  <ActivityNotificationBadge
                    sectionType="accounts"
                    employee={username}
                    isAdmin={isAdmin}
                  />
                </div>
                <p className="text-slate-400 text-sm">Go to</p>
                <button onClick={() => router.push('/crm/accounts')} className="text-white font-semibold hover:text-premium-gold transition-colors">
                  Accounts →
                </button>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-3xl">✅</div>
                  <ActivityNotificationBadge
                    sectionType="tasks"
                    employee={username}
                    isAdmin={isAdmin}
                  />
                </div>
                <p className="text-slate-400 text-sm">Go to</p>
                <button onClick={() => router.push('/crm/tasks')} className="text-white font-semibold hover:text-premium-gold transition-colors">
                  Tasks →
                </button>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-3xl">🎯</div>
                  <ActivityNotificationBadge
                    sectionType="leads"
                    employee={username}
                    isAdmin={isAdmin}
                  />
                </div>
                <p className="text-slate-400 text-sm">Go to</p>
                <button onClick={() => router.push('/crm/leads')} className="text-white font-semibold hover:text-premium-gold transition-colors">
                  Leads →
                </button>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                <div className="text-3xl mb-2">📝</div>
                <p className="text-slate-400 text-sm">Go to</p>
                <button onClick={() => router.push('/crm/activities')} className="text-white font-semibold hover:text-premium-gold transition-colors">
                  Activities →
                </button>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Insights Section - Different for Admin vs Employee */}
              {isAdmin && !isDataAnalyst ? (
                // ADMIN VIEW
                <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">🤖</span> AI Team Performance Analysis
                      </h2>
                      <p className="text-slate-400 text-sm mt-1">Generate AI-powered insights for any team member</p>
                    </div>
                    <div className="flex gap-3">
                      <select
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        className="px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm"
                      >
                        <option value="">Select Employee</option>
                        {employees.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                      </select>
                      <button
                        onClick={fetchAdminInsights}
                        disabled={loadingAdmin || !selectedEmployee}
                        className="px-6 py-2 bg-gradient-to-r from-premium-gold to-amber-600 hover:from-amber-600 hover:to-premium-gold text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingAdmin ? '🔄 Analyzing...' : '✨ Generate AI Report'}
                      </button>
                    </div>
                  </div>

                  {adminInsights && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                        <h3 className="text-green-400 font-semibold mb-2 flex items-center gap-2">✨ Strengths</h3>
                        <ul className="space-y-1 text-slate-300 text-sm">
                          {adminInsights.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                        </ul>
                      </div>
                      <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                        <h3 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">📈 Areas to Improve</h3>
                        <ul className="space-y-1 text-slate-300 text-sm">
                          {adminInsights.weaknesses.map((w, i) => <li key={i}>• {w}</li>)}
                        </ul>
                      </div>
                      <div className="md:col-span-2 bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                        <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">💡 AI Coaching Advice</h3>
                        <ul className="space-y-1 text-slate-300 text-sm">
                          {adminInsights.coachingAdvice.map((a, i) => <li key={i}>• {a}</li>)}
                        </ul>
                      </div>
                      {adminInsights.suggestedFocusAccounts.length > 0 && (
                        <div className="md:col-span-2 bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                          <h3 className="text-purple-400 font-semibold mb-2 flex items-center gap-2">🎯 Focus Accounts</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {adminInsights.suggestedFocusAccounts.map((acc, i) => (
                              <div key={i} className="bg-slate-800/50 rounded-lg p-2 text-sm">
                                <span className="text-white font-semibold">{acc.accountName}</span>
                                <span className="text-slate-400 ml-2">— {acc.reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!adminInsights && !loadingAdmin && (
                    <div className="text-center py-8 text-slate-400">
                      <div className="text-4xl mb-3">🤖</div>
                      <p>Select an employee and click "Generate AI Report" to see AI-powered performance insights</p>
                    </div>
                  )}
                </div>
              ) : (
                // EMPLOYEE / DATA ANALYST VIEW
                <>
                  {/* Weekly Insights */}
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>📅</span> Your Weekly AI Summary
                      </h2>
                      <button
                        onClick={fetchWeeklyInsights}
                        disabled={loadingWeekly}
                        className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                      >
                        {loadingWeekly ? '🔄' : '🔄 Refresh'}
                      </button>
                    </div>

                    {weeklyInsights ? (
                      <div className="space-y-4">
                        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                          <h3 className="text-premium-gold font-semibold mb-2">📊 Summary</h3>
                          <p className="text-slate-300 text-sm">{weeklyInsights.summary}</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-xl p-4 border border-green-500/30">
                          <h3 className="text-green-400 font-semibold mb-2">🌟 Top Opportunity</h3>
                          <p className="text-slate-300 text-sm">{weeklyInsights.topOpportunity}</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-xl p-4 border border-amber-500/30">
                          <h3 className="text-amber-400 font-semibold mb-2">🎯 Focus Area</h3>
                          <p className="text-slate-300 text-sm">{weeklyInsights.improvementArea}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-3">📅</div>
                        <p className="text-slate-400 mb-4">Get your AI-powered weekly performance summary</p>
                        <button
                          onClick={fetchWeeklyInsights}
                          disabled={loadingWeekly}
                          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
                        >
                          {loadingWeekly ? '🔄 Generating...' : '✨ Generate Weekly Insights'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Daily Coaching */}
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>💪</span> Today's AI Coaching
                      </h2>
                      <button
                        onClick={fetchDailyCoaching}
                        disabled={loadingDaily}
                        className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                      >
                        {loadingDaily ? '🔄' : '🔄 Refresh'}
                      </button>
                    </div>

                    {dailyCoaching ? (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
                          <h3 className="text-purple-300 font-semibold mb-2">💬 Motivation</h3>
                          <p className="text-white text-sm italic">"{dailyCoaching.motivation}"</p>
                        </div>
                        {dailyCoaching.recommendations.length > 0 && (
                          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                            <h3 className="text-blue-400 font-semibold mb-2">📋 Today's Actions</h3>
                            <ul className="space-y-1 text-slate-300 text-sm">
                              {dailyCoaching.recommendations.map((r, i) => <li key={i}>• {r}</li>)}
                            </ul>
                          </div>
                        )}
                        {dailyCoaching.priorityAccounts.length > 0 && (
                          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                            <h3 className="text-amber-400 font-semibold mb-2">🎯 Priority Accounts</h3>
                            <div className="flex flex-wrap gap-2">
                              {dailyCoaching.priorityAccounts.map((acc, i) => (
                                <span key={i} className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-300 text-sm">{acc}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-3">💪</div>
                        <p className="text-slate-400 mb-4">Get personalized coaching tips for today</p>
                        <button
                          onClick={fetchDailyCoaching}
                          disabled={loadingDaily}
                          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                        >
                          {loadingDaily ? '🔄 Generating...' : '✨ Get Daily Coaching'}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Notifications Section */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>🔔</span> {isAdmin ? 'AI Alerts & Escalations' : 'AI Notifications'}
                </h2>
                
                {(isAdmin ? adminNotifications : notifications).length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <div className="text-4xl mb-3">✅</div>
                    <p>No notifications - you're all caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {(isAdmin ? adminNotifications : notifications)
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .slice(0, 10)
                      .map((notif) => (
                        <div key={notif.id} className={`p-3 rounded-xl border ${!notif.is_read ? 'bg-slate-800/80 border-premium-gold/30' : 'bg-slate-900/50 border-slate-700/30'}`}>
                          <div className="flex items-start gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getPriorityColor(notif.priority)}`}>
                              {notif.priority.toUpperCase()}
                            </span>
                            {!notif.is_read && <span className="w-2 h-2 rounded-full bg-premium-gold animate-pulse"></span>}
                          </div>
                          <p className="text-slate-300 text-sm mt-2">{notif.message}</p>
                          <p className="text-slate-500 text-xs mt-1">{formatTimestampIST(notif.created_at)}</p>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Leaderboard */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>🏆</span> Employee Leaderboard
                </h2>
                
                {leaderboard.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <div className="text-4xl mb-3">🏆</div>
                    <p>No leaderboard data yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.slice(0, 10).map((entry, idx) => {
                      const rank = idx + 1;
                      const isMe = entry.employee === username;
                      return (
                        <div 
                          key={entry.employee}
                          className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                            isMe 
                              ? 'bg-premium-gold/20 border-premium-gold/50' 
                              : rank <= 3 
                                ? 'bg-slate-800/80 border-slate-600/50' 
                                : 'bg-slate-900/50 border-slate-700/30'
                          }`}
                        >
                          <div className="text-2xl w-10 text-center">{getRankBadge(rank)}</div>
                          <div className="flex-1">
                            <p className={`font-semibold ${isMe ? 'text-premium-gold' : 'text-white'}`}>
                              {entry.employee} {isMe && '(You)'}
                            </p>
                            <div className="flex gap-3 text-xs text-slate-400">
                              <span>🔥 {entry.streak}d</span>
                              <span>✅ {entry.closedWon}</span>
                              <span>📞 {entry.calls}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${rank <= 3 ? 'text-premium-gold' : 'text-slate-300'}`}>{entry.score.toFixed(1)}</p>
                            <p className="text-xs text-slate-500">pts</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* How AI Works Section */}
            <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>🤖</span> How AI Works in This CRM
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 rounded-xl p-4 border border-blue-500/30">
                  <div className="text-3xl mb-2">📊</div>
                  <h3 className="text-blue-400 font-semibold mb-2">Engagement Scoring</h3>
                  <p className="text-slate-400 text-sm">AI analyzes activities on each account and assigns a 0-100 engagement score. Low scores trigger alerts.</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-purple-500/30">
                  <div className="text-3xl mb-2">💬</div>
                  <h3 className="text-purple-400 font-semibold mb-2">AI Coach Chat</h3>
                  <p className="text-slate-400 text-sm">Click the 🤖 button (bottom-right) to ask AI questions about your performance, accounts, or strategies.</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-amber-500/30">
                  <div className="text-3xl mb-2">⚠️</div>
                  <h3 className="text-amber-400 font-semibold mb-2">Smart Alerts</h3>
                  <p className="text-slate-400 text-sm">AI monitors accounts automatically and creates alerts when engagement is slipping or action is needed.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Coach Floating Button */}
      {username && (
        <CoachButton
          user={username}
          role={isAdmin ? 'admin' : 'employee'}
        />
      )}
    </>
  );
}
