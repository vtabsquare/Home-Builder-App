import React from 'react';
import { FeeCalculation } from '@/utils/fees';
import { formatMoneyDynamic } from '@/hooks/useDynamicPricing';
import { Card } from '@/components/ui/card';

export function FeeBreakdown({ fees }: { fees: FeeCalculation }) {
  return (
    <Card className="p-6 bg-white border-gray-200 shadow-sm rounded-3xl">
      <h3 className="font-semibold text-gray-900 mb-4">Closing Fees & Taxes</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Solicitor / Legal Fees</span>
          <span className="font-mono text-gray-900">{formatMoneyDynamic(fees.legalFee)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Registry Fees</span>
          <span className="font-mono text-gray-900">{formatMoneyDynamic(fees.registryFee)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Stamp Duty</span>
          <span className="font-mono text-gray-900">{formatMoneyDynamic(fees.stampDuty)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Miscellaneous</span>
          <span className="font-mono text-gray-900">{formatMoneyDynamic(fees.miscFee)}</span>
        </div>
        
        {fees.vat > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">VAT (Legal)</span>
            <span className="font-mono text-gray-900">{formatMoneyDynamic(fees.vat)}</span>
          </div>
        )}
        
        <div className="pt-3 mt-3 border-t border-gray-100 flex justify-between items-center">
          <span className="font-semibold text-gray-900">Total Fees (Out of Pocket)</span>
          <span className="font-mono font-semibold text-rose-600">
            {formatMoneyDynamic(fees.totalFees)}
          </span>
        </div>
      </div>
    </Card>
  );
}
