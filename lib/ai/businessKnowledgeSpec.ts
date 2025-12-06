/**
 * Business Knowledge Specification
 * 
 * Central shared domain understanding for AI reasoning across CRM and Pricing modules.
 * This specification defines what the AI must understand about the business domain
 * to provide accurate, actionable insights.
 * 
 * This is a knowledge definition file - no implementation logic here.
 * Future steps will use this spec to build retrieval, embeddings, and reasoning systems.
 */

export const BUSINESS_KNOWLEDGE_MODEL = {
  /**
   * CRM Domain Knowledge
   * Entities and relationships the AI must understand for CRM reasoning
   */
  crm: {
    entities: {
      accounts: {
        description: "Top-level customer organizations",
        keyAttributes: [
          "account_name",
          "company_stage",
          "company_tag",
          "assigned_employee",
          "engagement_score",
          "is_active",
          "contact_person",
          "phone",
          "email"
        ],
        relationships: [
          "has many sub_accounts",
          "assigned to one employee",
          "has many activities",
          "has many quotations"
        ]
      },
      subAccounts: {
        description: "Sub-units or locations within an account",
        keyAttributes: [
          "sub_account_name",
          "account_id (parent)",
          "assigned_employee",
          "engagement_score",
          "is_active",
          "address",
          "city",
          "state",
          "pincode",
          "gst_number"
        ],
        relationships: [
          "belongs to one account",
          "assigned to one employee",
          "has many contacts",
          "has many activities",
          "has many quotations"
        ]
      },
      contacts: {
        description: "Individual people within sub-accounts",
        keyAttributes: [
          "name",
          "designation",
          "email",
          "phone",
          "call_status",
          "follow_up_date",
          "notes",
          "sub_account_id"
        ],
        relationships: [
          "belongs to one sub_account",
          "has many activities",
          "has follow-up dates"
        ]
      },
      quotations: {
        description: "Price quotes sent to customers",
        keyAttributes: [
          "section (mbcb/signages/paint)",
          "customer_name",
          "final_total_cost",
          "status",
          "created_by",
          "sub_account_id",
          "created_at",
          "ai_suggested_price_per_unit",
          "ai_win_probability",
          "outcome (won/lost/pending)"
        ],
        relationships: [
          "belongs to one sub_account",
          "created by one employee",
          "has outcome tracking",
          "has AI pricing analysis"
        ]
      },
      activities: {
        description: "All CRM interactions and events",
        keyAttributes: [
          "activity_type",
          "description",
          "employee_id",
          "account_id",
          "sub_account_id",
          "created_at",
          "metadata"
        ],
        relationships: [
          "performed by one employee",
          "related to account/sub_account",
          "tracks engagement changes"
        ]
      },
      engagementScores: {
        description: "AI-calculated engagement metrics (0-100)",
        keyAttributes: [
          "score (0-100)",
          "ai_insights (tips, comment)",
          "last_activity_at",
          "trend (improving/declining/stable)"
        ],
        calculationFactors: [
          "recent activity frequency",
          "activity types (calls, meetings, quotations)",
          "time since last interaction",
          "quotation outcomes",
          "follow-up completion"
        ]
      },
      assignedEmployees: {
        description: "Sales employees managing accounts",
        keyAttributes: [
          "employee username",
          "role (admin/employee)",
          "assigned accounts",
          "assigned sub_accounts",
          "activity history",
          "performance metrics"
        ],
        relationships: [
          "manages many accounts",
          "manages many sub_accounts",
          "performs many activities",
          "creates many quotations"
        ]
      },
      timelines: {
        description: "Temporal understanding of CRM data",
        keyConcepts: [
          "created_at timestamps",
          "last_activity_at dates",
          "follow_up_date deadlines",
          "quotation creation dates",
          "outcome tracking dates",
          "activity recency (today, yesterday, X days ago)"
        ]
      }
    },
    relationships: {
      accountToSubAccounts: "One-to-many: Account → Sub-Accounts",
      subAccountToContacts: "One-to-many: Sub-Account → Contacts",
      employeeToAccounts: "One-to-many: Employee → Accounts",
      employeeToSubAccounts: "One-to-many: Employee → Sub-Accounts",
      accountToActivities: "One-to-many: Account → Activities",
      subAccountToQuotations: "One-to-many: Sub-Account → Quotations",
      employeeToActivities: "One-to-many: Employee → Activities",
      contactToFollowUps: "One-to-many: Contact → Follow-up dates"
    }
  },

  /**
   * Pricing Intelligence Domain Knowledge
   * Concepts the AI must understand for pricing recommendations
   */
  pricing: {
    historicalPricing: {
      description: "Past pricing decisions and their outcomes",
      keyData: [
        "previous quote prices",
        "win/loss outcomes",
        "price adjustments made",
        "client acceptance/rejection patterns",
        "successful price ranges by product type",
        "margin achieved on won deals"
      ],
      learningInsights: [
        "prices that led to wins",
        "prices that led to losses",
        "optimal price ranges per product",
        "client price sensitivity patterns"
      ]
    },
    competitorPricing: {
      description: "Market competitor price benchmarks",
      keyConcepts: [
        "competitor_price_per_unit input",
        "our price vs competitor comparison",
        "pricing power (below/above competitor)",
        "market positioning",
        "competitive advantage factors"
      ],
      reasoningRules: [
        "If we're below competitor → we have pricing power",
        "If we're above competitor → justify premium or adjust",
        "Competitor price informs win probability"
      ]
    },
    clientDemandPrices: {
      description: "Client-requested or expected prices",
      keyConcepts: [
        "client_demand_price_per_unit input",
        "budget constraints",
        "negotiation room",
        "client price expectations",
        "willingness to pay"
      ],
      reasoningRules: [
        "Factor client budget into recommendations",
        "Balance client demand with profitability",
        "Consider negotiation flexibility"
      ]
    },
    winLossOutcomes: {
      description: "Historical win/loss tracking for pricing decisions",
      keyData: [
        "quotation outcomes (won/lost/pending)",
        "outcome_notes (why won/lost)",
        "price at time of outcome",
        "competitor price at outcome",
        "client demand at outcome",
        "time to outcome"
      ],
      learningPatterns: [
        "price ranges that win",
        "price ranges that lose",
        "factors beyond price (relationship, quality, timing)",
        "outcome correlation with AI suggestions"
      ]
    },
    productSpecificSpecs: {
      description: "Product specifications that affect pricing",
      mbcb: [
        "thickness",
        "coating GSM",
        "length",
        "section type (W-Beam, Thrie, Double W-Beam)",
        "quantity (RM)"
      ],
      signages: [
        "size",
        "material",
        "reflective properties",
        "quantity"
      ],
      paint: [
        "coverage area",
        "thickness",
        "color",
        "quantity"
      ],
      reasoningRules: [
        "Higher specs justify premium pricing",
        "Volume discounts for larger quantities",
        "Product complexity affects pricing strategy"
      ]
    },
    marginLogic: {
      description: "Profitability considerations in pricing",
      keyConcepts: [
        "cost per unit (base calculation)",
        "target margin percentages",
        "minimum acceptable margin",
        "volume-based margin adjustments",
        "premium pricing justification"
      ],
      reasoningRules: [
        "Maintain minimum margin thresholds",
        "Volume discounts can reduce margin but increase total profit",
        "Premium products justify higher margins",
        "Balance competitiveness with profitability"
      ]
    },
    closureProbabilityLogic: {
      description: "AI calculation of win probability (0-100%)",
      factors: [
        "our price vs competitor price",
        "our price vs client demand",
        "historical win rates at similar price points",
        "product specifications",
        "quantity (volume discounts)",
        "client relationship strength (engagement score)",
        "market conditions"
      ],
      calculationApproach: [
        "Compare current pricing context to historical outcomes",
        "Factor in competitive positioning",
        "Consider client budget constraints",
        "Adjust for relationship strength",
        "Output probability score (0-100)"
      ]
    }
  },

  /**
   * Universal Reasoning Rules
   * Rules the AI should always apply across all domains
   */
  reasoningRules: [
    {
      rule: "Avoid hallucination",
      description: "Never invent facts not present in provided data. If data is missing, state uncertainty rather than fabricating information.",
      application: "All AI responses must be grounded in actual database records, user inputs, or explicitly provided context."
    },
    {
      rule: "Use direct DB facts where possible",
      description: "Prefer querying actual database records over inferring or guessing. When factual data is available, use it directly.",
      application: "For CRM queries, execute database lookups. For pricing, use actual historical quotes and outcomes."
    },
    {
      rule: "Reference past successful outcomes",
      description: "When making recommendations, cite similar past situations that led to success. Learn from what worked before.",
      application: "In pricing: 'Similar quotes at ₹X won 75% of the time.' In CRM: 'Accounts with similar engagement patterns improved after Y actions.'"
    },
    {
      rule: "Compare against competitor pricing",
      description: "Always contextualize pricing recommendations relative to competitor benchmarks when available.",
      application: "If competitor price is known, explicitly state our position (above/below) and how it affects win probability."
    },
    {
      rule: "Prefer actionable insights over generic text",
      description: "Provide specific, actionable recommendations rather than generic advice. Include concrete next steps.",
      application: "Instead of 'improve engagement', say 'Call contact X at sub-account Y by [date] to discuss quotation Z.'"
    },
    {
      rule: "Respect business constraints",
      description: "Acknowledge business rules, margins, and operational constraints in all recommendations.",
      application: "Pricing recommendations must respect minimum margins. CRM actions must respect employee assignments and permissions."
    },
    {
      rule: "Explain reasoning transparently",
      description: "When providing recommendations, explain the reasoning chain that led to the conclusion.",
      application: "Show the logic: 'Based on historical data, quotes at ₹X won 80% of the time when competitor was at ₹Y and client demand was ₹Z.'"
    },
    {
      rule: "Update learning based on outcomes",
      description: "When outcomes are known (won/lost quotations, engagement changes), use them to improve future recommendations.",
      application: "Track which AI suggestions led to wins vs losses. Adjust probability calculations based on actual results."
    }
  ],

  /**
   * Purpose and Future Vision
   * Description of what the "Business Brain" will eventually do
   */
  purpose: "Central shared domain understanding for AI",
  
  futureVision: {
    description: "The Business Knowledge Model will power a 'Business Brain' system that:",
    capabilities: [
      {
        name: "Fetch structured DB snapshots",
        description: "Retrieve relevant business data (accounts, quotations, activities) in structured format for AI context"
      },
      {
        name: "Embed knowledge",
        description: "Convert business knowledge into vector embeddings for semantic search and retrieval"
      },
      {
        name: "Semantic retrieve context per query",
        description: "For each AI query, intelligently retrieve the most relevant business context (past quotes, similar accounts, outcomes) to inform reasoning"
      },
      {
        name: "Update learning based on outcomes",
        description: "Continuously learn from actual business outcomes (won/lost deals, engagement changes) to improve future recommendations"
      },
      {
        name: "Maintain domain consistency",
        description: "Ensure all AI reasoning across CRM and Pricing modules uses consistent business understanding"
      }
    ],
    benefits: [
      "More accurate recommendations grounded in actual business data",
      "Consistent reasoning across all AI features",
      "Continuous improvement from real-world outcomes",
      "Reduced hallucination through structured knowledge access",
      "Actionable insights based on historical patterns"
    ]
  }
} as const;

