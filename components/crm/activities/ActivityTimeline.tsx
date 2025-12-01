'use client';

import { Activity } from './types';
import ActivityTimelineItem from './ActivityTimelineItem';

interface Props {
  activities: Activity[];
  loading?: boolean;
  onExplain?: (activity: Activity) => void;
}

export default function ActivityTimeline({ activities, loading, onExplain }: Props) {
  if (loading) {
    return (
      <div className="glassmorphic rounded-3xl border border-white/10 p-10 text-center space-y-4">
        <p className="text-white text-lg font-semibold">Loading activities…</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="glassmorphic rounded-3xl border border-white/10 p-10 text-center space-y-4">
        <div className="text-6xl">🧸</div>
        <p className="text-white text-lg font-semibold">Nothing here yet…</p>
        <p className="text-slate-300 text-sm">
          Start by adding your first activity using the button above.
        </p>
      </div>
    );
  }

  return (
    <div className="glassmorphic rounded-3xl border border-white/10 p-8 space-y-6">
      {activities.map((activity, idx) => (
        <ActivityTimelineItem key={`activity-${activity.id}-${activity.created_at}-${idx}`} activity={activity} onExplain={onExplain} />
      ))}
    </div>
  );
}
