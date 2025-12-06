/**
 * Business Knowledge Loader
 * 
 * Fetches relevant business knowledge from the database based on context.
 * This is a neutral "knowledge fetcher" layer that can be used by:
 * - Pricing AI
 * - CRM Coach
 * - Future embedding/retrieval systems
 * 
 * This module does NOT:
 * - Make AI calls
 * - Create embeddings
 * - Modify existing APIs
 * 
 * It only fetches and structures business data for AI reasoning.
 */

import { BUSINESS_KNOWLEDGE_MODEL } from './businessKnowledgeSpec';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export interface KnowledgeLoaderContext {
  subAccountId?: number;
  productType?: 'mbcb' | 'signages' | 'paint';
  quotationId?: number;
  forceRefresh?: boolean; // Force refresh of cached knowledge
}

export interface QuotationContext {
  quotation: {
    id: number;
    section: string;
    customer_name: string;
    final_total_cost: number;
    quantity_rm: number | null;
    competitor_price_per_unit: number | null;
    client_demand_price_per_unit: number | null;
    ai_suggested_price_per_unit: number | null;
    ai_win_probability: number | null;
    status: string;
    created_by: string;
    created_at: string;
    sub_account_id: number | null;
    raw_payload: any;
  };
  similarQuotations: Array<{
    id: number;
    section: string;
    final_total_cost: number;
    quantity_rm: number | null;
    outcome: string | null;
    created_at: string;
  }>;
}

export interface CRMContext {
  subAccount: {
    id: number;
    sub_account_name: string;
    account_id: number;
    engagement_score: number | null;
    assigned_employee: string | null;
    is_active: boolean;
  } | null;
  account: {
    id: number;
    account_name: string;
    company_stage: string | null;
    company_tag: string | null;
    engagement_score: number | null;
    assigned_employee: string | null;
  } | null;
  contacts: Array<{
    id: number;
    name: string;
    designation: string | null;
    phone: string | null;
    email: string | null;
    call_status: string | null;
    follow_up_date: string | null;
  }>;
  recentActivities: Array<{
    id: number;
    activity_type: string;
    description: string | null;
    created_at: string;
  }>;
}

export interface PricingHistory {
  productType: string;
  quotations: Array<{
    id: number;
    section: string;
    final_total_cost: number;
    quantity_rm: number | null;
    competitor_price_per_unit: number | null;
    client_demand_price_per_unit: number | null;
    ai_suggested_price_per_unit: number | null;
    outcome: string | null;
    outcome_notes: string | null;
    created_at: string;
  }>;
  winRate: number;
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
}

export interface EngagementSignals {
  subAccountId: number;
  currentScore: number;
  trend: 'improving' | 'declining' | 'stable';
  recentActivityCount: number;
  daysSinceLastActivity: number | null;
  aiInsights: {
    tips: string[];
    comment: string;
  } | null;
}

export interface CompetitorTrends {
  productType: string;
  averageCompetitorPrice: number | null;
  priceRange: {
    min: number | null;
    max: number | null;
  };
  sampleSize: number;
  lastUpdated: string | null;
}

export interface DemandPriceTrends {
  productType: string;
  averageDemandPrice: number | null;
  priceRange: {
    min: number | null;
    max: number | null;
  };
  sampleSize: number;
  lastUpdated: string | null;
}

export interface BusinessKnowledge {
  knowledgeSpec: typeof BUSINESS_KNOWLEDGE_MODEL;
  quotationContext?: QuotationContext;
  crmContext?: CRMContext;
  pricingHistory?: PricingHistory[];
  engagementSignals?: EngagementSignals[];
  competitorTrends?: CompetitorTrends;
  demandPriceTrends?: DemandPriceTrends;
  pricingWeighted?: Array<{
    [key: string]: any;
    weight: number;
    importance: number;
  }>;
  crmWeighted?: Array<{
    [key: string]: any;
    weight: number;
    importance: number;
  }>;
  metaStats: {
    totalAccounts: number;
    totalContacts: number;
    winRate90Days: number;
    topClosingPriceRanges?: Array<{
      range: string;
      count: number;
      winRate: number;
    }>;
  };
}

/**
 * Helper: Get quotation table name from section
 */
function getQuotationTableName(section: string): string {
  const sectionLower = section.toLowerCase();
  if (sectionLower.includes('signages') || sectionLower.includes('reflective')) {
    return 'quotes_signages';
  } else if (sectionLower.includes('paint')) {
    return 'quotes_paint';
  } else {
    return 'quotes_mbcb';
  }
}

/**
 * Fetch quotation context when quotationId is provided
 */
async function fetchQuotationContext(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  quotationId: number
): Promise<QuotationContext | null> {
  try {
    // Try all quotation tables to find the quote
    const tables = ['quotes_mbcb', 'quotes_signages', 'quotes_paint'];
    
    for (const table of tables) {
      const { data: quotation, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', quotationId)
        .single();

      if (!error && quotation) {
        // Found the quotation, now fetch similar ones with matching specs
        const section = quotation.section || '';
        const productSpecs = quotation.raw_payload || {};
        
        // Fetch past quotations with similar specs (same section, similar quantity range)
        // Match by section first, then filter by similar quantity if available
        let similarQuery = supabase
          .from(table)
          .select('id, section, final_total_cost, quantity_rm, competitor_price_per_unit, client_demand_price_per_unit, outcome, outcome_notes, created_at')
          .eq('section', section)
          .neq('id', quotationId)
          .order('created_at', { ascending: false })
          .limit(20);

        // If quantity is available, try to match similar quantity ranges (±20%)
        if (quotation.quantity_rm && typeof quotation.quantity_rm === 'number') {
          const qty = quotation.quantity_rm;
          const lowerBound = qty * 0.8;
          const upperBound = qty * 1.2;
          similarQuery = similarQuery
            .gte('quantity_rm', lowerBound)
            .lte('quantity_rm', upperBound);
        }

        const { data: similarQuotations } = await similarQuery;

        // Compile pricing history with wins/losses (outcome field indicates win/loss)
        const pastQuotations = (similarQuotations || []).map(q => ({
          id: q.id,
          section: q.section || '',
          final_total_cost: q.final_total_cost || 0,
          quantity_rm: q.quantity_rm,
          outcome: q.outcome || null,
          created_at: q.created_at,
        }));

        return {
          quotation: {
            id: quotation.id,
            section: quotation.section || '',
            customer_name: quotation.customer_name || '',
            final_total_cost: quotation.final_total_cost || 0,
            quantity_rm: quotation.quantity_rm,
            competitor_price_per_unit: quotation.competitor_price_per_unit,
            client_demand_price_per_unit: quotation.client_demand_price_per_unit,
            ai_suggested_price_per_unit: quotation.ai_suggested_price_per_unit,
            ai_win_probability: quotation.ai_win_probability,
            status: quotation.status || 'draft',
            created_by: quotation.created_by || '',
            created_at: quotation.created_at,
            sub_account_id: quotation.sub_account_id,
            raw_payload: quotation.raw_payload,
          },
          similarQuotations: pastQuotations,
        };
      }
    }

    return null;
  } catch (error: any) {
    console.error('[KnowledgeLoader] Error fetching quotation context:', error);
    return null;
  }
}

/**
 * Fetch CRM context when subAccountId is provided
 */
async function fetchCRMContext(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  subAccountId: number
): Promise<CRMContext | null> {
  try {
    // Fetch sub-account
    const { data: subAccount, error: subAccountError } = await supabase
      .from('sub_accounts')
      .select('id, sub_account_name, account_id, engagement_score, assigned_employee, is_active')
      .eq('id', subAccountId)
      .single();

    if (subAccountError || !subAccount) {
      console.warn('[KnowledgeLoader] Sub-account not found:', subAccountId);
      return null;
    }

    // Fetch parent account
    let account = null;
    if (subAccount.account_id) {
      const { data: accountData } = await supabase
        .from('accounts')
        .select('id, account_name, company_stage, company_tag, engagement_score, assigned_employee')
        .eq('id', subAccount.account_id)
        .single();
      
      account = accountData;
    }

    // Fetch contacts for this sub-account
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, name, designation, phone, email, call_status, follow_up_date')
      .eq('sub_account_id', subAccountId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Fetch recent activities (limit 10, order desc)
    const { data: recentActivities } = await supabase
      .from('activities')
      .select('id, activity_type, description, created_at')
      .eq('sub_account_id', subAccountId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      subAccount: {
        id: subAccount.id,
        sub_account_name: subAccount.sub_account_name,
        account_id: subAccount.account_id,
        engagement_score: subAccount.engagement_score,
        assigned_employee: subAccount.assigned_employee,
        is_active: subAccount.is_active,
      },
      account: account ? {
        id: account.id,
        account_name: account.account_name,
        company_stage: account.company_stage,
        company_tag: account.company_tag,
        engagement_score: account.engagement_score,
        assigned_employee: account.assigned_employee,
      } : null,
      contacts: (contacts || []).map(c => ({
        id: c.id,
        name: c.name,
        designation: c.designation,
        phone: c.phone,
        email: c.email,
        call_status: c.call_status,
        follow_up_date: c.follow_up_date,
      })),
      recentActivities: (recentActivities || []).map(a => ({
        id: a.id,
        activity_type: a.activity_type,
        description: a.description,
        created_at: a.created_at,
      })),
    };
  } catch (error: any) {
    console.error('[KnowledgeLoader] Error fetching CRM context:', error);
    return null;
  }
}

/**
 * Fetch pricing history for a product type
 */
async function fetchPricingHistory(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  productType: 'mbcb' | 'signages' | 'paint'
): Promise<PricingHistory | null> {
  try {
    // Determine table name
    const tableName = productType === 'mbcb' 
      ? 'quotes_mbcb'
      : productType === 'signages'
      ? 'quotes_signages'
      : 'quotes_paint';

    // Fetch quotations for this product type (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: quotations } = await supabase
      .from(tableName)
      .select('id, section, final_total_cost, quantity_rm, competitor_price_per_unit, client_demand_price_per_unit, ai_suggested_price_per_unit, outcome, outcome_notes, created_at')
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (!quotations || quotations.length === 0) {
      return null;
    }

    // Calculate statistics
    const wonQuotations = quotations.filter(q => q.outcome === 'won');
    const winRate = quotations.length > 0 
      ? (wonQuotations.length / quotations.length) * 100 
      : 0;

    const prices = quotations
      .map(q => q.final_total_cost)
      .filter((p): p is number => p !== null && p > 0);

    const averagePrice = prices.length > 0
      ? prices.reduce((sum, p) => sum + p, 0) / prices.length
      : 0;

    const priceRange = prices.length > 0
      ? {
          min: Math.min(...prices),
          max: Math.max(...prices),
        }
      : { min: 0, max: 0 };

    return {
      productType,
      quotations: quotations.map(q => ({
        id: q.id,
        section: q.section || '',
        final_total_cost: q.final_total_cost || 0,
        quantity_rm: q.quantity_rm,
        competitor_price_per_unit: q.competitor_price_per_unit,
        client_demand_price_per_unit: q.client_demand_price_per_unit,
        ai_suggested_price_per_unit: q.ai_suggested_price_per_unit,
        outcome: q.outcome || null,
        outcome_notes: q.outcome_notes || null,
        created_at: q.created_at,
      })),
      winRate,
      averagePrice,
      priceRange,
    };
  } catch (error: any) {
    console.error('[KnowledgeLoader] Error fetching pricing history:', error);
    return null;
  }
}

/**
 * Fetch engagement signals for a sub-account
 */
async function fetchEngagementSignals(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  subAccountId: number
): Promise<EngagementSignals | null> {
  try {
    const { data: subAccount } = await supabase
      .from('sub_accounts')
      .select('id, engagement_score, ai_insights, last_activity_at')
      .eq('id', subAccountId)
      .single();

    if (!subAccount) {
      return null;
    }

    // Fetch recent activities count
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentActivityCount } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('sub_account_id', subAccountId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Calculate days since last activity
    const daysSinceLastActivity = subAccount.last_activity_at
      ? Math.floor((Date.now() - new Date(subAccount.last_activity_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Parse AI insights
    let aiInsights = null;
    if (subAccount.ai_insights) {
      try {
        const parsed = typeof subAccount.ai_insights === 'string'
          ? JSON.parse(subAccount.ai_insights)
          : subAccount.ai_insights;
        
        aiInsights = {
          tips: Array.isArray(parsed.tips) ? parsed.tips : [],
          comment: typeof parsed.comment === 'string' ? parsed.comment : '',
        };
      } catch {
        // Invalid JSON, skip
      }
    }

    // Determine trend (simplified - TODO: implement proper trend calculation)
    const trend: 'improving' | 'declining' | 'stable' = 'stable'; // TODO: Calculate from historical data

    return {
      subAccountId,
      currentScore: subAccount.engagement_score || 0,
      trend,
      recentActivityCount: recentActivityCount || 0,
      daysSinceLastActivity,
      aiInsights,
    };
  } catch (error: any) {
    console.error('[KnowledgeLoader] Error fetching engagement signals:', error);
    return null;
  }
}

/**
 * Fetch demand price trends
 * Tries to fetch from demand pricing table if exists, otherwise uses quotations
 */
async function fetchDemandPriceTrends(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  productType: 'mbcb' | 'signages' | 'paint'
): Promise<DemandPriceTrends | null> {
  try {
    // First, try to fetch from demand pricing table if it exists
    try {
      const { data: demandData, error: demandError } = await supabase
        .from('demand_pricing')
        .select('price_per_unit, product_type, updated_at')
        .eq('product_type', productType)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (!demandError && demandData && demandData.length > 0) {
        const prices = demandData
          .map(d => d.price_per_unit)
          .filter((p): p is number => p !== null && p > 0);

        if (prices.length > 0) {
          return {
            productType,
            averageDemandPrice: prices.reduce((sum, p) => sum + p, 0) / prices.length,
            priceRange: {
              min: Math.min(...prices),
              max: Math.max(...prices),
            },
            sampleSize: prices.length,
            lastUpdated: demandData[0]?.updated_at || null,
          };
        }
      }
    } catch {
      // Demand pricing table doesn't exist or failed, fall back to quotations
    }

    // Fallback: Fetch from quotations table
    const tableName = productType === 'mbcb' 
      ? 'quotes_mbcb'
      : productType === 'signages'
      ? 'quotes_signages'
      : 'quotes_paint';

    // Fetch quotations with client demand prices (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: quotations } = await supabase
      .from(tableName)
      .select('client_demand_price_per_unit, created_at')
      .not('client_demand_price_per_unit', 'is', null)
      .gte('created_at', ninetyDaysAgo.toISOString())
      .limit(100);

    if (!quotations || quotations.length === 0) {
      return {
        productType,
        averageDemandPrice: null,
        priceRange: { min: null, max: null },
        sampleSize: 0,
        lastUpdated: null,
      };
    }

    const demandPrices = quotations
      .map(q => q.client_demand_price_per_unit)
      .filter((p): p is number => p !== null && p > 0);

    const averageDemandPrice = demandPrices.length > 0
      ? demandPrices.reduce((sum, p) => sum + p, 0) / demandPrices.length
      : null;

    const priceRange = demandPrices.length > 0
      ? {
          min: Math.min(...demandPrices),
          max: Math.max(...demandPrices),
        }
      : { min: null, max: null };

    const lastUpdated = quotations.length > 0
      ? quotations[0].created_at
      : null;

    return {
      productType,
      averageDemandPrice,
      priceRange,
      sampleSize: demandPrices.length,
      lastUpdated,
    };
  } catch (error: any) {
    console.error('[KnowledgeLoader] Error fetching demand price trends:', error);
    return null;
  }
}

/**
 * Fetch competitor trends
 * Tries to fetch from competitor pricing table if exists, otherwise uses quotations
 */
async function fetchCompetitorTrends(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  productType: 'mbcb' | 'signages' | 'paint'
): Promise<CompetitorTrends | null> {
  try {
    // First, try to fetch from competitor pricing table if it exists
    try {
      const { data: competitorData, error: compError } = await supabase
        .from('competitor_pricing')
        .select('price_per_unit, product_type, updated_at')
        .eq('product_type', productType)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (!compError && competitorData && competitorData.length > 0) {
        const prices = competitorData
          .map(d => d.price_per_unit)
          .filter((p): p is number => p !== null && p > 0);

        if (prices.length > 0) {
          return {
            productType,
            averageCompetitorPrice: prices.reduce((sum, p) => sum + p, 0) / prices.length,
            priceRange: {
              min: Math.min(...prices),
              max: Math.max(...prices),
            },
            sampleSize: prices.length,
            lastUpdated: competitorData[0]?.updated_at || null,
          };
        }
      }
    } catch {
      // Competitor pricing table doesn't exist or failed, fall back to quotations
    }

    // Fallback: Fetch from quotations table
    const tableName = productType === 'mbcb' 
      ? 'quotes_mbcb'
      : productType === 'signages'
      ? 'quotes_signages'
      : 'quotes_paint';

    // Fetch quotations with competitor prices (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: quotations } = await supabase
      .from(tableName)
      .select('competitor_price_per_unit, created_at')
      .not('competitor_price_per_unit', 'is', null)
      .gte('created_at', ninetyDaysAgo.toISOString())
      .limit(100);

    if (!quotations || quotations.length === 0) {
      return {
        productType,
        averageCompetitorPrice: null,
        priceRange: { min: null, max: null },
        sampleSize: 0,
        lastUpdated: null,
      };
    }

    const competitorPrices = quotations
      .map(q => q.competitor_price_per_unit)
      .filter((p): p is number => p !== null && p > 0);

    const averageCompetitorPrice = competitorPrices.length > 0
      ? competitorPrices.reduce((sum, p) => sum + p, 0) / competitorPrices.length
      : null;

    const priceRange = competitorPrices.length > 0
      ? {
          min: Math.min(...competitorPrices),
          max: Math.max(...competitorPrices),
        }
      : { min: null, max: null };

    const lastUpdated = quotations.length > 0
      ? quotations[0].created_at
      : null;

    return {
      productType,
      averageCompetitorPrice,
      priceRange,
      sampleSize: competitorPrices.length,
      lastUpdated,
    };
  } catch (error: any) {
    console.error('[KnowledgeLoader] Error fetching competitor trends:', error);
    return null;
  }
}

/**
 * Weight data by recency - more recent items get higher weight
 * 
 * @param data - Array of items with a date field
 * @param dateField - Name of the date field (default: "created_at")
 * @returns Array of items with added weight field
 */
function weightByRecency<T extends Record<string, any>>(
  data: T[],
  dateField: string = 'created_at'
): Array<T & { weight: number }> {
  const now = new Date().getTime();
  
  return data.map(item => {
    const dateValue = item[dateField];
    if (!dateValue) {
      // If no date, give minimal weight
      return { ...item, weight: 0.01 };
    }
    
    const itemDate = new Date(dateValue).getTime();
    const ageDays = Math.max(1, (now - itemDate) / (1000 * 60 * 60 * 24));
    const weight = 1 / ageDays;
    
    return { ...item, weight };
  });
}

/**
 * Normalize weights to importance scores (0-1)
 * 
 * @param data - Array of items with weight field
 * @returns Array of items with added importance field
 */
function normalizeWeights<T extends { weight: number }>(
  data: T[]
): Array<T & { importance: number }> {
  if (data.length === 0) {
    return [];
  }
  
  const total = data.reduce((sum, item) => sum + item.weight, 0);
  
  if (total === 0) {
    // If all weights are zero, give equal importance
    const equalImportance = 1 / data.length;
    return data.map(item => ({ ...item, importance: equalImportance }));
  }
  
  return data.map(item => ({
    ...item,
    importance: item.weight / total,
  }));
}

/**
 * Fetch accounts with activity data for weighting
 */
async function fetchAccountsForWeighting(
  supabase: ReturnType<typeof createSupabaseServerClient>
): Promise<Array<{ id: number; account_name: string; last_activity_at: string | null; engagement_score: number | null }>> {
  try {
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, account_name, last_activity_at, engagement_score')
      .eq('is_active', true)
      .order('last_activity_at', { ascending: false })
      .limit(100);
    
    return (accounts || []).map(acc => ({
      id: acc.id,
      account_name: acc.account_name,
      last_activity_at: acc.last_activity_at,
      engagement_score: acc.engagement_score,
    }));
  } catch (error: any) {
    console.warn('[KnowledgeLoader] Failed to fetch accounts for weighting:', error);
    return [];
  }
}

/**
 * Fetch company-level insights (lightweight meta stats)
 */
async function fetchCompanyInsights(
  supabase: ReturnType<typeof createSupabaseServerClient>
): Promise<BusinessKnowledge['metaStats']> {
  try {
    // Calculate recent win rate (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const tables = ['quotes_mbcb', 'quotes_signages', 'quotes_paint'];
    let totalQuotations = 0;
    let wonQuotations = 0;
    const allClosingPrices: number[] = [];

    for (const table of tables) {
      try {
        const { data: quotations } = await supabase
          .from(table)
          .select('outcome, final_total_cost')
          .gte('created_at', ninetyDaysAgo.toISOString())
          .not('outcome', 'is', null);

        if (quotations) {
          totalQuotations += quotations.length;
          wonQuotations += quotations.filter(q => q.outcome === 'won').length;
          
          // Collect closing prices from won deals
          quotations
            .filter(q => q.outcome === 'won' && q.final_total_cost && q.final_total_cost > 0)
            .forEach(q => {
              if (typeof q.final_total_cost === 'number') {
                allClosingPrices.push(q.final_total_cost);
              }
            });
        }
      } catch (tableError) {
        // Table might not exist, continue
        console.warn(`[KnowledgeLoader] Table ${table} query failed, continuing`);
      }
    }

    const winRate90Days = totalQuotations > 0
      ? (wonQuotations / totalQuotations) * 100
      : 0;

    // Calculate top 3 common closing price ranges
    const topClosingPriceRanges: Array<{ range: string; count: number; winRate: number }> = [];
    
    if (allClosingPrices.length > 0) {
      // Sort prices and create ranges
      const sortedPrices = [...allClosingPrices].sort((a, b) => a - b);
      const minPrice = sortedPrices[0];
      const maxPrice = sortedPrices[sortedPrices.length - 1];
      const rangeSize = (maxPrice - minPrice) / 3;

      // Create 3 price ranges
      const ranges = [
        { min: minPrice, max: minPrice + rangeSize, label: `₹${Math.round(minPrice / 1000)}K-₹${Math.round((minPrice + rangeSize) / 1000)}K` },
        { min: minPrice + rangeSize, max: minPrice + (rangeSize * 2), label: `₹${Math.round((minPrice + rangeSize) / 1000)}K-₹${Math.round((minPrice + rangeSize * 2) / 1000)}K` },
        { min: minPrice + (rangeSize * 2), max: maxPrice, label: `₹${Math.round((minPrice + rangeSize * 2) / 1000)}K-₹${Math.round(maxPrice / 1000)}K` },
      ];

      // Count wins in each range
      for (const range of ranges) {
        const pricesInRange = sortedPrices.filter(p => p >= range.min && p <= range.max);
        if (pricesInRange.length > 0) {
          topClosingPriceRanges.push({
            range: range.label,
            count: pricesInRange.length,
            winRate: 100, // All are wins since we filtered for won deals
          });
        }
      }

      // Sort by count and take top 3
      topClosingPriceRanges.sort((a, b) => b.count - a.count);
    }

    // Count total accounts
    let totalAccounts = 0;
    try {
      const { count } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      totalAccounts = count || 0;
    } catch {
      // Table might not exist
    }

    // Count total contacts
    let totalContacts = 0;
    try {
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });
      totalContacts = count || 0;
    } catch {
      // Table might not exist
    }

    return {
      totalAccounts,
      totalContacts,
      winRate90Days,
      topClosingPriceRanges: topClosingPriceRanges.slice(0, 3),
    };
  } catch (error: any) {
    console.error('[KnowledgeLoader] Error fetching company insights:', error);
    // Return defaults on error
    return {
      totalAccounts: 0,
      totalContacts: 0,
      winRate90Days: 0,
      topClosingPriceRanges: [],
    };
  }
}

/**
 * Main function: Load business knowledge based on context
 * 
 * @param context - Optional context to fetch specific knowledge
 * @returns Structured business knowledge object
 */
export async function loadBusinessKnowledge(
  context?: KnowledgeLoaderContext
): Promise<BusinessKnowledge> {
  console.log('[AI] KnowledgeLoader: Starting loadBusinessKnowledge', {
    quotationId: context?.quotationId,
    subAccountId: context?.subAccountId,
    productType: context?.productType,
    forceRefresh: context?.forceRefresh,
  });
  
  // If forceRefresh is requested, clear any cached data (future: implement caching layer)
  if (context?.forceRefresh) {
    console.log('[KnowledgeLoader] Force refresh requested - fetching fresh data');
  }

  const supabase = createSupabaseServerClient();

  // Always fetch company-level insights (lightweight meta stats)
  const metaStats = await fetchCompanyInsights(supabase);

  // Initialize result
  const knowledge: BusinessKnowledge = {
    knowledgeSpec: BUSINESS_KNOWLEDGE_MODEL,
    metaStats,
  };

  // Always fetch and weight CRM accounts for prioritization
  try {
    const crmAccounts = await fetchAccountsForWeighting(supabase);
    if (crmAccounts && crmAccounts.length > 0) {
      // Weight by last_activity_at (more recent = higher importance)
      let weighted = weightByRecency(crmAccounts, 'last_activity_at');
      weighted = normalizeWeights(weighted);
      knowledge.crmWeighted = weighted as unknown as Array<{ [key: string]: any; weight: number; importance: number }>;
      console.log('[KnowledgeLoader] Applied weighting to', weighted.length, 'CRM accounts');
    }
  } catch (error) {
    console.warn('[KnowledgeLoader] Failed to fetch accounts for weighting:', error);
    // Continue without weighted accounts
  }

  // Fetch quotation context if quotationId provided
  if (context?.quotationId) {
    try {
      const quotationContext = await fetchQuotationContext(supabase, context.quotationId);
      if (quotationContext) {
        knowledge.quotationContext = quotationContext;
        
        // Also fetch pricing history for the same product type if we can determine it
        if (quotationContext.quotation.section) {
          const section = quotationContext.quotation.section.toLowerCase();
          const productType: 'mbcb' | 'signages' | 'paint' = 
            section.includes('signages') || section.includes('reflective')
              ? 'signages'
              : section.includes('paint')
              ? 'paint'
              : 'mbcb';
          
          try {
            const pricingHistory = await fetchPricingHistory(supabase, productType);
            if (pricingHistory) {
              knowledge.pricingHistory = [pricingHistory];
              
              // Apply weighting to historical pricing quotations
              if (pricingHistory.quotations && pricingHistory.quotations.length > 0) {
                let weighted = weightByRecency(pricingHistory.quotations, 'created_at');
                weighted = normalizeWeights(weighted);
                knowledge.pricingWeighted = weighted as unknown as Array<{ [key: string]: any; weight: number; importance: number }>;
                console.log('[KnowledgeLoader] Applied weighting to', weighted.length, 'pricing quotations');
              }
            }
          } catch (err) {
            console.warn('[KnowledgeLoader] Failed to fetch pricing history:', err);
          }

          try {
            const competitorTrends = await fetchCompetitorTrends(supabase, productType);
            if (competitorTrends) {
              knowledge.competitorTrends = competitorTrends;
            }
          } catch (err) {
            console.warn('[KnowledgeLoader] Failed to fetch competitor trends:', err);
          }

          try {
            const demandPriceTrends = await fetchDemandPriceTrends(supabase, productType);
            if (demandPriceTrends) {
              knowledge.demandPriceTrends = demandPriceTrends;
            }
          } catch (err) {
            console.warn('[KnowledgeLoader] Failed to fetch demand price trends:', err);
          }
        }
      }
    } catch (error) {
      console.warn('[KnowledgeLoader] Failed to fetch quotation context:', error);
      // Continue without quotation context
    }
  }

  // Fetch CRM context if subAccountId provided
  if (context?.subAccountId) {
    try {
      const crmContext = await fetchCRMContext(supabase, context.subAccountId);
      if (crmContext) {
        knowledge.crmContext = crmContext;
      }
    } catch (error) {
      console.warn('[KnowledgeLoader] Failed to fetch CRM context:', error);
      // Continue without CRM context
    }

    try {
      const engagementSignals = await fetchEngagementSignals(supabase, context.subAccountId);
      if (engagementSignals) {
        knowledge.engagementSignals = [engagementSignals];
      }
    } catch (error) {
      console.warn('[KnowledgeLoader] Failed to fetch engagement signals:', error);
      // Continue without engagement signals
    }
  }

  // Fetch pricing history if productType provided
  if (context?.productType) {
    try {
      const pricingHistory = await fetchPricingHistory(supabase, context.productType);
      if (pricingHistory) {
        knowledge.pricingHistory = knowledge.pricingHistory || [];
        knowledge.pricingHistory.push(pricingHistory);
        
        // Apply weighting to historical pricing quotations
        if (pricingHistory.quotations && pricingHistory.quotations.length > 0) {
          let weighted = weightByRecency(pricingHistory.quotations, 'created_at');
          weighted = normalizeWeights(weighted);
          knowledge.pricingWeighted = weighted as unknown as Array<{ [key: string]: any; weight: number; importance: number }>;
          console.log('[KnowledgeLoader] Applied weighting to', weighted.length, 'pricing quotations');
        }
      }
    } catch (error) {
      console.warn('[KnowledgeLoader] Failed to fetch pricing history:', error);
      // Continue without pricing history
    }

    try {
      const competitorTrends = await fetchCompetitorTrends(supabase, context.productType);
      if (competitorTrends) {
        knowledge.competitorTrends = competitorTrends;
      }
    } catch (error) {
      console.warn('[KnowledgeLoader] Failed to fetch competitor trends:', error);
      // Continue without competitor trends
    }

    try {
      const demandPriceTrends = await fetchDemandPriceTrends(supabase, context.productType);
      if (demandPriceTrends) {
        knowledge.demandPriceTrends = demandPriceTrends;
      }
    } catch (error) {
      console.warn('[KnowledgeLoader] Failed to fetch demand price trends:', error);
      // Continue without demand price trends
    }
  }

  console.log('[AI] KnowledgeLoader: Completed loadBusinessKnowledge', {
    hasQuotationContext: !!knowledge.quotationContext,
    hasCrmContext: !!knowledge.crmContext,
    pricingHistoryCount: knowledge.pricingHistory?.length || 0,
    engagementSignalsCount: knowledge.engagementSignals?.length || 0,
    hasCompetitorTrends: !!knowledge.competitorTrends,
    hasDemandPriceTrends: !!knowledge.demandPriceTrends,
    pricingWeightedCount: knowledge.pricingWeighted?.length || 0,
    crmWeightedCount: knowledge.crmWeighted?.length || 0,
  });

  return knowledge;
}

