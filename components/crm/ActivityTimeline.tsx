'use client';

import { Activity } from '@/lib/constants/types';

interface ActivityTimelineProps {
  activities: Activity[];
}

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const getActivityIcon = (type: string) => {
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
      default:
        return '📌';
    }
  };

  const getActivityColor = (type: string) => {
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
      default:
        return 'bg-slate-500/20 text-slate-300';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getActivityColor(activity.activity_type)}`}>
              {getActivityIcon(activity.activity_type)}
            </div>
            {idx < activities.length - 1 && (
              <div className="w-0.5 h-full bg-slate-700 mt-2" />
            )}
          </div>

          {/* Activity content */}
          <div className="flex-1 pb-6">
            <div className="glassmorphic-premium rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-white font-semibold">{activity.description}</p>
                  <p className="text-slate-400 text-xs mt-1">
                    By {activity.employee_id}
                  </p>
                </div>
                <span className="text-slate-400 text-xs">
                  {formatDate(activity.created_at)}
                </span>
              </div>
              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div className="mt-2 text-xs text-slate-400">
                  {activity.metadata.call_status && (
                    <span className="px-2 py-1 bg-slate-700/50 rounded mr-2">
                      Status: {activity.metadata.call_status}
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

