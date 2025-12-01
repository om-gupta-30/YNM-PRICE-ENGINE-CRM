'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { shouldDisableAnimations } from '@/lib/utils/performanceUtils';

// Dynamic import for Recharts to reduce initial bundle size
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });

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
  const [isVisible, setIsVisible] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Lazy load chart only when visible (IntersectionObserver)
  useEffect(() => {
    if (!chartRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      loadData();
    }
  }, [accountId, employeeUsername, isAdmin, isVisible]);

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

  if (!isVisible) {
    return (
      <div ref={chartRef} className="flex items-center justify-center h-64">
        <p className="text-slate-400">Loading chart...</p>
      </div>
    );
  }

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
    <div ref={chartRef} className="w-full h-64">
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
            isAnimationActive={!shouldDisableAnimations()} // Disable animation on low-power devices
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

