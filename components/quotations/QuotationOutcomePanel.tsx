'use client';

import { useState } from 'react';

export type OutcomeStatus = 'pending' | 'won' | 'lost';

interface QuotationOutcomePanelProps {
  currentStatus?: OutcomeStatus;
  currentNotes?: string | null;
  closedAt?: string | null;
  onSave: (status: OutcomeStatus, notes: string) => Promise<void>;
  disabled?: boolean;
}

export default function QuotationOutcomePanel({
  currentStatus = 'pending',
  currentNotes = '',
  closedAt = null,
  onSave,
  disabled = false,
}: QuotationOutcomePanelProps) {
  const [status, setStatus] = useState<OutcomeStatus>(currentStatus);
  const [notes, setNotes] = useState<string>(currentNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await onSave(status, notes);
      setSaveMessage({ type: 'success', text: 'Outcome saved successfully!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error saving outcome:', error);
      setSaveMessage({ type: 'error', text: error.message || 'Failed to save outcome' });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadgeClass = (s: OutcomeStatus) => {
    switch (s) {
      case 'won':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'lost':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'pending':
      default:
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
    }
  };

  const getStatusIcon = (s: OutcomeStatus) => {
    switch (s) {
      case 'won':
        return '✓';
      case 'lost':
        return '✗';
      case 'pending':
      default:
        return '⏳';
    }
  };

  const formatClosedDate = (dateString: string | null) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  };

  const hasChanges = status !== currentStatus || notes !== (currentNotes || '');

  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-slate-700/50 rounded-xl p-6 backdrop-blur-sm shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📊</span>
            <span>Quotation Outcome</span>
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Track the result of this quotation for analytics and learning
          </p>
        </div>
        
        {/* Current Status Badge */}
        <div className={`px-4 py-2 rounded-lg border-2 font-semibold text-sm flex items-center gap-2 ${getStatusBadgeClass(currentStatus)}`}>
          <span className="text-lg">{getStatusIcon(currentStatus)}</span>
          <span className="uppercase">{currentStatus}</span>
        </div>
      </div>

      {/* Closed Date (if applicable) */}
      {closedAt && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
          <p className="text-xs text-slate-400 mb-1">Closed On</p>
          <p className="text-sm text-white font-semibold">{formatClosedDate(closedAt)}</p>
        </div>
      )}

      {/* Status Dropdown */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-slate-200 mb-2">
          Outcome Status <span className="text-red-400">*</span>
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OutcomeStatus)}
          disabled={disabled || isSaving}
          className="w-full px-4 py-3 bg-slate-900/50 border-2 border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <option value="pending">⏳ Pending</option>
          <option value="won">✓ Won</option>
          <option value="lost">✗ Lost</option>
        </select>
        <p className="text-xs text-slate-400 mt-1">
          Select the outcome of this quotation
        </p>
      </div>

      {/* Notes Textarea */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-slate-200 mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={disabled || isSaving}
          placeholder="e.g., Won due to competitive pricing, Lost to competitor X, Client postponed decision..."
          className="w-full px-4 py-3 bg-slate-900/50 border-2 border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[100px] resize-y"
          rows={4}
        />
        <p className="text-xs text-slate-400 mt-1">
          Add context about why this quotation was won or lost
        </p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`mb-4 p-3 rounded-lg border-2 ${
          saveMessage.type === 'success' 
            ? 'bg-green-500/10 border-green-500/50 text-green-300' 
            : 'bg-red-500/10 border-red-500/50 text-red-300'
        }`}>
          <p className="text-sm font-semibold flex items-center gap-2">
            <span>{saveMessage.type === 'success' ? '✓' : '✗'}</span>
            <span>{saveMessage.text}</span>
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400">
          {hasChanges && (
            <span className="text-yellow-400">● Unsaved changes</span>
          )}
        </div>
        
        <button
          onClick={handleSave}
          disabled={disabled || isSaving || !hasChanges}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 font-semibold shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-700"
        >
          {isSaving ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>Save Outcome</span>
            </>
          )}
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-200 flex items-start gap-2">
          <span className="text-lg">💡</span>
          <span>
            <strong>Why track outcomes?</strong> This data helps improve AI pricing suggestions, 
            analyze win rates, identify successful strategies, and generate insights for future quotations.
          </span>
        </p>
      </div>
    </div>
  );
}

