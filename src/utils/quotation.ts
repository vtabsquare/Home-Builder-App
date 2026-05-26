import { FeeCalculation } from './fees';

export interface FinalQuote {
  // 1. Property Pricing
  propertyCost: number;     // base + addons + customization
  landCost: number;
  totalPropertyPrice: number; // propertyCost + landCost

  // 2. Financing
  downPayment: number;
  loanAmount: number;
  interestRate: number;
  tenureYears: number;
  monthlyEMI: number;
  totalInterest: number;
  totalRepayment: number;

  // 3. Out-of-pocket Fees
  fees: FeeCalculation;

  // 4. Grand Totals
  cashRequiredNow: number; // downPayment + totalFees
  grandTotalCost: number;  // totalRepayment + downPayment + totalFees
}

/**
 * Aggregates all engines into a single final quotation object.
 */
export function aggregateQuotation(
  totalPropertyPrice: number,
  landCost: number,
  downPayment: number,
  loanAmount: number,
  interestRate: number,
  tenureYears: number,
  monthlyEMI: number,
  fees: FeeCalculation
): FinalQuote {
  const propertyCost = totalPropertyPrice - landCost;
  const totalRepayment = monthlyEMI * (tenureYears * 12);
  const totalInterest = Math.max(0, totalRepayment - loanAmount);
  
  const cashRequiredNow = downPayment + fees.totalFees;
  const grandTotalCost = totalRepayment + downPayment + fees.totalFees;

  return {
    propertyCost,
    landCost,
    totalPropertyPrice,
    downPayment,
    loanAmount,
    interestRate,
    tenureYears,
    monthlyEMI,
    totalInterest,
    totalRepayment,
    fees,
    cashRequiredNow,
    grandTotalCost
  };
}
