/**
 * Semantic Query Interpreter
 * 
 * Interprets natural language queries to extract semantic intent.
 * Handles queries like "show me all contacts starting with A" or "which accounts are slipping?"
 */

export interface SemanticQueryIntent {
  entity: 'contacts' | 'accounts' | 'subaccounts' | 'activities' | 'quotes' | 'unknown';
  filterType?: 'startsWith' | 'contains' | 'dateRange' | 'silentAccounts' | 'recentActivity';
  filterValue?: string;
  filters?: {
    region?: string;
    minQuotes?: number;
    silentDays?: number;
  };
  limit?: number;
}

/**
 * Interpret semantic query from natural language text
 * 
 * @param text - User query text
 * @returns Semantic query intent
 */
export function interpretSemanticQuery(text: string): SemanticQueryIntent {
  console.log(`[AI] SemanticQueryInterpreter: Analyzing query: "${text.substring(0, 100)}"`);
  const lower = text.toLowerCase();
  
  // Initialize intent with empty filters
  const intent: SemanticQueryIntent = {
    entity: 'unknown',
    filters: {},
  };

  // Detect region/state filter (works for any entity)
  if (lower.includes('telangana') || lower.includes('hyderabad')) {
    intent.filters = { ...(intent.filters || {}), region: 'Telangana' };
  } else if (lower.includes('karnataka') || lower.includes('bangalore') || lower.includes('bengaluru')) {
    intent.filters = { ...(intent.filters || {}), region: 'Karnataka' };
  } else if (lower.includes('maharashtra') || lower.includes('mumbai') || lower.includes('pune')) {
    intent.filters = { ...(intent.filters || {}), region: 'Maharashtra' };
  } else if (lower.includes('tamil nadu') || lower.includes('chennai')) {
    intent.filters = { ...(intent.filters || {}), region: 'Tamil Nadu' };
  } else if (lower.includes('delhi') || lower.includes('ncr')) {
    intent.filters = { ...(intent.filters || {}), region: 'Delhi' };
  }

  // Detect quotation count filter (e.g., "3+ quotations", "5 quotations")
  const quoteMatch = lower.match(/(\d+)\s*\+?\s*(?:quotation|quote|quotes)/);
  if (quoteMatch) {
    intent.filters = { ...(intent.filters || {}), minQuotes: parseInt(quoteMatch[1], 10) };
  }

  // Detect silence period filter (e.g., "45 days no follow", "2 months silent")
  const silentMatch = lower.match(/(\d+)\s*(?:days?|months?)\s*(?:no\s+follow|silent|inactive|no\s+activity)/);
  if (silentMatch) {
    const days = silentMatch[0].includes('month') 
      ? parseInt(silentMatch[1], 10) * 30 
      : parseInt(silentMatch[1], 10);
    intent.filters = { ...(intent.filters || {}), silentDays: days };
  }

  // Detect contacts entity
  if (lower.includes('contact')) {
    // "starts with" pattern
    if (lower.includes('starts with') || lower.includes('starting with') || lower.includes('beginning with')) {
      const match = lower.match(/(?:starts? with|starting with|beginning with)\s+["']?(\w+)["']?/i);
      return {
        entity: 'contacts',
        filterType: 'startsWith',
        filterValue: match ? match[1] : undefined,
        filters: intent.filters,
        limit: 50,
      };
    }
    
    // "contains" pattern
    if (lower.includes('contains') || lower.includes('with') || lower.includes('having')) {
      const match = lower.match(/(?:contains?|with|having)\s+["']?(\w+)["']?/i);
      if (match) {
        return {
          entity: 'contacts',
          filterType: 'contains',
          filterValue: match[1],
          filters: intent.filters,
          limit: 50,
        };
      }
    }
    
    return { entity: 'contacts', filters: intent.filters, limit: 50 };
  }

  // Detect accounts entity
  if (lower.includes('account')) {
    // "silent" or "inactive" accounts
    if (lower.includes('silent') || lower.includes('inactive') || lower.includes('slipping') || lower.includes('slipped')) {
      return {
        entity: 'accounts',
        filterType: 'silentAccounts',
        filters: intent.filters,
        limit: 50,
      };
    }
    
    // "recent activity" accounts
    if (lower.includes('recent') && lower.includes('activity')) {
      return {
        entity: 'accounts',
        filterType: 'recentActivity',
        filters: intent.filters,
        limit: 50,
      };
    }
    
    return { entity: 'accounts', filters: intent.filters, limit: 50 };
  }

  // Detect subaccounts entity
  if (lower.includes('subaccount') || lower.includes('sub-account') || lower.includes('customer') || lower.includes('client')) {
    return { entity: 'subaccounts', filters: intent.filters, limit: 50 };
  }

  // Detect activities entity
  if (lower.includes('activity') || lower.includes('activities')) {
    return { entity: 'activities', filters: intent.filters, limit: 50 };
  }

  // Detect quotes/quotations entity
  if (lower.includes('quote') || lower.includes('quotation')) {
    return { entity: 'quotes', filters: intent.filters, limit: 50 };
  }

  // Unknown entity (but preserve filters if detected)
  const result: SemanticQueryIntent = { 
    entity: 'unknown', 
    filters: Object.keys(intent.filters || {}).length > 0 ? intent.filters : undefined 
  };
  console.log(`[AI] SemanticQueryInterpreter: Result`, {
    entity: result.entity,
    hasFilters: !!result.filters && Object.keys(result.filters).length > 0,
  });
  return result;
}

