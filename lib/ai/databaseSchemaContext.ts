/**
 * Database schema context for AI query processing
 * Provides schema information and relationships for all database tables
 */

export interface TableSchema {
  tableName: string;
  columns: {
    name: string;
    type: string;
    description?: string;
    nullable?: boolean;
  }[];
  primaryKey?: string;
  indexes?: string[];
}

export interface TableRelationship {
  fromTable: string;
  toTable: string;
  foreignKey: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many' | 'many-to-one';
  description?: string;
}

/**
 * Complete database schema for all tables
 * 
 * IMPORTANT: Verify table names match your actual Supabase database!
 * Run this SQL to check:
 * SELECT table_name FROM information_schema.tables 
 * WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
 * 
 * Common mismatches to check:
 * - contacts vs contact (singular)
 * - activities vs activity (singular)
 * - sub_accounts vs subaccounts (no underscore)
 * - follow_ups vs followups (no underscore)
 */
export const DATABASE_SCHEMA: Record<string, TableSchema> = {
  contacts: {
    tableName: 'contacts',
    columns: [
      { name: 'id', type: 'integer', description: 'Primary key', nullable: false },
      { name: 'name', type: 'string', description: 'Contact full name', nullable: false },
      { name: 'email', type: 'string', description: 'Contact email address', nullable: true },
      { name: 'phone', type: 'string', description: 'Contact phone number', nullable: true },
      { name: 'account_id', type: 'integer', description: 'Foreign key to accounts', nullable: true },
      { name: 'sub_account_id', type: 'integer', description: 'Foreign key to sub_accounts', nullable: true },
      { name: 'created_at', type: 'timestamp', description: 'Record creation timestamp', nullable: false },
      // NOTE: If your contacts table has assigned_to or created_by columns, add them here:
      // { name: 'assigned_to', type: 'integer', description: 'Foreign key to users (assigned employee)', nullable: true },
      // { name: 'created_by', type: 'integer', description: 'Foreign key to users (creator)', nullable: true },
    ],
    primaryKey: 'id',
    indexes: ['account_id', 'sub_account_id'],
  },
  sub_accounts: {
    tableName: 'sub_accounts',
    columns: [
      { name: 'id', type: 'integer', description: 'Primary key', nullable: false },
      { name: 'name', type: 'string', description: 'Sub-account name', nullable: false },
      { name: 'engagement_score', type: 'number', description: 'AI-calculated engagement score (0-100)', nullable: true },
      { name: 'ai_insights', type: 'jsonb', description: 'AI-generated insights and tips', nullable: true },
      { name: 'assigned_employee_id', type: 'integer', description: 'Foreign key to users (assigned employee)', nullable: true },
    ],
    primaryKey: 'id',
    indexes: ['assigned_employee_id'],
  },
  accounts: {
    tableName: 'accounts',
    columns: [
      { name: 'id', type: 'integer', description: 'Primary key', nullable: false },
      { name: 'name', type: 'string', description: 'Account name', nullable: false },
      { name: 'industry', type: 'string', description: 'Industry classification', nullable: true },
      { name: 'potential_value', type: 'number', description: 'Estimated potential revenue value', nullable: true },
    ],
    primaryKey: 'id',
  },
  activities: {
    tableName: 'activities',
    columns: [
      { name: 'id', type: 'integer', description: 'Primary key', nullable: false },
      { name: 'type', type: 'string', description: 'Activity type (call, meeting, email, etc.)', nullable: false },
      { name: 'description', type: 'text', description: 'Activity description/notes', nullable: true },
      { name: 'sub_account_id', type: 'integer', description: 'Foreign key to sub_accounts', nullable: true },
      { name: 'created_by', type: 'integer', description: 'Foreign key to users (creator)', nullable: false },
      { name: 'created_at', type: 'timestamp', description: 'Activity timestamp', nullable: false },
    ],
    primaryKey: 'id',
    indexes: ['sub_account_id', 'created_by', 'created_at'],
  },
  follow_ups: {
    tableName: 'follow_ups',
    columns: [
      { name: 'id', type: 'integer', description: 'Primary key', nullable: false },
      { name: 'title', type: 'string', description: 'Follow-up title/description', nullable: false },
      { name: 'due_date', type: 'date', description: 'Due date for follow-up', nullable: false },
      { name: 'status', type: 'string', description: 'Follow-up status (pending, completed, cancelled)', nullable: false },
      { name: 'sub_account_id', type: 'integer', description: 'Foreign key to sub_accounts', nullable: true },
      { name: 'assigned_to', type: 'integer', description: 'Foreign key to users (assigned employee)', nullable: false },
    ],
    primaryKey: 'id',
    indexes: ['sub_account_id', 'assigned_to', 'due_date', 'status'],
  },
  quotes_mbcb: {
    tableName: 'quotes_mbcb',
    columns: [
      { name: 'id', type: 'integer', description: 'Primary key', nullable: false },
      { name: 'sub_account_id', type: 'integer', description: 'Foreign key to sub_accounts', nullable: true },
      { name: 'total_price', type: 'number', description: 'Total quote price', nullable: false },
      { name: 'status', type: 'string', description: 'Quote status (draft, sent, accepted, rejected)', nullable: false },
      { name: 'ai_suggested_price_per_unit', type: 'number', description: 'AI-suggested price per unit', nullable: true },
      { name: 'ai_win_probability', type: 'number', description: 'AI-calculated win probability (0-100)', nullable: true },
    ],
    primaryKey: 'id',
    indexes: ['sub_account_id', 'status'],
  },
  quotes_signages: {
    tableName: 'quotes_signages',
    columns: [
      { name: 'id', type: 'integer', description: 'Primary key', nullable: false },
      { name: 'sub_account_id', type: 'integer', description: 'Foreign key to sub_accounts', nullable: true },
      { name: 'total_price', type: 'number', description: 'Total quote price', nullable: false },
      { name: 'status', type: 'string', description: 'Quote status (draft, sent, accepted, rejected)', nullable: false },
      { name: 'ai_suggested_price_per_unit', type: 'number', description: 'AI-suggested price per unit', nullable: true },
      { name: 'ai_win_probability', type: 'number', description: 'AI-calculated win probability (0-100)', nullable: true },
    ],
    primaryKey: 'id',
    indexes: ['sub_account_id', 'status'],
  },
  quotes_paint: {
    tableName: 'quotes_paint',
    columns: [
      { name: 'id', type: 'integer', description: 'Primary key', nullable: false },
      { name: 'sub_account_id', type: 'integer', description: 'Foreign key to sub_accounts', nullable: true },
      { name: 'total_price', type: 'number', description: 'Total quote price', nullable: false },
      { name: 'status', type: 'string', description: 'Quote status (draft, sent, accepted, rejected)', nullable: false },
      { name: 'ai_suggested_price_per_unit', type: 'number', description: 'AI-suggested price per unit', nullable: true },
      { name: 'ai_win_probability', type: 'number', description: 'AI-calculated win probability (0-100)', nullable: true },
    ],
    primaryKey: 'id',
    indexes: ['sub_account_id', 'status'],
  },
  leads: {
    tableName: 'leads',
    columns: [
      { name: 'id', type: 'integer', description: 'Primary key', nullable: false },
      { name: 'name', type: 'string', description: 'Lead name/company', nullable: false },
      { name: 'status', type: 'string', description: 'Lead status (New, In Progress, Follow-up, Quotation Sent, Converted, Lost)', nullable: false },
      { name: 'score', type: 'number', description: 'Lead score/quality rating', nullable: true },
      { name: 'source', type: 'string', description: 'Lead source (website, referral, cold call, etc.)', nullable: true },
      { name: 'assigned_to', type: 'integer', description: 'Foreign key to users (assigned employee)', nullable: true },
    ],
    primaryKey: 'id',
    indexes: ['status', 'assigned_to'],
  },
  users: {
    tableName: 'users',
    columns: [
      { name: 'id', type: 'integer', description: 'Primary key', nullable: false },
      { name: 'name', type: 'string', description: 'User full name', nullable: false },
      { name: 'email', type: 'string', description: 'User email address', nullable: false },
      { name: 'role', type: 'string', description: 'User role (admin, sales, manager, etc.)', nullable: false },
    ],
    primaryKey: 'id',
    indexes: ['email'],
  },
};

/**
 * Table relationships mapping foreign keys and relationships
 */
export const TABLE_RELATIONSHIPS: TableRelationship[] = [
  // Contacts relationships
  {
    fromTable: 'contacts',
    toTable: 'accounts',
    foreignKey: 'account_id',
    relationshipType: 'many-to-one',
    description: 'Many contacts can belong to one account',
  },
  {
    fromTable: 'contacts',
    toTable: 'sub_accounts',
    foreignKey: 'sub_account_id',
    relationshipType: 'many-to-one',
    description: 'Many contacts can belong to one sub-account',
  },
  // Sub-accounts relationships
  {
    fromTable: 'sub_accounts',
    toTable: 'users',
    foreignKey: 'assigned_employee_id',
    relationshipType: 'many-to-one',
    description: 'Many sub-accounts can be assigned to one employee',
  },
  // Activities relationships
  {
    fromTable: 'activities',
    toTable: 'sub_accounts',
    foreignKey: 'sub_account_id',
    relationshipType: 'many-to-one',
    description: 'Many activities can be associated with one sub-account',
  },
  {
    fromTable: 'activities',
    toTable: 'users',
    foreignKey: 'created_by',
    relationshipType: 'many-to-one',
    description: 'Many activities can be created by one user',
  },
  // Follow-ups relationships
  {
    fromTable: 'follow_ups',
    toTable: 'sub_accounts',
    foreignKey: 'sub_account_id',
    relationshipType: 'many-to-one',
    description: 'Many follow-ups can be associated with one sub-account',
  },
  {
    fromTable: 'follow_ups',
    toTable: 'users',
    foreignKey: 'assigned_to',
    relationshipType: 'many-to-one',
    description: 'Many follow-ups can be assigned to one user',
  },
  // Quotes relationships
  {
    fromTable: 'quotes_mbcb',
    toTable: 'sub_accounts',
    foreignKey: 'sub_account_id',
    relationshipType: 'many-to-one',
    description: 'Many MBCB quotes can be associated with one sub-account',
  },
  {
    fromTable: 'quotes_signages',
    toTable: 'sub_accounts',
    foreignKey: 'sub_account_id',
    relationshipType: 'many-to-one',
    description: 'Many signage quotes can be associated with one sub-account',
  },
  {
    fromTable: 'quotes_paint',
    toTable: 'sub_accounts',
    foreignKey: 'sub_account_id',
    relationshipType: 'many-to-one',
    description: 'Many paint quotes can be associated with one sub-account',
  },
  // Leads relationships
  {
    fromTable: 'leads',
    toTable: 'users',
    foreignKey: 'assigned_to',
    relationshipType: 'many-to-one',
    description: 'Many leads can be assigned to one user',
  },
];

/**
 * Get schema information for specific tables
 * 
 * @param tableNames - Array of table names to get schema for
 * @returns Object mapping table names to their schema information
 */
export function getSchemaForTables(tableNames: string[]): Record<string, TableSchema> {
  const result: Record<string, TableSchema> = {};
  
  console.log('[Database Schema] Looking up tables:', tableNames);
  console.log('[Database Schema] Available tables in schema:', Object.keys(DATABASE_SCHEMA));
  
  for (const tableName of tableNames) {
    const normalizedName = tableName.toLowerCase().trim();
    if (DATABASE_SCHEMA[normalizedName]) {
      result[normalizedName] = DATABASE_SCHEMA[normalizedName];
      console.log(`[Database Schema] Found table "${tableName}" (normalized: "${normalizedName}")`);
    } else {
      console.warn(`[Database Schema] ⚠️ Table "${tableName}" (normalized: "${normalizedName}") NOT FOUND in schema!`);
      console.warn(`[Database Schema] Available tables: ${Object.keys(DATABASE_SCHEMA).join(', ')}`);
      console.warn(`[Database Schema] This might indicate a table name mismatch. Verify your actual database table names.`);
    }
  }
  
  return result;
}

/**
 * Get relationships for specific tables
 * 
 * @param tableNames - Array of table names to get relationships for
 * @returns Array of relationships involving the specified tables
 */
export function getRelationshipsForTables(tableNames: string[]): TableRelationship[] {
  const normalizedNames = tableNames.map(name => name.toLowerCase().trim());
  
  return TABLE_RELATIONSHIPS.filter(
    rel => 
      normalizedNames.includes(rel.fromTable.toLowerCase()) ||
      normalizedNames.includes(rel.toTable.toLowerCase())
  );
}

/**
 * Get all tables that are related to the given tables (through relationships)
 * 
 * @param tableNames - Array of table names
 * @returns Array of related table names
 */
export function getRelatedTables(tableNames: string[]): string[] {
  const normalizedNames = new Set(tableNames.map(name => name.toLowerCase().trim()));
  const relatedTables = new Set<string>();
  
  for (const rel of TABLE_RELATIONSHIPS) {
    if (normalizedNames.has(rel.fromTable.toLowerCase())) {
      relatedTables.add(rel.toTable);
    }
    if (normalizedNames.has(rel.toTable.toLowerCase())) {
      relatedTables.add(rel.fromTable);
    }
  }
  
  return Array.from(relatedTables);
}

/**
 * Get all table names defined in the schema
 * Use this to verify against your actual database tables
 * 
 * @returns Array of table names
 */
export function getAllTableNames(): string[] {
  return Object.keys(DATABASE_SCHEMA);
}

/**
 * Log all defined table names for debugging
 * Call this to verify table names match your database
 */
export function logDefinedTables(): void {
  const tables = getAllTableNames();
  console.log('[Database Schema] Defined tables in schema:', tables);
  console.log('[Database Schema] To verify, run this SQL in Supabase:');
  console.log('[Database Schema] SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' AND table_type = \'BASE TABLE\';');
}

