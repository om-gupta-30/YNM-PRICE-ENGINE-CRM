/**
 * Quotation Pricing Validation Service
 * 
 * Validates pricing logic before saving quotations.
 * Returns errors (blocking) and warnings (non-blocking) based on business rules.
 */

// Configuration constants
export const PRICING_VALIDATION_CONFIG = {
  MIN_MARGIN: 0.05, // 5% minimum margin requirement
  MAX_CLIENT_DEMAND_DEVIATION: 0.20, // 20% above client demand triggers warning
  MIN_COMPETITOR_MARKUP: 0.01, // Must be at least 1% above competitor price
} as const;

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationResult {
  isValid: boolean;
  severity: ValidationSeverity;
  message: string;
  details?: {
    minSuggestedPrice?: number;
    requiredMinPrice?: number;
    currentMargin?: number;
    requiredMargin?: number;
    competitorPrice?: number;
    clientDemandPrice?: number;
    quotedPrice?: number;
    costPerUnit?: number;
  };
}

export interface PricingValidationInput {
  quoted_price_per_unit: number; // The price we're quoting to the client
  cost_per_unit: number; // Our calculated cost (material + transport + installation)
  competitor_price_per_unit?: number | null; // Competitor's price (optional)
  client_demand_price_per_unit?: number | null; // Client's expected/demanded price (optional)
}

export interface PricingValidationResponse {
  canSave: boolean; // false if there are blocking errors
  errors: ValidationResult[]; // Blocking issues
  warnings: ValidationResult[]; // Non-blocking alerts
}

/**
 * Main validation function
 * Validates quotation pricing against business rules
 */
export function validateQuotationPricing(
  input: PricingValidationInput
): PricingValidationResponse {
  const errors: ValidationResult[] = [];
  const warnings: ValidationResult[] = [];

  const {
    quoted_price_per_unit,
    cost_per_unit,
    competitor_price_per_unit,
    client_demand_price_per_unit,
  } = input;

  // Validation: Ensure required fields are valid numbers
  if (typeof quoted_price_per_unit !== 'number' || quoted_price_per_unit <= 0) {
    errors.push({
      isValid: false,
      severity: 'error',
      message: 'Quoted price must be a positive number',
      details: { quotedPrice: quoted_price_per_unit },
    });
  }

  if (typeof cost_per_unit !== 'number' || cost_per_unit <= 0) {
    errors.push({
      isValid: false,
      severity: 'error',
      message: 'Cost per unit must be a positive number',
      details: { costPerUnit: cost_per_unit },
    });
  }

  // If basic validation fails, return early
  if (errors.length > 0) {
    return {
      canSave: false,
      errors,
      warnings,
    };
  }

  // ============================================
  // RULE 1: Quoted price must be strictly above competitor price
  // ============================================
  if (
    competitor_price_per_unit &&
    typeof competitor_price_per_unit === 'number' &&
    competitor_price_per_unit > 0
  ) {
    if (quoted_price_per_unit <= competitor_price_per_unit) {
      const minSuggestedPrice =
        competitor_price_per_unit * (1 + PRICING_VALIDATION_CONFIG.MIN_COMPETITOR_MARKUP);

      errors.push({
        isValid: false,
        severity: 'error',
        message: 'Price must be above competitor benchmark',
        details: {
          quotedPrice: quoted_price_per_unit,
          competitorPrice: competitor_price_per_unit,
          minSuggestedPrice: parseFloat(minSuggestedPrice.toFixed(2)),
        },
      });
    }
  }

  // ============================================
  // RULE 2: Minimum margin requirement
  // ============================================
  const margin = (quoted_price_per_unit - cost_per_unit) / cost_per_unit;
  const MIN_MARGIN = PRICING_VALIDATION_CONFIG.MIN_MARGIN;

  if (margin < MIN_MARGIN) {
    const requiredMinPrice = cost_per_unit * (1 + MIN_MARGIN);

    warnings.push({
      isValid: false,
      severity: 'warning',
      message: `Quotation below minimum margin threshold (${(MIN_MARGIN * 100).toFixed(0)}%)`,
      details: {
        quotedPrice: quoted_price_per_unit,
        costPerUnit: cost_per_unit,
        currentMargin: parseFloat((margin * 100).toFixed(2)),
        requiredMargin: parseFloat((MIN_MARGIN * 100).toFixed(0)),
        requiredMinPrice: parseFloat(requiredMinPrice.toFixed(2)),
      },
    });
  }

  // ============================================
  // RULE 3: Price significantly above client's demand
  // ============================================
  if (
    client_demand_price_per_unit &&
    typeof client_demand_price_per_unit === 'number' &&
    client_demand_price_per_unit > 0
  ) {
    const maxAcceptablePrice =
      client_demand_price_per_unit * (1 + PRICING_VALIDATION_CONFIG.MAX_CLIENT_DEMAND_DEVIATION);

    if (quoted_price_per_unit > maxAcceptablePrice) {
      const deviationPercent =
        ((quoted_price_per_unit - client_demand_price_per_unit) / client_demand_price_per_unit) *
        100;

      warnings.push({
        isValid: false,
        severity: 'warning',
        message: `Price significantly above client's demand (${deviationPercent.toFixed(0)}% higher) — may reduce win probability`,
        details: {
          quotedPrice: quoted_price_per_unit,
          clientDemandPrice: client_demand_price_per_unit,
        },
      });
    }
  }

  // Determine if quotation can be saved
  const canSave = errors.length === 0;

  return {
    canSave,
    errors,
    warnings,
  };
}

/**
 * Helper function to format validation results for display
 */
export function formatValidationMessage(result: ValidationResult): string {
  let message = result.message;

  if (result.details) {
    const details = result.details;

    if (details.minSuggestedPrice) {
      message += `\nMinimum suggested price: ₹${details.minSuggestedPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    if (details.requiredMinPrice) {
      message += `\nRequired minimum price: ₹${details.requiredMinPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    if (details.currentMargin !== undefined && details.requiredMargin !== undefined) {
      message += `\nCurrent margin: ${details.currentMargin}% (Required: ${details.requiredMargin}%)`;
    }
  }

  return message;
}

/**
 * Helper function to check if validation passed without errors
 */
export function hasValidationErrors(response: PricingValidationResponse): boolean {
  return response.errors.length > 0;
}

/**
 * Helper function to check if validation has warnings
 */
export function hasValidationWarnings(response: PricingValidationResponse): boolean {
  return response.warnings.length > 0;
}

