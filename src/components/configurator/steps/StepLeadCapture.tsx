import { useState } from 'react';
import { z } from 'zod';
import { useConfig } from '@/store/configurator';
import { StepShell } from '../StepShell';
import { CostBreakdown, formatMoney } from '@/lib/cost';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const TIMELINES = ['0–3 months', '3–6 months', '6–12 months', '12+ months'];

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(100),
  phone: z.string().trim().min(6, 'Enter a valid phone').max(30),
  email: z.string().trim().email('Enter a valid email').max(255),
  timeline: z.string().min(1, 'Select a timeline'),
});

interface Props {
  cost: CostBreakdown;
}

export const StepLeadCapture = ({ cost }: Props) => {
  const c = useConfig();
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    const parsed = schema.safeParse({ name: c.name, phone: c.phone, email: c.email, timeline: c.timeline });
    if (!parsed.success) {
      const fe: Partial<Record<string, string>> = {};
      parsed.error.errors.forEach((e) => { fe[e.path[0] as string] = e.message; });
      setErrors(fe);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const config = {
      land: c.land, home_type: c.homeType, bedrooms: c.bedrooms, bathrooms: c.bathrooms,
      kitchen: c.kitchen, addons: c.addons, area: cost.area, roof: c.roof, material: c.material,
    };
    const { error } = await supabase.from('leads').insert({
      name: c.name.trim(),
      phone: c.phone.trim(),
      email: c.email.trim(),
      timeline: c.timeline,
      config,
      total_cost: cost.total,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Could not submit — please try again');
      return;
    }
    setDone(true);
    toast.success('Submitted! Our team will be in touch.');
  };

  return (
    <StepShell
      eyebrow="Step 05 · Let's connect"
      title="Get your full proposal."
      subtitle="We'll send a detailed PDF to your inbox and an architect will reach out."
      onPrev={() => useConfig.getState().prev()}
    >
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl bg-gradient-ink text-ink-foreground p-10 text-center"
          >
            <CheckCircle2 size={56} className="mx-auto text-clay mb-4" />
            <h3 className="font-display text-3xl font-extrabold">You're all set, {c.name.split(' ')[0]}.</h3>
            <p className="mt-2 text-ink-foreground/70 max-w-md mx-auto">
              Your configuration ({formatMoney(cost.total)} · {cost.area} sqft) was saved. Expect a call within 24 hours.
            </p>
            <button
              onClick={() => useConfig.getState().reset()}
              className="mt-6 rounded-full bg-clay text-clay-foreground px-6 py-3 text-sm font-semibold hover:scale-105 transition-transform"
            >
              Start a new design
            </button>
          </motion.div>
        ) : (
          <motion.div key="form" className="grid gap-4 md:grid-cols-2">
            <Field label="Full name" error={errors.name}>
              <input
                value={c.name}
                onChange={(e) => c.setLead({ name: e.target.value })}
                placeholder="Alex Morgan"
                className="w-full bg-transparent outline-none font-display text-lg placeholder:text-muted-foreground/50"
              />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <input
                value={c.phone}
                onChange={(e) => c.setLead({ phone: e.target.value })}
                placeholder="+1 555 0100"
                className="w-full bg-transparent outline-none font-display text-lg placeholder:text-muted-foreground/50"
              />
            </Field>
            <Field label="Email" error={errors.email} className="md:col-span-2">
              <input
                type="email"
                value={c.email}
                onChange={(e) => c.setLead({ email: e.target.value })}
                placeholder="alex@home.com"
                className="w-full bg-transparent outline-none font-display text-lg placeholder:text-muted-foreground/50"
              />
            </Field>
            <div className="md:col-span-2">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Timeline to build</div>
              <div className="flex flex-wrap gap-2">
                {TIMELINES.map((t) => (
                  <button
                    key={t}
                    onClick={() => c.setLead({ timeline: t })}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      c.timeline === t ? 'border-ink bg-ink text-ink-foreground' : 'border-border hover:bg-surface'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {errors.timeline && <div className="mt-2 text-xs text-destructive">{errors.timeline}</div>}
            </div>

            <div className="md:col-span-2 mt-2">
              <button
                onClick={submit}
                disabled={submitting}
                className="w-full rounded-full bg-ink text-ink-foreground py-4 font-display font-bold text-base shadow-elev hover:scale-[1.01] disabled:opacity-50 transition-transform"
              >
                {submitting ? 'Submitting…' : `Send my proposal · ${formatMoney(cost.total)}`}
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                By submitting you agree to be contacted by GBTI. We never share your data.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </StepShell>
  );
};

const Field = ({ label, error, className = '', children }: { label: string; error?: string; className?: string; children: React.ReactNode }) => (
  <div className={`rounded-2xl border-2 px-4 py-3 transition-colors ${error ? 'border-destructive' : 'border-border focus-within:border-ink bg-card'} ${className}`}>
    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{label}</div>
    {children}
    {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
  </div>
);
