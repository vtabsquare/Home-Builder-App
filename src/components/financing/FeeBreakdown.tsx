import React from 'react';
import { FeeCalculation } from '@/utils/fees';
import { formatMoneyDynamic } from '@/hooks/useDynamicPricing';
import { Card } from '@/components/ui/card';

export function FeeBreakdown({ fees }: { fees: FeeCalculation }) {
  return (
    <Card className="p-6 bg-black/40 border-white/10 backdrop-blur-md">
      <h3 className="font-semibold text-white mb-4">Closing Fees & Taxes</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/60">Solicitor / Legal Fees</span>
          <span className="font-mono text-white">{formatMoneyDynamic(fees.legalFee)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/60">Registry Fees</span>
          <span className="font-mono text-white">{formatMoneyDynamic(fees.registryFee)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/60">Stamp Duty</span>
          <span className="font-mono text-white">{formatMoneyDynamic(fees.stampDuty)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/60">Miscellaneous</span>
          <span className="font-mono text-white">{formatMoneyDynamic(fees.miscFee)}</span>
        </div>
        
        {fees.vat > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/60">VAT (Legal)</span>
            <span className="font-mono text-white">{formatMoneyDynamic(fees.vat)}</span>
          </div>
        )}
        
        <div className="pt-3 mt-3 border-t border-white/10 flex justify-between items-center">
          <span className="font-semibold text-white/90">Total Fees (Out of Pocket)</span>
          <span className="font-mono font-semibold text-rose-400">
            {formatMoneyDynamic(fees.totalFees)}
          </span>
        </div>
      </div>
    </Card>
  );
}
