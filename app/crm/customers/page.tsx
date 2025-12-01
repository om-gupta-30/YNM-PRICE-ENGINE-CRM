'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Customer } from '@/lib/constants/types';
import Toast from '@/components/ui/Toast';
import CRMLayout from '@/components/layout/CRMLayout';

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Filters
  const [filterCity, setFilterCity] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterActive, setFilterActive] = useState<string>('true');
  const [filterAssignedTo, setFilterAssignedTo] = useState('');

  useEffect(() => {
    loadCustomers();
  }, [filterCity, filterCategory, filterActive, filterAssignedTo]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const username = localStorage.getItem('username') || '';
      const isAdmin = localStorage.getItem('isAdmin') === 'true';

      const params = new URLSearchParams({
        employee: username,
        isAdmin: isAdmin.toString(),
      });

      if (filterCity) params.append('city', filterCity);
      if (filterCategory) params.append('category', filterCategory);
      if (filterActive) params.append('active', filterActive);
      if (filterAssignedTo) params.append('assignedTo', filterAssignedTo);

      const response = await fetch(`/api/crm/customers?${params}`);
      const result = await response.json();

      if (result.error) {
        setError(result.error);
      } else {
        setCustomers(result.data || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this customer?')) return;

    try {
      const response = await fetch(`/api/crm/customers/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.error) {
        setToast({ message: result.error, type: 'error' });
      } else {
        setToast({ message: 'Customer deactivated successfully', type: 'success' });
        loadCustomers();
      }
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const uniqueCities = Array.from(new Set(customers.map(c => c.city).filter(Boolean)));

  return (
    <CRMLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glassmorphic-premium rounded-2xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Customer Management</h1>
              <p className="text-slate-300">Manage all your customers and their information</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-accent rounded-lg transition-all"
            >
              + Create Customer
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="glassmorphic-premium rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">City</label>
              <select
                value={filterCity || ''}
                onChange={(e) => setFilterCity(e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
              >
                <option value="">All Cities</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city || ''}>{city || ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
              >
                <option value="">All Categories</option>
                <option value="Contractor">Contractor</option>
                <option value="Government">Government</option>
                <option value="Trader">Trader</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Status</label>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
                <option value="">All</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Assigned To</label>
              <input
                type="text"
                value={filterAssignedTo}
                onChange={(e) => setFilterAssignedTo(e.target.value)}
                placeholder="Employee name"
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Customers Table */}
        {loading ? (
          <div className="text-center py-20">
            <p className="text-slate-300">Loading customers...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-4">
            <p className="text-red-200 text-center">{error}</p>
          </div>
        ) : (
          <div className="glassmorphic-premium rounded-2xl p-6">
            {customers.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-2xl text-slate-300 mb-2">No customers found</p>
                <p className="text-slate-400">Create your first customer to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Name</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Company</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Contact</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">City</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Category</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Assigned To</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Status</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-4 px-4 text-slate-200 font-semibold">{customer.name}</td>
                        <td className="py-4 px-4 text-slate-200">{customer.company_name || '-'}</td>
                        <td className="py-4 px-4 text-slate-200">
                          <div className="text-xs">
                            {customer.phone && <div>{customer.phone}</div>}
                            {customer.email && <div className="text-slate-400">{customer.email}</div>}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-200">{customer.city || '-'}</td>
                        <td className="py-4 px-4 text-slate-200">{customer.category || '-'}</td>
                        <td className="py-4 px-4 text-slate-200">{customer.sales_employee || '-'}</td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            customer.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                            {customer.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => router.push(`/crm/customers/${customer.id}`)}
                              className="px-3 py-1 text-xs font-semibold text-white bg-blue-500/20 hover:bg-blue-500/30 rounded-lg"
                            >
                              View
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowEditModal(true);
                              }}
                              className="px-3 py-1 text-xs font-semibold text-white bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(customer.id)}
                              className="px-3 py-1 text-xs font-semibold text-white bg-red-500/20 hover:bg-red-500/30 rounded-lg"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Customer Modal */}
      {showCreateModal && (
        <CustomerFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadCustomers();
            setToast({ message: 'Customer created successfully', type: 'success' });
          }}
        />
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <CustomerFormModal
          customer={selectedCustomer}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedCustomer(null);
            loadCustomers();
            setToast({ message: 'Customer updated successfully', type: 'success' });
          }}
        />
      )}

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

// Customer Form Modal Component
function CustomerFormModal({ customer, onClose, onSuccess }: { customer?: Customer; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    company_name: customer?.company_name || '',
    contact_person: customer?.contact_person || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    location: customer?.location || '',
    address: customer?.address || '',
    gst_number: customer?.gst_number || '',
    category: customer?.category || '',
    related_products: customer?.related_products || [],
    notes: customer?.notes || '',
    city: customer?.city || '',
  });

  const [saving, setSaving] = useState(false);

  const productOptions = ['W-beam', 'Thrie-beam', 'Double W-beam', 'Signages', 'Thermoplastic Paint'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const username = localStorage.getItem('username') || '';
      const url = customer ? `/api/crm/customers/${customer.id}` : '/api/crm/customers';
      const method = customer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          created_by: username,
          sales_employee: username,
        }),
      });

      const result = await response.json();

      if (result.error) {
        alert(result.error);
      } else {
        onSuccess();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glassmorphic-premium rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {customer ? 'Edit Customer' : 'Create Customer'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Customer Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Company Name</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Contact Person</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">GST Number</label>
              <input
                type="text"
                value={formData.gst_number}
                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
              >
                <option value="">Select Category</option>
                <option value="Contractor">Contractor</option>
                <option value="Government">Government</option>
                <option value="Trader">Trader</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Related Products</label>
            <div className="flex flex-wrap gap-2">
              {productOptions.map(product => (
                <label key={product} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.related_products.includes(product)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, related_products: [...formData.related_products, product] });
                      } else {
                        setFormData({ ...formData, related_products: formData.related_products.filter(p => p !== product) });
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-200">{product}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-semibold text-white bg-slate-600 hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-accent rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : customer ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

