import type { Metadata } from 'next';
import { Inter, Cairo } from 'next/font/google';
import './globals.css';

import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/components/ui/Toast';
import ConsoleSilencer from '@/components/layout/ConsoleSilencer';
import ThemeInitializer from '@/components/layout/ThemeInitializer';
import LayoutShell from '@/components/layout/LayoutShell';
import I18nProvider from '@/components/providers/I18nProvider';
import { cookies } from 'next/headers'

const inter = Inter({ subsets: ['latin'] });
const cairo = Cairo({ subsets: ['arabic'] });

export const metadata: Metadata = {
  title: 'الريناد - نظام إدارة النقل الذكي',
  description: 'نظام شامل لإدارة النقل والحافلات المدرسية',
  icons: {
    icon: '/bus_two.png',
    shortcut: '/bus_two.png',
    apple: '/bus_two.png',
  },
};



export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const lang = (cookieStore.get('lang')?.value as 'en' | 'ar') || 'en'
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  return (
    <html lang={lang} dir={dir}>
      <body className={lang === 'ar' ? cairo.className : inter.className}>
        <AuthProvider>
          <ToastProvider>
            <ConsoleSilencer />
            <ThemeInitializer />
            <I18nProvider initialLang={lang}>
              <LayoutShell>{children}</LayoutShell>
            </I18nProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
