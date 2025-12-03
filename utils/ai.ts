import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
const MAX_TOKENS = 600;

let anthropicClient: Anthropic | null = null;

function getAnthropicClient() {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Missing ANTHROPIC_API_KEY env for AI utilities');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

export async function runClaude<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: DEFAULT_MODEL as any,
    max_tokens: MAX_TOKENS,
    temperature: 0.2,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const fullText = response.content
    .map(part => (part.type === 'text' ? part.text : ''))
    .join('')
    .trim();

  try {
    return JSON.parse(fullText) as T;
  } catch {
    throw new Error(`Anthropic response was not valid JSON: ${fullText}`);
  }
}

export interface EngagementInsightResult {
  engagementScore: number;
  tips: string[];
}

// TODO: will implement new AI-based engagement insights later (v2).
export async function generateEngagementInsights(accountData: any): Promise<EngagementInsightResult> {
  throw new Error('generateEngagementInsights v1 removed, will be replaced with v2');
  // Old implementation commented out:
  // const system = 'You are an assistant helping evaluate customer engagement.';
  // const user = `
  // Given this account data:
  // ${JSON.stringify(accountData, null, 2)}
  //
  // Return JSON: { "engagementScore": number (0-100), "tips": [string, string] }
  //   `.trim();
  //
  // const raw = await runClaude<EngagementInsightResult>(system, user);
  // return {
  //   engagementScore: Number(raw.engagementScore ?? 0),
  //   tips: Array.isArray(raw.tips) ? raw.tips.slice(0, 2) : [],
  // };
}

export interface EngagementScoreUpdateResult extends EngagementInsightResult {}

// TODO: will implement new AI-based engagement score update later (v2).
export async function updateEngagementScoreAI(accountData: any, recentActivities: any[]): Promise<EngagementScoreUpdateResult> {
  throw new Error('updateEngagementScoreAI v1 removed, will be replaced with v2');
  // Old implementation commented out:
  // const system = 'You are an assistant helping evaluate customer engagement.';
  // const user = `
  // Account profile:
  // ${JSON.stringify(accountData, null, 2)}
  //
  // Recent activities (30 days):
  // ${JSON.stringify(recentActivities, null, 2)}
  //
  // Respond with JSON { "engagementScore": number between 0-100, "tips": [two short suggestions] }.
  //   `.trim();
  //
  // const raw = await runClaude<EngagementScoreUpdateResult>(system, user);
  // return {
  //   engagementScore: Number(raw.engagementScore ?? accountData?.engagement_score ?? 0),
  //   tips: Array.isArray(raw.tips) ? raw.tips.slice(0, 2) : [],
  // };
}

export interface DailySummaryResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestedGoals: string[];
  metrics: {
    calls: number;
    tasks: number;
    leads: number;
    quotations: number;
    followUps: number;
  };
}

// TODO: will implement new AI-based daily employee summary later (v2).
export async function generateDailyEmployeeSummary(activityLog: any[]): Promise<DailySummaryResult> {
  throw new Error('generateDailyEmployeeSummary v1 removed, will be replaced with v2');
  // Old implementation commented out:
  // const system = 'You are an assistant summarizing CRM activity for a salesperson.';
  // const user = `
  // Yesterday's activity log:
  // ${JSON.stringify(activityLog, null, 2)}
  //
  // Return JSON with:
  // {
  //   "summary": string,
  //   "strengths": [string],
  //   "weaknesses": [string],
  //   "suggestedGoals": [string],
  //   "metrics": { "calls": number, "tasks": number, "leads": number, "quotations": number, "followUps": number }
  // }
  //   `.trim();
  //
  // return runClaude<DailySummaryResult>(system, user);
}

export interface AdminInsightsResult {
  mostActive: string;
  leastActive: string;
  topCloser: string;
  needsAttention: string;
  suggestions: string[];
}

// TODO: will implement new AI-based admin employee insights later (v2).
export async function generateAdminEmployeeInsights(allEmployeesActivity: any[]): Promise<AdminInsightsResult> {
  throw new Error('generateAdminEmployeeInsights v1 removed, will be replaced with v2');
  // Old implementation commented out:
  // const system = 'You are an assistant helping a sales director understand their team.';
  // const user = `
  // Employee activity dataset:
  // ${JSON.stringify(allEmployeesActivity, null, 2)}
  //
  // Return JSON:
  // {
  //   "mostActive": string,
  //   "leastActive": string,
  //   "topCloser": string,
  //   "needsAttention": string,
  //   "suggestions": [string, string]
  // }
  //   `.trim();
  //
  // return runClaude<AdminInsightsResult>(system, user);
}

export interface ActivityExplanation {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  suggestedAction: string;
}

// TODO: will implement new AI-based activity explanation later (v2).
export async function explainActivity(activity: any): Promise<ActivityExplanation> {
  throw new Error('explainActivity v1 removed, will be replaced with v2');
  // Old implementation commented out:
  // const system = 'You explain CRM timeline entries in friendly, simple language.';
  // const user = `
  // Activity details:
  // ${JSON.stringify(activity, null, 2)}
  //
  // Return JSON:
  // {
  //   "summary": "short explanation in 1-2 sentences",
  //   "sentiment": "positive | neutral | negative",
  //   "suggestedAction": "one practical follow-up suggestion"
  // }
  //   `.trim();
  //
  // return runClaude<ActivityExplanation>(system, user);
}

// ============================================
// V2 AI: Sub-account Engagement Scoring
// ============================================

export type SubaccountAIInsights = {
  score: number;     // 0–100
  tips: string[];    // improvement suggestions
  comment: string;   // short explanation
};

export async function calculateSubaccountAIInsights(input: {
  subaccountName: string;
  accountName: string;
  assignedEmployee?: string | null;
  currentScore: number;
  activities: {
    activity_type: string;
    created_at: string;
    description?: string | null;
  }[];
}): Promise<SubaccountAIInsights> {
  try {
    // Build system prompt
    const systemPrompt = `You are a CRM engagement analyst. Given a sub-account name, parent account, existing score, and recent activities, output a JSON object with score (0-100), tips array (2-3 actionable suggestions), and comment (short explanation of the score).`;

    // Summarize activities with age
    const now = new Date();
    const activitySummary = input.activities.map(activity => {
      const activityDate = new Date(activity.created_at);
      const daysAgo = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        type: activity.activity_type,
        age: daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`,
        description: activity.description || null,
      };
    });

    // Build user prompt
    const userPrompt = `
Sub-account: ${input.subaccountName}
Parent Account: ${input.accountName}
Assigned Employee: ${input.assignedEmployee || 'Not assigned'}
Current Engagement Score: ${input.currentScore}

Recent Activities (${input.activities.length} total):
${JSON.stringify(activitySummary, null, 2)}

Analyze the engagement level and return JSON:
{
  "score": <number 0-100>,
  "tips": ["<actionable suggestion 1>", "<actionable suggestion 2>", "<optional suggestion 3>"],
  "comment": "<short explanation of why this score>"
}
  `.trim();

    // Call Claude
    const raw = await runClaude<SubaccountAIInsights>(systemPrompt, userPrompt);

    // Validate and sanitize response
    const score = Math.max(0, Math.min(100, Number(raw.score ?? input.currentScore)));
    const tips = Array.isArray(raw.tips) && raw.tips.length > 0
      ? raw.tips.filter((tip): tip is string => typeof tip === 'string').slice(0, 3)
      : ['Increase followups', 'Schedule calls'];
    const comment = typeof raw.comment === 'string' && raw.comment.trim()
      ? raw.comment.trim()
      : 'Moderate engagement';

    return {
      score,
      tips,
      comment,
    };
  } catch (error) {
    // Fallback on any error
    console.error('calculateSubaccountAIInsights error:', error);
    return {
      score: Math.max(0, Math.min(100, input.currentScore)),
      tips: ['Increase followups', 'Schedule calls'],
      comment: 'Moderate engagement',
    };
  }
}

