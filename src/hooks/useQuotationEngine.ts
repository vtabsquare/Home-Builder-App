import { useMemo } from 'react';
import { aggregateQuotation, FinalQuote } from '@/utils/quotation';
import { useMortgageCalculator } from './useMortgageCalculator';
import { useFeeCalculator } from './useFeeCalculator';

/**
 * The master engine that composes pricing, mortgage, and fee layers into a single quotation.
 * @param totalPropertyPrice The gross property price (base + addons + land) from the Pricing Engine
 * @param landCost The portion of the property price that is just land
 */
export function useQuotationEngine(totalPropertyPrice: number, landCost: number) {
  // Initialize Mortgage Engine
  const mortgageEngine = useMortgageCalculator(totalPropertyPrice);
  
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
