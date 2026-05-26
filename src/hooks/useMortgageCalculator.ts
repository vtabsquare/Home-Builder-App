import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateEMI, generateAmortizationSchedule, AmortizationRow } from '@/utils/finance';

export interface MortgageSettings {
  default_interest_rate: number;
  min_interest_rate: number;
  max_interest_rate: number;
  default_tenure: number;
  min_tenure: number;
  max_tenure: number;
  min_down_payment_percent: number;
  max_ltv: number;
}

const DEFAULT_SETTINGS: MortgageSettings = {
  default_interest_rate: 6.5,
  min_interest_rate: 2.0,
  max_interest_rate: 15.0,
  default_tenure: 25,
  min_tenure: 5,
  max_tenure: 40,
  min_down_payment_percent: 10.0,
  max_ltv: 90.0
};

export function useMortgageCalculator(totalPropertyPrice: number) {
  const [settings, setSettings] = useState<MortgageSettings>(DEFAULT_SETTINGS);
  
  // User adjustable states
  const [interestRate, setInterestRate] = useState<number>(DEFAULT_SETTINGS.default_interest_rate);
  const [tenureYears, setTenureYears] = useState<number>(DEFAULT_SETTINGS.default_tenure);
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(DEFAULT_SETTINGS.min_down_payment_percent);

  // Fetch admin settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('mortgage_settings')
          .select('*')
          .limit(1)
          .maybeSingle();
        
        if (!error && data) {
          setSettings(data);
          setInterestRate(data.default_interest_rate);
          setTenureYears(data.default_tenure);
          setDownPaymentPercent(data.min_down_payment_percent);
        }
      } catch (e) {
        console.error('Failed to fetch mortgage settings:', e);
      }
    }
    fetchSettings();
  }, []);

  // Compute derived values
  const downPayment = Math.round(totalPropertyPrice * (downPaymentPercent / 100));
  const loanAmount = Math.max(0, totalPropertyPrice - downPayment);
  
  const emi = useMemo(() => calculateEMI(loanAmount, interestRate, tenureYears), [loanAmount, interestRate, tenureYears]);
  const amortizationSchedule = useMemo(() => generateAmortizationSchedule(loanAmount, interestRate, tenureYears), [loanAmount, interestRate, tenureYears]);

  return {
    settings,
    
    // User controls
    interestRate,
    setInterestRate,
    tenureYears,
    setTenureYears,
    downPaymentPercent,
    setDownPaymentPercent,
    
    // Calculated values
    downPayment,
    loanAmount,
    emi,
    amortizationSchedule
  };
}
