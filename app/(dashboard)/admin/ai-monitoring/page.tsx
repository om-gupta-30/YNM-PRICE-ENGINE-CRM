'use client';

/**
 * AI Monitoring Dashboard
 * Admin-only page for monitoring AI system health, performance, and accuracy
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
// Using simple HTML elements with Tailwind styling instead of UI components

interface MonitoringData {
  todaySummary: any;
  performanceMetrics: any;
  errorRate: number;
  recentErrors: any[];
  stats: {
    totalQueries: number;
    totalToday: number;
    totalThisWeek: number;
    averageResponseTime: number;
    slowestQueries: any[];
    mostCommonQueries: any[];
    mostCommonIntents: any[];
    userEngagement: any[];
    querySuccessRate: number;
    modeDistribution: { COACH: number; QUERY: number };
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AIMonitoringPage() {
  const router = useRouter();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedMode, setSelectedMode] = useState<string>('all');

  useEffect(() => {
    fetchMonitoringData();
  }, [startDate, endDate, selectedUserId, selectedMode]);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate + 'T23:59:59').toISOString(),
      });

      if (selectedUserId !== 'all') {
        params.append('userId', selectedUserId);
      }
      if (selectedMode !== 'all') {
        params.append('mode', selectedMode);
      }

      const response = await fetch(`/api/admin/ai-monitoring?${params.toString()}`);
      
      if (response.status === 401 || response.status === 403) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch monitoring data');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Error fetching monitoring data:', err);
      setError(err.message || 'Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading monitoring data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-red-800 dark:text-red-200">
              <span>⚠️</span>
              Error Loading Data
            </h3>
          </div>
          <div>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <button
              onClick={fetchMonitoringData}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Prepare chart data
  const dailyTrendData = data.stats.mostCommonIntents.map(intent => ({
    name: intent.category,
    count: intent.count,
  }));

  const modeDistributionData = [
    { name: 'COACH', value: data.stats.modeDistribution.COACH },
    { name: 'QUERY', value: data.stats.modeDistribution.QUERY },
  ];

  const userEngagementData = data.stats.userEngagement.slice(0, 5).map(user => ({
    name: user.userId.substring(0, 8) + '...',
    operations: user.totalOperations,
    queries: user.queries,
    responses: user.responses,
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Monitoring Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor AI system health, performance, and accuracy</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium mb-1">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium mb-1">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label htmlFor="mode" className="block text-sm font-medium mb-1">
              Mode
            </label>
            <select
              id="mode"
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">All Modes</option>
              <option value="COACH">COACH</option>
              <option value="QUERY">QUERY</option>
            </select>
          </div>
          <div>
            <label htmlFor="user" className="block text-sm font-medium mb-1">
              User
            </label>
            <select
              id="user"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">All Users</option>
              {/* Add user list here if needed */}
            </select>
          </div>
        </div>
      </div>

      {/* System Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex flex-row items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Total Queries Today</h3>
            <span>📊</span>
          </div>
          <div className="text-2xl font-bold">{data.stats.totalToday}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {data.stats.totalThisWeek} this week
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex flex-row items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Average Response Time</h3>
            <span>⏱️</span>
          </div>
          <div className="text-2xl font-bold">{data.stats.averageResponseTime}ms</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {data.performanceMetrics?.averageExecutionTime || 0}ms avg
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex flex-row items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Error Rate</h3>
            <span>⚠️</span>
          </div>
          <div className="text-2xl font-bold">{data.errorRate.toFixed(2)}%</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {data.todaySummary?.errors || 0} errors today
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex flex-row items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Query Success Rate</h3>
            <span>✅</span>
          </div>
          <div className="text-2xl font-bold">{data.stats.querySuccessRate.toFixed(1)}%</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {data.stats.totalQueries} total queries
          </p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Most Common Intents */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Most Common Intents</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Top intent categories by frequency</p>
          </div>
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mode Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Mode Distribution</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">COACH vs QUERY mode usage</p>
          </div>
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={modeDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {modeDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User Engagement */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Top Users by Engagement</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Most active users</p>
          </div>
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userEngagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="queries" fill="#8884d8" />
                <Bar dataKey="responses" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Performance Metrics</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Response time percentiles</p>
          </div>
          <div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Average</span>
                <span className="font-bold">{data.performanceMetrics?.averageExecutionTime || 0}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">P50 (Median)</span>
                <span className="font-bold">{data.performanceMetrics?.p50ExecutionTime || 0}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">P95</span>
                <span className="font-bold">{data.performanceMetrics?.p95ExecutionTime || 0}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">P99</span>
                <span className="font-bold">{data.performanceMetrics?.p99ExecutionTime || 0}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Success Rate</span>
                <span className="font-bold">{data.performanceMetrics?.successRate || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Query Performance Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Slowest Queries */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Slowest Queries</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Top 10 queries by execution time</p>
          </div>
          <div>
            <div className="space-y-2">
              {data.stats.slowestQueries.length > 0 ? (
                data.stats.slowestQueries.map((query, index) => (
                  <div key={index} className="border-b pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-mono text-gray-700 truncate">
                          {query.sql}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {query.rowCount} rows • {new Date(query.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <span className="text-sm font-bold text-red-600">
                          {query.executionTime}ms
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No queries found</p>
              )}
            </div>
          </div>
        </div>

        {/* Most Common Queries */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Most Common Queries</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Top 10 questions asked</p>
          </div>
          <div>
            <div className="space-y-2">
              {data.stats.mostCommonQueries.length > 0 ? (
                data.stats.mostCommonQueries.map((query, index) => (
                  <div key={index} className="border-b pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">
                          {query.question}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          First seen: {new Date(query.firstSeen).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <span className="text-sm font-bold">
                          {query.count}x
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No queries found</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      {data.recentErrors && data.recentErrors.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-red-600">⚠️</span>
              Recent Errors
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Last 20 errors</p>
          </div>
          <div>
            <div className="space-y-2">
              {data.recentErrors.map((error: any, index: number) => (
                <div key={index} className="border-l-4 border-red-500 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{error.operation_name || 'Unknown Operation'}</p>
                      <p className="text-xs text-gray-600 mt-1">{error.error_message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(error.created_at).toLocaleString()} • User: {error.user_id}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

