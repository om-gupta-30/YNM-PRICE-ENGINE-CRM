'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Contact {
  id: number;
  name: string;
  designation: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

interface SubAccount {
  id: number;
  sub_account_name: string;
  address: string | null;
  state_id: number | null;
  city_id: number | null;
  pincode: string | null;
  state_name?: string | null;
  city_name?: string | null;
  created_at: string;
  contacts: Contact[];
}

interface Account {
  id: number;
  account_name: string;
  company_stage: string | null;
  company_tag: string | null;
  created_at: string;
  sub_accounts: SubAccount[];
}

interface ImportedData {
  data: Account[];
  totalAccounts: number;
  totalSubAccounts: number;
  totalContacts: number;
}

export default function Database1Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [importedData, setImportedData] = useState<ImportedData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());
  const [expandedSubAccounts, setExpandedSubAccounts] = useState<Set<number>>(new Set());

  const fetchImportedData = async () => {
    try {
      const response = await fetch('/api/admin/import-database1/data');
      const data = await response.json();
      if (data.success) {
        setImportedData(data);
      }
    } catch (error: any) {
      console.error('Error fetching imported data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImportedData();
  }, []);

  const toggleAccount = (accountId: number) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const toggleSubAccount = (subAccountId: number) => {
    const newExpanded = new Set(expandedSubAccounts);
    if (newExpanded.has(subAccountId)) {
      newExpanded.delete(subAccountId);
    } else {
      newExpanded.add(subAccountId);
    }
    setExpandedSubAccounts(newExpanded);
  };

  const filteredAccounts = importedData?.data.filter(account => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      account.account_name.toLowerCase().includes(query) ||
      account.sub_accounts.some(sub => 
        sub.sub_account_name.toLowerCase().includes(query) ||
        sub.contacts.some(contact => 
          contact.name.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.phone?.includes(query)
        )
      )
    );
  }) || [];

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0d1117] to-slate-900"></div>
      </div>

      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-premium-gold hover:text-amber-400 mb-4 flex items-center gap-2"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-white mb-2">Database1.xlsx Data</h1>
            <p className="text-slate-400">
              Automatically imported from database1.xlsx file
            </p>
          </div>

          {/* Data Display Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Imported Data</h2>
                {importedData && (
                  <p className="text-slate-400 text-sm">
                    {importedData.totalAccounts} Accounts • {importedData.totalSubAccounts} Sub-Accounts • {importedData.totalContacts} Contacts
                  </p>
                )}
              </div>
              <button
                onClick={fetchImportedData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm"
              >
                {loading ? '🔄 Loading...' : '🔄 Refresh'}
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search accounts, sub-accounts, or contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-premium-gold"
              />
            </div>

            {/* Data Table */}
            {loading ? (
              <div className="text-center py-8 text-slate-400">Loading data...</div>
            ) : filteredAccounts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                {importedData ? 'No data found matching your search.' : 'No data available. Importing...'}
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {filteredAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="bg-slate-700/30 rounded-lg border border-slate-600/50 overflow-hidden"
                  >
                    {/* Account Header */}
                    <div
                      className="p-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
                      onClick={() => toggleAccount(account.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {account.account_name}
                          </h3>
                          <div className="flex gap-4 text-sm text-slate-400">
                            {account.company_stage && (
                              <span>Stage: {account.company_stage}</span>
                            )}
                            {account.company_tag && (
                              <span>Tag: {account.company_tag}</span>
                            )}
                            <span>{account.sub_accounts.length} Sub-Account{account.sub_accounts.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="text-slate-400">
                          {expandedAccounts.has(account.id) ? '▼' : '▶'}
                        </div>
                      </div>
                    </div>

                    {/* Sub-Accounts */}
                    {expandedAccounts.has(account.id) && (
                      <div className="border-t border-slate-600/50">
                        {account.sub_accounts.map((subAccount) => (
                          <div key={subAccount.id} className="bg-slate-800/30">
                            {/* Sub-Account Header */}
                            <div
                              className="p-3 pl-8 cursor-pointer hover:bg-slate-700/30 transition-colors border-b border-slate-600/30"
                              onClick={() => toggleSubAccount(subAccount.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="text-md font-medium text-premium-gold mb-1">
                                    {subAccount.sub_account_name}
                                  </h4>
                                  <div className="flex gap-4 text-xs text-slate-400">
                                    {subAccount.state_name && (
                                      <span>📍 {subAccount.state_name}</span>
                                    )}
                                    {subAccount.city_name && (
                                      <span>{subAccount.city_name}</span>
                                    )}
                                    {subAccount.pincode && (
                                      <span>PIN: {subAccount.pincode}</span>
                                    )}
                                    <span>{subAccount.contacts.length} Contact{subAccount.contacts.length !== 1 ? 's' : ''}</span>
                                  </div>
                                  {subAccount.address && (
                                    <p className="text-xs text-slate-500 mt-1">{subAccount.address}</p>
                                  )}
                                </div>
                                <div className="text-slate-500">
                                  {expandedSubAccounts.has(subAccount.id) ? '▼' : '▶'}
                                </div>
                              </div>
                            </div>

                            {/* Contacts */}
                            {expandedSubAccounts.has(subAccount.id) && (
                              <div className="bg-slate-900/30">
                                {subAccount.contacts.length === 0 ? (
                                  <div className="p-3 pl-12 text-sm text-slate-500">No contacts</div>
                                ) : (
                                  <div className="divide-y divide-slate-700/50">
                                    {subAccount.contacts.map((contact) => (
                                      <div key={contact.id} className="p-3 pl-12">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-white mb-1">
                                              {contact.name}
                                            </p>
                                            <div className="space-y-1 text-xs text-slate-400">
                                              {contact.designation && (
                                                <p>💼 {contact.designation}</p>
                                              )}
                                              {contact.phone && (
                                                <p>📞 {contact.phone}</p>
                                              )}
                                              {contact.email && (
                                                <p>✉️ {contact.email}</p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
