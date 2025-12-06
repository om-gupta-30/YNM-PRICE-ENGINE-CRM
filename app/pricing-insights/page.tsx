'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PricingMetrics {
  avgCompetitorDifference: number;
  avgWinProbability: number;
  aiAcceptedCount: number;
  aiOverrideCount: number;
  totalQuotesWithAI: number;
  totalQuotesWithCompetitor: number;
  pricingTrend: Array<{
    index: number;
    quotedPrice: number;
    aiSuggestedPrice?: number;
    competitorPrice?: number;
    date: string;
  }>;
}

export default function PricingInsightsPage() {
  const [metrics, setMetrics] = useState<PricingMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pricing/insights');
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch pricing insights');
      }

      setMetrics(data.data);
    } catch (err: any) {
      console.error('Error fetching pricing insights:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-white text-xl">Loading pricing insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">❌ {error}</p>
          <button
            onClick={fetchMetrics}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-white text-xl">No data available</p>
      </div>
    );
  }

  const aiAcceptanceRate = metrics.totalQuotesWithAI > 0
    ? ((metrics.aiAcceptedCount / metrics.totalQuotesWithAI) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <span>📊</span>
            <span>Pricing Intelligence Dashboard</span>
          </h1>
          <p className="text-slate-300">AI-powered insights from your quotation data</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Card 1: Competitor Price Difference */}
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 border border-blue-500/30 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-300">Competitor Price Diff</h3>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {metrics.avgCompetitorDifference > 0 ? '+' : ''}
              {metrics.avgCompetitorDifference}%
            </p>
            <p className="text-xs text-slate-400">
              Avg vs {metrics.totalQuotesWithCompetitor} competitor quotes
            </p>
          </div>

          {/* Card 2: Avg Win Probability */}
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 border border-green-500/30 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-green-300">Avg Win Probability</h3>
              <span className="text-2xl">🎯</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {metrics.avgWinProbability}%
            </p>
            <p className="text-xs text-slate-400">
              From {metrics.totalQuotesWithAI} AI suggestions
            </p>
          </div>

          {/* Card 3: AI Accepted */}
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 border border-purple-500/30 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-purple-300">AI Accepted</h3>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {metrics.aiAcceptedCount}
            </p>
            <p className="text-xs text-slate-400">
              {aiAcceptanceRate}% acceptance rate
            </p>
          </div>

          {/* Card 4: AI Overridden */}
          <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/40 border border-orange-500/30 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-orange-300">AI Overridden</h3>
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {metrics.aiOverrideCount}
            </p>
            <p className="text-xs text-slate-400">
              Times users changed AI price
            </p>
          </div>
        </div>

        {/* Pricing Trend Chart */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <span>📈</span>
            <span>Historical Pricing Trend (Last 20 Quotes)</span>
          </h2>

          {metrics.pricingTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={metrics.pricingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => `₹${Number(value).toFixed(2)}`}
                />
                <Legend 
                  wrapperStyle={{ color: '#fff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="quotedPrice" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Quoted Price"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="aiSuggestedPrice" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="AI Suggested"
                  dot={{ fill: '#10b981', r: 4 }}
                  connectNulls
                />
                <Line 
                  type="monotone" 
                  dataKey="competitorPrice" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Competitor Price"
                  dot={{ fill: '#f59e0b', r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg">No pricing data available yet</p>
              <p className="text-slate-500 text-sm mt-2">Create quotations to see trends</p>
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={fetchMetrics}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 font-semibold shadow-lg"
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}

