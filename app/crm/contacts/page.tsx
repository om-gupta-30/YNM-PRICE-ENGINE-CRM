'use client';

import { useRouter } from 'next/navigation';

export default function ContactsPage() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-20 px-4 relative">
      {/* Multi-layered glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-gold/25 rounded-full blur-[100px] opacity-70 -z-0 animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-brand-primary/20 rounded-full blur-[80px] opacity-60 -z-0 animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      {/* Placeholder Content */}
      <div className="glassmorphic-premium rounded-3xl p-12 max-w-2xl w-full relative z-10 text-center">
        <div className="text-4xl text-slate-400 mb-4">📇</div>
        <h2 className="text-2xl font-bold text-white mb-4">Contacts Management</h2>
        <p className="text-slate-300 mb-6">
          To view and manage contacts, please navigate to a specific sub-account:
        </p>
        <p className="text-slate-400 text-sm mb-6">
          Accounts → Select Account → View Sub-Accounts → Select Sub-Account → View Contacts
        </p>
        <button
          onClick={() => router.push('/crm/accounts')}
          className="px-6 py-3 text-lg font-bold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-xl transition-all duration-300 shadow-lg shadow-premium-gold/50 hover:shadow-xl hover:shadow-premium-gold/70"
        >
          Go to Accounts
        </button>
      </div>
    </div>
  );
}
