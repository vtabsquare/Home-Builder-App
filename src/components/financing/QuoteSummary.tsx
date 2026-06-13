import React from 'react';
import { FinalQuote } from '@/utils/quotation';
import { formatMoneyDynamic } from '@/hooks/useDynamicPricing';
import { Card } from '@/components/ui/card';
import { MortgageControls } from './MortgageControls';

interface QuoteSummaryProps {
  quote: FinalQuote;
  mortgageEngine: any; // Return type of useMortgageCalculator
}

import { useConfig } from '@/store/configurator';


export function QuoteSummary({ quote, mortgageEngine }: QuoteSummaryProps) {
  const loyaltyProducts = useConfig(s => s.loyaltyProducts);
  const toggleLoyaltyProduct = useConfig(s => s.toggleLoyaltyProduct);
  
  // Monthly saving = baseEmi - current effective emi
  const monthlySaving = Math.max(0, mortgageEngine.baseEmi - quote.monthlyEMI);

  return (
    <div className="space-y-6">
      
      {/* Top Summary Cards */}
      <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pb-2 sm:pb-0 scrollbar-minimal snap-x">
        <Card className="flex-1 min-w-[140px] sm:min-w-0 snap-start shrink-0 p-4 sm:p-5 bg-white border-gray-200 shadow-sm rounded-2xl sm:rounded-3xl">
          <p className="text-[9px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 truncate">Est. Property Price</p>
          <h2 className="text-sm sm:text-lg lg:text-xl font-light text-gray-900 tracking-tight leading-tight whitespace-nowrap">{formatMoneyDynamic(quote.totalPropertyPrice)}</h2>
          <p className="text-[9px] sm:text-[10px] text-gray-400 mt-1 sm:mt-2 truncate">Base + Addons + Land</p>
        </Card>

        <Card className="flex-1 min-w-[140px] sm:min-w-0 snap-start shrink-0 p-4 sm:p-5 bg-white border-gray-200 shadow-sm rounded-2xl sm:rounded-3xl">
          <p className="text-[9px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 truncate">Loan Amount</p>
          <h2 className="text-sm sm:text-lg lg:text-xl font-light text-gray-900 tracking-tight leading-tight whitespace-nowrap">{formatMoneyDynamic(quote.loanAmount)}</h2>
          <p className="text-[9px] sm:text-[10px] text-gray-400 mt-1 sm:mt-2 truncate">Principal Financed</p>
        </Card>
        
        <Card className="flex-1 min-w-[140px] sm:min-w-0 snap-start shrink-0 p-4 sm:p-5 bg-white border-gray-200 shadow-sm rounded-2xl sm:rounded-3xl">
          <p className="text-[9px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 truncate">Monthly Repayment</p>
          <h2 className="text-sm sm:text-lg lg:text-xl font-semibold text-emerald-600 tracking-tight leading-tight whitespace-nowrap">{formatMoneyDynamic(quote.monthlyEMI)}</h2>
          <p className="text-[9px] sm:text-[10px] text-gray-400 mt-1 sm:mt-2 truncate">{quote.tenureYears} Years @ {quote.interestRate.toFixed(2)}%</p>
        </Card>

        <Card className="flex-1 min-w-[140px] sm:min-w-0 snap-start shrink-0 p-4 sm:p-5 bg-[#faf8f5] border-[#b8956a]/20 shadow-sm rounded-2xl sm:rounded-3xl">
          <p className="text-[9px] sm:text-[11px] font-semibold text-[#b8956a] uppercase tracking-wider mb-1 truncate">Down Payment</p>
          <h2 className="text-sm sm:text-lg lg:text-xl font-semibold text-gray-900 tracking-tight leading-tight whitespace-nowrap">{formatMoneyDynamic(quote.downPayment)}</h2>
          <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1 sm:mt-2 truncate">Required Equity</p>
        </Card>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8 p-5 sm:p-6 bg-white border border-gray-200 rounded-3xl shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Check Your Loyalty Savings</h3>
              <p className="text-sm text-gray-500 mt-1">Select your existing products to see how much you could save on your interest rate</p>
            </div>
            {monthlySaving > 0 && (
              <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 flex flex-col items-end whitespace-nowrap">
                <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Monthly Saving</span>
                <span className="text-lg font-bold text-emerald-700">{formatMoneyDynamic(monthlySaving)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {mortgageEngine.loyaltyOptions.map((opt: any) => {
              const isSelected = loyaltyProducts.includes(opt.id);
              return (
                <label 
                  key={opt.id} 
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-300'}`}>
                      {isSelected && <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span className={`text-sm font-medium ${isSelected ? 'text-emerald-900' : 'text-gray-700'}`}>{opt.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600">-{opt.discount.toFixed(2)}%</span>
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={isSelected}
                    onChange={() => toggleLoyaltyProduct(opt.id)}
                  />
                </label>
              );
            })}
          </div>
        </div>

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
      </div>

    </div>
  );
}
