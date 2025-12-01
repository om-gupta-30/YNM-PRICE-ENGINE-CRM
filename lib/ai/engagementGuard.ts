const TARGET_ACTIVITY_TYPES = new Set(['call', 'note', 'followup', 'quotation', 'task']);

export function shouldAffectEngagement(activityType?: string | null) {
  if (!activityType) return false;
  return TARGET_ACTIVITY_TYPES.has(activityType);
}

