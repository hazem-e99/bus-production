'use client';

import { useEffect } from 'react';

export default function ConsoleSilencer() {
  useEffect(() => {
    // Only silence the console in production, and only the noisy/verbose channels
    // (log/info/debug — where request URLs, payloads, and token fragments get printed
    // throughout this app). console.error/warn are deliberately left alone: this app
    // logs caught errors via console.error as part of its error-handling strategy, and
    // silencing those too would make production issues undebuggable even via a user's
    // browser devtools during a support session.
    if (process.env.NODE_ENV !== 'production') return;
    try {
      const noop = () => {};
      // Preserve references if needed later
      (window as { __original_console__?: Partial<typeof console> }).__original_console__ = {
        log: console.log,
        info: console.info,
        debug: console.debug,
      };
      console.log = noop as typeof console.log;
      console.info = noop as typeof console.info;
      console.debug = noop as typeof console.debug;
    } catch {}
  }, []);
  return null;
}


