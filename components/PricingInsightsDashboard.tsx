'use client';

import { useState, useEffect } from 'react';
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

interface PricingInsightsDashboard {
  overallAccuracy: {
    aiAccuracy: number;
    overrideAccuracy: number;
    totalQuotesAnalyzed: number;
    quotesWithAI: number;
    quotesWithoutAI: number;
  };
  winRateByPriceRange: Array<{
    range: string;
    winRate: number;
    quoteCount: number;
    averagePrice: number;
  }>;
  averageMarginByProduct: Array<{
    productType: string;
    averageMargin: number;
    quoteCount: number;
    optimalMargin: number;
  }>;
  competitorAnalysis: {
    winsWhenAboveCompetitor: number;
    winsWhenBelowCompetitor: number;
    winsWhenAtCompetitor: number;
    averagePriceDifference: number;
  };
  pricingTrends: Array<{
    period: string;
    averagePrice: number;
    winRate: number;
    averageMargin: number;
    quoteCount: number;
  }>;
  mostProfitableCategories: Array<{
    category: string;
    averageMargin: number;
    totalRevenue: number;
    winRate: number;
    quoteCount: number;
  }>;
  cached: boolean;
  cacheTimestamp: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function PricingInsightsDashboard() {
  const [data, setData] = useState<PricingInsightsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [productType, setProductType] = useState<'mbcb' | 'signages' | 'paint' | ''>('');
  const [timeRange, setTimeRange] = useState<string>('90');
  const [clientId, setClientId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [productType, timeRange, clientId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (productType) params.append('productType', productType);
      if (timeRange) params.append('timeRange', timeRange);
      if (clientId) params.append('clientId', clientId);

      const response = await fetch(`/api/pricing/insights-dashboard?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch pricing insights');
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err: any) {
      console.error('Error fetching pricing insights:', err);
      setError(err.message || 'An error occurred while loading insights');
    } finally {
      setLoading(false);
    }
  };

  // Calculate key metrics
  const overallWinRate = data?.pricingTrends.length
    ? data.pricingTrends.reduce((sum, t) => sum + t.winRate, 0) / data.pricingTrends.length
    : 0;

  const bestCategory = data?.mostProfitableCategories.length
    ? data.mostProfitableCategories.reduce((best, cat) =>
        cat.averageMargin > best.averageMargin ? cat : best
      )
    : null;

  const totalMarginImprovement = data?.averageMarginByProduct.length
    ? data.averageMarginByProduct.reduce((sum, p) => sum + (p.optimalMargin - p.averageMargin), 0)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-white text-xl">Loading pricing insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-xl mb-4">❌ {error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <p className="text-white text-xl">No data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <span>📊</span>
            <span>Pricing Insights Dashboard</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base">AI-powered insights from your quotation data</p>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Product Type Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Product Type</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as any)}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-premium-gold/50 focus:ring-2 focus:ring-premium-gold/20"
              >
                <option value="">All Products</option>
                <option value="mbcb">MBCB</option>
                <option value="signages">Signages</option>
                <option value="paint">Paint</option>
              </select>
            </div>

            {/* Time Range Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-premium-gold/50 focus:ring-2 focus:ring-premium-gold/20"
              >
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="180">Last 180 Days</option>
                <option value="365">Last Year</option>
              </select>
            </div>

            {/* Client Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Filter by client ID..."
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-premium-gold/50 focus:ring-2 focus:ring-premium-gold/20"
              />
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Overall AI Accuracy */}
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 border border-blue-500/30 rounded-xl p-4 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-blue-300">AI Accuracy</h3>
              <span className="text-xl sm:text-2xl">🎯</span>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-white mb-1">
              {data.overallAccuracy.aiAccuracy.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400">
              {data.overallAccuracy.quotesWithAI} quotes analyzed
            </p>
          </div>

          {/* Average Win Rate */}
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 border border-green-500/30 rounded-xl p-4 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-green-300">Avg Win Rate</h3>
              <span className="text-xl sm:text-2xl">📈</span>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-white mb-1">
              {overallWinRate.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400">
              Across all products
            </p>
          </div>

          {/* Best Performing Category */}
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 border border-purple-500/30 rounded-xl p-4 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-purple-300">Best Category</h3>
              <span className="text-xl sm:text-2xl">⭐</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {bestCategory?.category || 'N/A'}
            </p>
            <p className="text-xs text-slate-400">
              {bestCategory ? `${bestCategory.averageMargin.toFixed(1)}% margin` : 'No data'}
            </p>
          </div>

          {/* Total Margin Improvement */}
          <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/40 border border-orange-500/30 rounded-xl p-4 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-orange-300">Margin Potential</h3>
              <span className="text-xl sm:text-2xl">💰</span>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-white mb-1">
              +{totalMarginImprovement.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400">
              Improvement opportunity
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Win Rate by Price Range - Bar Chart */}
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 rounded-xl p-4 sm:p-6 backdrop-blur-sm">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
              <span>📊</span>
              <span>Win Rate by Price Range</span>
            </h2>
            {data.winRateByPriceRange.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.winRateByPriceRange}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="range"
                    stroke="#94a3b8"
                    style={{ fontSize: '11px' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    style={{ fontSize: '11px' }}
                    label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                  />
                  <Bar dataKey="winRate" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {data.winRateByPriceRange.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400">No data available</p>
              </div>
            )}
          </div>

          {/* Margin Distribution - Pie Chart */}
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 rounded-xl p-4 sm:p-6 backdrop-blur-sm">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
              <span>🥧</span>
              <span>Margin Distribution by Product</span>
            </h2>
            {data.averageMarginByProduct.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.averageMarginByProduct}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="averageMargin"
                  >
                    {data.averageMarginByProduct.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400">No data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Trends - Line Chart */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 rounded-xl p-4 sm:p-6 backdrop-blur-sm mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
            <span>📈</span>
            <span>Pricing Trends Over Time</span>
          </h2>
          {data.pricingTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data.pricingTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="period"
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Rate (%)', angle: 90, position: 'insideRight', fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'averagePrice') return `₹${Number(value).toFixed(2)}`;
                    return `${Number(value).toFixed(1)}%`;
                  }}
                />
                <Legend wrapperStyle={{ color: '#fff' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="averagePrice"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Avg Price"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="winRate"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Win Rate"
                  dot={{ fill: '#10b981', r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="averageMargin"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Avg Margin"
                  dot={{ fill: '#f59e0b', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400">No pricing trend data available</p>
            </div>
          )}
        </div>

        {/* AI Accuracy Over Time - Line Chart */}
        {data.pricingTrends.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 rounded-xl p-4 sm:p-6 backdrop-blur-sm mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
              <span>🤖</span>
              <span>AI Accuracy Over Time</span>
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.pricingTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="period"
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                />
                <Legend wrapperStyle={{ color: '#fff' }} />
                <Line
                  type="monotone"
                  dataKey="winRate"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Win Rate"
                  dot={{ fill: '#8b5cf6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Refresh Button */}
        <div className="text-center">
          <button
            onClick={fetchData}
            className="px-6 sm:px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 font-semibold shadow-lg"
          >
            🔄 Refresh Data
          </button>
          {data.cached && (
            <p className="text-xs text-slate-400 mt-2">
              Cached data • Last updated: {new Date(data.cacheTimestamp).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

