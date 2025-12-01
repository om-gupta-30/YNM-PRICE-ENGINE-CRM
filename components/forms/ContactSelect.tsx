'use client';

import { useState, useEffect } from 'react';

interface Contact {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
}

interface ContactSelectProps {
  subAccountId: number | null;
  value: number | null;
  onChange: (contactId: number | null, contactName: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function ContactSelect({
  subAccountId,
  value,
  onChange,
  required = false,
  disabled = false,
}: ContactSelectProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subAccountId) {
      fetchContacts(subAccountId);
    } else {
      setContacts([]);
      if (value) {
        onChange(null, '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAccountId]);

  const fetchContacts = async (subId: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/subaccounts/${subId}/contacts`);
      const data = await response.json();

      if (data.success) {
        const formatted = (data.contacts || []).map((contact: any) => ({
          id: contact.id,
          name: contact.name,
          email: contact.email || null,
          phone: contact.phone || null,
        }));
        setContacts(formatted);
      } else {
        throw new Error(data.error || 'Failed to fetch contacts');
      }
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      setError(err.message || 'Failed to load contacts');
      setContacts([]);
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
          const selectedContact = contacts.find((contact) => contact.id === selectedId);
          onChange(selectedId, selectedContact?.name || '');
        }}
        required={required}
        disabled={disabled || loading || !subAccountId}
        className="input-premium w-full px-4 py-3 text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold focus:border-transparent [&>option]:bg-[#1A103C] [&>option]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">
          {!subAccountId
            ? 'Select an account first'
            : loading
              ? 'Loading contacts...'
              : contacts.length > 0
                ? 'Select Contact'
                : 'No contacts found'}
        </option>
        {contacts.map((contact) => (
          <option key={contact.id} value={contact.id}>
            {contact.name}
            {contact.email ? ` (${contact.email})` : contact.phone ? ` (${contact.phone})` : ''}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}
