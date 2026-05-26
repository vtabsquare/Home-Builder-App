import React from 'react';
import { FinalQuote } from '@/utils/quotation';
import { formatMoneyDynamic } from '@/hooks/useDynamicPricing';
import { Card } from '@/components/ui/card';
import { MortgageControls } from './MortgageControls';
import { AmortizationTable } from './AmortizationTable';
import { FeeBreakdown } from './FeeBreakdown';

interface QuoteSummaryProps {
  quote: FinalQuote;
  mortgageEngine: any; // Return type of useMortgageCalculator
}

export function QuoteSummary({ quote, mortgageEngine }: QuoteSummaryProps) {
  return (
    <div className="space-y-6">
      
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-black/40 border-white/10 backdrop-blur-md">
          <p className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-1">Total Property Price</p>
          <h2 className="text-3xl font-light text-white tracking-tight">{formatMoneyDynamic(quote.totalPropertyPrice)}</h2>
          <p className="text-xs text-white/40 mt-2">Base + Addons + Land</p>
        </Card>
        
        <Card className="p-5 bg-black/40 border-white/10 backdrop-blur-md">
          <p className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-1">Monthly Repayment</p>
          <h2 className="text-3xl font-semibold text-emerald-400 tracking-tight">{formatMoneyDynamic(quote.monthlyEMI)}</h2>
          <p className="text-xs text-white/40 mt-2">{quote.tenureYears} Years @ {quote.interestRate.toFixed(2)}% APR</p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-[#b8956a]/20 to-[#a07850]/5 border-[#b8956a]/30 backdrop-blur-md">
          <p className="text-sm font-semibold text-[#b8956a] uppercase tracking-wider mb-1">Cash Required Now</p>
          <h2 className="text-3xl font-semibold text-white tracking-tight">{formatMoneyDynamic(quote.cashRequiredNow)}</h2>
          <p className="text-xs text-white/50 mt-2">Down Payment + Closing Fees</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Controls and Fees */}
        <div className="space-y-6">
          <MortgageControls 
            settings={mortgageEngine.settings}
            totalCost={quote.totalPropertyPrice}
            downPaymentPercent={mortgageEngine.downPaymentPercent}
            setDownPaymentPercent={mortgageEngine.setDownPaymentPercent}
            interestRate={mortgageEngine.interestRate}
            setInterestRate={mortgageEngine.setInterestRate}
            tenureYears={mortgageEngine.tenureYears}
            setTenureYears={mortgageEngine.setTenureYears}
          />
          <FeeBreakdown fees={quote.fees} />
        </div>

        {/* Right Column: Amortization Schedule */}
        <div className="space-y-6">
          <AmortizationTable schedule={mortgageEngine.amortizationSchedule} />
        </div>
      </div>

    </div>
  );
}
