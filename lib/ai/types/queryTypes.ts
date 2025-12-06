/**
 * Query builder types for AI-generated database queries
 */

/**
 * Result from query builder containing SQL and metadata
 */
export interface QueryBuilderResult {
  sql: string;
  params: any[];
  explanation: string;
  affectedTables: string[];
}

/**
 * Filter condition for database queries
 */
export interface QueryFilter {
  field: string;
  operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL' | 'BETWEEN';
  value: any;
}

/**
 * Query options for pagination, sorting, and grouping
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: {
    field: string;
    direction: 'ASC' | 'DESC';
  }[];
  groupBy?: string[];
}

