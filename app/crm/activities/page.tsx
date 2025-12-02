'use client';

import { useState, useEffect } from 'react';
import CRMLayout from '@/components/layout/CRMLayout';
import ActivityTimeline from '@/components/crm/ActivityTimeline';
import { Activity } from '@/lib/constants/types';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [employeeOptions, setEmployeeOptions] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
      setUsername(localStorage.getItem('username') || '');
    }
  }, []);

  // Fetch employee list for admin filter
  useEffect(() => {
    if (isAdmin) {
      const fetchEmployees = async () => {
        try {
          const response = await fetch('/api/employees');
          const data = await response.json();
          if (data.success && Array.isArray(data.employees)) {
            setEmployeeOptions(data.employees);
          }
        } catch (error) {
          console.error('Error fetching employees:', error);
        }
      };
      fetchEmployees();
    }
  }, [isAdmin]);

  // Set default date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFilterDate(today);
  }, []);

  useEffect(() => {
    if (!username && !isAdmin) return;

    const fetchActivities = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (!isAdmin && username) {
          params.append('employee', username);
        }
        if (isAdmin) {
          params.append('isAdmin', 'true');
          if (filterEmployee) {
            params.append('filterEmployee', filterEmployee);
          }
        }
        if (filterDate) {
          params.append('filterDate', filterDate);
        }

        const response = await fetch(`/api/crm/activities?${params}`);
        const data = await response.json();

        if (data.success) {
          setActivities(data.data || []);
        } else {
          console.error('Failed to fetch activities:', data.error);
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    // Refresh activities every 10 seconds for live updates
    const interval = setInterval(fetchActivities, 10000);
    return () => clearInterval(interval);
  }, [username, isAdmin, filterEmployee, filterDate]);

  return (
    <CRMLayout>
      <div className="min-h-screen py-6 sm:py-8 md:py-12 pb-20 sm:pb-24 md:pb-32 relative w-full">
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4">
          {/* Header */}
          <div className="w-full flex flex-col items-center mb-10 title-glow fade-up relative">
            <div className="w-full flex items-center justify-center mb-4 relative">
              <h1 
                className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-extrabold text-white text-center tracking-tight drop-shadow-md text-neon-gold"
                style={{ 
                  textShadow: '0 0 10px rgba(209, 168, 90, 0.3)',
                  letterSpacing: '-0.02em'
                }}
              >
                {isAdmin ? 'All Activities' : 'My Activities'}
              </h1>
            </div>
            <div className="gold-divider w-full"></div>
          </div>

          {/* Filters - Only show for admin */}
          {isAdmin && (
            <div className="glassmorphic-premium rounded-2xl p-4 sm:p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Employee Filter */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Filter by Employee
                  </label>
                  <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                  >
                    <option value="">All Employees</option>
                    {employeeOptions.map((employee) => (
                      <option key={employee} value={employee}>
                        {employee}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Filter by Date
                  </label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent"
                  />
                </div>
              </div>

              {/* Clear Filters */}
              {(filterEmployee || filterDate) && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setFilterEmployee('');
                      const today = new Date().toISOString().split('T')[0];
                      setFilterDate(today);
                    }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-all duration-200"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Activities Summary */}
          <div className="glassmorphic-premium rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">
                  {isAdmin 
                    ? `Showing ${activities.length} activity${activities.length !== 1 ? 'ies' : ''}${filterEmployee ? ` for ${filterEmployee}` : ''}${filterDate ? ` on ${new Date(filterDate).toLocaleDateString()}` : ''}`
                    : `Showing ${activities.length} of your activity${activities.length !== 1 ? 'ies' : ''}${filterDate ? ` on ${new Date(filterDate).toLocaleDateString()}` : ''}`
                  }
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Updates every 10 seconds
                </p>
              </div>
              {!isAdmin && (
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Filter by Date
                  </label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="input-premium px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Activities Timeline */}
          <div className="glassmorphic-premium rounded-3xl p-6 sm:p-8 md:p-10">
            {loading ? (
              <div className="text-center py-20">
                <div className="text-4xl text-slate-400 mb-4 animate-pulse">⏳</div>
                <p className="text-slate-300">Loading activities...</p>
              </div>
            ) : (
              <ActivityTimeline activities={activities} />
            )}
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}
