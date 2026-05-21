import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowRight, Mail, Send, ShieldCheck, Smartphone } from 'lucide-react';

const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY;
const BREVO_SENDER_EMAIL = import.meta.env.VITE_BREVO_SENDER_EMAIL;
const BREVO_SENDER_NAME = import.meta.env.VITE_BREVO_SENDER_NAME || 'GBTI Architectural Team';

// ── Device info helpers ─────────────────────────────────────

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';

  // Browser detection
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

  // OS detection
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);

  return {
    deviceType: isTablet ? 'tablet' : isMobileUA ? 'mobile' : 'desktop',
    browser,
    os,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    userAgent: ua,
  };
}

// ── Gate Page Component ─────────────────────────────────────

interface GatePageProps {
  onProceed: () => void;
}

export const GatePage = ({ onProceed }: GatePageProps) => {
  const isMobile = useIsMobile();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isDismantling, setIsDismantling] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  // Generate QR code URL pointing to current page
  useEffect(() => {
    const url = window.location.href;
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}&bgcolor=0a0a0a&color=ffffff&format=svg`);
  }, []);

  const handleContinue = () => {
    setIsDismantling(true);
    setTimeout(() => {
      setShowAuth(true);
      setIsDismantling(false);
    }, 700); // reduced from 1000 to 700 to match faster animation
  };

  const handleSkip = () => {
    setIsDismantling(true);
    setTimeout(() => {
      onProceed();
    }, 700);
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('send_visitor_otp', {
        p_email: email.trim(),
      });

      if (error) {
        toast.error('Failed to send OTP: ' + error.message);
        setLoading(false);
        return;
      }

      // Send OTP via Brevo
      if (BREVO_API_KEY && BREVO_SENDER_EMAIL && data) {
        try {
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'api-key': BREVO_API_KEY,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
              to: [{ email: email.trim() }],
              replyTo: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
              subject: 'GBTI Smart Home Builder — Verification Code',
              htmlContent: `
                <div style="font-family:Arial,sans-serif;color:#111;line-height:1.6;max-width:560px;margin:0 auto;padding:32px;">
                  <div style="text-align:center;margin-bottom:24px;">
                    <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#b8956a,#a07850);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:20px;">G</div>
                  </div>
                  <h2 style="text-align:center;margin:0 0 8px;color:#111;font-size:20px;">Verification Code</h2>
                  <p style="text-align:center;color:#6b7280;margin:0 0 24px;font-size:14px;">Enter this code to access the GBTI Smart Home Builder</p>
                  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
                    <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#111;">${data}</span>
                  </div>
                  <p style="text-align:center;color:#9ca3af;font-size:12px;margin:0;">This code expires in 10 minutes.</p>
                  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
                  <p style="text-align:center;font-size:11px;color:#9ca3af;">GBTI Architectural Team</p>
                </div>
              `,
              textContent: `Your GBTI verification code is: ${data}\n\nThis code expires in 10 minutes.\n\n-- GBTI Architectural Team`,
            }),
          });
        } catch {
          console.error('Brevo email send failed');
        }
      }

      toast.success('Verification code sent! Check your email.');
      setStep('otp');
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('verify_visitor_otp', {
        p_email: email.trim(),
        p_otp: otp.trim(),
      });

      if (error) {
        toast.error('Verification failed: ' + error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        toast.error('Invalid or expired code. Please try again.');
        setLoading(false);
        return;
      }

      // Store device/session info
      const info = getDeviceInfo();
      try {
        await supabase.rpc('store_visitor_session', {
          p_email: email.trim(),
          p_device_type: info.deviceType,
          p_browser: info.browser,
          p_os: info.os,
          p_screen_width: info.screenWidth,
          p_screen_height: info.screenHeight,
          p_user_agent: info.userAgent,
        });
      } catch {
        // Non-critical — continue even if session store fails
      }

      // Play success animation then proceed
      setVerified(true);
      setTimeout(() => {
        onProceed();
      }, 2000);
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  // ── Success / Verified State ──────────────────────────────
  if (verified) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0a]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center"
          >
            <motion.div
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <ShieldCheck size={36} className="text-white" />
            </motion.div>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="font-display text-2xl font-bold text-white tracking-tight mb-2"
          >
            Verified!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="text-white/40 text-sm"
          >
            Launching your experience…
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.8, duration: 1.0, ease: 'easeInOut' }}
            className="mt-6 mx-auto w-48 h-1 rounded-full bg-gradient-to-r from-emerald-400/60 via-emerald-400 to-emerald-400/60 origin-left"
          />
        </motion.div>
      </div>
    );
  }

  // ── Desktop View: QR Code + Continue ──────────────────────
  if (!isMobile) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0a] overflow-hidden">
        {/* Background accents */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#b8956a]/[0.04] blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#b8956a]/[0.03] blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
              backgroundSize: '48px 48px',
            }}
          />
        </div>

        <AnimatePresence mode="wait">
          {!showAuth ? (
            <motion.div
              key="qr-view"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 text-center max-w-lg mx-4"
            >
              {/* Title and Top Label (Fade out during dismantle) */}
              <motion.div
                animate={{ opacity: isDismantling ? 0 : 1, y: isDismantling ? -10 : 0 }}
                transition={{ duration: 0.4 }}
              >
                {/* Top label */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] mb-8"
                >
                  <Smartphone size={12} className="text-[#b8956a]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Scan with your phone</span>
                </motion.div>

                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="font-display text-5xl md:text-6xl font-bold text-white tracking-tight mb-3 leading-[1.1]"
                >
                  Build Your Own
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="text-white/35 text-sm mb-10 max-w-sm mx-auto"
                >
                  Scan the QR code to continue on your mobile device, or proceed directly below
                </motion.p>
              </motion.div>

              {/* QR Code */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isDismantling ? {
                  scale: [1, 0.85, 8],
                  opacity: [1, 1, 0],
                } : {
                  opacity: 1, scale: 1
                }}
                transition={isDismantling ? { duration: 0.6, times: [0, 0.3, 1], ease: "easeInOut" } : { delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={`inline-block mb-10 ${isDismantling ? 'pointer-events-none relative z-50' : ''}`}
                style={{ willChange: 'transform, opacity' }}
              >
                <div className="relative p-6 rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden">
                  {/* Paytm-style scanner laser */}
                  <AnimatePresence>
                    {isDismantling && (
                      <motion.div
                        initial={{ top: '10%' }}
                        animate={{ top: '90%' }}
                        transition={{ duration: 0.3, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_20px_2px_#34d399] z-[60]"
                        style={{ willChange: 'top' }}
                      />
                    )}
                  </AnimatePresence>
                  {/* Subtle glow behind QR */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#b8956a]/10 to-transparent blur-xl opacity-60" />
                  <div className="relative bg-white rounded-2xl p-4">
                    {qrUrl ? (
                      <img
                        src={qrUrl}
                        alt="Scan to continue on mobile"
                        className="w-[220px] h-[220px] md:w-[260px] md:h-[260px]"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <div className="w-[220px] h-[220px] md:w-[260px] md:h-[260px] flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
                          className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full"
                        />
                      </div>
                    )}
                  </div>
                  {/* Corner accents */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#b8956a]/40 rounded-tl-lg" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#b8956a]/40 rounded-tr-lg" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#b8956a]/40 rounded-bl-lg" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#b8956a]/40 rounded-br-lg" />
                </div>
              </motion.div>

              {/* Continue Button & Footer (Fade out during dismantle) */}
              <motion.div
                animate={{ opacity: isDismantling ? 0 : 1, y: isDismantling ? 10 : 0 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="flex flex-col items-center gap-4"
                >
                  <button
                    id="gate-continue"
                    onClick={handleContinue}
                    disabled={isDismantling}
                    className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#b8956a] to-[#a07850] text-white text-sm font-semibold hover:brightness-110 active:scale-[0.97] transition-all duration-300 shadow-lg shadow-[#b8956a]/20 disabled:opacity-50"
                  >
                    Continue Here
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </button>

                  <button
                    onClick={handleSkip}
                    disabled={isDismantling}
                    className="text-[10px] text-white/20 hover:text-white/40 uppercase tracking-[0.2em] transition-colors"
                  >
                    Skip (Dev)
                  </button>
                </motion.div>

                {/* Footer */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9, duration: 0.5 }}
                  className="text-white/15 text-[10px] uppercase tracking-[0.2em] mt-8"
                >
                  GBTI Smart Home Builder
                </motion.p>
              </motion.div>
            </motion.div>
          ) : (
            /* Desktop Auth Form (email/OTP) */
            <motion.div
              key="auth-view"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-md mx-4"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#b8956a] to-[#a07850] flex items-center justify-center text-white font-display font-bold text-2xl mx-auto mb-4 shadow-lg shadow-[#b8956a]/20"
                >
                  G
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="font-display text-3xl font-bold text-white tracking-tight"
                >
                  Build Your Own
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-white/35 text-sm mt-2"
                >
                  {step === 'email' ? 'Enter your email to get started' : 'Enter the code sent to your email'}
                </motion.p>
              </div>

              {/* Form Card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl"
              >
                <AnimatePresence mode="wait">
                  {step === 'email' ? (
                    <motion.form
                      key="email-step"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={sendOtp}
                      className="space-y-5"
                    >
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2 block">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
                          <input
                            id="gate-email-desktop"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                            autoFocus
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-sm placeholder:text-white/20 outline-none focus:border-[#b8956a]/50 focus:bg-white/[0.08] transition-all duration-300"
                          />
                        </div>
                      </div>

                      <button
                        id="gate-send-otp-desktop"
                        type="submit"
                        disabled={loading || !email.trim()}
                        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-gradient-to-r from-[#b8956a] to-[#a07850] text-white text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 shadow-lg shadow-[#b8956a]/20"
                      >
                        {loading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
                            className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full"
                          />
                        ) : (
                          <>
                            <Send size={15} />
                            Send Verification Code
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowAuth(false)}
                        className="w-full text-center text-[11px] text-white/25 hover:text-white/40 transition-colors pt-1"
                      >
                        ← Back to QR code
                      </button>
                    </motion.form>
                  ) : (
                    <motion.form
                      key="otp-step"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={verifyOtp}
                      className="space-y-5"
                    >
                      {/* Email display */}
                      <div className="bg-white/[0.04] rounded-lg px-4 py-3 flex items-center gap-3">
                        <Mail size={14} className="text-white/30 flex-shrink-0" />
                        <span className="text-white/50 text-sm truncate">{email}</span>
                      </div>

                      {/* OTP Input */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2 block">
                          6-Digit Code
                        </label>
                        <input
                          id="gate-otp-desktop"
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          maxLength={6}
                          autoFocus
                          className="w-full text-center text-2xl font-display font-bold tracking-[0.5em] px-4 py-4 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-white/15 outline-none focus:border-[#b8956a]/50 focus:bg-white/[0.08] transition-all duration-300"
                        />
                      </div>

                      <button
                        id="gate-verify-otp-desktop"
                        type="submit"
                        disabled={loading || otp.length !== 6}
                        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-gradient-to-r from-[#b8956a] to-[#a07850] text-white text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 shadow-lg shadow-[#b8956a]/20"
                      >
                        {loading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
                            className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full"
                          />
                        ) : (
                          <>
                            <ShieldCheck size={15} />
                            Verify & Continue
                          </>
                        )}
                      </button>

                      {/* Resend / Change email */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => { setStep('email'); setOtp(''); }}
                          className="text-[11px] text-white/25 hover:text-white/40 transition-colors"
                        >
                          ← Change email
                        </button>
                        <button
                          type="button"
                          onClick={sendOtp as any}
                          disabled={loading}
                          className="text-[11px] text-[#b8956a]/60 hover:text-[#b8956a] transition-colors disabled:opacity-50"
                        >
                          Resend code
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Footer */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-center text-white/15 text-[10px] uppercase tracking-[0.2em] mt-6"
              >
                GBTI Smart Home Builder
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Mobile View: Email + OTP ──────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0a] overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0">
        <div className="absolute -top-[30%] -right-[20%] w-[60%] h-[60%] rounded-full bg-[#b8956a]/[0.04] blur-[80px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-[#b8956a]/[0.03] blur-[60px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#b8956a] to-[#a07850] flex items-center justify-center text-white font-display font-bold text-xl mx-auto mb-4 shadow-lg shadow-[#b8956a]/20"
          >
            G
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="font-display text-3xl font-bold text-white tracking-tight"
          >
            Build Your Own
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-white/35 text-sm mt-2"
          >
            {step === 'email' ? 'Enter your email to get started' : 'Enter the code sent to your email'}
          </motion.p>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 shadow-2xl"
        >
          <AnimatePresence mode="wait">
            {step === 'email' ? (
              <motion.form
                key="email-step"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                onSubmit={sendOtp}
                className="space-y-4"
              >
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2 block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                    <input
                      id="gate-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-sm placeholder:text-white/20 outline-none focus:border-[#b8956a]/50 focus:bg-white/[0.08] transition-all duration-300"
                    />
                  </div>
                </div>

                <button
                  id="gate-send-otp"
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-gradient-to-r from-[#b8956a] to-[#a07850] text-white text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 shadow-lg shadow-[#b8956a]/20"
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
                      className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      <Send size={15} />
                      Send Verification Code
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="otp-step"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                onSubmit={verifyOtp}
                className="space-y-4"
              >
                {/* Email display */}
                <div className="bg-white/[0.04] rounded-lg px-3 py-2.5 flex items-center gap-2.5">
                  <Mail size={13} className="text-white/30 flex-shrink-0" />
                  <span className="text-white/50 text-xs truncate">{email}</span>
                </div>

                {/* OTP Input */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2 block">
                    6-Digit Code
                  </label>
                  <input
                    id="gate-otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                    className="w-full text-center text-2xl font-display font-bold tracking-[0.5em] px-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-white/15 outline-none focus:border-[#b8956a]/50 focus:bg-white/[0.08] transition-all duration-300"
                  />
                </div>

                <button
                  id="gate-verify-otp"
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-gradient-to-r from-[#b8956a] to-[#a07850] text-white text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 shadow-lg shadow-[#b8956a]/20"
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
                      className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      <ShieldCheck size={15} />
                      Verify & Continue
                    </>
                  )}
                </button>

                {/* Resend / Change email */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setOtp(''); }}
                    className="text-[11px] text-white/25 hover:text-white/40 transition-colors"
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    onClick={sendOtp as any}
                    disabled={loading}
                    className="text-[11px] text-[#b8956a]/60 hover:text-[#b8956a] transition-colors disabled:opacity-50"
                  >
                    Resend code
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-center text-white/15 text-[10px] uppercase tracking-[0.2em] mt-6"
        >
          GBTI Smart Home Builder
        </motion.p>
      </motion.div>
    </div>
  );
};
