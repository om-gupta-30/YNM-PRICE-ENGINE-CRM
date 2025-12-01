'use server';

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

async function runClaude<T>(systemPrompt: string, userPrompt: string): Promise<T> {
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

export async function generateEngagementInsights(accountData: any): Promise<EngagementInsightResult> {
  const system = 'You are an assistant helping evaluate customer engagement.';
  const user = `
Given this account data:
${JSON.stringify(accountData, null, 2)}

Return JSON: { "engagementScore": number (0-100), "tips": [string, string] }
  `.trim();

  const raw = await runClaude<EngagementInsightResult>(system, user);
  return {
    engagementScore: Number(raw.engagementScore ?? 0),
    tips: Array.isArray(raw.tips) ? raw.tips.slice(0, 2) : [],
  };
}

export interface EngagementScoreUpdateResult extends EngagementInsightResult {}

export async function updateEngagementScoreAI(accountData: any, recentActivities: any[]): Promise<EngagementScoreUpdateResult> {
  const system = 'You are an assistant helping evaluate customer engagement.';
  const user = `
Account profile:
${JSON.stringify(accountData, null, 2)}

Recent activities (30 days):
${JSON.stringify(recentActivities, null, 2)}

Respond with JSON { "engagementScore": number between 0-100, "tips": [two short suggestions] }.
  `.trim();

  const raw = await runClaude<EngagementScoreUpdateResult>(system, user);
  return {
    engagementScore: Number(raw.engagementScore ?? accountData?.engagement_score ?? 0),
    tips: Array.isArray(raw.tips) ? raw.tips.slice(0, 2) : [],
  };
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

export async function generateDailyEmployeeSummary(activityLog: any[]): Promise<DailySummaryResult> {
  const system = 'You are an assistant summarizing CRM activity for a salesperson.';
  const user = `
Yesterday's activity log:
${JSON.stringify(activityLog, null, 2)}

Return JSON with:
{
  "summary": string,
  "strengths": [string],
  "weaknesses": [string],
  "suggestedGoals": [string],
  "metrics": { "calls": number, "tasks": number, "leads": number, "quotations": number, "followUps": number }
}
  `.trim();

  return runClaude<DailySummaryResult>(system, user);
}

export interface AdminInsightsResult {
  mostActive: string;
  leastActive: string;
  topCloser: string;
  needsAttention: string;
  suggestions: string[];
}

export async function generateAdminEmployeeInsights(allEmployeesActivity: any[]): Promise<AdminInsightsResult> {
  const system = 'You are an assistant helping a sales director understand their team.';
  const user = `
Employee activity dataset:
${JSON.stringify(allEmployeesActivity, null, 2)}

Return JSON:
{
  "mostActive": string,
  "leastActive": string,
  "topCloser": string,
  "needsAttention": string,
  "suggestions": [string, string]
}
  `.trim();

  return runClaude<AdminInsightsResult>(system, user);
}

export interface ActivityExplanation {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  suggestedAction: string;
}

export async function explainActivity(activity: any): Promise<ActivityExplanation> {
  const system = 'You explain CRM timeline entries in friendly, simple language.';
  const user = `
Activity details:
${JSON.stringify(activity, null, 2)}

Return JSON:
{
  "summary": "short explanation in 1-2 sentences",
  "sentiment": "positive | neutral | negative",
  "suggestedAction": "one practical follow-up suggestion"
}
  `.trim();

  return runClaude<ActivityExplanation>(system, user);
}

