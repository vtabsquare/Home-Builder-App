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
    <Card className="p-6 space-y-8 bg-black/40 border-white/10 backdrop-blur-md">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-white/80">Down Payment</label>
          <span className="text-sm font-mono text-white bg-white/10 px-2 py-1 rounded">
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
        <div className="flex justify-between text-xs text-white/40">
          <span>Min {settings.min_down_payment_percent}%</span>
          <span>100% (Cash)</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-white/80">Interest Rate</label>
          <span className="text-sm font-mono text-white bg-white/10 px-2 py-1 rounded">
            {interestRate.toFixed(2)}%
          </span>
        </div>
        <Slider
          min={settings.min_interest_rate}
          max={settings.max_interest_rate}
          step={0.1}
          value={[interestRate]}
          onValueChange={(val) => setInterestRate(val[0])}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-white/40">
          <span>Min {settings.min_interest_rate}%</span>
          <span>Max {settings.max_interest_rate}%</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-white/80">Loan Tenure</label>
          <span className="text-sm font-mono text-white bg-white/10 px-2 py-1 rounded">
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
        <div className="flex justify-between text-xs text-white/40">
          <span>{settings.min_tenure} Years</span>
          <span>{settings.max_tenure} Years</span>
        </div>
      </div>
    </Card>
  );
}
