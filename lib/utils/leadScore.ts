// Lead Score Calculation Utility
// Temporary logic as specified - will be improved later

import { Lead } from '@/app/crm/leads/page';

export function calculateLeadScore(lead: Lead): number {
  let score = 0;

  // +10 if email exists
  if (lead.email && lead.email.trim() !== '') {
    score += 10;
  }

  // +10 if phone exists
  if (lead.phone && lead.phone.trim() !== '') {
    score += 10;
  }

  // +20 if requirements length > 30
  if (lead.requirements && lead.requirements.length > 30) {
    score += 20;
  }

  // +15 if lead_source is inbound (website / google)
  const inboundSources = ['Website', 'Google', 'Inbound Call'];
  if (lead.lead_source && inboundSources.some(src => lead.lead_source?.toLowerCase().includes(src.toLowerCase()))) {
    score += 15;
  }

  // +20 if status = quotation sent
  if (lead.status === 'Quotation Sent') {
    score += 20;
  }

  // -20 if status = closed lost
  if (lead.status === 'Lost' || lead.status === 'Closed Lost') {
    score -= 20;
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}

export function getLeadScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500/20 text-green-300';
  if (score >= 60) return 'bg-blue-500/20 text-blue-300';
  if (score >= 40) return 'bg-yellow-500/20 text-yellow-300';
  if (score >= 20) return 'bg-orange-500/20 text-orange-300';
  return 'bg-red-500/20 text-red-300';
}

// Get priority badge based on score (High=red, Medium=yellow, Low=green)
export function getScoreBasedPriority(score: number): { label: string; color: string } {
  if (score >= 70) {
    return { label: 'High', color: 'bg-red-500/20 text-red-300 border-red-500/30' };
  } else if (score >= 40) {
    return { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
  } else {
    return { label: 'Low', color: 'bg-green-500/20 text-green-300 border-green-500/30' };
  }
}


