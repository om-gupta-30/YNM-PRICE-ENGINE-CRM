'use client';

import { useState, useEffect } from 'react';

interface SubAccount {
  id: number;
  subAccountName: string;
  accountId: number;
  accountName?: string | null;
  displayName: string;
}

interface SubAccountSelectProps {
  value: number | null;
  onChange: (subAccountId: number | null, subAccountName: string, displayName?: string) => void;
  required?: boolean;
  employeeUsername: string;
  accountId?: number | null; // Filter by account ID
  disabled?: boolean;
}

export default function SubAccountSelect({ value, onChange, required = false, employeeUsername, accountId = null, disabled = false }: SubAccountSelectProps) {
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employeeUsername && accountId) {
      fetchSubAccounts();
    } else {
      // Clear sub-accounts if no account selected
      setSubAccounts([]);
      setLoading(false);
      if (value) {
        onChange(null, ''); // Clear value when account changes
      }
    }
  }, [employeeUsername, accountId]);

  const fetchSubAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch sub-accounts for the specific account
      const response = await fetch(`/api/subaccounts?account_id=${accountId}`);
      const data = await response.json();

      if (data.success) {
        // Filter to only show sub-accounts for this account
        const filtered = (data.subAccounts || []).filter((sa: SubAccount) => sa.accountId === accountId);
        setSubAccounts(filtered);
      } else {
        throw new Error(data.error || 'Failed to fetch sub-accounts');
      }
    } catch (err: any) {
      console.error('Error fetching sub-accounts:', err);
      setError(err.message || 'Failed to load sub-accounts');
      setSubAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <select
        value={value ?? ''}
        onChange={(e) => {
          const selectedId = e.target.value ? parseInt(e.target.value) : null;
          const selectedSubAccount = subAccounts.find(sa => sa.id === selectedId);
          onChange(
            selectedId,
            selectedSubAccount?.subAccountName || '',
            selectedSubAccount?.displayName || selectedSubAccount?.subAccountName || ''
          );
        }}
        required={required}
        disabled={loading || disabled}
        className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">
          {loading ? 'Loading sub-accounts...' : 'Select Sub-Account'}
        </option>
        {subAccounts.map((subAccount) => (
          <option key={subAccount.id} value={subAccount.id}>
            {subAccount.displayName}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

