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
    <div className="rounded-2xl bg-ink text-ink-foreground p-5 shadow-elev">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-ink-foreground/55">Total estimate</div>
          <motion.div
            key={cost.total}
            initial={{ opacity: 0.4, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-4xl md:text-5xl num leading-none"
          >
            {formatMoney(cost.total)}
          </motion.div>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-clay">
          <TrendingUp size={12} /> live
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <Stat label="Down 10%" value={formatMoney(cost.downPayment)} />
        <Stat label="Loan" value={formatMoney(cost.loanAmount)} />
        <Stat label="Monthly" value={formatMoney(cost.emi)} highlight />
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-ink-foreground/15 px-3 py-2 text-xs hover:bg-ink-foreground/5 transition-colors"
      >
        <span className="uppercase tracking-wider">Breakdown</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 space-y-1.5 overflow-hidden text-sm"
          >
            {cost.items.map((it) => (
              <li key={it.label} className="flex justify-between gap-3 text-ink-foreground/80">
                <span className="truncate">{it.label}</span>
                <span className="num">{formatMoney(it.amount)}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      {/* Budget bar */}
      <div className="mt-5">
        <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] text-ink-foreground/55 mb-1.5">
          <span>Budget zone</span>
          <span>{cost.area} sqft</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-foreground/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (cost.total / 600000) * 100)}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="h-full bg-gradient-to-r from-clay to-[hsl(28,40%,55%)]"
          />
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className={`rounded-xl px-2 py-2 ${highlight ? 'bg-clay text-clay-foreground' : 'bg-ink-foreground/5'}`}>
    <div className={`text-[9px] uppercase tracking-[0.18em] ${highlight ? 'text-clay-foreground/70' : 'text-ink-foreground/55'}`}>{label}</div>
    <div className="font-display text-sm md:text-base num mt-0.5">{value}</div>
  </div>
);
