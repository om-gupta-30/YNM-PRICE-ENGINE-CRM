'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Toast from '@/components/ui/Toast';
import ContactForm from '@/components/crm/ContactForm';
import { formatDateIST, formatTimestampIST } from '@/lib/utils/dateFormatters';
import { getCachedSubAccounts, setCachedSubAccounts } from '@/lib/utils/crmCache';

interface Contact {
  id: number;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  callStatus: string | null;
  notes: string | null;
  followUpDate: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SubAccountContactsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subAccountId = params?.id ? parseInt(params.id as string) : null;
  const [highlightedContactId, setHighlightedContactId] = useState<number | null>(null);
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedContactForHistory, setSelectedContactForHistory] = useState<Contact | null>(null);
  const [contactHistory, setContactHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch account_id for sub-account
  const fetchAccountId = async () => {
    if (!subAccountId) return;
    
    try {
      const response = await fetch(`/api/subaccounts/${subAccountId}`);
      const data = await response.json();
      
      if (data.success && data.subAccount) {
        setAccountId(data.subAccount.accountId);
      }
    } catch (error: any) {
      console.error('Error fetching account ID:', error);
    }
  };

  // Fetch contacts for sub-account
  // PERFORMANCE OPTIMIZATION: Check cache first for instant page switching
  const fetchContacts = async () => {
    if (!subAccountId) return;
    
    try {
      // Check cache first (contacts are stored per sub-account)
      const cachedContacts = getCachedSubAccounts(subAccountId);
      
      if (cachedContacts) {
        setContacts(cachedContacts);
        setLoading(false);
        // Still fetch in background to refresh data
        // (but don't show loading state)
      } else {
        setLoading(true);
      }

      const response = await fetch(`/api/subaccounts/${subAccountId}/contacts`);
      const data = await response.json();
      
      if (data.success) {
        setContacts(data.contacts || []);
        // PERFORMANCE OPTIMIZATION: Cache the results
        setCachedSubAccounts(subAccountId, data.contacts || []);
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
    }
  }, []);

  useEffect(() => {
    if (subAccountId) {
      fetchAccountId();
      fetchContacts();
    }
  }, [subAccountId]);

  // Check for contact ID in query params to highlight
  useEffect(() => {
    if (!searchParams) return;
    const contactIdParam = searchParams.get('contact');
    if (contactIdParam) {
      const contactId = parseInt(contactIdParam);
      if (!isNaN(contactId)) {
        setHighlightedContactId(contactId);
        // Remove query param and highlight after 5 seconds
        const timer = setTimeout(() => {
          setHighlightedContactId(null);
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('contact');
          router.replace(newUrl.pathname + newUrl.search, { scroll: false });
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [searchParams, router, subAccountId]);

  // Scroll to highlighted contact when it's loaded
  useEffect(() => {
    if (highlightedContactId && highlightedRowRef.current && !loading) {
      setTimeout(() => {
        highlightedRowRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 500);
    }
  }, [highlightedContactId, loading, contacts]);

  // Handle modal open for create
  const handleOpenModal = () => {
    setEditContact(null);
    setIsModalOpen(true);
  };

  // Handle modal open for edit
  const handleEditContact = (contact: Contact) => {
    setEditContact(contact);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditContact(null);
  };

  // Handle form submit
  const handleSubmit = async (formData: any) => {
    if (!subAccountId) return;

    try {
      setSubmitting(true);
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin';

      // Normalize payload to match API expectations
      const payload: Record<string, any> = {
        name: formData.name,
        designation: formData.designation,
        email: formData.email,
        phone: formData.phone,
        call_status: formData.callStatus || null,
        notes: formData.notes,
        follow_up_date: formData.followUpDate ? formData.followUpDate.toISOString() : null,
        created_by: username,
      };
      if (editContact) {
        payload.contact_id = editContact.id;
      }

      const response = await fetch(`/api/subaccounts/${subAccountId}/contacts`, {
        method: editContact ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save contact');
      }

      setToast({ 
        message: editContact ? 'Contact updated successfully' : 'Contact created successfully', 
        type: 'success' 
      });
      
      // Trigger notification refresh immediately when follow-up date is added/edited
      if (typeof window !== 'undefined' && formData.followUpDate) {
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
      }
      
      handleCloseModal();
      await fetchContacts();
    } catch (error: any) {
      console.error('Error saving contact:', error);
      setToast({ message: error.message || 'Failed to save contact', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle view contact history
  const handleViewHistory = async (contact: Contact) => {
    setSelectedContactForHistory(contact);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    
    try {
      const response = await fetch(`/api/activities?contact_id=${contact.id}&isAdmin=true&limit=100`);
      const data = await response.json();
      
      if (data.success) {
        setContactHistory(data.activities || []);
      } else {
        throw new Error(data.error || 'Failed to fetch contact history');
      }
    } catch (error: any) {
      console.error('Error fetching contact history:', error);
      setToast({ message: error.message || 'Failed to load contact history', type: 'error' });
      setContactHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!subAccountId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-300">Invalid sub-account ID</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-start py-12 pb-32 relative">
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4">
        {/* Header */}
        <div className="w-full flex flex-col items-center mb-10 title-glow fade-up relative">
          <div className="w-full flex items-center justify-between mb-4 relative">
            <button
              onClick={() => {
                // Navigate back to sub-accounts page
                if (accountId) {
                  router.push(`/crm/accounts/${accountId}/sub-accounts`);
                } else {
                  router.back();
                }
              }}
              className="px-4 py-2 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200"
            >
              ← Back
            </button>
            <h1 
              className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-extrabold text-white text-center tracking-tight drop-shadow-md text-neon-gold"
              style={{ 
                textShadow: '0 0 10px rgba(209, 168, 90, 0.3)', /* Reduced for performance */
                letterSpacing: '-0.02em'
              }}
            >
              Contacts
            </h1>
            <button 
              onClick={handleOpenModal}
              disabled={submitting}
              className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base md:text-lg font-bold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-lg sm:rounded-xl transition-all duration-300 shadow-md shadow-premium-gold/30 flex items-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span>+</span>
              <span>Add Contact</span>
            </button>
          </div>
          <div className="gold-divider w-full"></div>
        </div>

        {/* Contacts Table */}
        <div className="glassmorphic-premium rounded-3xl p-8 slide-up card-hover-gold border-2 border-premium-gold/30 shadow-2xl">
          {loading ? (
            <div className="text-center py-20">
              <div className="text-4xl text-slate-400 mb-4 animate-pulse">⏳</div>
              <p className="text-slate-300">Loading contacts...</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl text-slate-400 mb-4">📋</div>
              <p className="text-slate-300">No contacts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar-x -mx-2 sm:mx-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full min-w-[1000px] sm:min-w-0">
                <thead className="sticky top-0 bg-[#1A103C]/95 backdrop-blur-sm z-10">
                  <tr className="border-b border-white/20">
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Contact Name</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Designation</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Phone</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Email</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Call Status</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Follow-Up Date</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Notes</th>
                    <th className="text-left py-4 px-4 text-sm font-bold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr 
                      key={contact.id}
                      ref={highlightedContactId === contact.id ? highlightedRowRef : null}
                      className={`border-b border-white/10 hover:bg-white/5 transition-all duration-200 ${
                        highlightedContactId === contact.id 
                          ? 'bg-gradient-to-r from-premium-gold/40 via-premium-gold/30 to-premium-gold/40 border-4 border-premium-gold shadow-2xl shadow-premium-gold/60 ring-4 ring-premium-gold/50 animate-pulse scale-[1.02] z-10 relative' 
                          : ''
                      }`}
                      style={highlightedContactId === contact.id ? {
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        boxShadow: '0 0 30px rgba(212, 166, 90, 0.8), 0 0 60px rgba(212, 166, 90, 0.4)'
                      } : {}}
                    >
                      <td className="py-4 px-4 text-slate-200 font-semibold">{contact.name}</td>
                      <td className="py-4 px-4 text-slate-200">{contact.designation || '-'}</td>
                      <td className="py-4 px-4 text-slate-200">{contact.phone || '-'}</td>
                      <td className="py-4 px-4 text-slate-200">{contact.email || '-'}</td>
                      <td className="py-4 px-4">
                        {contact.callStatus ? (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-500/20 text-blue-300">
                            {contact.callStatus}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-200">
                        {contact.followUpDate
                          ? formatDateIST(contact.followUpDate)
                          : <span className="text-slate-500 italic">-</span>}
                      </td>
                      <td className="py-4 px-4 text-slate-200 max-w-xs truncate" title={contact.notes || ''}>
                        {contact.notes || '-'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditContact(contact)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-premium-gold/80 hover:bg-premium-gold rounded-lg transition-all duration-200"
                        >
                          ✏️ Edit
                        </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleViewHistory(contact)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-500/80 hover:bg-purple-500 rounded-lg transition-all duration-200"
                            >
                              📜 History
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Contact Form Modal */}
      <ContactForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialData={editContact ? {
          name: editContact.name,
          designation: editContact.designation || '',
          email: editContact.email || '',
          phone: editContact.phone || '',
          callStatus: editContact.callStatus || '',
          notes: editContact.notes || '',
          followUpDate: editContact.followUpDate ? new Date(editContact.followUpDate) : null,
        } : null}
        mode={editContact ? 'edit' : 'create'}
      />

      {/* Contact History Modal */}
      {showHistoryModal && selectedContactForHistory && (
        <div 
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-up overflow-hidden"
          onClick={() => {
            setShowHistoryModal(false);
            setSelectedContactForHistory(null);
            setContactHistory([]);
          }}
        >
          <div 
            className="glassmorphic-premium rounded-3xl max-w-4xl w-full border-2 border-premium-gold/30 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 flex-shrink-0">
              <div>
                <h2 className="text-2xl font-extrabold text-white drop-shadow-lg">
                  Contact History
                </h2>
                <p className="text-slate-300 text-sm mt-1">
                  {selectedContactForHistory.name} - {selectedContactForHistory.email || selectedContactForHistory.phone || 'No contact info'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedContactForHistory(null);
                  setContactHistory([]);
                }}
                className="text-slate-300 hover:text-white text-2xl font-bold transition-colors"
              >
                ×
              </button>
            </div>

            {/* History Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 modal-scrollable">
              {loadingHistory ? (
                <div className="text-center py-20">
                  <div className="text-4xl text-slate-400 mb-4 animate-pulse">⏳</div>
                  <p className="text-slate-300">Loading history...</p>
                </div>
              ) : contactHistory.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-4xl text-slate-400 mb-4">📋</div>
                  <p className="text-slate-300">No history found for this contact</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contactHistory.map((activity: any, idx: number) => {
                    const typeEmoji: Record<string, string> = {
                      call: '📞',
                      note: '📝',
                      followup: '🔁',
                      task: '✔️',
                      email: '✉️',
                      meeting: '📅',
                      quotation: '📄',
                      login: '🔐',
                      logout: '🚪',
                    };
                    const icon = typeEmoji[activity.activity_type] || '✨';
                    const timestampRaw = activity.created_at || activity.createdAt;
                    const formattedTimestamp = timestampRaw ? formatTimestampIST(timestampRaw) : '-';
                    const changes: string[] | null = Array.isArray(activity.metadata?.changes)
                      ? activity.metadata?.changes
                      : null;
                    const hasChanges = !!changes && changes.length > 0;

                    // Clean title: show only the human-readable part, not the raw diff
                    let titleText = activity.description || 'Update';
                    if (hasChanges) {
                      const lower = titleText.toLowerCase();
                      const updatedIdx = lower.indexOf('updated');
                      if (updatedIdx !== -1) {
                        titleText = titleText.slice(0, updatedIdx + 'updated'.length);
                      }
                    }

                    // Make change lines more readable (esp. follow-up date ISO → IST)
                    const prettifyChange = (change: string): string => {
                      if (change.startsWith('Follow-up:')) {
                        return change.replace(/"([^"]+)"/g, (match, iso) => {
                          try {
                            return formatTimestampIST(iso);
                          } catch {
                            return iso;
                          }
                        });
                      }
                      return change;
                    };

                    return (
                      <div key={`contact-history-${activity.id}-${activity.created_at}-${idx}`} className="flex gap-5">
                        <div className="flex flex-col items-center">
                          <span className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xl">
                            {icon}
                          </span>
                          {contactHistory.indexOf(activity) < contactHistory.length - 1 && (
                            <span className="flex-1 w-px bg-white/10"></span>
                          )}
                        </div>
                        <div className="flex-1 glassmorphic rounded-2xl border border-white/10 p-4 hover:border-premium-gold/50 transition">
                          <div className="flex flex-wrap items-center gap-2 mb-2 text-xs uppercase tracking-[0.3em] text-white/60">
                            <span>{activity.activity_type}</span>
                            {formattedTimestamp !== '-' && (
                              <>
                                <span>•</span>
                                <span>{formattedTimestamp}</span>
                              </>
                            )}
                          </div>
                          <p className="text-white text-base font-semibold mb-1">
                            {titleText}
                          </p>
                          {hasChanges ? (
                            <ul className="list-disc list-inside text-slate-200 text-sm space-y-1">
                              {changes.map((change, changeIdx) => (
                                <li key={`change-${activity.id}-${changeIdx}`}>
                                  {prettifyChange(change)}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-slate-300 text-sm">{activity.description}</p>
                          )}
                          <div className="text-slate-300 text-sm space-x-2 flex flex-wrap gap-2 mt-2">
                            {activity.account_name && (
                              <span className="text-white/80">Account: {activity.account_name}</span>
                            )}
                            <span className="text-white/60">By {activity.employee_id}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
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

