'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ChartData {
  name: string;
  value: number;
}

interface QuotationStatusChartProps {
  accountId?: number;
  employeeUsername?: string;
  isAdmin?: boolean;
}

const COLORS = {
  'Drafted': '#64748b',
  'Sent': '#3b82f6',
  'On Hold': '#f59e0b',
  'In Negotiations': '#8b5cf6',
  'Closed Won': '#10b981',
  'Closed Lost': '#ef4444',
};

export default function QuotationStatusChart({ accountId, employeeUsername, isAdmin }: QuotationStatusChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [accountId, employeeUsername, isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (accountId) params.append('accountId', accountId.toString());
      if (employeeUsername) params.append('employee', employeeUsername);
      if (isAdmin) params.append('isAdmin', 'true');

      const response = await fetch(`/api/quotations/status-summary?${params}`);
      const result = await response.json();

      if (result.data) {
        setData(result.data);
      }
    } catch (err) {
      console.error('Error loading chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Loading chart...</p>
      </div>
    );
  }

  if (data.length === 0 || data.every(d => d.value === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">No quotation data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data as any}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#64748b'} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

