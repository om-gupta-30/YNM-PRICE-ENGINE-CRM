'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Contact, CallStatus } from '@/lib/constants/types';
import { bringElementIntoView } from '@/lib/utils/bringElementIntoView';

interface ContactFormModalProps {
  accountId?: number;
  subAccountId?: number;
  contact?: Contact;
  subAccounts?: Array<{ id: number; sub_account_name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ContactFormModal({ accountId, subAccountId, contact, subAccounts = [], onClose, onSuccess }: ContactFormModalProps) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bring modal into view when it opens
  useEffect(() => {
    if (modalRef.current) {
      bringElementIntoView(modalRef.current);
    }
  }, []);

  const [formData, setFormData] = useState({
    name: contact?.name || '',
    designation: contact?.designation || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    call_status: contact?.call_status || '' as CallStatus | '',
    notes: contact?.notes || '',
    follow_up_date: contact?.follow_up_date ? new Date(contact.follow_up_date).toISOString().slice(0, 16) : '',
    sub_account_id: subAccountId || (contact as any)?.sub_account_id || (subAccounts.length > 0 ? subAccounts[0].id : null),
  });

  const [saving, setSaving] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const callStatuses: CallStatus[] = [
    'Connected',
    'DNP',
    'ATCBL',
    'Unable to connect',
    'Number doesn\'t exist',
    'Wrong number',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const username = localStorage.getItem('username') || '';
      if (!accountId && !contact) {
        alert('Account ID is required to create a contact');
        setSaving(false);
        return;
      }
      const url = contact ? `/api/contacts/${contact.id}` : `/api/accounts/${accountId}/contacts`;
      const method = contact ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          follow_up_date: formData.follow_up_date || null,
          sub_account_id: formData.sub_account_id || null,
          created_by: username,
          updated_by: username,
        }),
      });

      const result = await response.json();

      if (result.error) {
        alert(result.error);
      } else {
        // Trigger notification refresh immediately when follow-up date is set
        if (typeof window !== 'undefined' && formData.follow_up_date) {
          window.dispatchEvent(new CustomEvent('refreshNotifications'));
        }
        onSuccess();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleATCBL = () => {
    setShowCalendar(true);
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="glassmorphic-premium rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {contact ? 'Edit Contact' : 'Add Contact'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {subAccounts.length > 0 && !contact && (
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Sub-Account *</label>
              <select
                value={formData.sub_account_id || ''}
                onChange={(e) => setFormData({ ...formData, sub_account_id: parseInt(e.target.value) })}
                required
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
              >
                <option value="">Select Sub-Account</option>
                {subAccounts.map((sa) => (
                  <option key={sa.id} value={sa.id}>{sa.sub_account_name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!!contact}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!!contact}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!!contact}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!!contact}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Call Status</label>
              <select
                value={formData.call_status}
                onChange={(e) => {
                  const status = e.target.value as CallStatus;
                  setFormData({ ...formData, call_status: status });
                  if (status === 'ATCBL') {
                    handleATCBL();
                  }
                }}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
              >
                <option value="">Select Status</option>
                {callStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            {formData.call_status === 'ATCBL' && (
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Follow-up Date & Time</label>
                <input
                  type="datetime-local"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg"
                />
                <p className="text-xs text-slate-400 mt-1">
                  <a
                    href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=Follow-up with ${formData.name}&dates=${formData.follow_up_date ? new Date(formData.follow_up_date).toISOString().replace(/[-:]/g, '').split('.')[0] : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-primary hover:underline"
                  >
                    📅 Add to Google Calendar
                  </a>
                </p>
              </div>
            )}
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
              {saving ? 'Saving...' : contact ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

