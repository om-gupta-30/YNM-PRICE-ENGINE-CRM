/**
 * RAG Chat Interface Component
 * 
 * A comprehensive AI-powered chatbot interface for querying CRM data using natural language.
 * Supports two modes: COACH (strategic advice) and QUERY (data queries).
 * 
 * Features:
 * - Natural language question processing
 * - Streaming responses for real-time updates
 * - Query suggestions based on user data
 * - Conversation memory for context
 * - SQL query transparency
 * - Data table display with export options
 * - Report generation from query results
 * 
 * @component
 * @example
 * ```tsx
 * <RAGChatInterface
 *   isOpen={isChatOpen}
 *   onClose={() => setIsChatOpen(false)}
 *   userId="user123"
 *   sessionId="session456"
 * />
 * ```
 * 
 * @see {@link https://docs.ynmsafety.com/ai-features} for user documentation
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import DataResultTable from './DataResultTable';

interface RAGChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  sessionId?: string;
  initialMode?: 'COACH' | 'QUERY';
}

type ChatMode = 'COACH' | 'QUERY';

interface IntentPreview {
  intent: {
    category: string;
    tables: string[];
    filters?: Record<string, any>;
    aggregationType?: string;
    timeRange?: any;
  };
  confidence: number;
  explanation: string;
  estimatedComplexity: string;
}

interface QueryExplain {
  sql: string;
  explanation: string;
  affectedTables: string[];
  estimatedRows: number;
  warnings: string[];
}

interface RAGMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  mode: ChatMode;
  confidence?: number;
  data?: any[];
  sql?: string;
  intentPreview?: IntentPreview;
  queryExplain?: QueryExplain;
  sessionId?: string;
}

const QUICK_QUESTIONS_COACH = [
  "How can I improve my performance this week?",
  "Which accounts need attention?",
  "What should I focus on today?",
  "Give me tips to close more deals",
];

const QUICK_QUESTIONS_QUERY = [
  "How many contacts do I have?",
  "Show my follow-ups due today",
  "List all my sub-accounts",
  "What is my pipeline value?",
];

export default function RAGChatInterface({ isOpen, onClose, userId, sessionId, initialMode = 'QUERY' }: RAGChatInterfaceProps) {
  const [messages, setMessages] = useState<RAGMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>(initialMode);
  const [showHistory, setShowHistory] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId);
  const [intentPreview, setIntentPreview] = useState<IntentPreview | null>(null);
  const [explainingQuery, setExplainingQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Update mode when initialMode prop changes
  useEffect(() => {
    if (isOpen && initialMode) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Add welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'ai',
        content: `Hi! 👋 I'm your RAG-powered AI Assistant.

Use the toggle above to switch between modes:
• **Sales Coach** 🎯 — Get coaching advice and strategies
• **Ask Data** 📊 — Query your CRM data with natural language

I'll show you exactly what I understand and what queries I'll run!`,
        timestamp: new Date(),
        mode: initialMode,
      }]);
    }
  }, [isOpen, messages.length, initialMode]);

  // Fetch intent preview when in QUERY mode and user is typing
  const fetchIntentPreview = async (question: string) => {
    if (mode !== 'QUERY' || !question.trim()) {
      setIntentPreview(null);
      return;
    }

    try {
      const res = await fetch('/api/ai/intent-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ question }),
      });

      if (res.ok) {
        const data = await res.json();
        setIntentPreview(data);
      }
    } catch (error) {
      // Silently fail - preview is optional
    }
  };

  // Debounced intent preview
  useEffect(() => {
    if (mode === 'QUERY' && input.trim().length > 5) {
      const timer = setTimeout(() => {
        fetchIntentPreview(input);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIntentPreview(null);
    }
  }, [input, mode, userId]);

  // Load suggestions when chat opens
  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
    }
  }, [isOpen, userId, mode]);

  // Load query suggestions
  const loadSuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      
      // Get recent queries from messages
      const recentQueries = messages
        .filter(m => m.type === 'user')
        .map(m => m.content)
        .slice(-5);

      const res = await fetch('/api/ai/query-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          recentQueries,
          mode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      // Use fallback suggestions
      setSuggestions(getFallbackSuggestions());
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Fallback suggestions
  const getFallbackSuggestions = (): string[] => {
    if (mode === 'COACH') {
      return [
        'How can I improve my performance?',
        'Which accounts need attention?',
        'What should I focus on today?',
        'Give me tips to close more deals',
      ];
    } else {
      return [
        'How many contacts do I have?',
        'Show my follow-ups due today',
        'List all my sub-accounts',
        'What is my pipeline value?',
      ];
    }
  };

  const handleSend = async (question?: string) => {
    const messageText = question || input.trim();
    if (!messageText || loading) return;

    // Add user message
    const userMessage: RAGMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date(),
      mode,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setIntentPreview(null);

    // Check if browser supports EventSource (SSE)
    const supportsSSE = typeof EventSource !== 'undefined';

    if (supportsSSE) {
      // Use streaming
      await handleStreamingResponse(messageText);
    } else {
      // Fallback to regular request
      await handleRegularResponse(messageText);
    }
  };

  const handleStreamingResponse = async (messageText: string) => {
    const aiMessageId = (Date.now() + 1).toString();
    
    try {
      // Create AI message placeholder for streaming
      let aiMessage: RAGMessage = {
        id: aiMessageId,
        type: 'ai',
        content: '',
        timestamp: new Date(),
        mode,
        sessionId: currentSessionId,
      };
      setMessages(prev => [...prev, aiMessage]);

      // Use fetch with ReadableStream for SSE
      const res = await fetch('/api/ai/rag-chat?stream=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message: messageText,
          mode,
          sessionId: currentSessionId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to start streaming' }));
        throw new Error(errorData.error || 'Failed to start streaming');
      }

      if (!res.body) {
        throw new Error('Stream not available');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
            continue;
          }
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            if (!dataStr) continue;
            
            try {
              const data = JSON.parse(dataStr);
              
              // Handle different event types
              if (currentEvent === 'chunk' && data.chunk) {
                // Append chunk to message
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId
                    ? { ...msg, content: msg.content + data.chunk }
                    : msg
                ));
              } else if (currentEvent === 'status' && data.stage) {
                // Status update - could show in UI
                // Optionally update message with status
              } else if (currentEvent === 'mode' && data.mode) {
                // Mode determined
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId
                    ? { ...msg, mode: data.mode }
                    : msg
                ));
              } else if (currentEvent === 'query' && data.sql) {
                // Query built
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId
                    ? { ...msg, sql: data.sql }
                    : msg
                ));
              } else if (currentEvent === 'data' && data.preview) {
                // Data preview
                // Could show preview in UI
              } else if (currentEvent === 'response_end' && data.fullResponse) {
                // Response complete
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId
                    ? { ...msg, content: data.fullResponse }
                    : msg
                ));
              } else if (currentEvent === 'done' && data.answer) {
                // Final response with all metadata
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId
                    ? {
                        ...msg,
                        content: data.answer,
                        confidence: data.confidence,
                        data: data.data,
                        sql: data.sql,
                        sessionId: data.sessionId,
                        mode: data.mode || mode,
                      }
                    : msg
                ));
                if (data.sessionId) {
                  setCurrentSessionId(data.sessionId);
                }
              } else if (currentEvent === 'error') {
                throw new Error(data.message || 'Streaming error');
              }
            } catch (e) {
              // Ignore parse errors for non-JSON data
              if (dataStr && !dataStr.startsWith('{')) {
                continue;
              }
            }
          }
        }
      }

      setLoading(false);
    } catch (err: any) {
      // Remove placeholder message if error
      setMessages(prev => prev.filter(msg => msg.id !== aiMessageId || msg.content !== ''));
      
      const errorMessage: RAGMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `Sorry, I encountered an error: ${err.message}. Falling back to regular mode...`,
        timestamp: new Date(),
        mode,
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Fallback to regular request
      await handleRegularResponse(messageText);
    }
  };

  const handleRegularResponse = async (messageText: string) => {
    try {
      const res = await fetch('/api/ai/rag-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({
          message: messageText,
          mode,
          sessionId: currentSessionId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Update session ID if provided
      if (data.sessionId) {
        setCurrentSessionId(data.sessionId);
      }

      // Add AI response
      const aiMessage: RAGMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.answer,
        timestamp: new Date(),
        mode: data.mode || mode,
        confidence: data.confidence,
        data: data.data,
        sql: data.sql,
        sessionId: data.sessionId,
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: RAGMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `Sorry, I encountered an error: ${err.message}. Please try again.`,
        timestamp: new Date(),
        mode,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleExplainQuery = async (question: string) => {
    if (explainingQuery === question) {
      setExplainingQuery(null);
      return;
    }

    setExplainingQuery(question);
    
    try {
      const res = await fetch('/api/ai/query-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ question }),
      });

      if (res.ok) {
        const explainData = await res.json();
        
        // Find the user message and add explain data to the following AI message
        setMessages(prev => {
          const userMsgIndex = prev.findIndex(m => m.type === 'user' && m.content === question);
          if (userMsgIndex >= 0 && userMsgIndex + 1 < prev.length) {
            const newMessages = [...prev];
            newMessages[userMsgIndex] = { ...newMessages[userMsgIndex], queryExplain: explainData };
            return newMessages;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error explaining query:', error);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value).replace(/"/g, '""');
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = (data: any[], filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome-new',
      type: 'ai',
      content: `Chat cleared! How can I help you? Currently in ${mode === 'COACH' ? 'Sales Coach' : 'Ask Data'} mode.`,
      timestamp: new Date(),
      mode,
    }]);
  };

  const handleModeChange = (newMode: ChatMode) => {
    setMode(newMode);
    setIntentPreview(null);
    setMessages(prev => [...prev, {
      id: `mode-change-${Date.now()}`,
      type: 'ai',
      content: newMode === 'COACH' 
        ? '🎯 Switched to **Sales Coach** mode. I\'ll provide coaching advice and strategies.'
        : '📊 Switched to **Ask Data** mode. I\'ll query your CRM data and show you exactly what I find.',
      timestamp: new Date(),
      mode: newMode,
    }]);
  };

  const renderDataTable = (data: any[]) => {
    if (!data || data.length === 0) return null;

    const headers = Object.keys(data[0]);
    const maxRows = 50; // Limit display to 50 rows
    const displayData = data.slice(0, maxRows);
    const hasMore = data.length > maxRows;

    return (
      <div className="mt-3 overflow-x-auto">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-400">
            {data.length} {data.length === 1 ? 'result' : 'results'}
            {hasMore && ` (showing first ${maxRows})`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => exportToCSV(data, `query-results-${Date.now()}`)}
              className="px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              📥 CSV
            </button>
            <button
              onClick={() => exportToJSON(data, `query-results-${Date.now()}`)}
              className="px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              📥 JSON
            </button>
          </div>
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-600/50">
              {headers.map(header => (
                <th key={header} className="text-left py-2 px-2 text-slate-400 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, idx) => (
              <tr key={idx} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                {headers.map(header => (
                  <td key={header} className="py-2 px-2 text-slate-300">
                    {row[header] !== null && row[header] !== undefined
                      ? typeof row[header] === 'object'
                        ? JSON.stringify(row[header])
                        : String(row[header])
                      : 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {hasMore && (
          <p className="text-xs text-slate-500 mt-2">
            ... and {data.length - maxRows} more rows (export to see all)
          </p>
        )}
      </div>
    );
  };

  const [expandedSQL, setExpandedSQL] = useState<Set<string>>(new Set());

  const renderSQLQuery = (sql: string, messageId: string) => {
    const isExpanded = expandedSQL.has(messageId);

    return (
      <div className="mt-3 pt-3 border-t border-white/10">
        <button
          onClick={() => {
            const newSet = new Set(expandedSQL);
            if (isExpanded) {
              newSet.delete(messageId);
            } else {
              newSet.add(messageId);
            }
            setExpandedSQL(newSet);
          }}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors mb-2"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>{isExpanded ? 'Hide' : 'Show'} SQL Query</span>
        </button>
        {isExpanded && (
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
            <pre className="text-xs text-slate-300 overflow-x-auto font-mono whitespace-pre-wrap">
              {sql}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(sql);
                // Could add toast notification here
              }}
              className="mt-2 px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            >
              📋 Copy SQL
            </button>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  const quickQuestions = mode === 'COACH' ? QUICK_QUESTIONS_COACH : QUICK_QUESTIONS_QUERY;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Chat Window */}
      <div className="fixed right-4 bottom-4 top-4 w-full max-w-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border border-slate-700/50 shadow-2xl z-[9999] flex overflow-hidden">
        {/* Conversation History Panel */}
        {showHistory && (
          <div className="w-64 border-r border-slate-700/50 bg-slate-800/30 flex flex-col">
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Conversation History</h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 rounded hover:bg-slate-700/50 text-slate-400"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages
                .filter(m => m.type === 'user')
                .map((msg, idx) => (
                  <button
                    key={msg.id}
                    onClick={() => {
                      // Could implement message navigation here
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 text-xs text-slate-300 transition-colors"
                  >
                    <p className="truncate">{msg.content}</p>
                    <p className="text-slate-500 text-xs mt-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-premium-gold/10 to-amber-600/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-premium-gold to-amber-600 flex items-center justify-center shadow-lg shadow-premium-gold/30">
                  <span className="text-2xl">{mode === 'COACH' ? '🎯' : '📊'}</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">RAG AI Assistant</h2>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs text-slate-400">Powered by Gemini AI + RAG</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Toggle history"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
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
                  onClick={() => handleModeChange('COACH')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    mode === 'COACH'
                      ? 'bg-gradient-to-r from-premium-gold to-amber-600 text-white shadow-lg shadow-premium-gold/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <span>🎯</span>
                  <span>Sales Coach</span>
                </button>
                <button
                  onClick={() => handleModeChange('QUERY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    mode === 'QUERY'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <span>📊</span>
                  <span>Ask Data</span>
                </button>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Intent Preview (QUERY mode only) */}
            {mode === 'QUERY' && intentPreview && input.trim().length > 5 && (
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🔍</span>
                  <span className="text-xs font-semibold text-cyan-300">Intent Preview</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <p><strong>Category:</strong> {intentPreview.intent.category}</p>
                  <p><strong>Tables:</strong> {intentPreview.intent.tables.join(', ') || 'None'}</p>
                  {intentPreview.intent.aggregationType && (
                    <p><strong>Aggregation:</strong> {intentPreview.intent.aggregationType}</p>
                  )}
                  <p><strong>Confidence:</strong> {(intentPreview.confidence * 100).toFixed(1)}%</p>
                  <p><strong>Complexity:</strong> {intentPreview.estimatedComplexity}</p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-premium-gold to-amber-600 text-white rounded-br-sm'
                      : 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-slate-200 rounded-bl-sm'
                  }`}
                >
                  {message.type === 'ai' && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">📊</span>
                      <span className="text-xs font-semibold text-slate-400 uppercase">
                        {message.mode === 'QUERY' ? 'Data Query' : 'Sales Coach'}
                      </span>
                      {message.confidence !== undefined && (
                        <span className="text-xs text-slate-500">
                          (Confidence: {(message.confidence * 100).toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

                  {/* Data Table Display */}
                  {message.data && message.data.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <DataResultTable
                        data={message.data}
                        title={`Query Results (${message.data.length} rows)`}
                        userId={userId}
                        context={message.content}
                      />
                    </div>
                  )}

                  {/* SQL Query Display */}
                  {message.sql && (
                    renderSQLQuery(message.sql, message.id)
                  )}

                  {/* Query Explain Button (for user messages in QUERY mode) */}
                  {message.type === 'user' && mode === 'QUERY' && (
                    <div className="mt-2">
                      <button
                        onClick={() => handleExplainQuery(message.content)}
                        className="px-3 py-1.5 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <span>💡</span>
                        <span>{message.queryExplain && explainingQuery === message.content ? 'Hide' : 'Explain'} this query</span>
                      </button>
                      {message.queryExplain && explainingQuery === message.content && (
                        <div className="mt-2 bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                          <p className="text-xs text-slate-300 mb-2">
                            <strong>Explanation:</strong> {message.queryExplain.explanation}
                          </p>
                          <p className="text-xs text-slate-400 mb-2">
                            <strong>Affected Tables:</strong> {message.queryExplain.affectedTables.join(', ')}
                          </p>
                          <p className="text-xs text-slate-400 mb-2">
                            <strong>Estimated Rows:</strong> {message.queryExplain.estimatedRows}
                          </p>
                          {message.queryExplain.warnings.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-orange-400 mb-1">⚠️ Warnings:</p>
                              <ul className="text-xs text-slate-400 space-y-1">
                                {message.queryExplain.warnings.map((warning, idx) => (
                                  <li key={idx}>• {warning}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="mt-2">
                            {renderSQLQuery(message.queryExplain.sql, `explain-${message.id}`)}
                          </div>
                        </div>
                      )}
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
                      {mode === 'QUERY' ? 'Querying database...' : 'AI is thinking...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Query Suggestions */}
          {suggestions.length > 0 && messages.length <= 2 && !loading && (
            <div className="px-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">
                  💡 Suggested questions ({mode === 'COACH' ? 'Coach' : 'Query'}):
                </p>
                <button
                  onClick={loadSuggestions}
                  disabled={loadingSuggestions}
                  className="text-xs text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
                  title="Refresh suggestions"
                >
                  {loadingSuggestions ? '⏳' : '🔄'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 6).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(suggestion)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-premium-gold/30 rounded-full text-xs text-slate-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fallback Quick Questions if no suggestions */}
          {suggestions.length === 0 && messages.length <= 2 && !loading && !loadingSuggestions && (
            <div className="px-4 pb-2">
              <p className="text-xs text-slate-500 mb-2">Quick questions ({mode === 'COACH' ? 'Coach' : 'Query'}):</p>
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
                  placeholder={mode === 'QUERY' 
                    ? "Ask about your CRM data (e.g., 'How many contacts do I have?')" 
                    : "Ask me anything about your performance..."}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-premium-gold/50 focus:ring-2 focus:ring-premium-gold/20 pr-12"
                  title={mode === 'QUERY' 
                    ? "Ask questions in natural language. Examples: 'Show my top accounts', 'What activities did I do today?', 'List contacts from Mumbai'" 
                    : "Get strategic coaching advice. Examples: 'How can I improve?', 'What should I focus on?', 'Which accounts need attention?'"}
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
                  mode === 'QUERY'
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
      </div>
    </>
  );
}

