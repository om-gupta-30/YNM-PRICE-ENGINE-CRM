'use client';

import { useState, useEffect } from 'react';

interface Activity {
  id: number;
  lead_id: number;
  activity_type: string;
  description: string;
  metadata: any;
  created_by: string;
  created_at: string;
}

interface LeadActivityTimelineProps {
  leadId: number;
}

export default function LeadActivityTimeline({ leadId }: LeadActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (leadId) {
      fetchActivities();
    }
  }, [leadId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/crm/leads/activities?lead_id=${leadId}`);
      const data = await response.json();
      
      if (data.success && data.activities) {
        setActivities(data.activities);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'note':
        return '📝';
      case 'call':
        return '📞';
      case 'status_change':
        return '🔄';
      case 'follow_up_set':
        return '📅';
      case 'follow_up_completed':
        return '✅';
      case 'employee_reassigned':
        return '👤';
      case 'email_sent':
        return '✉️';
      case 'meeting_scheduled':
        return '🤝';
      default:
        return '📌';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'note':
        return 'border-blue-500';
      case 'call':
        return 'border-green-500';
      case 'status_change':
        return 'border-purple-500';
      case 'follow_up_set':
        return 'border-orange-500';
      case 'follow_up_completed':
        return 'border-green-500';
      case 'employee_reassigned':
        return 'border-yellow-500';
      case 'email_sent':
        return 'border-cyan-500';
      case 'meeting_scheduled':
        return 'border-pink-500';
      default:
        return 'border-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-2xl text-slate-400 mb-2 animate-pulse">⏳</div>
        <p className="text-sm text-slate-400">Loading activities...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl text-slate-400 mb-2">📋</div>
        <p className="text-sm text-slate-400">No activities yet. Start by adding a note or setting a follow-up.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className={`bg-slate-800/50 rounded-lg p-4 border-l-4 ${getActivityColor(activity.activity_type)}`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{getActivityIcon(activity.activity_type)}</span>
              <span className="text-xs font-semibold text-slate-300 capitalize">
                {activity.activity_type.replace('_', ' ')}
              </span>
            </div>
            <span className="text-xs text-slate-400">{formatDate(activity.created_at)}</span>
          </div>
          <p className="text-sm text-slate-200 mb-1">{activity.description}</p>
          <p className="text-xs text-slate-400">by {activity.created_by}</p>
        </div>
      ))}
    </div>
  );
}

