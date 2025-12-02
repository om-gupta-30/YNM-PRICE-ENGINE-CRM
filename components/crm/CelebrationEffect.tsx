'use client';

import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

interface CelebrationData {
  quotationId: number;
  accountId?: number;
  accountName?: string;
  closedByEmployeeId: string;
  value?: number;
  timestamp: string;
}

export default function CelebrationEffect() {
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Poll for new "Closed Won" quotations
    const checkForCelebrations = async () => {
      try {
        const username = typeof window !== 'undefined' ? localStorage.getItem('username') || '' : '';
        const isAdmin = typeof window !== 'undefined' ? localStorage.getItem('isAdmin') === 'true' : false;

        // Get recent quotations with Closed Won status
        const params = new URLSearchParams({
          limit: '10',
        });

        const response = await fetch(`/api/quotes?${params}`);
        const result = await response.json();

        if (result.data) {
          // Check for recently closed won quotations (within last 30 seconds)
          const now = Date.now();
          const recentClosedWon = result.data.filter((quote: any) => {
            if (quote.status !== 'closed_won') return false;
            
            // Check if status was recently updated
            const statusHistory = quote.status_history || [];
            if (statusHistory.length === 0) return false;
            
            const lastStatusUpdate = statusHistory[statusHistory.length - 1];
            if (!lastStatusUpdate.updated_at) return false;
            
            const updateTime = new Date(lastStatusUpdate.updated_at).getTime();
            const timeDiff = now - updateTime;
            
            // Only show if updated within last 30 seconds
            return timeDiff < 30000 && timeDiff > 0;
          });

          if (recentClosedWon.length > 0) {
            const latest = recentClosedWon[0];
            const celebrationKey = `celebrated_${latest.id}_${latest.status_history?.length || 0}`;
            
            // Check if we've already celebrated this
            const hasCelebrated = typeof window !== 'undefined' ? sessionStorage.getItem(celebrationKey) : null;
            if (!hasCelebrated) {
              // Get account name if available
              let accountName = latest.customer_name;
              if (latest.account_id) {
                try {
                  const accountRes = await fetch(`/api/accounts/${latest.account_id}`);
                  const accountData = await accountRes.json();
                  if (accountData.data) {
                    accountName = accountData.data.account_name;
                  }
                } catch (err) {
                  // Ignore errors
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

              setShowConfetti(true);
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(celebrationKey, 'true');
              }

              // Hide confetti after 3 seconds
              setTimeout(() => {
                setShowConfetti(false);
              }, 3000);
            }
          }
        }
      } catch (err) {
        console.error('Error checking for celebrations:', err);
      }
    };

    // Check immediately
    checkForCelebrations();

    // Poll every 5 seconds
    const interval = setInterval(checkForCelebrations, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!celebration || !showConfetti) {
    return null;
  }

  return (
    <>
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={200}
        gravity={0.3}
        colors={['#d1a85a', '#74060d', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />
    </>
  );
}

