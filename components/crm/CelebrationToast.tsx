'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/ui/Toast';

interface CelebrationData {
  quotationId: number;
  accountId?: number;
  accountName?: string;
  closedByEmployeeId: string;
  value?: number;
  timestamp: string;
}

export default function CelebrationToast() {
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Listen for celebration events
    const checkForCelebrations = async () => {
      try {
        const username = typeof window !== 'undefined' ? localStorage.getItem('username') || '' : '';
        const isAdmin = typeof window !== 'undefined' ? localStorage.getItem('isAdmin') === 'true' : false;

        const params = new URLSearchParams({
          limit: '10',
        });

        const response = await fetch(`/api/quotes?${params}`);
        const result = await response.json();

        if (result.data) {
          const now = Date.now();
          const recentClosedWon = result.data.filter((quote: any) => {
            if (quote.status !== 'closed_won') return false;
            
            const statusHistory = quote.status_history || [];
            if (statusHistory.length === 0) return false;
            
            const lastStatusUpdate = statusHistory[statusHistory.length - 1];
            if (!lastStatusUpdate.updated_at) return false;
            
            const updateTime = new Date(lastStatusUpdate.updated_at).getTime();
            const timeDiff = now - updateTime;
            
            return timeDiff < 30000 && timeDiff > 0;
          });

          if (recentClosedWon.length > 0) {
            const latest = recentClosedWon[0];
            const celebrationKey = `toast_celebrated_${latest.id}_${latest.status_history?.length || 0}`;
            
            const hasShownToast = typeof window !== 'undefined' ? sessionStorage.getItem(celebrationKey) : null;
            if (!hasShownToast) {
              let accountName = latest.customer_name;
              if (latest.account_id) {
                try {
                  const accountRes = await fetch(`/api/accounts/${latest.account_id}`);
                  const accountData = await accountRes.json();
                  if (accountData.data) {
                    accountName = accountData.data.account_name;
                  }
                } catch (err) {
                  // Ignore
                }
              }

              setCelebration({
                quotationId: latest.id,
                accountId: latest.account_id,
                accountName: accountName || latest.customer_name,
                closedByEmployeeId: latest.created_by || 'Unknown',
                value: latest.final_total_cost || undefined,
                timestamp: new Date().toISOString(),
              });

              setShowToast(true);
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(celebrationKey, 'true');
              }

              // Hide toast after 5 seconds
              setTimeout(() => {
                setShowToast(false);
                setTimeout(() => setCelebration(null), 300);
              }, 5000);
            }
          }
        }
      } catch (err) {
        console.error('Error checking for celebrations:', err);
      }
    };

    checkForCelebrations();
    const interval = setInterval(checkForCelebrations, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!celebration || !showToast) {
    return null;
  }

  const message = (
    <div className="space-y-1">
      <div className="font-bold text-lg">🎉 Quotation Closed Won! Great job!</div>
      <div className="text-sm">
        <div>Quotation #{celebration.quotationId}</div>
        <div>Account: {celebration.accountName}</div>
        {celebration.value && (
          <div className="text-premium-gold font-semibold">
            Value: ₹{celebration.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        )}
        <div className="text-xs text-slate-300 mt-1">Closed by: {celebration.closedByEmployeeId}</div>
      </div>
    </div>
  );

  return (
    <div className="fixed top-20 right-4 z-[10000] animate-bounce">
      <div className="glassmorphic-premium rounded-xl p-4 border-2 border-premium-gold shadow-2xl max-w-sm">
        {message}
      </div>
    </div>
  );
}

