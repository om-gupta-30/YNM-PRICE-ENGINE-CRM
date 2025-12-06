/**
 * Dynamic SQL Query Builder
 * 
 * Constructs parameterized SQL queries from intent classifications.
 * Handles complex operations including:
 * - Automatic JOIN detection and construction
 * - Role-based access control (RLS) filtering
 * - Aggregation functions (COUNT, SUM, AVG, MIN, MAX)
 * - Time range filtering with PostgreSQL date functions
 * - GROUP BY and HAVING clauses
 * - ORDER BY and LIMIT clauses
 * - SQL injection prevention via parameterization
 * 
 * Features:
 * - Multi-hop JOIN support (e.g., contacts -> accounts -> sub_accounts)
 * - Automatic table relationship resolution
 * - User context filtering (employee assignments, role permissions)
 * - Smart column selection
 * - Query optimization
 * 
 * @module lib/ai/dynamicQueryBuilder
 * @see {@link DATABASE_SCHEMA} for schema definitions
 * @see {@link TABLE_RELATIONSHIPS} for relationship definitions
 */

import { QueryIntent, IntentCategory } from './types/intentTypes';
import {
  QueryBuilderResult,
  QueryFilter,
  QueryOptions,
} from './types/queryTypes';
import {
  DATABASE_SCHEMA,
  TABLE_RELATIONSHIPS,
  getRelationshipsForTables,
  TableRelationship,
} from './databaseSchemaContext';

export interface UserContext {
  userId?: number | string;
  employeeId?: number | string;
  role?: string;
  permissions?: string[];
}

export interface AggregationConfig {
  type: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
  field?: string; // Optional field name for aggregation (defaults to * for COUNT, or auto-detected)
  alias?: string; // Optional alias for the aggregation result
}

/**
 * Dynamic Query Builder Class
 * 
 * Main class for building SQL queries from intent classifications.
 * Provides methods for constructing all parts of a SQL query:
 * - SELECT clause (with aggregations)
 * - FROM clause (with table selection)
 * - JOIN clauses (automatic relationship resolution)
 * - WHERE clause (filters and RLS)
 * - GROUP BY clause
 * - HAVING clause
 * - ORDER BY clause
 * - LIMIT clause
 * 
 * @example
 * ```typescript
 * const builder = createQueryBuilder();
 * const intent = {
 *   category: IntentCategory.ACCOUNT_QUERY,
 *   tables: ["accounts"],
 *   filters: { engagement_score: { operator: ">", value: 70 } }
 * };
 * const result = await builder.buildQuery(intent, userContext);
 * console.log(result.sql); // "SELECT ... FROM accounts WHERE ..."
 * ```
 */
export class DynamicQueryBuilder {
  private paramCounter = 1;

  /**
   * Build a complete parameterized SQL query from intent classification
   * 
   * This is the main method that orchestrates query construction:
   * 1. Validates intent and schema
   * 2. Builds SELECT clause (with aggregations if needed)
   * 3. Builds FROM clause
   * 4. Builds JOIN clauses (automatic relationship resolution)
   * 5. Builds WHERE clause (filters + RLS)
   * 6. Builds GROUP BY clause (if aggregations present)
   * 7. Builds HAVING clause (if needed)
   * 8. Builds ORDER BY clause
   * 9. Builds LIMIT clause
   * 
   * @param intent - The classified query intent containing:
   *   - category: IntentCategory
   *   - tables: string[] - Required tables
   *   - filters: Record<string, any> - Filter conditions
   *   - aggregationType: string - Optional aggregation (COUNT, SUM, etc.)
   *   - timeRange: { start?, end? } - Optional time range
   * @param userContext - User context for RLS and filtering:
   *   - userId: User ID
   *   - employeeId: Employee ID (for employee filtering)
   *   - role: User role (admin, employee, data_analyst)
   *   - permissions: Array of permission strings
   * @param options - Optional query options:
   *   - limit: Maximum number of rows
   *   - offset: Pagination offset
   *   - orderBy: Array of { field, direction } for sorting
   *   - groupBy: Array of field names for grouping
   * @returns Promise<QueryBuilderResult> containing:
   *   - sql: Parameterized SQL query string
   *   - params: Array of parameter values ($1, $2, etc.)
   *   - explanation: Human-readable query explanation
   *   - affectedTables: Array of table names used
   * 
   * @example
   * ```typescript
   * const intent = {
   *   category: IntentCategory.ACCOUNT_QUERY,
   *   tables: ["accounts"],
   *   filters: { engagement_score: { operator: ">", value: 70 } }
   * };
   * const result = await builder.buildQuery(intent, userContext, { limit: 10 });
   * // result.sql: "SELECT * FROM accounts WHERE engagement_score > $1 LIMIT $2"
   * // result.params: [70, 10]
   * ```
   * 
   * @throws {Error} If intent is invalid
   * @throws {Error} If tables don't exist in schema
   * @throws {Error} If JOIN resolution fails
   * 
   * @see {@link QueryIntent} for intent structure
   * @see {@link UserContext} for user context structure
   * @see {@link QueryOptions} for options structure
   */
  async buildQuery(
    intent: QueryIntent,
    userContext?: UserContext,
    options?: QueryOptions
  ): Promise<QueryBuilderResult> {
    console.log('[Query Builder] buildQuery called with:', {
      intentCategory: intent.category,
      tables: intent.tables,
      aggregationType: intent.aggregationType,
      hasFilters: !!intent.filters,
      userContext: userContext ? {
        userId: userContext.userId,
        employeeId: userContext.employeeId,
        role: userContext.role,
        hasPermissions: !!userContext.permissions
      } : null,
      options
    });

    this.paramCounter = 1; // Reset parameter counter
    const params: any[] = [];

    // Separate WHERE filters from HAVING filters for aggregation queries
    const isAggregationQuery = intent.category === IntentCategory.AGGREGATION_QUERY || 
                               intent.aggregationType !== undefined;
    
    // Convert intent filters to QueryFilter format
    const allIntentFilters = this.convertFiltersToQueryFilters(intent.filters || {});
    console.log('[Query Builder] Intent filters converted:', {
      count: allIntentFilters.length,
      filters: allIntentFilters.map(f => ({ field: f.field, operator: f.operator, value: f.value }))
    });
    
    // Separate pre-aggregation (WHERE) and post-aggregation (HAVING) filters
    const { whereFilters, havingFilters } = this.separateFiltersForAggregation(
      allIntentFilters,
      isAggregationQuery
    );
    console.log('[Query Builder] Filters separated:', {
      whereFiltersCount: whereFilters.length,
      havingFiltersCount: havingFilters.length,
      isAggregationQuery
    });
    
    // Add user context filters (always go in WHERE clause)
    const userFilters = this.buildUserContextFilters(intent, userContext);
    console.log('[Query Builder] User context filters:', {
      count: userFilters.length,
      filters: userFilters.map(f => ({ field: f.field, operator: f.operator, value: f.value }))
    });
    
    // Add time range filters to WHERE clause
    const timeRangeFilters = this.buildTimeRangeFilters(intent, intent.tables);
    console.log('[Query Builder] Time range filters:', {
      count: timeRangeFilters.length,
      filters: timeRangeFilters.map(f => ({ field: f.field, operator: f.operator, value: f.value }))
    });
    
    const allWhereFilters = [...whereFilters, ...userFilters, ...timeRangeFilters];
    console.log('[Query Builder] All WHERE filters combined:', {
      totalCount: allWhereFilters.length,
      breakdown: {
        intentFilters: whereFilters.length,
        userFilters: userFilters.length,
        timeRangeFilters: timeRangeFilters.length
      },
      allFilters: allWhereFilters.map(f => ({ field: f.field, operator: f.operator, value: f.value }))
    });

    // Determine grouping fields
    const groupFields = this.determineGroupFields(intent, options);
    console.log('[Query Builder] Group fields:', { count: groupFields.length, fields: groupFields });

    // Build query components
    const selectClause = this.buildSelectClause(intent, intent.tables, groupFields);
    const fromClause = this.buildFromClause(intent.tables);
    const joins = this.buildJoins(intent.tables);
    const whereClause = this.buildWhereClause(allWhereFilters, params);
    const groupByClause = this.buildGroupByClause(groupFields);
    const havingClause = this.buildHavingClause(havingFilters, params);
    const orderByClause = this.buildOrderByClause(options);
    const limitClause = this.buildLimitClause(options);

    console.log('[Query Builder] Query components built:', {
      selectClause: selectClause.substring(0, 100),
      fromClause,
      joins: joins.substring(0, 100),
      whereClause: whereClause || '(no WHERE clause)',
      groupByClause: groupByClause || '(no GROUP BY)',
      havingClause: havingClause || '(no HAVING)',
      orderByClause: orderByClause || '(no ORDER BY)',
      limitClause: limitClause || '(no LIMIT)',
      paramsCount: params.length,
      params: params
    });

    // Construct final SQL
    const sql = [
      selectClause,
      fromClause,
      joins,
      whereClause,
      groupByClause,
      havingClause,
      orderByClause,
      limitClause,
    ]
      .filter(clause => clause.trim().length > 0)
      .join(' ');

    console.log('[Query Builder] Generated SQL:', sql);
    console.log('[Query Builder] User context:', userContext);
    console.log('[Query Builder] Filters applied:', {
      allWhereFilters: allWhereFilters.map(f => ({
        field: f.field,
        operator: f.operator,
        value: f.value
      })),
      havingFilters: havingFilters.map(f => ({
        field: f.field,
        operator: f.operator,
        value: f.value
      }))
    });

    // Build explanation
    const explanation = this.buildExplanation(intent, allWhereFilters, userContext, havingFilters);

    console.log('[Query Builder] Query explanation:', explanation);
    console.log('[Query Builder] Final result:', {
      sqlLength: sql.trim().length,
      paramsCount: params.length,
      affectedTables: intent.tables
    });

    return {
      sql: sql.trim(),
      params,
      explanation,
      affectedTables: intent.tables,
    };
  }

  /**
   * Build SELECT clause based on intent and tables
   */
  private buildSelectClause(intent: QueryIntent, tables: string[], groupFields: string[] = []): string {
    const primaryTable = tables[0] || 'contacts';
    const schema = DATABASE_SCHEMA[primaryTable];

    if (!schema) {
      return `SELECT * FROM ${primaryTable}`;
    }

    const selectParts: string[] = [];

    // Handle aggregations
    if (intent.aggregationType) {
      // Detect aggregation field from intent or schema
      const aggregationField = this.detectAggregationField(intent, schema, primaryTable);
      const aggregationClause = this.buildAggregationClause(
        intent.aggregationType,
        aggregationField
      );
      selectParts.push(aggregationClause);
    }

    // Add grouping fields to SELECT if grouping is used
    if (groupFields.length > 0) {
      for (const groupField of groupFields) {
        // Check if field already in select parts
        if (!selectParts.some(part => part.includes(groupField))) {
          selectParts.push(groupField);
        }
      }
    }

    // If no aggregation and no grouping, select all columns
    if (selectParts.length === 0) {
      const columns = schema.columns.map(col => `${primaryTable}.${col.name}`).join(', ');
      return `SELECT ${columns} FROM ${primaryTable}`;
    }

    return `SELECT ${selectParts.join(', ')} FROM ${primaryTable}`;
  }

  /**
   * Build aggregation clause (COUNT, SUM, AVG, MIN, MAX)
   */
  private buildAggregationClause(aggregationType: string, field?: string): string {
    const type = aggregationType.toUpperCase();
    const fieldExpr = field || '*';
    const alias = this.getAggregationAlias(type, field);

    switch (type) {
      case 'COUNT':
        return `COUNT(${fieldExpr}) as ${alias}`;
      case 'SUM':
        return `SUM(${fieldExpr}) as ${alias}`;
      case 'AVG':
      case 'AVERAGE':
        return `AVG(${fieldExpr}) as ${alias}`;
      case 'MIN':
        return `MIN(${fieldExpr}) as ${alias}`;
      case 'MAX':
        return `MAX(${fieldExpr}) as ${alias}`;
      default:
        return `COUNT(*) as count`;
    }
  }

  /**
   * Get alias for aggregation result
   */
  private getAggregationAlias(type: string, field?: string): string {
    const typeLower = type.toLowerCase();
    
    if (field) {
      // Extract field name without table prefix
      const fieldName = field.includes('.') ? field.split('.')[1] : field;
      return `${typeLower}_${fieldName}`;
    }

    const aliasMap: Record<string, string> = {
      'COUNT': 'count',
      'SUM': 'total',
      'AVG': 'average',
      'AVERAGE': 'average',
      'MIN': 'min_value',
      'MAX': 'max_value',
    };

    return aliasMap[type] || 'result';
  }

  /**
   * Detect which field to aggregate based on intent and schema
   */
  private detectAggregationField(
    intent: QueryIntent,
    schema: any,
    tableName: string
  ): string | undefined {
    // For COUNT, return undefined (will use *)
    if (intent.aggregationType?.toUpperCase() === 'COUNT') {
      return undefined;
    }

    // Look for common aggregation fields based on aggregation type
    const aggregationFieldMap: Record<string, string[]> = {
      'SUM': ['total_price', 'price', 'value', 'amount', 'cost'],
      'AVG': ['engagement_score', 'score', 'value', 'price', 'rating'],
      'AVERAGE': ['engagement_score', 'score', 'value', 'price', 'rating'],
      'MAX': ['engagement_score', 'score', 'value', 'price', 'created_at'],
      'MIN': ['engagement_score', 'score', 'value', 'price', 'created_at'],
    };

    const aggregationType = intent.aggregationType?.toUpperCase() || '';
    const preferredFields = aggregationFieldMap[aggregationType] || ['value', 'price', 'score'];

    // Try to find preferred fields first
    for (const field of preferredFields) {
      if (schema.columns.some((col: any) => col.name === field)) {
        return `${tableName}.${field}`;
      }
    }

    // Fallback: find any numeric column
    const numericColumn = schema.columns.find(
      (col: any) => 
        col.type === 'number' || 
        col.name.includes('price') || 
        col.name.includes('value') || 
        col.name.includes('score') ||
        col.name.includes('amount')
    );

    if (numericColumn) {
      return `${tableName}.${numericColumn.name}`;
    }

    return undefined;
  }

  /**
   * Build FROM clause
   */
  private buildFromClause(tables: string[]): string {
    if (tables.length === 0) {
      return 'FROM contacts';
    }
    // FROM clause is already included in SELECT for primary table
    return '';
  }

  /**
   * Build JOIN clauses based on table relationships
   * Handles multi-hop joins, optimizes join order, and uses appropriate join types
   */
  private buildJoins(tables: string[]): string {
    if (tables.length <= 1) {
      return '';
    }

    const normalizedTables = tables.map(t => t.toLowerCase());
    const primaryTable = normalizedTables[0];
    const joins: string[] = [];
    const joinedTables = new Set<string>([primaryTable]);
    const processedJoins = new Set<string>(); // Track join pairs to avoid duplicates

    // Build relationship graph
    const relationshipGraph = this.buildRelationshipGraph(normalizedTables);

    // Use breadth-first approach to join tables, starting from primary table
    // This optimizes join order by joining directly connected tables first
    const queue: string[] = [primaryTable];
    const visited = new Set<string>([primaryTable]);

    while (queue.length > 0) {
      const currentTable = queue.shift()!;
      
      // Find all tables that can be joined from current table
      const connectedTables = relationshipGraph.get(currentTable) || [];
      
      for (const { table, relationship, path } of connectedTables) {
        // Skip if already joined
        if (joinedTables.has(table) || !normalizedTables.includes(table)) {
          continue;
        }

        // Check if this join was already processed
        const joinKey = `${currentTable}_${table}`;
        const reverseJoinKey = `${table}_${currentTable}`;
        if (processedJoins.has(joinKey) || processedJoins.has(reverseJoinKey)) {
          continue;
        }

        // Determine join type based on foreign key nullability
        const joinType = this.determineJoinType(relationship, currentTable, table);
        
        // Build join condition
        const joinCondition = this.buildJoinCondition(relationship, currentTable, table);
        
        if (joinCondition) {
          joins.push(`${joinType} JOIN ${table} ON ${joinCondition}`);
          joinedTables.add(table);
          processedJoins.add(joinKey);
          
          // Add to queue for further exploration (multi-hop joins)
          if (!visited.has(table)) {
            queue.push(table);
            visited.add(table);
          }
        }
      }
    }

    // Handle any remaining unjoined tables using path finding
    // This handles multi-hop joins through intermediate tables
    for (const table of normalizedTables) {
      if (!joinedTables.has(table)) {
        const path = this.findJoinPath(primaryTable, table, relationshipGraph, joinedTables);
        if (path && path.length > 1) {
          // Join through the path (including intermediate tables)
          for (let i = 1; i < path.length; i++) {
            const fromTable = path[i - 1];
            const toTable = path[i];
            
            // Skip if already joined (might be an intermediate table we already joined)
            if (joinedTables.has(toTable)) {
              continue;
            }
            
            const joinKey = `${fromTable}_${toTable}`;
            const reverseJoinKey = `${toTable}_${fromTable}`;
            
            if (!processedJoins.has(joinKey) && !processedJoins.has(reverseJoinKey)) {
              const relationship = this.findRelationship(fromTable, toTable);
              if (relationship) {
                const joinType = this.determineJoinType(relationship, fromTable, toTable);
                const joinCondition = this.buildJoinCondition(relationship, fromTable, toTable);
                
                if (joinCondition) {
                  joins.push(`${joinType} JOIN ${toTable} ON ${joinCondition}`);
                  joinedTables.add(toTable);
                  processedJoins.add(joinKey);
                }
              }
            }
          }
        }
      }
    }

    return joins.join(' ');
  }

  /**
   * Build a relationship graph for efficient path finding
   * Includes all relationships to allow multi-hop joins through intermediate tables
   */
  private buildRelationshipGraph(tables: string[]): Map<string, Array<{ table: string; relationship: any; path: string[] }>> {
    const graph = new Map<string, Array<{ table: string; relationship: any; path: string[] }>>();
    const allRelationships = TABLE_RELATIONSHIPS;
    const allTablesSet = new Set(tables);

    // Build bidirectional graph including ALL relationships
    // This allows finding paths through intermediate tables not explicitly in the query
    for (const rel of allRelationships) {
      const fromTable = rel.fromTable.toLowerCase();
      const toTable = rel.toTable.toLowerCase();

      // Include relationship if at least one table is in the query
      // This allows multi-hop joins through intermediate tables
      const fromInQuery = allTablesSet.has(fromTable);
      const toInQuery = allTablesSet.has(toTable);

      if (fromInQuery || toInQuery) {
        // Add forward relationship
        if (!graph.has(fromTable)) {
          graph.set(fromTable, []);
        }
        graph.get(fromTable)!.push({
          table: toTable,
          relationship: rel,
          path: [fromTable, toTable],
        });

        // Add reverse relationship (for bidirectional traversal)
        if (!graph.has(toTable)) {
          graph.set(toTable, []);
        }
        graph.get(toTable)!.push({
          table: fromTable,
          relationship: rel,
          path: [toTable, fromTable],
        });
      }
    }

    return graph;
  }

  /**
   * Find shortest path between two tables using BFS
   * Finds path through any tables in the graph, not just already joined ones
   */
  private findJoinPath(
    startTable: string,
    endTable: string,
    graph: Map<string, Array<{ table: string; relationship: any; path: string[] }>>,
    alreadyJoined: Set<string>
  ): string[] | null {
    if (startTable === endTable) {
      return [startTable];
    }

    const queue: Array<{ table: string; path: string[] }> = [{ table: startTable, path: [startTable] }];
    const visited = new Set<string>([startTable]);

    while (queue.length > 0) {
      const { table, path } = queue.shift()!;
      const neighbors = graph.get(table) || [];

      for (const neighbor of neighbors) {
        if (neighbor.table === endTable) {
          return [...path, neighbor.table];
        }

        // Explore all connected tables in the graph (not just already joined ones)
        // This allows finding multi-hop paths through intermediate tables
        if (!visited.has(neighbor.table)) {
          visited.add(neighbor.table);
          queue.push({ table: neighbor.table, path: [...path, neighbor.table] });
        }
      }
    }

    return null;
  }

  /**
   * Find relationship between two tables
   */
  private findRelationship(fromTable: string, toTable: string): any {
    return TABLE_RELATIONSHIPS.find(
      rel =>
        (rel.fromTable.toLowerCase() === fromTable && rel.toTable.toLowerCase() === toTable) ||
        (rel.fromTable.toLowerCase() === toTable && rel.toTable.toLowerCase() === fromTable)
    );
  }

  /**
   * Determine join type (INNER vs LEFT) based on foreign key nullability
   */
  private determineJoinType(relationship: any, fromTable: string, toTable: string): 'INNER' | 'LEFT' {
    // Check if the foreign key is nullable
    const isFromTable = relationship.fromTable.toLowerCase() === fromTable;
    const foreignKeyTable = isFromTable ? fromTable : toTable;
    const foreignKey = relationship.foreignKey;

    const schema = DATABASE_SCHEMA[foreignKeyTable];
    if (!schema) {
      // Default to LEFT JOIN if schema not found (safer)
      return 'LEFT';
    }

    const foreignKeyColumn = schema.columns.find((col: any) => col.name === foreignKey);
    if (!foreignKeyColumn) {
      return 'LEFT';
    }

    // Use INNER JOIN if foreign key is NOT NULL (required relationship)
    // Use LEFT JOIN if foreign key is nullable (optional relationship)
    return foreignKeyColumn.nullable ? 'LEFT' : 'INNER';
  }

  /**
   * Build join condition SQL
   */
  private buildJoinCondition(relationship: any, fromTable: string, toTable: string): string {
    const isFromTable = relationship.fromTable.toLowerCase() === fromTable;
    
    if (isFromTable) {
      // Standard join: fromTable.foreignKey = toTable.id
      return `${fromTable}.${relationship.foreignKey} = ${toTable}.id`;
    } else {
      // Reverse join: toTable.foreignKey = fromTable.id
      return `${toTable}.${relationship.foreignKey} = ${fromTable}.id`;
    }
  }

  /**
   * Build WHERE clause from filters
   * Handles special user filters with OR conditions (assigned_to OR created_by)
   */
  private buildWhereClause(filters: QueryFilter[], params: any[]): string {
    console.log('[Query Builder] buildWhereClause called with:', {
      filterCount: filters.length,
      filters: filters.map(f => ({ field: f.field, operator: f.operator, value: f.value }))
    });

    if (filters.length === 0) {
      console.log('[Query Builder] No filters provided, returning empty WHERE clause');
      return '';
    }

    const conditions: string[] = [];

    for (const filter of filters) {
      // Check if this is a user filter with OR condition
      const userFilter = filter as QueryFilter & { 
        isUserFilter?: boolean;
        table?: string;
      };
      
      if (userFilter.isUserFilter) {
        // This is a user OR filter - build the OR condition with proper parameterization
        const userId = userFilter.value;
        const fields = userFilter.field.split('|'); // Fields are separated by |
        
        // Build OR condition with parameterized values
        const orConditionParts: string[] = [];
        for (const field of fields) {
          const paramPlaceholder = `$${this.paramCounter++}`;
          orConditionParts.push(`${field} = ${paramPlaceholder}`);
          params.push(userId);
        }
        
        const orCondition = orConditionParts.length > 1
          ? `(${orConditionParts.join(' OR ')})`
          : orConditionParts[0];
        
        console.log('[Query Builder] Adding user OR filter condition:', orCondition);
        console.log('[Query Builder] User OR filter params:', { 
          userId, 
          fieldCount: fields.length,
          fields,
          paramsAdded: fields.length
        });
        conditions.push(orCondition);
        continue;
      }
      
      // Check if this is a time range SQL filter (field contains SQL, not just a field name)
      if (this.isTimeRangeSQLFilter(filter.field)) {
        // The field itself contains the SQL condition
        console.log('[Query Builder] Adding time range SQL filter:', filter.field);
        conditions.push(filter.field);
      } else {
        const condition = this.buildFilterCondition(filter, params);
        if (condition) {
          console.log('[Query Builder] Adding filter condition:', condition);
          conditions.push(condition);
        } else {
          console.warn('[Query Builder] Filter condition was empty for filter:', filter);
        }
      }
    }

    if (conditions.length === 0) {
      console.log('[Query Builder] No valid conditions generated, returning empty WHERE clause');
      return '';
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    console.log('[Query Builder] WHERE clause built:', whereClause);
    console.log('[Query Builder] WHERE clause params:', params);
    
    return whereClause;
  }

  /**
   * Check if a filter field contains SQL (for time range filters)
   */
  private isTimeRangeSQLFilter(field: string): boolean {
    // Time range SQL filters contain PostgreSQL functions or operators
    return field.includes('CURRENT_DATE') || 
           field.includes('DATE_TRUNC') || 
           field.includes('INTERVAL') ||
           field.includes(' AND ') ||
           (field.includes('>=') && field.includes('<'));
  }

  /**
   * Build a single filter condition
   */
  private buildFilterCondition(filter: QueryFilter, params: any[]): string {
    const { field, operator, value } = filter;

    switch (operator) {
      case '=':
        params.push(value);
        return `${field} = $${this.paramCounter++}`;
      case '!=':
        params.push(value);
        return `${field} != $${this.paramCounter++}`;
      case '>':
        params.push(value);
        return `${field} > $${this.paramCounter++}`;
      case '>=':
        params.push(value);
        return `${field} >= $${this.paramCounter++}`;
      case '<':
        params.push(value);
        return `${field} < $${this.paramCounter++}`;
      case '<=':
        params.push(value);
        return `${field} <= $${this.paramCounter++}`;
      case 'LIKE':
        params.push(`%${value}%`);
        return `${field} LIKE $${this.paramCounter++}`;
      case 'IN':
        if (Array.isArray(value)) {
          const placeholders = value.map(() => `$${this.paramCounter++}`).join(', ');
          params.push(...value);
          return `${field} IN (${placeholders})`;
        }
        return '';
      case 'NOT IN':
        if (Array.isArray(value)) {
          const placeholders = value.map(() => `$${this.paramCounter++}`).join(', ');
          params.push(...value);
          return `${field} NOT IN (${placeholders})`;
        }
        return '';
      case 'IS NULL':
        return `${field} IS NULL`;
      case 'IS NOT NULL':
        return `${field} IS NOT NULL`;
      case 'BETWEEN':
        if (Array.isArray(value) && value.length === 2) {
          params.push(value[0], value[1]);
          return `${field} BETWEEN $${this.paramCounter++} AND $${this.paramCounter++}`;
        }
        return '';
      default:
        return '';
    }
  }

  /**
   * Build GROUP BY clause
   */
  private buildGroupByClause(groupFields: string[]): string {
    if (groupFields.length === 0) {
      return '';
    }
    return `GROUP BY ${groupFields.join(', ')}`;
  }

  /**
   * Determine grouping fields from intent or options
   */
  private determineGroupFields(intent: QueryIntent, options?: QueryOptions): string[] {
    // Check options first
    if (options?.groupBy && options.groupBy.length > 0) {
      return options.groupBy;
    }

    // Check if grouping is implied by intent filters (e.g., "by type", "by employee")
    const groupFields: string[] = [];
    const primaryTable = intent.tables[0] || 'contacts';
    const schema = DATABASE_SCHEMA[primaryTable];

    if (schema && intent.filters) {
      // Look for common grouping fields in filters
      const commonGroupFields = ['type', 'status', 'assigned_employee_id', 'assigned_to', 'created_by', 'source'];
      for (const field of commonGroupFields) {
        if (schema.columns.some((col: any) => col.name === field)) {
          // Check if this field is used in filters (indicating grouping intent)
          if (intent.filters[field] || Object.keys(intent.filters).some(k => k.includes(field))) {
            groupFields.push(`${primaryTable}.${field}`);
          }
        }
      }
    }

    return groupFields;
  }

  /**
   * Build HAVING clause for post-aggregation filtering
   */
  private buildHavingClause(filters: QueryFilter[], params: any[]): string {
    if (filters.length === 0) {
      return '';
    }

    const conditions: string[] = [];

    for (const filter of filters) {
      const condition = this.buildFilterCondition(filter, params);
      if (condition) {
        conditions.push(condition);
      }
    }

    if (conditions.length === 0) {
      return '';
    }

    return `HAVING ${conditions.join(' AND ')}`;
  }

  /**
   * Separate filters into WHERE (pre-aggregation) and HAVING (post-aggregation) filters
   */
  private separateFiltersForAggregation(
    filters: QueryFilter[],
    isAggregationQuery: boolean
  ): { whereFilters: QueryFilter[]; havingFilters: QueryFilter[] } {
    if (!isAggregationQuery) {
      return { whereFilters: filters, havingFilters: [] };
    }

    const whereFilters: QueryFilter[] = [];
    const havingFilters: QueryFilter[] = [];

    // Filters on aggregation results (e.g., COUNT > 10, SUM > 1000) go in HAVING
    // Filters on base columns go in WHERE
    for (const filter of filters) {
      // Check if filter is on an aggregation result
      const isAggregationFilter = 
        filter.field.toLowerCase().includes('count') ||
        filter.field.toLowerCase().includes('sum') ||
        filter.field.toLowerCase().includes('avg') ||
        filter.field.toLowerCase().includes('average') ||
        filter.field.toLowerCase().includes('min') ||
        filter.field.toLowerCase().includes('max') ||
        filter.field.toLowerCase().includes('total');

      if (isAggregationFilter) {
        havingFilters.push(filter);
      } else {
        whereFilters.push(filter);
      }
    }

    return { whereFilters, havingFilters };
  }

  /**
   * Build ORDER BY clause
   */
  private buildOrderByClause(options?: QueryOptions): string {
    if (options?.orderBy && options.orderBy.length > 0) {
      const orderParts = options.orderBy.map(
        order => `${order.field} ${order.direction}`
      );
      return `ORDER BY ${orderParts.join(', ')}`;
    }
    return '';
  }

  /**
   * Build LIMIT/OFFSET clause
   */
  private buildLimitClause(options?: QueryOptions): string {
    const parts: string[] = [];
    
    if (options?.limit) {
      parts.push(`LIMIT ${options.limit}`);
    }
    
    if (options?.offset) {
      parts.push(`OFFSET ${options.offset}`);
    }
    
    return parts.join(' ');
  }

  /**
   * Convert intent filters (Record<string, any>) to QueryFilter array
   */
  private convertFiltersToQueryFilters(filters: Record<string, any>): QueryFilter[] {
    const queryFilters: QueryFilter[] = [];

    for (const [field, value] of Object.entries(filters)) {
      if (value === null || value === undefined) {
        continue;
      }

      // Handle object-based filters (e.g., { $lt: 50 })
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        for (const [op, opValue] of Object.entries(value)) {
          const operator = this.mapOperator(op);
          if (operator) {
            queryFilters.push({ field, operator, value: opValue });
          }
        }
      } else if (Array.isArray(value)) {
        // Array values default to IN operator
        queryFilters.push({ field, operator: 'IN', value });
      } else {
        // Simple equality
        queryFilters.push({ field, operator: '=', value });
      }
    }

    return queryFilters;
  }

  /**
   * Map filter operator strings to QueryFilter operators
   */
  private mapOperator(op: string): QueryFilter['operator'] | null {
    const operatorMap: Record<string, QueryFilter['operator']> = {
      $eq: '=',
      $ne: '!=',
      $gt: '>',
      $gte: '>=',
      $lt: '<',
      $lte: '<=',
      $like: 'LIKE',
      $in: 'IN',
      $nin: 'NOT IN',
      $null: 'IS NULL',
      $notNull: 'IS NOT NULL',
      $between: 'BETWEEN',
    };

    return operatorMap[op.toLowerCase()] || null;
  }

  /**
   * Build time range filters for WHERE clause
   */
  private buildTimeRangeFilters(intent: QueryIntent, tables: string[]): QueryFilter[] {
    if (!intent.timeRange) {
      return [];
    }

    const filters: QueryFilter[] = [];
    const primaryTable = tables[0] || 'contacts';
    const schema = DATABASE_SCHEMA[primaryTable];

    if (!schema) {
      return [];
    }

    // Find created_at or timestamp column
    const timestampColumn = schema.columns.find(
      (col: any) => col.name === 'created_at' || col.name.includes('date') || col.name.includes('timestamp')
    );

    if (!timestampColumn) {
      return [];
    }

    const field = `${primaryTable}.${timestampColumn.name}`;
    
    // Check if we have a single relative time expression (e.g., "this week", "last 30 days")
    // If start is a relative expression, use it to build the full range
    if (intent.timeRange.start && typeof intent.timeRange.start === 'string' && 
        this.isRelativeTimeExpression(intent.timeRange.start)) {
      const timeRangeSQL = this.buildTimeRangeFilter(intent.timeRange.start, field);
      if (timeRangeSQL) {
        // For relative expressions, the SQL contains the full range condition
        filters.push({
          field: timeRangeSQL,
          operator: '=',
          value: true, // Placeholder, actual SQL is in field
        });
        return filters;
      }
    }

    // Handle absolute dates or mixed start/end
    if (intent.timeRange.start) {
      if (typeof intent.timeRange.start === 'string' && this.isRelativeTimeExpression(intent.timeRange.start)) {
        // If start is relative but we also have an end, build start condition
        const timeRangeSQL = this.buildTimeRangeFilter(intent.timeRange.start, field);
        if (timeRangeSQL) {
          filters.push({
            field: timeRangeSQL,
            operator: '=',
            value: true,
          });
        }
      } else {
        // Absolute date
        filters.push({
          field,
          operator: '>=',
          value: intent.timeRange.start,
        });
      }
    }

    if (intent.timeRange.end) {
      if (typeof intent.timeRange.end === 'string' && this.isRelativeTimeExpression(intent.timeRange.end)) {
        // If end is relative, build end condition
        const timeRangeSQL = this.buildTimeRangeFilter(intent.timeRange.end, field, true);
        if (timeRangeSQL) {
          filters.push({
            field: timeRangeSQL,
            operator: '=',
            value: true,
          });
        }
      } else {
        // Absolute date
        filters.push({
          field,
          operator: '<=',
          value: intent.timeRange.end,
        });
      }
    }

    return filters;
  }

  /**
   * Check if a string is a relative time expression
   */
  private isRelativeTimeExpression(timeRange: string): boolean {
    const relativeExpressions = [
      'today', 'yesterday', 'this week', 'last week', 'this month', 'last month',
      'this quarter', 'last quarter', 'this year', 'last year',
      'last 7 days', 'last 30 days', 'last 90 days', 'last 6 months',
      'this week', 'last week', 'next week'
    ];
    
    const normalized = timeRange.toLowerCase().trim();
    return relativeExpressions.some(expr => normalized.includes(expr.toLowerCase()));
  }

  /**
   * Build time range filter SQL using PostgreSQL date functions
   * Converts relative time expressions like "this week", "last 30 days" into SQL
   * 
   * @param timeRange - Relative time expression (e.g., "this week", "last 30 days")
   * @param dateField - The date field to filter on (e.g., "activities.created_at")
   * @param isEndDate - If true, only return the end condition (for <=)
   * @returns SQL condition string or empty string if no match
   */
  private buildTimeRangeFilter(timeRange: string, dateField: string, isEndDate: boolean = false): string {
    const normalized = timeRange.toLowerCase().trim();
    
    // Handle single date expressions
    if (normalized === 'today') {
      if (isEndDate) {
        return `${dateField} < CURRENT_DATE + INTERVAL '1 day'`;
      }
      return `${dateField} >= CURRENT_DATE AND ${dateField} < CURRENT_DATE + INTERVAL '1 day'`;
    }
    
    if (normalized === 'yesterday') {
      if (isEndDate) {
        return `${dateField} < CURRENT_DATE`;
      }
      return `${dateField} >= CURRENT_DATE - INTERVAL '1 day' AND ${dateField} < CURRENT_DATE`;
    }
    
    // Handle "this week" - from start of current week to end of current week
    if (normalized === 'this week') {
      if (isEndDate) {
        return `${dateField} < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'`;
      }
      return `${dateField} >= DATE_TRUNC('week', CURRENT_DATE) AND ${dateField} < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'`;
    }
    
    // Handle "last week" - previous week
    if (normalized === 'last week') {
      if (isEndDate) {
        return `${dateField} < DATE_TRUNC('week', CURRENT_DATE)`;
      }
      return `${dateField} >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week' AND ${dateField} < DATE_TRUNC('week', CURRENT_DATE)`;
    }
    
    // Handle "this month" - current month
    if (normalized === 'this month') {
      if (isEndDate) {
        return `${dateField} < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`;
      }
      return `${dateField} >= DATE_TRUNC('month', CURRENT_DATE) AND ${dateField} < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`;
    }
    
    // Handle "last month" - previous month
    if (normalized === 'last month') {
      if (isEndDate) {
        return `${dateField} < DATE_TRUNC('month', CURRENT_DATE)`;
      }
      return `${dateField} >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' AND ${dateField} < DATE_TRUNC('month', CURRENT_DATE)`;
    }
    
    // Handle "this quarter" - current quarter
    if (normalized === 'this quarter') {
      if (isEndDate) {
        return `${dateField} < DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months'`;
      }
      return `${dateField} >= DATE_TRUNC('quarter', CURRENT_DATE) AND ${dateField} < DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months'`;
    }
    
    // Handle "last quarter" - previous quarter
    if (normalized === 'last quarter') {
      if (isEndDate) {
        return `${dateField} < DATE_TRUNC('quarter', CURRENT_DATE)`;
      }
      return `${dateField} >= DATE_TRUNC('quarter', CURRENT_DATE) - INTERVAL '3 months' AND ${dateField} < DATE_TRUNC('quarter', CURRENT_DATE)`;
    }
    
    // Handle "this year" - current year
    if (normalized === 'this year') {
      if (isEndDate) {
        return `${dateField} < DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'`;
      }
      return `${dateField} >= DATE_TRUNC('year', CURRENT_DATE) AND ${dateField} < DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'`;
    }
    
    // Handle "last year" - previous year
    if (normalized === 'last year') {
      if (isEndDate) {
        return `${dateField} < DATE_TRUNC('year', CURRENT_DATE)`;
      }
      return `${dateField} >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year' AND ${dateField} < DATE_TRUNC('year', CURRENT_DATE)`;
    }
    
    // Handle "last N days" pattern (e.g., "last 7 days", "last 30 days")
    const lastDaysMatch = normalized.match(/last\s+(\d+)\s+days?/i);
    if (lastDaysMatch) {
      const days = parseInt(lastDaysMatch[1], 10);
      if (isEndDate) {
        return `${dateField} < CURRENT_DATE + INTERVAL '1 day'`;
      }
      return `${dateField} >= CURRENT_DATE - INTERVAL '${days} days' AND ${dateField} < CURRENT_DATE + INTERVAL '1 day'`;
    }
    
    // Handle "last N months" pattern (e.g., "last 6 months")
    const lastMonthsMatch = normalized.match(/last\s+(\d+)\s+months?/i);
    if (lastMonthsMatch) {
      const months = parseInt(lastMonthsMatch[1], 10);
      if (isEndDate) {
        return `${dateField} < CURRENT_DATE + INTERVAL '1 day'`;
      }
      return `${dateField} >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '${months} months' AND ${dateField} < CURRENT_DATE + INTERVAL '1 day'`;
    }
    
    // Handle "last N weeks" pattern
    const lastWeeksMatch = normalized.match(/last\s+(\d+)\s+weeks?/i);
    if (lastWeeksMatch) {
      const weeks = parseInt(lastWeeksMatch[1], 10);
      if (isEndDate) {
        return `${dateField} < CURRENT_DATE + INTERVAL '1 day'`;
      }
      return `${dateField} >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '${weeks} weeks' AND ${dateField} < CURRENT_DATE + INTERVAL '1 day'`;
    }
    
    // Handle "last N years" pattern
    const lastYearsMatch = normalized.match(/last\s+(\d+)\s+years?/i);
    if (lastYearsMatch) {
      const years = parseInt(lastYearsMatch[1], 10);
      if (isEndDate) {
        return `${dateField} < CURRENT_DATE + INTERVAL '1 day'`;
      }
      return `${dateField} >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '${years} years' AND ${dateField} < CURRENT_DATE + INTERVAL '1 day'`;
    }
    
    // Default: return empty string if no match
    return '';
  }

  /**
   * Build user context filters (e.g., filter by assigned employee)
   * For employees: Adds filters for both assigned_to and created_by (OR condition)
   * For admins: No user filters (show all data)
   */
  private buildUserContextFilters(
    intent: QueryIntent,
    userContext?: UserContext
  ): QueryFilter[] {
    console.log('[CRM Query] User context:', { 
      userId: userContext?.userId, 
      employeeId: userContext?.employeeId,
      role: userContext?.role 
    });
    
    if (!userContext || (!userContext.userId && !userContext.employeeId)) {
      console.log('[CRM Query] No user context provided, skipping user filters');
      return [];
    }

    // Get user ID - prefer userId, fallback to employeeId
    const userId = userContext.userId || userContext.employeeId;
    if (!userId) {
      console.log('[CRM Query] No user ID found in context, skipping user filters');
      return [];
    }

    // Normalize role to lowercase for comparison
    const role = userContext.role?.toLowerCase() || '';
    const isAdmin = role === 'admin';

    console.log('[CRM Query] User filter check:', {
      userId,
      role,
      isAdmin
    });

    // For admins, don't add user filters (show all data)
    if (isAdmin) {
      console.log('[CRM Query] Admin user detected, skipping user filters');
      return [];
    }

    const filters: QueryFilter[] = [];

    // Add user context filters based on intent category and tables
    for (const table of intent.tables) {
      const tableLower = table.toLowerCase();
      const schema = DATABASE_SCHEMA[tableLower];
      if (!schema) {
        console.error('[CRM Query] ⚠️ Schema not found for table:', table);
        console.error('[CRM Query] Available tables:', Object.keys(DATABASE_SCHEMA).join(', '));
        console.error('[CRM Query] This might indicate a table name mismatch. Verify your database table names match the schema.');
        continue;
      }
      
      console.log('[CRM Query] Found schema for table:', table, {
        tableName: schema.tableName,
        columnCount: schema.columns.length,
        columnNames: schema.columns.map(c => c.name)
      });

      // Find all user-related columns
      const assignedToColumn = schema.columns.find(col => 
        col.name === 'assigned_to' || 
        col.name === 'assigned_employee_id' ||
        col.name === 'assigned_employee'
      );
      
      const createdByColumn = schema.columns.find(col => 
        col.name === 'created_by' || 
        col.name === 'created_by_id'
      );

      console.log('[CRM Query] Table:', table, {
        hasAssignedTo: !!assignedToColumn,
        assignedToColumn: assignedToColumn?.name,
        hasCreatedBy: !!createdByColumn,
        createdByColumn: createdByColumn?.name,
        role,
        isAdmin
      });

      // For employees: Add filters for both assigned_to AND created_by (OR condition)
      // We'll create a special filter that combines both with OR
      if (assignedToColumn || createdByColumn) {
        // Store the fields that need to be checked for this user
        const userFilterFields: string[] = [];
        
        if (assignedToColumn) {
          userFilterFields.push(`${table}.${assignedToColumn.name}`);
        }
        
        if (createdByColumn) {
          userFilterFields.push(`${table}.${createdByColumn.name}`);
        }

        if (userFilterFields.length > 0) {
          // Store a special filter that will be processed in buildWhereClause
          // The field will contain the field names separated by | as a marker
          filters.push({
            field: userFilterFields.join('|'), // Use | as separator to identify user filter fields
            operator: '=', // This will be ignored for user filters
            value: userId, // Store userId for parameter substitution
            isUserFilter: true, // Flag to indicate this needs special handling
            table: table, // Store table name for reference
          } as QueryFilter & { 
            isUserFilter?: boolean;
            table?: string;
          });
          
          console.log('[CRM Query] Added user OR filter:', {
            table,
            fields: userFilterFields,
            userId,
            hasAssignedTo: !!assignedToColumn,
            hasCreatedBy: !!createdByColumn
          });
        }
      } else {
        console.log('[CRM Query] No user columns (assigned_to/created_by) found for table:', table);
      }
    }

    console.log('[CRM Query] Total user filters:', filters.length);
    return filters;
  }

  /**
   * Build human-readable explanation of the query
   */
  private buildExplanation(
    intent: QueryIntent,
    filters: QueryFilter[],
    userContext?: UserContext,
    havingFilters: QueryFilter[] = []
  ): string {
    const parts: string[] = [];

    parts.push(`Querying ${intent.tables.join(', ')}`);
    
    if (intent.aggregationType) {
      parts.push(`with ${intent.aggregationType} aggregation`);
    }

    if (filters.length > 0) {
      const filterDescriptions = filters.map(f => {
        if (f.operator === '=') {
          return `${f.field} = ${f.value}`;
        } else if (f.operator === '>') {
          return `${f.field} > ${f.value}`;
        } else if (f.operator === '<') {
          return `${f.field} < ${f.value}`;
        } else if (f.operator === 'IN') {
          return `${f.field} IN (${Array.isArray(f.value) ? f.value.join(', ') : f.value})`;
        }
        return `${f.field} ${f.operator} ${f.value}`;
      });
      parts.push(`filtered by: ${filterDescriptions.join(', ')}`);
    }

    if (havingFilters.length > 0) {
      const havingDescriptions = havingFilters.map(f => {
        return `${f.field} ${f.operator} ${f.value}`;
      });
      parts.push(`with post-aggregation filters: ${havingDescriptions.join(', ')}`);
    }

    if (intent.timeRange) {
      parts.push(
        `for time range: ${intent.timeRange.start || 'start'} to ${intent.timeRange.end || 'end'}`
      );
    }

    if (userContext && userContext.role !== 'admin') {
      parts.push(`(scoped to current user)`);
    }

    return parts.join(' ');
  }
}

/**
 * Factory function to create a new DynamicQueryBuilder instance
 */
export function createQueryBuilder(): DynamicQueryBuilder {
  return new DynamicQueryBuilder();
}

