 'use client';

import { ChangeEvent, useEffect, useState } from 'react';

interface Props {
  filters: Record<string, string>;
  onChange: (filters: Record<string, string>) => void;
  onClear: () => void;
  isAdmin?: boolean;
}

export default function ActivityFilters({ filters, onChange, onClear, isAdmin = false }: Props) {
  const [employees, setEmployees] = useState<string[]>([]);

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    }
  }, [isAdmin]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/crm/employees');
      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange({ ...filters, [event.target.name]: event.target.value });
  };

  return (
    <div className="glassmorphic rounded-3xl border border-white/10 p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Filters</p>
          <h2 className="text-2xl font-bold text-white">Signal Console</h2>
          <p className="text-slate-300 text-sm">Blend activity type, owners, and time windows to focus the feed.</p>
        </div>
        <button
          onClick={onClear}
          className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition"
        >
          Clear Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-sm">
        <select
          name="type"
          value={filters.type || ''}
          onChange={handleChange}
          className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
        >
          <option value="">Activity Type</option>
          <option value="call">Call</option>
          <option value="note">Note</option>
          <option value="followup">Follow-up</option>
          <option value="task">Task</option>
          <option value="meeting">Meeting</option>
          <option value="quotation">Quotation</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
        </select>

        {isAdmin ? (
          <select
            name="employee"
            value={filters.employee || ''}
            onChange={handleChange}
            className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
          >
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>
        ) : (
        <input
          name="employee"
          value={filters.employee || ''}
          onChange={handleChange}
          placeholder="Employee username"
          className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-premium-gold"
            disabled
        />
        )}

        <input
          name="account_id"
          value={filters.account_id || ''}
          onChange={handleChange}
          placeholder="Account ID"
          className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-premium-gold"
        />

        <input
          name="search"
          value={filters.search || ''}
          onChange={handleChange}
          placeholder="Search description…"
          className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-premium-gold"
        />

        <input
          type="date"
          name="date_from"
          value={filters.date_from || ''}
          onChange={handleChange}
          className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
        />

        <input
          type="date"
          name="date_to"
          value={filters.date_to || ''}
          onChange={handleChange}
          className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
        />
      </div>
    </div>
  );
}
