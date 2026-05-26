/**
 * Rules defining fee percentages
 */
export interface FeeRules {
  solicitorFeePercent: number; // e.g. 0.8
  solicitorFixedCharge: number; // e.g. 340 (Hughes)
  registryFeePercent: number;  // e.g. 0.12
  stampDutyPercent: number;    // e.g. 0.20
  miscFee: number;             // fixed amount e.g. 500
  vatEnabled: boolean;
  vatPercent: number;          // e.g. 14.0
}

export interface FeeCalculation {
  legalFee: number;
  registryFee: number;
  stampDuty: number;
  miscFee: number;
  vat: number;
  totalFees: number;
}

/**
 * Calculates standard external property fees separate from the loan.
 * @param propertyCost The total cost of the property before down payment/loan
 * @param rules Admin configured fee percentages
 */
export function calculateClosingFees(propertyCost: number, rules: FeeRules): FeeCalculation {
  const legalFee = Math.round(propertyCost * (rules.solicitorFeePercent / 100)) + rules.solicitorFixedCharge;
  const registryFee = Math.round(propertyCost * (rules.registryFeePercent / 100));
  const stampDuty = Math.round(propertyCost * (rules.stampDutyPercent / 100));
  const miscFee = rules.miscFee;
  
  // VAT is typically applied on the legal/solicitor fees, not the property cost
  const vatAmount = rules.vatEnabled ? Math.round(legalFee * (rules.vatPercent / 100)) : 0;

  const totalFees = legalFee + registryFee + stampDuty + miscFee + vatAmount;

  return {
    legalFee,
    registryFee,
    stampDuty,
    miscFee,
    vat: vatAmount,
    totalFees
  };
}
