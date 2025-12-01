'use client';

import { useState, useEffect } from 'react';

interface Account {
  id: number;
  accountName: string;
}

interface AccountSelectProps {
  value: number | null;
  onChange: (accountId: number | null, accountName: string) => void;
  required?: boolean;
  employeeUsername: string;
  disabled?: boolean;
}

export default function AccountSelect({ 
  value, 
  onChange, 
  required = false, 
  employeeUsername,
  disabled = false 
}: AccountSelectProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
    }
  }, []);

  useEffect(() => {
    if (employeeUsername) {
      fetchAccounts();
    }
  }, [employeeUsername, isAdmin]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (!isAdmin && employeeUsername) {
        params.append('employee', employeeUsername);
      }
      if (isAdmin) {
        params.append('isAdmin', 'true');
      }
      
      const response = await fetch(`/api/accounts?${params}`);
      const data = await response.json();

      if (data.success) {
        const formattedAccounts = (data.accounts || []).map((acc: any) => ({
          id: acc.id,
          accountName: acc.accountName,
        }));
        setAccounts(formattedAccounts);
      } else {
        throw new Error(data.error || 'Failed to fetch accounts');
      }
    } catch (err: any) {
      console.error('Error fetching accounts:', err);
      setError(err.message || 'Failed to load accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <select
        value={value || ''}
        onChange={(e) => {
          const accountId = e.target.value ? parseInt(e.target.value) : null;
          const selectedAccount = accounts.find(a => a.id === accountId);
          onChange(accountId, selectedAccount?.accountName || '');
        }}
        required={required}
        disabled={loading || disabled}
        className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">
          {loading ? 'Loading accounts...' : 'Select Account'}
        </option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.accountName}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
