'use client';

import { useEffect } from 'react';
import { settingsAPI } from '@/lib/api';

function applyThemeColors(primary: string, secondary: string) {
  const root = document.documentElement;
  const safePrimary = primary || '#3B82F6';
  const safeSecondary = secondary || '#10B981';
  root.style.setProperty('--primary', safePrimary);
  root.style.setProperty('--primary-hover', adjustBrightness(safePrimary, -20));
  root.style.setProperty('--primary-light', adjustBrightness(safePrimary, 90));
  root.style.setProperty('--secondary', safeSecondary);
  root.style.setProperty('--secondary-hover', adjustBrightness(safeSecondary, -20));
  root.style.setProperty('--secondary-light', adjustBrightness(safeSecondary, 90));
}

function adjustBrightness(hex: string, percent: number) {
  const normalized = /^#/.test(hex) ? hex : `#${hex}`;
  const num = parseInt(normalized.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

export default function ThemeInitializer() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Apply from localStorage immediately if available
        const cached = typeof window !== 'undefined' ? localStorage.getItem('themeColors') : null;
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as { primary?: string; secondary?: string };
            if (parsed?.primary || parsed?.secondary) {
              applyThemeColors(parsed.primary || '#3B82F6', parsed.secondary || '#10B981');
            }
          } catch {}
        }

        const data = await settingsAPI.get().catch(() => null as unknown);
        if (!data) return;
        if (cancelled) return;
        applyThemeColors(data?.primaryColor || '#3B82F6', data?.secondaryColor || '#10B981');
        // sync cache
        try {
          localStorage.setItem('themeColors', JSON.stringify({ primary: data?.primaryColor, secondary: data?.secondaryColor }));
        } catch {}
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}


