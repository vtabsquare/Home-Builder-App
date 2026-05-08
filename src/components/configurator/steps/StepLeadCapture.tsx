import { useState } from 'react';
import { z } from 'zod';
import { useConfig } from '@/store/configurator';
import { StepShell } from '../StepShell';
import { CostBreakdown, formatMoney } from '@/lib/cost';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Send, ArrowRight } from 'lucide-react';

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
      toast.error('Submission failed — please try again');
      return;
    }
    setDone(true);
  };

  return (
    <StepShell
      eyebrow="Step 05 · Finalization"
      title="Request your proposal."
      subtitle="Connect with our design team to receive a comprehensive architectural breakdown and structural overview."
      onPrev={() => useConfig.getState().prev()}
    >
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-soft-section border border-clay/20 text-clay mb-10"
              >
                <CheckCircle2 size={40} strokeWidth={1} />
              </motion.div>

              <h3 className="font-display text-4xl md:text-5xl font-normal tracking-tight text-foreground mb-6">
                Proposal secured.
              </h3>

              <p className="text-muted-foreground max-w-md mx-auto text-lg leading-relaxed font-light">
                Thank you, <span className="text-foreground font-medium">{c.name.split(' ')[0]}</span>. Your architectural configuration has been received. Our studio will contact you within 24 hours.
              </p>

              <button
                onClick={() => useConfig.getState().reset()}
                className="mt-12 inline-flex items-center gap-3 rounded-full bg-foreground text-background px-10 py-4 text-[10px] font-bold uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95"
              >
                New Configuration <ArrowRight size={14} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-10"
            >
              <div className="grid gap-6 md:grid-cols-2">
                <Field label="Full Name" error={errors.name}>
                  <input
                    value={c.name}
                    onChange={(e) => c.setLead({ name: e.target.value })}
                    placeholder="e.g., Alex Morgan"
                    className="w-full bg-transparent outline-none font-display text-xl placeholder:text-muted-foreground/30 text-foreground"
                  />
                </Field>

                <Field label="Phone Number" error={errors.phone}>
                  <input
                    value={c.phone}
                    onChange={(e) => c.setLead({ phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-transparent outline-none font-display text-xl placeholder:text-muted-foreground/30 text-foreground"
                  />
                </Field>

                <Field label="Email Address" error={errors.email} className="md:col-span-2">
                  <input
                    type="email"
                    value={c.email}
                    onChange={(e) => c.setLead({ email: e.target.value })}
                    placeholder="alex@example.com"
                    className="w-full bg-transparent outline-none font-display text-xl placeholder:text-muted-foreground/30 text-foreground"
                  />
                </Field>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground/40 mb-5 text-center">Project Timeline</div>
                <div className="flex flex-wrap justify-center gap-4">
                  {TIMELINES.map((t) => {
                    const isActive = c.timeline === t;
                    return (
                      <button
                        key={t}
                        onClick={() => c.setLead({ timeline: t })}
                        className={`rounded-full px-8 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 border ${isActive
                          ? 'bg-clay border-clay text-white shadow-elev scale-105'
                          : 'bg-surface border-border text-muted-foreground hover:border-muted-foreground/20 hover:text-foreground'
                          }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
                {errors.timeline && <div className="mt-4 text-center text-[10px] font-bold text-destructive uppercase tracking-[0.1em]">{errors.timeline}</div>}
              </div>

              <div className="pt-6">
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-3 rounded-full bg-foreground text-background py-6 font-display font-normal text-xl shadow-elev hover:brightness-110 disabled:opacity-30 transition-all duration-500"
                >
                  {submitting ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }} className="w-6 h-6 border-2 border-background/20 border-t-background rounded-full" />
                  ) : (
                    <>
                      Request Proposal · {formatMoney(cost.total)}
                    </>
                  )}
                </button>
                <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30 max-w-sm mx-auto leading-loose">
                  Your architectural configuration will be saved to our private design studio.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StepShell>
  );
};

const Field = ({ label, error, className = '', children }: { label: string; error?: string; className?: string; children: React.ReactNode }) => (
  <div className={`rounded-xl border px-6 py-4 transition-all duration-500 ${error ? 'border-destructive/30 bg-destructive/5' : 'bg-surface border-border focus-within:border-muted-foreground/40 focus-within:shadow-soft'} ${className}`}>
    <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40 mb-2">{label}</div>
    {children}
    {error && <div className="mt-2 text-[10px] font-bold text-destructive uppercase tracking-[0.1em]">{error}</div>}
  </div>
);

