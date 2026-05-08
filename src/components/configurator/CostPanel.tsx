import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { CostBreakdown, formatMoney } from '@/lib/cost';

interface Props {
  cost: CostBreakdown;
  compact?: boolean;
}

export const CostPanel = ({ cost, compact }: Props) => {
  const [open, setOpen] = useState(!compact);

  return (
    <div className="relative rounded-2xl bg-surface border border-border p-6 shadow-elev overflow-hidden">
      <div className="relative z-10 flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1 font-bold">Total estimate</div>
          <motion.div
            key={cost.total}
            initial={{ opacity: 0.4, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-4xl num leading-none text-foreground tracking-tight font-normal"
          >
            {formatMoney(cost.total)}
          </motion.div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-clay font-bold">
          <div className="h-1.5 w-1.5 rounded-full bg-clay animate-pulse" /> Live
        </div>
      </div>

      <div className="relative z-10 mt-6 grid grid-cols-3 gap-3 text-center">
        <Stat label="Down 10%" value={formatMoney(cost.downPayment)} />
        <Stat label="Loan" value={formatMoney(cost.loanAmount)} />
        <Stat label="Monthly" value={formatMoney(cost.emi)} highlight />
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className="relative z-10 mt-5 flex w-full items-center justify-between rounded-xl border border-border bg-soft-section px-4 py-3 text-[10px] font-bold text-muted-foreground hover:bg-muted/10 hover:text-foreground transition-all active:scale-[0.98]"
      >
        <span className="uppercase tracking-[0.2em]">View Breakdown</span>
        <ChevronDown size={14} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 mt-4 space-y-2.5 overflow-hidden"
          >
            {cost.items.map((it, i) => (
              <motion.li 
                key={it.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex justify-between gap-3 text-muted-foreground pb-2 border-b border-border/50 last:border-0 last:pb-0"
              >
                <span className="truncate tracking-wide text-[11px]">{it.label}</span>
                <span className="num text-foreground font-semibold text-[11px]">{formatMoney(it.amount)}</span>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      {/* Budget line */}
      <div className="relative z-10 mt-6">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40 mb-3">
          <span>Budget Utilization</span>
          <span>{cost.area} sqft</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-soft-section">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (cost.total / 600000) * 100)}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="h-full bg-clay"
          />
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className={`relative rounded-xl px-2 py-3 border transition-colors ${highlight ? 'bg-soft-section border-clay/20 text-clay' : 'bg-white border-border text-muted-foreground'}`}>
    <div className={`text-[8px] font-bold uppercase tracking-[0.2em] mb-1 ${highlight ? 'text-clay/80' : 'text-muted-foreground/50'}`}>{label}</div>
    <div className={`font-display text-xs md:text-[13px] num font-medium ${highlight ? 'text-clay' : 'text-foreground'}`}>{value}</div>
  </div>
);
