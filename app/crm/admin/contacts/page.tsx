'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/ui/Toast';

interface Contact {
  id: number;
  accountId: number;
  accountName: string | null;
  assignedEmployee: string | null;
  subAccountId: number | null;
  subAccountName: string | null;
  stateName: string | null;
  cityName: string | null;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  callStatus: string | null;
  notes: string | null;
  followUpDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filter states
  const [filterAccountId, setFilterAccountId] = useState<number | null>(null);
  const [filterSubAccountId, setFilterSubAccountId] = useState<number | null>(null);
  const [filterCallStatus, setFilterCallStatus] = useState<string>('all');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');

  // Options for filters
  const [accounts, setAccounts] = useState<Array<{ id: number; accountName: string }>>([]);
  const [subAccounts, setSubAccounts] = useState<Array<{ id: number; subAccountName: string; accountId: number }>>([]);
  const [employees, setEmployees] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminStatus = localStorage.getItem('isAdmin') === 'true';
      setIsAdmin(adminStatus);
      if (!adminStatus) {
        router.push('/crm/accounts');
      }
    }
  }, [router]);

  useEffect(() => {
    if (isAdmin) {
      fetchContacts();
      fetchAccounts();
      fetchEmployees();
    }
  }, [isAdmin, filterAccountId, filterSubAccountId, filterCallStatus, filterEmployeeId]);

  useEffect(() => {
    if (filterAccountId) {
      fetchSubAccountsForAccount(filterAccountId);
    } else {
      setSubAccounts([]);
      setFilterSubAccountId(null);
    }
  }, [filterAccountId]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('isAdmin', 'true');
      if (filterAccountId) params.append('account_id', filterAccountId.toString());
      if (filterSubAccountId) params.append('sub_account_id', filterSubAccountId.toString());
      if (filterCallStatus !== 'all') params.append('call_status', filterCallStatus);
      if (filterEmployeeId !== 'all') params.append('employee_id', filterEmployeeId);

      const response = await fetch(`/api/admin/contacts?${params}`);
      const data = await response.json();

      if (data.success) {
        setContacts(data.contacts || []);
      } else {
        throw new Error(data.error || 'Failed to fetch contacts');
      }
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      setToast({ message: error.message || 'Failed to load contacts', type: 'error' });
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts?isAdmin=true');
      const data = await response.json();
      if (data.success) {
        setAccounts((data.accounts || []).map((acc: any) => ({
          id: acc.id,
          accountName: acc.accountName,
        })));
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchSubAccountsForAccount = async (accountId: number) => {
    try {
      const response = await fetch(`/api/subaccounts?account_id=${accountId}`);
      const data = await response.json();
      if (data.success) {
        setSubAccounts((data.subAccounts || []).map((sa: any) => ({
          id: sa.id,
          subAccountName: sa.subAccountName,
          accountId: sa.accountId,
        })));
      }
    } catch (error) {
      console.error('Error fetching sub-accounts:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      const data = await response.json();
      if (data.success && Array.isArray(data.employees)) {
        setEmployees(data.employees.filter((e: string) => e?.toLowerCase() !== 'admin'));
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const uniqueCallStatuses = Array.from(new Set(contacts.map(c => c.callStatus).filter(Boolean))).sort();

  if (!isAdmin) {
    return null;
  }

  return (
      <div className="min-h-screen py-6 sm:py-8 md:py-12 pb-20 sm:pb-24 md:pb-32 relative w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">All Contacts</h1>
            <p className="text-slate-400">View and manage all contacts across all accounts and sub-accounts</p>
          </div>

          {/* Filters */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 mb-6">
            <h2 className="text-lg font-bold text-white mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Account Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Account</label>
                <select
                  value={filterAccountId || ''}
                  onChange={(e) => {
                    setFilterAccountId(e.target.value ? parseInt(e.target.value) : null);
                    setFilterSubAccountId(null);
                  }}
                  className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                >
                  <option value="">All Accounts</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-Account Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Sub-Account</label>
                <select
                  value={filterSubAccountId || ''}
                  onChange={(e) => setFilterSubAccountId(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={!filterAccountId}
                  className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">All Sub-Accounts</option>
                  {subAccounts.map((sa) => (
                    <option key={sa.id} value={sa.id}>
                      {sa.subAccountName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Call Status Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Call Status</label>
                <select
                  value={filterCallStatus}
                  onChange={(e) => setFilterCallStatus(e.target.value)}
                  className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                >
                  <option value="all">All Statuses</option>
                  {uniqueCallStatuses.map((status) => (
                    <option key={status} value={status || ''}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Created By</label>
                <select
                  value={filterEmployeeId}
                  onChange={(e) => setFilterEmployeeId(e.target.value)}
                  className="input-premium w-full px-4 py-2 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white"
                >
                  <option value="all">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp} value={emp}>
                      {emp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterAccountId(null);
                    setFilterSubAccountId(null);
                    setFilterCallStatus('all');
                    setFilterEmployeeId('all');
                  }}
                  className="w-full px-4 py-2 text-sm font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-all duration-200"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Contacts Table */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            {loading ? (
              <div className="text-center py-20">
                <div className="text-4xl text-slate-400 mb-4 animate-pulse">⏳</div>
                <p className="text-slate-300">Loading contacts...</p>
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-4xl text-slate-400 mb-4">👥</div>
                <p className="text-slate-300">No contacts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-[#1A103C]/95 backdrop-blur-sm z-10">
                    <tr className="border-b border-white/20">
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Account</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Sub-Account</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Contact Name</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Designation</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Email</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Phone</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Call Status</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Location</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Created By</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr
                        key={contact.id}
                        className="border-b border-white/10 hover:bg-white/5 transition-all duration-200"
                      >
                        <td className="py-4 px-4 text-slate-200">
                          <div>
                            <div className="font-semibold">{contact.accountName || 'N/A'}</div>
                            {contact.assignedEmployee && (
                              <div className="text-xs text-slate-400">{contact.assignedEmployee}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-200 text-sm">{contact.subAccountName || '—'}</td>
                        <td className="py-4 px-4 text-slate-200 font-semibold">{contact.name}</td>
                        <td className="py-4 px-4 text-slate-200 text-sm">{contact.designation || '—'}</td>
                        <td className="py-4 px-4 text-slate-200 text-sm">{contact.email || '—'}</td>
                        <td className="py-4 px-4 text-slate-200 text-sm">{contact.phone || '—'}</td>
                        <td className="py-4 px-4">
                          {contact.callStatus ? (
                            <span className="px-2 py-1 text-xs font-semibold bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30">
                              {contact.callStatus}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-200 text-sm">
                          {contact.cityName && contact.stateName ? (
                            <span>{contact.cityName}, {contact.stateName}</span>
                          ) : contact.cityName ? (
                            <span>{contact.cityName}</span>
                          ) : contact.stateName ? (
                            <span>{contact.stateName}</span>
                          ) : (
                            <span className="text-slate-500 italic">Not set</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-200 text-sm">{contact.createdBy}</td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => router.push(`/crm/accounts/${contact.accountId}`)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-premium-gold/80 hover:bg-premium-gold rounded-lg transition-all duration-200"
                          >
                            View Account
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
  );
}
