import { useMemo } from 'react';
import { aggregateQuotation, FinalQuote } from '@/utils/quotation';
import { useMortgageCalculator } from './useMortgageCalculator';
import { useFeeCalculator } from './useFeeCalculator';

/**
 * The master engine that composes pricing, mortgage, and fee layers into a single quotation.
 * @param totalPropertyPrice The gross property price (base + addons + land) from the Pricing Engine
 * @param landCost The portion of the property price that is just land
 * @param loanEligiblePrice The portion eligible for bank financing (excludes non-loan addons like solar/water_tank/generator)
 */
export function useQuotationEngine(totalPropertyPrice: number, landCost: number, loanEligiblePrice?: number) {
  // Use loanEligiblePrice for mortgage if provided, otherwise fall back to totalPropertyPrice
  const mortgageBase = loanEligiblePrice ?? totalPropertyPrice;

  // Initialize Mortgage Engine — only on the loan-eligible portion
  const mortgageEngine = useMortgageCalculator(mortgageBase);
  
  // Initialize Fee Engine (Fees are calculated strictly on the total property price)
  const feeEngine = useFeeCalculator(totalPropertyPrice);

  // Compose Final Quotation
  const finalQuote: FinalQuote = useMemo(() => {
    return aggregateQuotation(
      totalPropertyPrice,
      landCost,
      mortgageEngine.downPayment,
      mortgageEngine.loanAmount,
      mortgageEngine.interestRate,
      mortgageEngine.tenureYears,
      mortgageEngine.emi,
      feeEngine.feeBreakdown
    );
  }, [
    totalPropertyPrice, 
    landCost, 
    mortgageEngine.downPayment, 
    mortgageEngine.loanAmount, 
    mortgageEngine.interestRate, 
    mortgageEngine.tenureYears, 
    mortgageEngine.emi, 
    feeEngine.feeBreakdown
  ]);

  return {
    mortgageEngine,
    feeEngine,
    finalQuote
  };
}
