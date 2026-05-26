import React, { useState } from 'react';
import { AmortizationRow } from '@/utils/finance';
import { formatMoneyDynamic } from '@/hooks/useDynamicPricing';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function AmortizationTable({ schedule }: { schedule: AmortizationRow[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!schedule || schedule.length === 0) return null;

  // Show first 12 months if collapsed, else all
  const displaySchedule = expanded ? schedule : schedule.slice(0, 12);
  const years = schedule[schedule.length - 1].month / 12;

  return (
    <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
        <h3 className="font-semibold text-white">Amortization Schedule</h3>
        <span className="text-xs text-white/50">{years} Years ({schedule.length} Months)</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-white/80">
          <thead className="text-xs text-white/50 uppercase bg-white/5">
            <tr>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Principal</th>
              <th className="px-4 py-3">Interest</th>
              <th className="px-4 py-3">Balance</th>
            </tr>
          </thead>
          <tbody>
            {displaySchedule.map((row) => (
              <tr key={row.month} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white/60">{row.month}</td>
                <td className="px-4 py-3 font-mono">{formatMoneyDynamic(row.payment)}</td>
                <td className="px-4 py-3 font-mono text-emerald-400">{formatMoneyDynamic(row.principalPaid)}</td>
                <td className="px-4 py-3 font-mono text-rose-400">{formatMoneyDynamic(row.interestPaid)}</td>
                <td className="px-4 py-3 font-mono text-white">{formatMoneyDynamic(row.remainingBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {schedule.length > 12 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 flex items-center justify-center gap-2 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          {expanded ? (
            <>Hide Full Schedule <ChevronUp size={14} /></>
          ) : (
            <>View Full {years}-Year Schedule <ChevronDown size={14} /></>
          )}
        </button>
      )}
    </div>
  );
}
