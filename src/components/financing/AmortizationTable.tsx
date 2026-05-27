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
    <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 className="font-semibold text-gray-900">Amortization Schedule</h3>
        <span className="text-xs text-gray-500">{years} Years ({schedule.length} Months)</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
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
              <tr key={row.month} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-600">{row.month}</td>
                <td className="px-4 py-3 font-mono">{formatMoneyDynamic(row.payment)}</td>
                <td className="px-4 py-3 font-mono text-emerald-600">{formatMoneyDynamic(row.principalPaid)}</td>
                <td className="px-4 py-3 font-mono text-rose-600">{formatMoneyDynamic(row.interestPaid)}</td>
                <td className="px-4 py-3 font-mono text-gray-900">{formatMoneyDynamic(row.remainingBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {schedule.length > 12 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
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
