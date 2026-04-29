import { useEffect, useRef } from 'react';

/**
 * Resets the configurator after `timeoutMs` of no user input.
 * Designed for expo kiosks. Pause when disabled.
 */
export function useInactivityReset(onReset: () => void, timeoutMs = 60000, enabled = true) {
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(onReset, timeoutMs);
    };
    const events = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'wheel'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [enabled, onReset, timeoutMs]);
}
