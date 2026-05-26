import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FeeRules, calculateClosingFees } from '@/utils/fees';

const DEFAULT_FEE_RULES: FeeRules = {
  solicitorFeePercent: 0.8,
  solicitorFixedCharge: 340,
  registryFeePercent: 0.12,
  stampDutyPercent: 0.20,
  miscFee: 10000,
  vatEnabled: false,
  vatPercent: 14.0
};

export function useFeeCalculator(propertyCost: number) {
  const [feeRules, setFeeRules] = useState<FeeRules>(DEFAULT_FEE_RULES);
  
  useEffect(() => {
    async function fetchFeeRules() {
      try {
        const { data, error } = await supabase
          .from('fee_rules')
          .select('*')
          .limit(1)
          .maybeSingle();
        
        if (!error && data) {
          setFeeRules({
            solicitorFeePercent: Number(data.solicitor_fee_percent),
            solicitorFixedCharge: Number(data.solicitor_fixed_charge),
            registryFeePercent: Number(data.registry_fee_percent),
            stampDutyPercent: Number(data.stamp_duty_percent),
            miscFee: Number(data.misc_fee),
            vatEnabled: data.vat_enabled,
            vatPercent: Number(data.vat_percent)
          });
        }
      } catch (e) {
        console.error('Failed to fetch fee rules:', e);
      }
    }
    fetchFeeRules();
  }, []);

  const feeBreakdown = useMemo(() => calculateClosingFees(propertyCost, feeRules), [propertyCost, feeRules]);

  return {
    feeRules,
    feeBreakdown
  };
}
