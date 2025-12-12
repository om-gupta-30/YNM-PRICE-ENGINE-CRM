/**
 * User Profile Engine
 * 
 * Provides role-based user profiles to tailor AI responses.
 * Different roles receive different tones, detail levels, and coaching styles.
 */

interface UserProfile {
  tone: string;
  detailLevel: string;
  coachStyle: string;
}

const DEFAULT_PROFILE: UserProfile = {
  tone: 'professional',
  detailLevel: 'balanced',
  coachStyle: 'suggestive',
};

const roleProfiles: Record<string, UserProfile> = {
  admin: {
    tone: 'authoritative',
    detailLevel: 'overview',
    coachStyle: 'directive',
  },
  employee: {
    tone: 'supportive',
    detailLevel: 'practical',
    coachStyle: 'stepByStep',
  },
};

/**
 * Get user profile based on role
 * 
 * @param role - User role (admin, employee, etc.)
 * @returns User profile with tone, detailLevel, and coachStyle
 */
export function getUserProfile(role: string): UserProfile {
  // Normalize role
  const normalizedRole = role?.toLowerCase().replace(/_/g, '');
  const roleKey = normalizedRole;
  
  const profile = roleProfiles[roleKey] || DEFAULT_PROFILE;
  console.log(`[AI] UserProfileEngine: Role "${role}" → profile`, {
    tone: profile.tone,
    detailLevel: profile.detailLevel,
    coachStyle: profile.coachStyle,
  });
  return profile;
}

/**
 * Get profile description for AI prompts
 * 
 * @param role - User role
 * @returns Formatted profile context string
 */
export function getProfileContext(role: string): string {
  const profile = getUserProfile(role);
  
  return `Tone context:
"You are responding in a ${profile.tone} style."

Detail context:
"Adjust explanation depth to ${profile.detailLevel}."

Coaching style:
"Your guidance pattern should be ${profile.coachStyle}."`;
}

