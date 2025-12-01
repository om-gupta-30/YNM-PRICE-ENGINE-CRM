'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Customer, Quote } from '@/lib/constants/types';
import Toast from '@/components/ui/Toast';
import CRMLayout from '@/components/layout/CRMLayout';

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = parseInt(params.id as string);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [quotations, setQuotations] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (customerId) {
      loadCustomer();
      loadQuotations();
    }
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      const response = await fetch(`/api/crm/customers/${customerId}`);
      const result = await response.json();

      if (result.error) {
        setError(result.error);
      } else {
        setCustomer(result.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadQuotations = async () => {
    try {
      // Load quotations from all sections
      const [mbcbRes, signagesRes, paintRes] = await Promise.all([
        fetch('/api/quotes/mbcb'),
        fetch('/api/quotes/signages'),
        fetch('/api/quotes/paint'),
      ]);

      const [mbcbData, signagesData, paintData] = await Promise.all([
        mbcbRes.json(),
        signagesRes.json(),
        paintRes.json(),
      ]);

      const allQuotes: Quote[] = [
        ...(mbcbData.data || []).map((q: any) => ({ ...q, section: 'MBCB' })),
        ...(signagesData.data || []).map((q: any) => ({ ...q, section: 'Signages' })),
        ...(paintData.data || []).map((q: any) => ({ ...q, section: 'Paint' })),
      ];

      // Filter by customer name or customer_id
      const customerQuotes = allQuotes.filter(
        (q) => q.customer_name === customer?.name || q.customer_id === customerId
      );

      setQuotations(customerQuotes);
    } catch (err: any) {
      console.error('Error loading quotations:', err);
    }
  };

  const totalQuotationValue = quotations.reduce((sum, q) => sum + (q.final_total_cost || 0), 0);
  const sentQuotations = quotations.filter(q => q.status === 'sent' || q.status === 'negotiation').length;
  const closedWonQuotations = quotations.filter(q => q.status === 'closed_won').length;

  if (loading) {
    return (
      <CRMLayout>
        <div className="text-center py-20">
          <p className="text-slate-300">Loading customer details...</p>
        </div>
      </CRMLayout>
    );
  }

  if (error || !customer) {
    return (
      <CRMLayout>
        <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-4">
          <p className="text-red-200 text-center">{error || 'Customer not found'}</p>
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glassmorphic-premium rounded-2xl p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <button
                onClick={() => router.push('/crm/customers')}
                className="text-slate-400 hover:text-white mb-4 text-sm"
              >
                ← Back to Customers
              </button>
              <h1 className="text-3xl font-bold text-white mb-2">{customer.name}</h1>
              <p className="text-slate-300">{customer.company_name || 'No company name'}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/crm/customers?edit=${customer.id}`)}
                className="px-4 py-2 text-sm font-semibold text-white bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg"
              >
                Edit
              </button>
              <button
                onClick={() => router.push(`/mbcb/w-beam?customer=${customer.name}`)}
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-accent rounded-lg"
              >
                Create Quotation
              </button>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="glassmorphic-premium rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Contact Information</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-400">Contact Person</p>
                <p className="text-white font-semibold">{customer.contact_person || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400">Phone</p>
                <p className="text-white font-semibold">{customer.phone || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400">Email</p>
                <p className="text-white font-semibold">{customer.email || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400">Location</p>
                <p className="text-white font-semibold">{customer.location || customer.city || '-'}</p>
              </div>
            </div>
          </div>

          <div className="glassmorphic-premium rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Business Information</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-400">Category</p>
                <p className="text-white font-semibold">{customer.category || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400">GST Number</p>
                <p className="text-white font-semibold">{customer.gst_number || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400">Assigned To</p>
                <p className="text-white font-semibold">{customer.sales_employee || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400">Status</p>
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  customer.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {customer.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Address & Notes */}
        {(customer.address || customer.notes) && (
          <div className="glassmorphic-premium rounded-2xl p-6 mb-6">
            {customer.address && (
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white mb-2">Address</h3>
                <p className="text-slate-300 whitespace-pre-wrap">{customer.address}</p>
              </div>
            )}
            {customer.notes && (
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Notes</h3>
                <p className="text-slate-300 whitespace-pre-wrap">{customer.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Quotation Analytics */}
        <div className="glassmorphic-premium rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Quotation Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">Total Quotations</p>
              <p className="text-2xl font-bold text-white">{quotations.length}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">Total Value</p>
              <p className="text-2xl font-bold text-premium-gold">
                ₹{totalQuotationValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">Sent</p>
              <p className="text-2xl font-bold text-blue-300">{sentQuotations}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">Closed Won</p>
              <p className="text-2xl font-bold text-green-300">{closedWonQuotations}</p>
            </div>
          </div>
        </div>

        {/* Quotations List */}
        <div className="glassmorphic-premium rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Quotations</h2>
          {quotations.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-300">No quotations found for this customer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">ID</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Section</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Date</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Amount</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Status</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quote) => (
                    <tr key={quote.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-4 px-4 text-slate-200 font-semibold">{quote.id}</td>
                      <td className="py-4 px-4 text-slate-200">{quote.section}</td>
                      <td className="py-4 px-4 text-slate-200">
                        {quote.date.includes('-') 
                          ? (() => {
                              const [year, month, day] = quote.date.split('-');
                              return `${day}-${month}-${year}`;
                            })()
                          : quote.date}
                      </td>
                      <td className="py-4 px-4 text-premium-gold font-bold">
                        {quote.final_total_cost 
                          ? `₹${quote.final_total_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
                          : '-'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          quote.status === 'closed_won' ? 'bg-green-500/20 text-green-300' :
                          quote.status === 'closed_lost' ? 'bg-red-500/20 text-red-300' :
                          quote.status === 'sent' ? 'bg-blue-500/20 text-blue-300' :
                          quote.status === 'negotiation' ? 'bg-purple-500/20 text-purple-300' :
                          quote.status === 'on_hold' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-slate-500/20 text-slate-300'
                        }`}>
                          {(quote.status || 'draft').toUpperCase().replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => router.push(`/history?quote=${quote.id}`)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-accent rounded-lg"
                        >
                          View
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
    </CRMLayout>
  );
}

