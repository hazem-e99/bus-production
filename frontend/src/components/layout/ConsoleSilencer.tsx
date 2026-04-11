'use client';

import { useEffect } from 'react';

export default function ConsoleSilencer() {
  useEffect(() => {
    try {
      const noop = () => {};
      // Preserve references if needed later
      (window as { __original_console__?: Partial<typeof console> }).__original_console__ = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info,
        debug: console.debug,
      };
      console.log = noop as typeof console.log;
      console.warn = noop as typeof console.warn;
      console.error = noop as typeof console.error;
      console.info = noop as typeof console.info;
      console.debug = noop as typeof console.debug;
    } catch {}
  }, []);
  return null;
}


