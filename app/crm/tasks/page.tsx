'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/ui/Toast';
import { Task } from '@/lib/constants/types';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
type TaskFilter = 'All' | 'Pending' | 'In Progress' | 'Completed' | 'Cancelled' | 'Overdue' | 'Due Today';

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // User info
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [employees, setEmployees] = useState<string[]>([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskFilter>('All');
  const [employeeFilter, setEmployeeFilter] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [taskHistory, setTaskHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Analytics
  const [analytics, setAnalytics] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Load user info
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('auth');
      if (auth !== 'true') {
        router.replace('/login');
        return;
      }
      const adminValue = localStorage.getItem('isAdmin') === 'true';
      const dataAnalystValue = localStorage.getItem('isDataAnalyst') === 'true';
      // Data analysts should be treated as employees, not admins
      setIsAdmin(adminValue && !dataAnalystValue);
      setUsername(localStorage.getItem('username') || '');
    }
  }, [router]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/crm/employees');
      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees || []);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching employees:', err);
      }
    }
  };

  const loadTasks = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      const params = new URLSearchParams();
      if (!isAdmin) {
        params.append('assigned_to', username);
      } else if (employeeFilter !== 'All') {
        params.append('assigned_to', employeeFilter);
      }

      const response = await fetch(`/api/crm/tasks/list?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success) {
        const tasksList = data.tasks || [];
        setTasks(tasksList);
      } else {
        throw new Error(data.error || 'Failed to load tasks');
      }
    } catch (err: any) {
      setError(err.message);
      // Only show toast on initial load, not on background refresh
      if (showLoading) {
        setToast({ message: err.message, type: 'error' });
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [isAdmin, username, employeeFilter]);

  // Load employees list (for admin)
  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    }
  }, [isAdmin]);

  // Load tasks
  useEffect(() => {
    if (username) {
      loadTasks();
      if (isAdmin) {
        loadAnalytics();
      }
    }
  }, [username, isAdmin, employeeFilter, loadTasks]);

  const loadAnalytics = async () => {
    try {
      const params = new URLSearchParams();
      if (employeeFilter !== 'All') {
        params.append('employee', employeeFilter);
      }
      
      const response = await fetch(`/api/crm/tasks/analytics?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error loading analytics:', errorData.error || `HTTP error! status: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (err: any) {
      console.error('Error loading analytics:', err.message || err);
    }
  };

  const handleCreateTask = async (taskData: any) => {
    // Optimistic update - add task to UI immediately
    const optimisticTask: Task = {
      id: Date.now(), // Temporary ID
      title: taskData.title,
      description: taskData.description || null,
      task_type: taskData.task_type || 'Follow-up',
      due_date: taskData.due_date,
      assigned_to: isAdmin ? taskData.assigned_to : username,
      account_id: taskData.account_id ? parseInt(taskData.account_id) : null,
      sub_account_id: taskData.sub_account_id ? parseInt(taskData.sub_account_id) : null,
      status: 'Pending',
      created_by: username,
      account_name: null,
      sub_account_name: null,
      latest_note: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
      status_history: [],
    };

    // Add optimistic task to UI immediately
    setTasks(prev => [optimisticTask, ...prev]);
    setShowCreateModal(false);
    setToast({ message: 'Creating task...', type: 'success' });

    try {
      const response = await fetch('/api/crm/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskData,
          created_by: username,
          assigned_to: isAdmin ? taskData.assigned_to : username,
        }),
      });

      if (!response.ok) {
        // Remove optimistic task on error
        setTasks(prev => prev.filter(t => t.id !== optimisticTask.id));
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setToast({ message: 'Task created successfully', type: 'success' });
        // Refresh tasks in background (non-blocking)
        loadTasks().catch(err => console.error('Error refreshing tasks:', err));
        if (isAdmin) {
          loadAnalytics().catch(err => console.error('Error refreshing analytics:', err));
        }
      } else {
        // Remove optimistic task on error
        setTasks(prev => prev.filter(t => t.id !== optimisticTask.id));
        throw new Error(data.error || 'Failed to create task');
      }
    } catch (err: any) {
      // Remove optimistic task on error
      setTasks(prev => prev.filter(t => t.id !== optimisticTask.id));
      setToast({ message: err.message, type: 'error' });
    }
  };

  const loadTaskHistory = async (taskId: number) => {
    try {
      setLoadingHistory(true);
      const response = await fetch(`/api/crm/tasks/${taskId}/history`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error loading task history:', errorData.error || `HTTP error! status: ${response.status}`);
        setTaskHistory([]);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setTaskHistory(data.history || []);
      } else {
        setTaskHistory([]);
      }
    } catch (err: any) {
      console.error('Error loading task history:', err.message || err);
      setTaskHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!isAdmin) {
      setToast({ message: 'Only admins can delete tasks', type: 'error' });
      return;
    }
    
    setTaskToDelete(task);
    setShowDeleteModal(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete || !isAdmin) {
      setToast({ message: 'Only admins can delete tasks', type: 'error' });
      return;
    }

    // Optimistic updates - instant UI update
    const taskToRestore = taskToDelete;
    setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
    
    // Optimistically update analytics immediately
    if (analytics) {
      setAnalytics(prev => {
        if (!prev) return prev;
        const newTotal = Math.max(0, (prev.total || 0) - 1);
        const currentStatus = taskToDelete.status || 'Pending';
        const assignedEmployee = taskToDelete.assigned_to || 'Unassigned';
        
        // Calculate new status counts
        const newPending = currentStatus === 'Pending' ? Math.max(0, (prev.pending || 0) - 1) : (prev.pending || 0);
        const newInProgress = currentStatus === 'In Progress' ? Math.max(0, (prev.inProgress || 0) - 1) : (prev.inProgress || 0);
        const newCompleted = currentStatus === 'Completed' ? Math.max(0, (prev.completed || 0) - 1) : (prev.completed || 0);
        const newCancelled = currentStatus === 'Cancelled' ? Math.max(0, (prev.cancelled || 0) - 1) : (prev.cancelled || 0);
        
        // Calculate new completion rate
        const newCompletionRate = newTotal > 0 
          ? ((newCompleted / newTotal) * 100).toFixed(1)
          : '0.0';
        
        // Update employee stats
        const newEmployeeStats = { ...prev.employeeStats };
        if (newEmployeeStats[assignedEmployee]) {
          const empStats = { ...newEmployeeStats[assignedEmployee] };
          empStats.total = Math.max(0, (empStats.total || 0) - 1);
          if (currentStatus === 'Pending') empStats.pending = Math.max(0, (empStats.pending || 0) - 1);
          if (currentStatus === 'In Progress') empStats.inProgress = Math.max(0, (empStats.inProgress || 0) - 1);
          if (currentStatus === 'Completed') empStats.completed = Math.max(0, (empStats.completed || 0) - 1);
          if (currentStatus === 'Cancelled') empStats.cancelled = Math.max(0, (empStats.cancelled || 0) - 1);
          
          // Recalculate employee completion rate
          empStats.completionRate = empStats.total > 0
            ? ((empStats.completed / empStats.total) * 100).toFixed(1)
            : '0.0';
          
          newEmployeeStats[assignedEmployee] = empStats;
        }
        
        return {
          ...prev,
          total: newTotal,
          pending: newPending,
          inProgress: newInProgress,
          completed: newCompleted,
          cancelled: newCancelled,
          completionRate: newCompletionRate,
          employeeStats: newEmployeeStats,
        };
      });
    }
    
    setShowDeleteModal(false);
    setDeleting(false);
    setTaskToDelete(null);
    setToast({ message: 'Task deleted successfully', type: 'success' });

    // Delete in background - don't wait for it
    fetch(`/api/crm/tasks/${taskToDelete.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to delete task. Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!data.success) {
          throw new Error(data.error || 'Failed to delete task');
        }
        // Silently refresh in background to ensure sync
        loadTasks(false).catch(() => {});
        if (isAdmin) {
          loadAnalytics().catch(() => {});
        }
      })
      .catch((err: any) => {
        // Restore task on error
        setTasks(prev => {
          const restored = [...prev, taskToRestore];
          return restored.sort((a, b) => {
            const dateA = new Date(a.due_date).getTime();
            const dateB = new Date(b.due_date).getTime();
            return dateA - dateB;
          });
        });
        // Restore analytics
        if (analytics) {
          loadAnalytics().catch(() => {});
        }
        setToast({ message: err.message || 'Failed to delete task. Restored.', type: 'error' });
      });
  };

  const handleUpdateStatus = async (taskId: number, newStatus: TaskStatus, statusNote?: string) => {
    try {
      const currentUsername = typeof window !== 'undefined' ? localStorage.getItem('username') || '' : '';
      
      if (!currentUsername && !username) {
        setToast({ message: 'User not authenticated', type: 'error' });
        return;
      }

      const response = await fetch(`/api/crm/tasks/${taskId}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          status_note: statusNote,
          updated_by: currentUsername || username || 'System',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update status');
      }

      setToast({ message: 'Status updated successfully', type: 'success' });
      setShowStatusModal(false);
      setSelectedTask(null);
      await loadTasks();
      if (isAdmin) loadAnalytics();
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating task status:', err);
      }
      setToast({ message: err.message || 'Failed to update status. Please try again.', type: 'error' });
    }
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by status
    if (statusFilter === 'Overdue') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(t => {
        if (t.status === 'Completed' || t.status === 'Cancelled') return false;
        const dueDate = new Date(t.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      });
    } else if (statusFilter === 'Due Today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(t => {
        if (t.status === 'Completed' || t.status === 'Cancelled') return false;
        const dueDate = new Date(t.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      });
    } else if (statusFilter !== 'All') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      return dateA - dateB;
    });
  }, [tasks, statusFilter]);

  // Task stats
  const taskStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'Pending').length,
      inProgress: tasks.filter(t => t.status === 'In Progress').length,
      completed: tasks.filter(t => t.status === 'Completed').length,
      cancelled: tasks.filter(t => t.status === 'Cancelled').length,
      overdue: tasks.filter(t => {
        if (t.status === 'Completed' || t.status === 'Cancelled') return false;
        const dueDate = new Date(t.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      }).length,
      dueToday: tasks.filter(t => {
        if (t.status === 'Completed' || t.status === 'Cancelled') return false;
        const dueDate = new Date(t.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      }).length,
    };
  }, [tasks]);

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
              <div className="absolute inset-0 rounded-full border-4 border-premium-gold border-t-transparent animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-4 border-slate-700"></div>
              <div className="absolute inset-2 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.6s' }}></div>
            </div>
            <p className="text-slate-300 font-medium">Loading tasks...</p>
            <p className="text-slate-500 text-sm mt-1">Please wait</p>
          </div>
        </div>
    );
  }

  return (
    <>
      <div className="min-h-screen w-full px-4 py-8 relative">
        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          {/* Header - Clean & Minimal */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
              <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {isAdmin ? 'Task Management' : 'My Tasks'}
                </h1>
              <p className="text-slate-400 text-sm mt-1">
                {isAdmin ? 'Manage and assign tasks to employees' : 'View and manage your assigned tasks'}
                </p>
              </div>
            <div className="flex gap-3">
              {isAdmin && (
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="group px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 text-white border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {showAnalytics ? 'Hide Analytics' : 'Analytics'}
                </button>
              )}
                  <button
                onClick={() => setShowCreateModal(true)}
                className="group px-5 py-2.5 rounded-xl bg-gradient-to-r from-premium-gold/30 to-amber-600/30 hover:from-premium-gold/40 hover:to-amber-600/40 text-white font-semibold border border-premium-gold/30 hover:border-premium-gold/50 transition-all duration-300 flex items-center gap-2 shadow-lg shadow-premium-gold/10 hover:shadow-premium-gold/20"
              >
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Task
                  </button>
            </div>
          </div>

          {/* Analytics Panel (Admin only) */}
          {isAdmin && showAnalytics && analytics && (
            <div className="bg-gradient-to-br from-slate-900/80 to-purple-900/30 rounded-2xl p-6 border border-purple-500/20 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Performance Analytics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Tasks</p>
                  <p className="text-3xl font-bold text-white">{analytics.total}</p>
              </div>
                <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                  <p className="text-xs text-emerald-300 uppercase tracking-wider mb-1">Completion Rate</p>
                  <p className="text-3xl font-bold text-emerald-400">{analytics.completionRate}%</p>
          </div>
                <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                  <p className="text-xs text-red-300 uppercase tracking-wider mb-1">Overdue</p>
                  <p className="text-3xl font-bold text-red-400">{analytics.overdue}</p>
                </div>
                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                  <p className="text-xs text-blue-300 uppercase tracking-wider mb-1">Avg Completion</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {analytics.averageCompletionTime ? `${analytics.averageCompletionTime}d` : '—'}
                  </p>
                </div>
              </div>

              {analytics.employeeStats && Object.keys(analytics.employeeStats).length > 0 && (
                  <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Employee Performance</h3>
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase text-slate-400 bg-white/5">
                        <tr>
                          <th className="py-3 px-4 text-left">Employee</th>
                          <th className="py-3 px-4 text-center">Total</th>
                          <th className="py-3 px-4 text-center">Completed</th>
                          <th className="py-3 px-4 text-center">Pending</th>
                          <th className="py-3 px-4 text-center">Overdue</th>
                          <th className="py-3 px-4 text-center">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(analytics.employeeStats).map(([emp, stats]: [string, any]) => (
                          <tr key={emp} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 text-white font-medium">{emp}</td>
                            <td className="py-3 px-4 text-center text-slate-300">{stats.total}</td>
                            <td className="py-3 px-4 text-center text-emerald-400 font-medium">{stats.completed}</td>
                            <td className="py-3 px-4 text-center text-amber-400 font-medium">{stats.pending}</td>
                            <td className="py-3 px-4 text-center text-red-400 font-medium">{stats.overdue}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300">
                                {stats.completionRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
                        </div>
          )}

          {/* Stats Cards - Compact & Modern */}
          <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
            {[
              { label: 'Total', value: taskStats.total, color: 'text-white', bg: 'bg-slate-800/50' },
              { label: 'Pending', value: taskStats.pending, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'In Progress', value: taskStats.inProgress, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Completed', value: taskStats.completed, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Overdue', value: taskStats.overdue, color: 'text-red-400', bg: 'bg-red-500/10' },
              { label: 'Due Today', value: taskStats.dueToday, color: 'text-orange-400', bg: 'bg-orange-500/10' },
              { label: 'Cancelled', value: taskStats.cancelled, color: 'text-slate-400', bg: 'bg-slate-700/30' },
            ].map((stat, idx) => (
              <button
                key={stat.label}
                onClick={() => setStatusFilter(stat.label === 'Total' ? 'All' : stat.label === 'In Progress' ? 'In Progress' : stat.label as TaskFilter)}
                className={`${stat.bg} rounded-xl p-3 border border-white/10 hover:border-white/20 transition-all hover:scale-105 cursor-pointer ${
                  (statusFilter === stat.label || (statusFilter === 'All' && stat.label === 'Total')) ? 'ring-2 ring-premium-gold/50' : ''
                }`}
              >
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </button>
            ))}
          </div>

          {/* Filters - Clean Design */}
          <div className="flex flex-wrap items-center gap-4 py-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TaskFilter)}
                className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white text-sm hover:border-slate-600 focus:border-premium-gold/50 focus:ring-1 focus:ring-premium-gold/30 transition-all cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Overdue">⚠️ Overdue</option>
                <option value="Due Today">🔔 Due Today</option>
              </select>
            </div>
            
            {isAdmin && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white text-sm hover:border-slate-600 focus:border-premium-gold/50 focus:ring-1 focus:ring-premium-gold/30 transition-all cursor-pointer"
                >
                  <option value="All">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="ml-auto text-sm text-slate-400">
              Showing {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
            </div>
          </div>

          {/* Tasks Display - Clean Modern Design */}
          {filteredTasks.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-700/50">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <p className="text-xl font-medium text-slate-300 mb-2">No tasks found</p>
              <p className="text-sm text-slate-500 mb-2">
                {statusFilter !== 'All' ? `No ${statusFilter.toLowerCase()} tasks` : 'Create a new task to get started'}
              </p>
              {tasks.length > 0 && (
                <p className="text-xs text-amber-400 mb-4">
                  Showing {tasks.length} total task(s), but none match the current filter
                </p>
              )}
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2.5 rounded-xl bg-premium-gold/20 hover:bg-premium-gold/30 text-white font-medium border border-premium-gold/30 transition-all inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Task
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTasks.map((task, idx) => {
                const dueDate = new Date(task.due_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dueDate.setHours(0, 0, 0, 0);
                const isOverdue = dueDate < today && task.status !== 'Completed' && task.status !== 'Cancelled';
                const isDueToday = dueDate.getTime() === today.getTime() && task.status !== 'Completed' && task.status !== 'Cancelled';
                
                const statusConfig = {
                  'Pending': { 
                    border: 'border-l-amber-500', 
                    bg: 'bg-gradient-to-r from-amber-500/5 to-transparent',
                    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                    icon: '⏳'
                  },
                  'In Progress': { 
                    border: 'border-l-blue-500', 
                    bg: 'bg-gradient-to-r from-blue-500/5 to-transparent',
                    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                    icon: '🔄'
                  },
                  'Completed': { 
                    border: 'border-l-emerald-500', 
                    bg: 'bg-gradient-to-r from-emerald-500/5 to-transparent',
                    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                    icon: '✓'
                  },
                  'Cancelled': { 
                    border: 'border-l-slate-500', 
                    bg: 'bg-gradient-to-r from-slate-500/5 to-transparent',
                    badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
                    icon: '✕'
                  },
                };
                
                const config = statusConfig[task.status] || statusConfig['Pending'];

                return (
                  <div
                    key={`task-${task.id}`}
                    className={`group relative rounded-xl border-l-4 ${config.border} ${config.bg} bg-slate-900/40 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 overflow-hidden ${
                      !isAdmin && task.assigned_to === username ? 'cursor-pointer' : ''
                    }`}
                    onClick={(e) => {
                      // Don't trigger if clicking on buttons or interactive elements
                      const target = e.target as HTMLElement;
                      if (target.closest('button') || target.closest('a') || target.closest('select') || target.closest('input')) {
                        return;
                      }
                      // Only open status modal for employees on their own tasks
                      if (!isAdmin && task.assigned_to === username) {
                        setSelectedTask(task);
                        setShowStatusModal(true);
                      }
                    }}
                  >
                    {/* Overdue/Due Today indicator */}
                    {(isOverdue || isDueToday) && (
                      <div className={`absolute top-0 right-0 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-lg ${
                        isOverdue ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                      }`}>
                        {isOverdue ? 'Overdue' : 'Due Today'}
                      </div>
                    )}
                    
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="text-base font-semibold text-white leading-tight group-hover:text-premium-gold transition-colors">
                          {task.title}
                        </h3>
                        <span className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${config.badge}`}>
                          {task.status}
                        </span>
                      </div>
                      
                      {/* Description */}
                      {task.description && (
                        <p className="text-sm text-slate-400 mb-4 line-clamp-2 leading-relaxed">{task.description}</p>
                      )}
                      
                      {/* Meta Info */}
                      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                          <span className="text-slate-300">{task.task_type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <span className="text-slate-300 truncate">{task.assigned_to}</span>
                        </div>
                      </div>
                      
                      {/* Account and Sub-Account Info - Always Show */}
                      <div className="mb-4 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-center gap-2 text-xs">
                          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            {task.account_name ? (
                              <div className="text-slate-300 truncate">
                                <span className="text-slate-400">Account: </span>
                                <span className="font-medium">{task.account_name}</span>
                              </div>
                            ) : (
                              <div className="text-slate-500 truncate">
                                <span className="text-slate-500">Account: </span>
                                <span className="italic">No Account</span>
                              </div>
                            )}
                            {task.sub_account_name ? (
                              <div className="text-slate-300 truncate mt-1">
                                <span className="text-slate-400">Sub-Account: </span>
                                <span className="font-medium">{task.sub_account_name}</span>
                              </div>
                            ) : (
                              <div className="text-slate-500 truncate mt-1">
                                <span className="text-slate-500">Sub-Account: </span>
                                <span className="italic">No Sub-Account</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Latest Note */}
                      {task.latest_note && (
                        <div className="mb-4 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <div className="flex items-start gap-2 text-xs">
                            <svg className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <div className="text-blue-300 font-medium mb-1">Latest Note:</div>
                              <div className="text-slate-300 text-xs leading-relaxed">{task.latest_note}</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Due Date */}
                      <div className={`flex items-center gap-2 text-xs py-2 px-3 rounded-lg ${
                        isOverdue ? 'bg-red-500/10 text-red-300' : isDueToday ? 'bg-orange-500/10 text-orange-300' : 'bg-slate-800/50 text-slate-300'
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">
                          {new Date(task.due_date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700/50" onClick={(e) => e.stopPropagation()}>
                        {/* Update Status button - Only for employees on their own tasks */}
                        {!isAdmin && task.assigned_to === username && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedTask(task);
                              setShowStatusModal(true);
                            }}
                            className="flex-1 px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-blue-500/30"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Update Status
                          </button>
                        )}
                        
                        {/* History button - visible to everyone (admin sees all, employees see their own) */}
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedTask(task);
                            setShowHistoryModal(true);
                            await loadTaskHistory(task.id);
                          }}
                          className={`px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 ${!isAdmin && task.assigned_to === username ? '' : isAdmin ? '' : 'flex-1'}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          History
                        </button>
                        
                        {/* Delete button - ONLY for admin */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteTask(task);
                            }}
                            className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium transition-colors flex items-center gap-1.5 border border-red-500/30 hover:border-red-500/50"
                            title="Delete task (Admin only)"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
                  </div>
                )}
              </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTask}
          isAdmin={isAdmin}
          employees={employees}
          currentUser={username}
        />
      )}

      {/* Update Status Modal */}
      {showStatusModal && selectedTask && (
        <UpdateStatusModal
          isOpen={showStatusModal}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          onUpdate={(status, note) => handleUpdateStatus(selectedTask.id, status, note)}
        />
      )}

      {/* Status History Modal */}
      {showHistoryModal && selectedTask && (
        <StatusHistoryModal
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedTask(null);
            setTaskHistory([]);
          }}
          task={selectedTask}
          history={taskHistory}
          loading={loadingHistory}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && taskToDelete && (
        <DeleteTaskModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setTaskToDelete(null);
          }}
          onConfirm={confirmDeleteTask}
          task={taskToDelete}
          deleting={deleting}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}

// Create Task Modal Component
function CreateTaskModal({
  isOpen,
  onClose,
  onCreate,
  isAdmin,
  employees,
  currentUser,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => void;
  isAdmin: boolean;
  employees: string[];
  currentUser: string;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'Follow-up' as 'Follow-up' | 'Meeting' | 'Call',
    due_date: '',
    assigned_to: isAdmin ? '' : currentUser,
    account_id: '',
    sub_account_id: '',
    contact_id: '',
  });

  const [accounts, setAccounts] = useState<Array<{ id: number; accountName: string }>>([]);
  const [subAccounts, setSubAccounts] = useState<Array<{ id: number; subAccountName: string; accountId: number }>>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingSubAccounts, setLoadingSubAccounts] = useState(false);

  // Fetch accounts when modal opens or when assigned employee changes (for admin)
  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Refetch accounts when assigned employee changes (for admin filtering)
  useEffect(() => {
    if (isOpen && isAdmin && formData.assigned_to) {
      // When admin selects an employee, refetch accounts for that employee
      fetchAccounts();
      // Also clear account and sub-account selections when employee changes
      setFormData(prev => ({ ...prev, account_id: '', sub_account_id: '' }));
      setSubAccounts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.assigned_to, isOpen, isAdmin]);

  // Fetch sub-accounts when account is selected
  useEffect(() => {
    if (formData.account_id) {
      fetchSubAccounts(parseInt(formData.account_id));
    } else {
      setSubAccounts([]);
      setFormData(prev => ({ ...prev, sub_account_id: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.account_id]);

  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const params = new URLSearchParams();
      
      // If admin has selected an employee, filter by that employee
      // Otherwise, if not admin, filter by current user
      // If admin but no employee selected, show all accounts
      if (isAdmin && formData.assigned_to) {
        params.append('employee', formData.assigned_to);
        // Don't pass isAdmin=true when filtering by employee
      } else if (!isAdmin && currentUser) {
        params.append('employee', currentUser);
      } else if (isAdmin && !formData.assigned_to) {
        params.append('isAdmin', 'true');
      }
      
      const response = await fetch(`/api/accounts?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching accounts:', errorData.error || `HTTP error! status: ${response.status}`);
        setAccounts([]);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAccounts((data.accounts || []).map((acc: any) => ({
          id: acc.id,
          accountName: acc.accountName,
        })));
      } else {
        setAccounts([]);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const fetchSubAccounts = async (accountId: number) => {
    try {
      setLoadingSubAccounts(true);
      // Try the sub-accounts endpoint with account_id filter
      const response = await fetch(`/api/subaccounts?account_id=${accountId}`);
      const data = await response.json();
      
      if (data.success && data.subAccounts) {
        setSubAccounts((data.subAccounts || []).map((sub: any) => ({
          id: sub.id,
          subAccountName: sub.subAccountName || sub.sub_account_name,
          accountId: sub.accountId || sub.account_id,
        })));
      } else {
        setSubAccounts([]);
      }
    } catch (error) {
      console.error('Error fetching sub-accounts:', error);
      setSubAccounts([]);
    } finally {
      setLoadingSubAccounts(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.due_date) {
      return;
    }
    onCreate(formData);
    setFormData({
      title: '',
      description: '',
      task_type: 'Follow-up',
      due_date: '',
      assigned_to: isAdmin ? '' : currentUser,
      account_id: '',
      sub_account_id: '',
      contact_id: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-6 w-full max-w-lg shadow-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-premium-gold/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-premium-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">New Task</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:border-premium-gold/50 focus:ring-1 focus:ring-premium-gold/30 transition-all"
              placeholder="Enter task title"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:border-premium-gold/50 focus:ring-1 focus:ring-premium-gold/30 transition-all resize-none"
              rows={3}
              placeholder="Add a description (optional)"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Type</label>
              <select
                value={formData.task_type || 'Follow-up'}
                onChange={(e) => setFormData({ ...formData, task_type: e.target.value as any })}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white focus:border-premium-gold/50 focus:ring-1 focus:ring-premium-gold/30 transition-all cursor-pointer"
              >
                <option value="Follow-up">📞 Follow-up</option>
                <option value="Meeting">📅 Meeting</option>
                <option value="Call">☎️ Call</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Due Date *</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white focus:border-premium-gold/50 focus:ring-1 focus:ring-premium-gold/30 transition-all cursor-pointer"
                required
              />
            </div>
          </div>
          {isAdmin && (
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Assign To *</label>
              <select
                value={formData.assigned_to || ''}
                onChange={(e) => {
                  setFormData({ ...formData, assigned_to: e.target.value, account_id: '', sub_account_id: '' });
                }}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white focus:border-premium-gold/50 focus:ring-1 focus:ring-premium-gold/30 transition-all cursor-pointer"
                required
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Account Selection */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Account (Optional)
              {isAdmin && formData.assigned_to && (
                <span className="text-xs text-slate-500 ml-2">(Filtered by selected employee)</span>
              )}
            </label>
            <select
              value={formData.account_id || ''}
              onChange={(e) => setFormData({ ...formData, account_id: e.target.value, sub_account_id: '' })}
              disabled={loadingAccounts || (isAdmin && !formData.assigned_to)}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white focus:border-premium-gold/50 focus:ring-1 focus:ring-premium-gold/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {isAdmin && !formData.assigned_to 
                  ? 'Select an employee first' 
                  : 'No Account'}
              </option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id.toString()}>{acc.accountName}</option>
              ))}
            </select>
            {isAdmin && !formData.assigned_to && (
              <p className="text-xs text-slate-500 mt-1">Please select an employee to see their accounts</p>
            )}
          </div>

          {/* Sub-Account Selection (only if account is selected) */}
          {formData.account_id && (
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Sub-Account (Optional)</label>
              <select
                value={formData.sub_account_id || ''}
                onChange={(e) => setFormData({ ...formData, sub_account_id: e.target.value })}
                disabled={loadingSubAccounts || !formData.account_id}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white focus:border-premium-gold/50 focus:ring-1 focus:ring-premium-gold/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">No Sub-Account</option>
                {subAccounts.map(sub => (
                  <option key={sub.id} value={sub.id.toString()}>{sub.subAccountName}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-premium-gold to-amber-600 hover:from-amber-600 hover:to-premium-gold text-white font-semibold transition-all shadow-lg shadow-premium-gold/20"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Update Status Modal Component
function UpdateStatusModal({
  isOpen,
  onClose,
  task,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onUpdate: (status: TaskStatus, note?: string) => void;
}) {
  const [newStatus, setNewStatus] = useState<TaskStatus>(task.status);
  const [statusNote, setStatusNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatus !== task.status) {
      onUpdate(newStatus, statusNote.trim() || undefined);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const statusOptions = [
    { value: 'Pending', label: 'Pending', icon: '⏳', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { value: 'In Progress', label: 'In Progress', icon: '🔄', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    { value: 'Completed', label: 'Completed', icon: '✓', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { value: 'Cancelled', label: 'Cancelled', icon: '✕', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-6 w-full max-w-md shadow-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Update Status</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Task Info */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-5 border border-slate-700/50">
          <p className="text-sm text-slate-400 mb-1">Task</p>
          <p className="text-white font-medium">{task.title}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Status Selection - Visual Grid */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-3 block">Select New Status</label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setNewStatus(option.value as TaskStatus)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    newStatus === option.value 
                      ? option.color + ' ring-2 ring-offset-2 ring-offset-slate-900'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="text-lg mb-1 block">{option.icon}</span>
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Note (Optional)</label>
            <textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:border-premium-gold/50 focus:ring-1 focus:ring-premium-gold/30 transition-all resize-none"
              rows={2}
              placeholder="Add a note about this change..."
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={newStatus === task.status}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-semibold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Task Confirmation Modal Component
function DeleteTaskModal({
  isOpen,
  onClose,
  onConfirm,
  task,
  deleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  task: Task;
  deleting: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-red-500/30 p-6 w-full max-w-md shadow-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Delete Task</h3>
          </div>
          <button 
            onClick={onClose} 
            disabled={deleting}
            className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Task Info */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-5 border border-slate-700/50">
          <p className="text-sm text-slate-400 mb-1">Task</p>
          <p className="text-white font-medium">{task.title}</p>
          {task.description && (
            <p className="text-sm text-slate-400 mt-2 line-clamp-2">{task.description}</p>
          )}
        </div>

        <div className="bg-red-500/10 rounded-xl p-4 mb-5 border border-red-500/20">
          <p className="text-sm text-red-300">
            ⚠️ Are you sure you want to delete this task? This action cannot be undone.
          </p>
        </div>
        
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-semibold transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {deleting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Deleting...
              </>
            ) : (
              'Delete Task'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Status History Modal Component
function StatusHistoryModal({
  isOpen,
  onClose,
  task,
  history,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  history?: any[];
  loading?: boolean;
}) {
  if (!isOpen) return null;

  const displayHistory = history || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'text-amber-400';
      case 'In Progress': return 'text-blue-400';
      case 'Completed': return 'text-emerald-400';
      case 'Cancelled': return 'text-slate-400';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-6 w-full max-w-lg shadow-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Task History</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Task Info */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-5 border border-slate-700/50">
          <p className="text-sm text-slate-400 mb-1">Task</p>
          <p className="text-white font-medium">{task.title}</p>
        </div>
        
        {loading ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-slate-400">Loading history...</p>
          </div>
        ) : displayHistory.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-400">No history available</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {displayHistory.map((entry: any, idx: number) => {
              const isStatusChange = entry.type === 'status_change';
              const isCreated = entry.type === 'created';
              
              return (
                <div key={`${entry.changed_at}-${entry.changed_by}-${idx}`} className="relative pl-6 pb-4 border-l-2 border-slate-700 last:border-transparent">
                  {/* Timeline dot */}
                  <div className={`absolute left-[-5px] top-0 w-2 h-2 rounded-full ${
                    isCreated ? 'bg-green-500' : isStatusChange ? 'bg-blue-500' : 'bg-slate-600'
                  }`}></div>
                  
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        {isCreated ? (
                          <span className="text-green-400 font-semibold">✨ {entry.action}</span>
                        ) : isStatusChange && entry.metadata?.old_status && entry.metadata?.new_status ? (
                          <>
                            <span className={getStatusColor(entry.metadata.old_status)}>{entry.metadata.old_status}</span>
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <span className={`font-semibold ${getStatusColor(entry.metadata.new_status)}`}>{entry.metadata.new_status}</span>
                          </>
                        ) : (
                          <span className="text-slate-300 font-semibold">{entry.action}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-slate-300 mb-2">
                      {entry.description}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">by <span className="text-slate-300">{entry.changed_by}</span></span>
                      <span className="text-slate-500">{entry.changed_at}</span>
                    </div>
                    {entry.metadata?.status_note && (
                      <div className="mt-3 text-sm text-slate-300 bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                        <span className="text-slate-500 text-xs block mb-1">Note:</span>
                        {entry.metadata.status_note}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
