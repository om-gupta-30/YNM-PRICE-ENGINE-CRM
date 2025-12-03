'use client';

import { useState, useEffect } from 'react';

interface CustomerSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function CustomerSelect({
  value,
  onChange,
  placeholder = 'Select customer',
  className = '',
  disabled = false,
}: CustomerSelectProps) {
  const [customers, setCustomers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch customers for current sales employee
  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      
      if (typeof window !== 'undefined') {
        const username = localStorage.getItem('username') || '';
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        
        // Determine sales employee
        // Admin sees all customers, employees see their own
        let salesEmployee = 'Admin';
        if (username.startsWith('Sales_')) {
          salesEmployee = username;
        } else if (username === 'Admin') {
          salesEmployee = 'Admin';
        }
        
        const url = `/api/meta/customers?t=${Date.now()}&salesEmployee=${encodeURIComponent(salesEmployee)}&isAdmin=${isAdmin}`;
        
        const response = await fetch(url);
        if (response.ok) {
          const result = await response.json();
          if (result.data && Array.isArray(result.data)) {
            setCustomers(result.data);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <div className={`relative ${className}`}>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || isLoading}
        className="input-premium w-full px-4 py-3 text-white placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
        required
      >
        <option value="">{isLoading ? 'Loading customers...' : placeholder}</option>
        {customers.map((customer) => (
          <option key={customer} value={customer} className="bg-slate-800 text-white">
            {customer}
          </option>
        ))}
      </select>
    </div>
  );
}

