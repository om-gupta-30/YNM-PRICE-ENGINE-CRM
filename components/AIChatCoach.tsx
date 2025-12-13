'use client';

import { useState, useRef, useEffect } from 'react';
import { bringElementIntoView } from '@/lib/utils/bringElementIntoView';

interface AIChatCoachProps {
  isOpen: boolean;
  onClose: () => void;
  user: string;
  role: 'employee' | 'admin';
  context?: {
    subAccountId?: number;
    accountId?: number;
  };
}

type AIMode = 'coach' | 'assistant';

interface QueryResult {
  success: boolean;
  entity: string;
  operation: string;
  raw: any;
  formatted: string;
  count?: number;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  suggestedActions?: string[];
  tone?: 'encouraging' | 'strategic' | 'warning' | 'informational';
  timestamp: Date;
  mode?: 'COACH' | 'QUERY';
  queryResult?: QueryResult;
}

const QUICK_QUESTIONS_COACH = [
  "How can I improve my performance this week?",
  "Which accounts need attention?",
  "What should I focus on today?",
  "Give me tips to close more deals",
  "How do I increase engagement scores?",
];

const QUICK_QUESTIONS_ASSISTANT = [
  "How many contacts does my account have?",
  "Show my follow-ups due today",
  "List all my sub-accounts",
  "What is my pipeline value?",
  "Show recent activities",
];

export default function AIChatCoach({ isOpen, onClose, user, role, context }: AIChatCoachProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState<AIMode>('coach');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to chat window when it opens
  useEffect(() => {
    if (isOpen && chatWindowRef.current) {
      bringElementIntoView(chatWindowRef.current);
    }
  }, [isOpen]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Add welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'ai',
        content: `Hi ${user}! 👋 I'm your AI CRM Assistant powered by Gemini. 

Use the toggle above to switch between modes:
• **Sales Coach** 🎯 — Get coaching advice, strategies, and performance tips
• **CRM Assistant** 📊 — Look up factual data like contacts, follow-ups, quotations

Ask me anything about your CRM!`,
        tone: 'encouraging',
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, user, messages.length]);

  const handleSend = async (question?: string) => {
    const messageText = question || input.trim();
    if (!messageText || loading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          role,
          question: messageText,
          mode: aiMode, // Pass the user-selected mode
          context,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.reply,
        suggestedActions: data.suggestedActions || [],
        tone: data.tone || 'strategic',
        timestamp: new Date(),
        mode: data.mode,
        queryResult: data.queryResult,
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `Sorry, I encountered an error: ${err.message}. Please try again.`,
        tone: 'warning',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getToneStyles = (tone?: string) => {
    switch (tone) {
      case 'encouraging':
        return { bg: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30', icon: '✨' };
      case 'warning':
        return { bg: 'from-orange-500/20 to-red-500/20', border: 'border-orange-500/30', icon: '⚠️' };
      case 'informational':
        return { bg: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/30', icon: '📊' };
      default:
        return { bg: 'from-blue-500/20 to-purple-500/20', border: 'border-blue-500/30', icon: '💡' };
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome-new',
      type: 'ai',
      content: `Chat cleared! How can I help you, ${user}? Currently in ${aiMode === 'coach' ? 'Sales Coach' : 'CRM Assistant'} mode.`,
      tone: 'encouraging',
      timestamp: new Date(),
    }]);
  };

  const handleModeChange = (newMode: AIMode) => {
    setAiMode(newMode);
    // Add a system message about mode change
    setMessages(prev => [...prev, {
      id: `mode-change-${Date.now()}`,
      type: 'ai',
      content: newMode === 'coach' 
        ? '🎯 Switched to **Sales Coach** mode. I\'ll provide coaching advice, strategies, and personalized tips based on your performance data.'
        : '📊 Switched to **CRM Assistant** mode. I\'ll look up factual data from your CRM. Ask me about contacts, accounts, follow-ups, quotations, or activities.',
      tone: 'informational',
      timestamp: new Date(),
    }]);
  };

  // Render query result data
  const renderQueryData = (queryResult: QueryResult) => {
    if (!queryResult || !queryResult.raw) return null;
    
    const { entity, raw, count } = queryResult;
    
    // Render based on entity type
    switch (entity) {
      case 'contacts':
        return renderContactsTable(raw);
      case 'followups':
        return renderFollowupsData(raw);
      case 'subaccounts':
        return renderSubAccountsTable(raw);
      case 'accounts':
        return renderAccountsTable(raw);
      case 'activities':
        return renderActivitiesData(raw);
      case 'quotations':
        return renderQuotationsData(raw);
      case 'leads':
        return renderLeadsTable(raw);
      case 'metrics':
        return renderMetricsCard(raw);
      default:
        return (
          <pre className="text-xs bg-slate-800/50 p-2 rounded-lg overflow-x-auto mt-2">
            {JSON.stringify(raw, null, 2)}
          </pre>
        );
    }
  };

  const renderContactsTable = (data: any) => {
    if (!data?.contacts?.length) return null;
    return (
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-600/50">
              <th className="text-left py-2 px-2 text-slate-400">Name</th>
              <th className="text-left py-2 px-2 text-slate-400">Phone</th>
              <th className="text-left py-2 px-2 text-slate-400">Status</th>
              <th className="text-left py-2 px-2 text-slate-400">Sub-Account</th>
            </tr>
          </thead>
          <tbody>
            {data.contacts.slice(0, 10).map((contact: any, idx: number) => (
              <tr key={idx} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                <td className="py-2 px-2 text-white font-medium">{contact.name}</td>
                <td className="py-2 px-2 text-slate-300">{contact.phone || 'N/A'}</td>
                <td className="py-2 px-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    contact.callStatus === 'Connected' ? 'bg-green-500/20 text-green-300' :
                    contact.callStatus === 'DNP' ? 'bg-red-500/20 text-red-300' :
                    'bg-slate-500/20 text-slate-300'
                  }`}>
                    {contact.callStatus || 'N/A'}
                  </span>
                </td>
                <td className="py-2 px-2 text-slate-300 truncate max-w-[120px]">{contact.subAccount || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.contacts.length > 10 && (
          <p className="text-xs text-slate-400 mt-2">Showing 10 of {data.contacts.length} contacts</p>
        )}
      </div>
    );
  };

  const renderFollowupsData = (data: any) => {
    const { overdue = [], dueToday = [], upcoming = [] } = data;
    
    return (
      <div className="mt-3 space-y-3">
        {overdue.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <h4 className="text-red-300 font-semibold text-sm mb-2">⚠️ Overdue ({overdue.length})</h4>
            {overdue.slice(0, 5).map((f: any, idx: number) => (
              <div key={idx} className="text-xs text-slate-300 py-1">
                {f.contactName} • {f.phone || 'No phone'} • {f.subAccount}
              </div>
            ))}
          </div>
        )}
        {dueToday.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
            <h4 className="text-orange-300 font-semibold text-sm mb-2">📅 Due Today ({dueToday.length})</h4>
            {dueToday.slice(0, 5).map((f: any, idx: number) => (
              <div key={idx} className="text-xs text-slate-300 py-1">
                {f.contactName} • {f.phone || 'No phone'} • {f.subAccount}
              </div>
            ))}
          </div>
        )}
        {upcoming.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <h4 className="text-blue-300 font-semibold text-sm mb-2">📆 Upcoming ({upcoming.length})</h4>
            {upcoming.slice(0, 5).map((f: any, idx: number) => (
              <div key={idx} className="text-xs text-slate-300 py-1">
                {f.contactName} • {f.phone || 'No phone'} • {new Date(f.followUpDate).toLocaleDateString()}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSubAccountsTable = (data: any) => {
    if (!data?.subAccounts?.length) return null;
    return (
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-600/50">
              <th className="text-left py-2 px-2 text-slate-400">Sub-Account</th>
              <th className="text-left py-2 px-2 text-slate-400">Account</th>
              <th className="text-left py-2 px-2 text-slate-400">Engagement</th>
              <th className="text-left py-2 px-2 text-slate-400">Assigned</th>
            </tr>
          </thead>
          <tbody>
            {data.subAccounts.slice(0, 10).map((sa: any, idx: number) => (
              <tr key={idx} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                <td className="py-2 px-2 text-white font-medium">{sa.name}</td>
                <td className="py-2 px-2 text-slate-300 truncate max-w-[100px]">{sa.account || 'N/A'}</td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          sa.engagementScore >= 70 ? 'bg-green-500' :
                          sa.engagementScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${sa.engagementScore || 0}%` }}
                      />
                    </div>
                    <span className="text-slate-300 text-xs">{sa.engagementScore || 0}%</span>
                  </div>
                </td>
                <td className="py-2 px-2 text-slate-300">{sa.assignedEmployee || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.subAccounts.length > 10 && (
          <p className="text-xs text-slate-400 mt-2">Showing 10 of {data.subAccounts.length} sub-accounts</p>
        )}
      </div>
    );
  };

  const renderAccountsTable = (data: any) => {
    if (!data?.accounts?.length) return null;
    return (
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-600/50">
              <th className="text-left py-2 px-2 text-slate-400">Account</th>
              <th className="text-left py-2 px-2 text-slate-400">Stage</th>
              <th className="text-left py-2 px-2 text-slate-400">Tag</th>
              <th className="text-left py-2 px-2 text-slate-400">Engagement</th>
            </tr>
          </thead>
          <tbody>
            {data.accounts.slice(0, 10).map((acc: any, idx: number) => (
              <tr key={idx} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                <td className="py-2 px-2 text-white font-medium">{acc.name}</td>
                <td className="py-2 px-2 text-slate-300">{acc.companyStage || 'N/A'}</td>
                <td className="py-2 px-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-premium-gold/20 text-premium-gold">
                    {acc.companyTag || 'N/A'}
                  </span>
                </td>
                <td className="py-2 px-2 text-slate-300">{acc.engagementScore || 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderActivitiesData = (data: any) => {
    if (!data?.breakdown) return null;
    return (
      <div className="mt-3">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(data.breakdown).map(([type, count]: [string, any]) => (
            <div key={type} className="bg-slate-700/30 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-white">{count}</p>
              <p className="text-xs text-slate-400 capitalize">{type}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">Total: {data.totalActivities || 0} activities</p>
      </div>
    );
  };

  const renderQuotationsData = (data: any) => {
    if (!data) return null;
    return (
      <div className="mt-3">
        <div className="bg-gradient-to-r from-premium-gold/20 to-amber-600/10 rounded-lg p-4 border border-premium-gold/30">
          <p className="text-2xl font-bold text-premium-gold">₹{(data.totalPipelineValue || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-400">Total Pipeline Value • {data.totalQuotations || 0} quotations</p>
        </div>
        {data.statusBreakdown && Object.keys(data.statusBreakdown).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(data.statusBreakdown).map(([status, count]: [string, any]) => (
              <span key={status} className="px-2 py-1 rounded text-xs bg-slate-700/50 text-slate-300">
                {status}: {count}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderLeadsTable = (data: any) => {
    if (!data?.leads?.length) return null;
    return (
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-600/50">
              <th className="text-left py-2 px-2 text-slate-400">Lead</th>
              <th className="text-left py-2 px-2 text-slate-400">Contact</th>
              <th className="text-left py-2 px-2 text-slate-400">Status</th>
              <th className="text-left py-2 px-2 text-slate-400">Source</th>
            </tr>
          </thead>
          <tbody>
            {data.leads.slice(0, 10).map((lead: any, idx: number) => (
              <tr key={idx} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                <td className="py-2 px-2 text-white font-medium">{lead.name}</td>
                <td className="py-2 px-2 text-slate-300">{lead.contactPerson || 'N/A'}</td>
                <td className="py-2 px-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    lead.status === 'Won' ? 'bg-green-500/20 text-green-300' :
                    lead.status === 'Lost' ? 'bg-red-500/20 text-red-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {lead.status || 'New'}
                  </span>
                </td>
                <td className="py-2 px-2 text-slate-300">{lead.source || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMetricsCard = (data: any) => {
    if (!data) return null;
    return (
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/10 rounded-lg p-3 border border-green-500/30">
          <p className="text-xl font-bold text-green-400">{data.averageEngagementScore?.toFixed(1) || 0}%</p>
          <p className="text-xs text-slate-400">Avg Engagement</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/10 rounded-lg p-3 border border-blue-500/30">
          <p className="text-xl font-bold text-blue-400">{data.totalSubAccounts || 0}</p>
          <p className="text-xs text-slate-400">Sub-Accounts</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/10 rounded-lg p-3 border border-purple-500/30">
          <p className="text-xl font-bold text-purple-400">{data.maxEngagementScore || 0}%</p>
          <p className="text-xs text-slate-400">Highest Score</p>
        </div>
        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/10 rounded-lg p-3 border border-orange-500/30">
          <p className="text-xl font-bold text-orange-400">{data.minEngagementScore || 0}%</p>
          <p className="text-xs text-slate-400">Lowest Score</p>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  const quickQuestions = aiMode === 'coach' ? QUICK_QUESTIONS_COACH : QUICK_QUESTIONS_ASSISTANT;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Chat Window */}
      <div 
        ref={chatWindowRef}
        className="fixed right-4 bottom-4 top-4 w-full max-w-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border border-slate-700/50 shadow-2xl z-[9999] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-premium-gold/10 to-amber-600/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-premium-gold to-amber-600 flex items-center justify-center shadow-lg shadow-premium-gold/30">
                <span className="text-2xl">{aiMode === 'coach' ? '🎯' : '📊'}</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">AI CRM Assistant</h2>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-xs text-slate-400">Powered by Gemini AI</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="Clear chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-red-500/50 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex bg-slate-800/80 rounded-xl p-1 border border-slate-700/50">
              <button
                onClick={() => handleModeChange('coach')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                  aiMode === 'coach'
                    ? 'bg-gradient-to-r from-premium-gold to-amber-600 text-white shadow-lg shadow-premium-gold/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>🎯</span>
                <span>Sales Coach</span>
              </button>
              <button
                onClick={() => handleModeChange('assistant')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                  aiMode === 'assistant'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <span>📊</span>
                <span>CRM Q&amp;A</span>
              </button>
            </div>
            
            {/* Role Badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              role === 'admin'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                : 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
            }`}>
              {role === 'admin' ? '👔 Admin' : '👤 Employee'}
            </span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl p-4 ${
                  message.type === 'user'
                    ? 'bg-gradient-to-r from-premium-gold to-amber-600 text-white rounded-br-sm'
                    : `bg-gradient-to-r ${getToneStyles(message.tone).bg} border ${getToneStyles(message.tone).border} text-slate-200 rounded-bl-sm`
                }`}
              >
                {message.type === 'ai' && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getToneStyles(message.tone).icon}</span>
                    <span className="text-xs font-semibold text-slate-400 uppercase">
                      {message.mode === 'QUERY' ? 'CRM Data' : message.tone}
                    </span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

                {/* Query Result Data Display */}
                {message.queryResult && message.queryResult.raw && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    {renderQueryData(message.queryResult)}
                  </div>
                )}

                {/* Suggested Actions */}
                {message.suggestedActions && message.suggestedActions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs font-semibold text-slate-400 mb-2">📋 Suggested Actions:</p>
                    <ul className="space-y-1">
                      {message.suggestedActions.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="text-premium-gold mt-0.5">→</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <p className="text-xs text-slate-500 mt-2">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/50 rounded-2xl rounded-bl-sm p-4 border border-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-premium-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-premium-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-premium-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-slate-400 text-sm">
                    {aiMode === 'assistant' ? 'Looking up CRM data...' : 'AI is thinking...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions */}
        {messages.length <= 2 && !loading && (
          <div className="px-4 pb-2">
            <p className="text-xs text-slate-500 mb-2">Quick questions ({aiMode === 'coach' ? 'Coach' : 'Assistant'}):</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.slice(0, 3).map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-premium-gold/30 rounded-full text-xs text-slate-300 hover:text-white transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={aiMode === 'assistant' 
                  ? "Ask about contacts, accounts, follow-ups..." 
                  : "Ask me anything about your performance..."}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-premium-gold/50 focus:ring-2 focus:ring-premium-gold/20 pr-12"
                rows={1}
                disabled={loading}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <div className="absolute right-2 bottom-2 text-xs text-slate-500">
                ⏎ to send
              </div>
            </div>
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className={`px-4 py-3 font-semibold rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${
                aiMode === 'assistant'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-blue-600 hover:to-cyan-500 text-white shadow-cyan-500/20'
                  : 'bg-gradient-to-r from-premium-gold to-amber-600 hover:from-amber-600 hover:to-premium-gold text-white shadow-premium-gold/20'
              }`}
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
