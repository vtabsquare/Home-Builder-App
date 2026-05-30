import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { MortgageSettings } from '@/hooks/useMortgageCalculator';
import { formatMoneyDynamic } from '@/hooks/useDynamicPricing';

interface MortgageControlsProps {
  settings: MortgageSettings;
  totalCost: number;
  downPaymentPercent: number;
  setDownPaymentPercent: (v: number) => void;
  interestRate: number;
  setInterestRate: (v: number) => void;
  tenureYears: number;
  setTenureYears: (v: number) => void;
}

export function MortgageControls({
  settings,
  totalCost,
  downPaymentPercent,
  setDownPaymentPercent,
  interestRate,
  setInterestRate,
  tenureYears,
  setTenureYears
}: MortgageControlsProps) {
  
  const downPaymentAmount = (totalCost * downPaymentPercent) / 100;

  return (
    <Card className="p-6 space-y-8 bg-white border-gray-200 shadow-sm rounded-3xl">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-gray-700">Down Payment</label>
          <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
            {downPaymentPercent.toFixed(1)}% ({formatMoneyDynamic(downPaymentAmount)})
          </span>
        </div>
        <Slider
          min={settings.min_down_payment_percent}
          max={100}
          step={0.5}
          value={[downPaymentPercent]}
          onValueChange={(val) => setDownPaymentPercent(val[0])}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>Min {settings.min_down_payment_percent}%</span>
          <span>100% (Cash)</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-gray-700">Interest Rate</label>
          <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
            {interestRate.toFixed(2)}%
          </span>
        </div>
        <div className="text-xs text-gray-400">Fixed rate set by administration</div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-gray-700">Loan Tenure</label>
          <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
            {tenureYears} Years
          </span>
        </div>
        <Slider
          min={settings.min_tenure}
          max={settings.max_tenure}
          step={1}
          value={[tenureYears]}
          onValueChange={(val) => setTenureYears(val[0])}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{settings.min_tenure} Years</span>
          <span>{settings.max_tenure} Years</span>
        </div>
      </div>
    </Card>
  );
}
