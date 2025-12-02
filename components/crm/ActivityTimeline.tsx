'use client';

import { Activity } from '@/lib/constants/types';

interface ActivityTimelineProps {
  activities: Activity[];
}

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const getActivityIcon = (type: string, description?: string, metadata?: any) => {
    // Check if this is a notification activity
    if (metadata?.action === 'notification_created' || metadata?.action === 'notification_completed') {
      return '🔔';
    }
    
    // Check if this is an inactivity reason activity
    if (metadata?.type === 'inactivity_reason' || (description && description.includes('Logged back in after auto-logout'))) {
      return '⏸️';
    }
    
    // Check if this is a status change activity
    if (description && description.includes('Status changed')) {
      if (description.includes('online')) return '🟢';
      if (description.includes('away')) return '🟡';
      if (description.includes('logged_out')) return '🔴';
      return '⚪';
    }
    
    switch (type) {
      case 'call':
        return '📞';
      case 'note':
        return '📝';
      case 'followup':
        return '📅';
      case 'quotation':
        return '📄';
      case 'email':
        return '✉️';
      case 'task':
        return '✅';
      case 'meeting':
        return '🤝';
      case 'login':
        return '🔐';
      case 'logout':
        return '🚪';
      default:
        return '📌';
    }
  };

  const getActivityColor = (type: string, description?: string, metadata?: any) => {
    // Check if this is a notification activity
    if (metadata?.action === 'notification_created' || metadata?.action === 'notification_completed') {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
    
    // Check if this is an inactivity reason activity
    if (metadata?.type === 'inactivity_reason' || (description && description.includes('Logged back in after auto-logout'))) {
      return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    }
    
    // Check if this is a status change activity
    if (description && description.includes('Status changed')) {
      const status = metadata?.status;
      if (status === 'online') return 'bg-green-500/20 text-green-300 border-green-500/30';
      if (status === 'away') return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      if (status === 'logged_out') return 'bg-red-500/20 text-red-300 border-red-500/30';
      return 'bg-slate-500/20 text-slate-300';
    }
    
    switch (type) {
      case 'call':
        return 'bg-blue-500/20 text-blue-300';
      case 'note':
        return 'bg-purple-500/20 text-purple-300';
      case 'followup':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'quotation':
        return 'bg-green-500/20 text-green-300';
      case 'email':
        return 'bg-indigo-500/20 text-indigo-300';
      case 'task':
        return 'bg-teal-500/20 text-teal-300';
      case 'meeting':
        return 'bg-pink-500/20 text-pink-300';
      case 'login':
        return 'bg-cyan-500/20 text-cyan-300';
      case 'logout':
        return 'bg-gray-500/20 text-gray-300';
      default:
        return 'bg-slate-500/20 text-slate-300';
    }
  };


  if (activities.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-slate-400">No activities found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, idx) => (
        <div key={activity.id} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border ${getActivityColor(activity.activity_type, activity.description, activity.metadata)}`}>
              {getActivityIcon(activity.activity_type, activity.description, activity.metadata)}
            </div>
            {idx < activities.length - 1 && (
              <div className="w-0.5 h-full bg-slate-700 mt-2" />
            )}
          </div>

          {/* Activity content */}
          <div className="flex-1 pb-6">
            <div className="glassmorphic-premium rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="text-white font-semibold">{activity.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-slate-400 text-xs">
                    By {activity.employee_id}
                  </p>
                  </div>
                </div>
              </div>
              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div className="mt-2 text-xs text-slate-400 flex flex-wrap gap-2">
                  {activity.metadata.status && (
                    <span className={`px-2 py-1 rounded ${
                      activity.metadata.status === 'online' ? 'bg-green-500/20 text-green-300' :
                      activity.metadata.status === 'away' ? 'bg-yellow-500/20 text-yellow-300' :
                      activity.metadata.status === 'logged_out' ? 'bg-red-500/20 text-red-300' :
                      'bg-slate-700/50'
                    }`}>
                      Status: {activity.metadata.status}
                    </span>
                  )}
                  {activity.metadata.type === 'inactivity_reason' && activity.metadata.reason && (
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded border border-orange-500/30">
                      <span className="font-semibold">Inactivity Reason:</span> {activity.metadata.reason}
                    </span>
                  )}
                  {activity.metadata.call_status && (
                    <span className="px-2 py-1 bg-slate-700/50 rounded">
                      Call Status: {activity.metadata.call_status}
                    </span>
                  )}
                  {activity.metadata.reason && activity.metadata.type !== 'inactivity_reason' && (
                    <span className="px-2 py-1 bg-slate-700/50 rounded italic">
                      {activity.metadata.reason}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

