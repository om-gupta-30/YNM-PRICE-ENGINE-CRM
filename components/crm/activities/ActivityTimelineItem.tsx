'use client';

import { Activity } from './types';
import { formatTimestampIST, formatTimeIST } from '@/lib/utils/dateFormatters';

const typeEmoji: Record<Activity['activity_type'], string> = {
  call: '📞',
  note: '📝',
  followup: '🔁',
  task: '✔️',
  email: '✉️',
  meeting: '📅',
  quotation: '📄',
  login: '🔐',
  logout: '🚪',
  away: '⏸️',
  inactive: '💤',
};

interface Props {
  activity: Activity;
  onExplain?: (activity: Activity) => void;
}

export default function ActivityTimelineItem({ activity, onExplain }: Props) {
  const icon = typeEmoji[activity.activity_type] || '✨';
  const logoutReason = (activity as any).logout_reason;
  const loginTime = (activity as any).login_time;
  const logoutTime = (activity as any).logout_time;

  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <span className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xl">
          {icon}
        </span>
        <span className="flex-1 w-px bg-white/10"></span>
      </div>
      <div className="flex-1 glassmorphic rounded-2xl border border-white/10 p-4 hover:border-premium-gold/50 transition">
        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs uppercase tracking-[0.3em] text-white/60">
          <span>{activity.activity_type}</span>
          <span>•</span>
          <span>{formatTimestampIST(activity.created_at)}</span>
        </div>
        <p className="text-white text-base font-semibold mb-1">{activity.description}</p>
        
        {/* Show login/logout specific details */}
        {activity.activity_type === 'login' && loginTime && (
          <div className="mt-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-xs text-green-300">Login Time: {formatTimeIST(loginTime)}</p>
          </div>
        )}
        
        {activity.activity_type === 'logout' && (
          <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 space-y-1">
            {logoutTime && (
              <p className="text-xs text-red-300">Logout Time: {formatTimeIST(logoutTime)}</p>
            )}
            {logoutReason && (
              <>
                <p className="text-xs text-red-300">Reason: <span className="font-semibold">{logoutReason.reason_tag}</span></p>
                {logoutReason.reason_text && logoutReason.reason_text !== logoutReason.reason_tag && (
                  <p className="text-xs text-red-200/80 mt-1">{logoutReason.reason_text}</p>
                )}
              </>
            )}
          </div>
        )}
        
        {/* Show away/inactive status details */}
        {(activity.activity_type === 'away' || activity.activity_type === 'inactive') && activity.metadata && (
          <div className={`mt-2 p-2 rounded-lg border space-y-1 ${
            activity.activity_type === 'away' 
              ? 'bg-yellow-500/10 border-yellow-500/20' 
              : 'bg-orange-500/10 border-orange-500/20'
          }`}>
            <p className={`text-xs ${
              activity.activity_type === 'away' ? 'text-yellow-300' : 'text-orange-300'
            }`}>
              Status: <span className="font-semibold capitalize">{activity.activity_type}</span>
            </p>
            {activity.metadata.reason && (
              <p className={`text-xs mt-1 ${
                activity.activity_type === 'away' ? 'text-yellow-200/80' : 'text-orange-200/80'
              }`}>
                {activity.metadata.reason}
              </p>
            )}
          </div>
        )}
        
        {/* Show quotation details */}
        {activity.activity_type === 'quotation' && activity.metadata && (
          <div className="mt-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-300">
              Section: {activity.metadata.section || 'N/A'}
              {activity.metadata.final_total_cost && (
                <span className="ml-2">• Amount: ₹{activity.metadata.final_total_cost.toLocaleString('en-IN')}</span>
              )}
            </p>
          </div>
        )}
        
        <div className="text-slate-300 text-sm space-x-2 flex flex-wrap gap-2 mt-2">
          {activity.account_name && <span className="text-white/80">Account: {activity.account_name}</span>}
          {activity.contact_name && <span className="text-white/60">Contact: {activity.contact_name}</span>}
          <span className="text-white/60">By {activity.employee_id}</span>
        </div>
        {onExplain && (
          <div className="mt-3">
            <button
              onClick={() => onExplain(activity)}
              className="px-3 py-1.5 text-xs font-semibold rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition"
            >
              Explain with AI
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
