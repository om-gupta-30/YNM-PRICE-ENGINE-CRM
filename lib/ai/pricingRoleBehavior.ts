/**
 * Pricing Role Behavior
 * 
 * Adjusts pricing recommendations and provides role-specific insights
 * based on user role (Admin vs Employee).
 */

/**
 * Adjust recommended price based on user role
 * 
 * Only Admin and Employee roles trigger price adjustments.
 * Data Analyst role bypasses pricing logic entirely.
 * 
 * @param baseRecommendedPrice - Base price recommended by AI
 * @param role - User role (admin, employee, data_analyst, etc.)
 * @returns Adjusted price based on role, or base price if role is not admin/employee
 */
export function adjustPriceForRole(baseRecommendedPrice: number, role?: string): number {
  if (!baseRecommendedPrice || !role) {
    return baseRecommendedPrice;
  }

  const r = role.toLowerCase().replace(/_/g, ''); // Normalize: "data_analyst" -> "dataanalyst", "ADMIN" -> "admin"

  // Data Analyst should never trigger pricing adjustments
  if (r === 'dataanalyst' || r === 'analyst') {
    return baseRecommendedPrice; // No adjustment, bypass pricing logic
  }

  if (r === 'admin') {
    // Admins control final pricing → stay neutral (no adjustment)
    return baseRecommendedPrice;
  }

  if (r === 'employee') {
    // Employees negotiate → give slightly lower guidance for negotiation buffer
    return baseRecommendedPrice * 0.98; // -2% buffer
  }

  // Unknown role: no adjustment
  return baseRecommendedPrice;
}

/**
 * Get role-based insight message for pricing suggestions
 * 
 * Only Admin and Employee roles receive pricing insight messages.
 * Data Analyst role should never receive pricing messages.
 * 
 * @param role - User role (admin, employee, data_analyst, etc.)
 * @returns Role-specific insight message or null
 */
export function roleBasedInsightMessage(role?: string): string | null {
  if (!role) {
    return null;
  }

  const r = role.toLowerCase().replace(/_/g, ''); // Normalize: "data_analyst" -> "dataanalyst"

  // Data Analyst should never receive pricing messages
  if (r === 'dataanalyst' || r === 'analyst') {
    return null; // No pricing messages for analysts
  }

  if (r === 'employee') {
    // Employees get cautionary warning about minimum margin
    return '⚠️ As an employee, ensure pricing does not go below minimum margin — check final price with admin if discounting too much.';
  }

  if (r === 'admin') {
    // Admins get optional upward optimization suggestion
    return 'As admin, consider pushing higher if buyer urgency and competitor pressure allows.';
  }

  return null;
}

