'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Mail, ArrowLeft } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useI18n } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { t } = useI18n();
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  // Prefill email if provided via query string
  useEffect(() => {
    const initialEmail = searchParams.get('email');
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [searchParams, email]);

  const handleBackToLogin = () => {
    router.push('/auth/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await authAPI.forgotPassword({ email });
    } catch {}
    // For privacy and better UX, always proceed to verification and show a neutral toast
    showToast({
      type: 'success',
      title: t('pages.auth.forgotPassword.toasts.successTitle', 'Email Sent'),
      message: t(
        'pages.auth.forgotPassword.toasts.successMessage',
        "If an account exists with that email, a reset link has been sent."
      ),
    });
    router.push(`/auth/reset-password-verification?email=${encodeURIComponent(email)}`);
    setIsLoading(false);
  };
  return (
    <div className="min-h-screen relative overflow-hidden bg-background flex items-center justify-center p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-primary/25 to-primary-hover/25 blur-3xl opacity-70 animate-pulse" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-tr from-emerald-400/15 to-sky-400/15 blur-3xl opacity-70 animate-pulse" />
      </div>
      {/* Top-right language switcher */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md relative">
        <div className="group relative">
          <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-r from-primary/50 via-primary-hover/50 to-primary/50 opacity-70 blur-xl transition-opacity duration-500 group-hover:opacity-90" aria-hidden="true" />
          <Card className="relative rounded-2xl border border-white/10 bg-background/70 backdrop-blur-xl shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-r from-primary to-primary-hover mb-4 shadow-xl">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-text-primary">
                {t('pages.auth.forgotPassword.title', 'Forgot Password?')}
              </CardTitle>
              <CardDescription className="text-text-secondary">
                {t('pages.auth.forgotPassword.description', "Enter your email address and we'll send you a link to reset your password.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
                    {t('pages.auth.forgotPassword.fields.email', 'Email Address')}
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('pages.auth.forgotPassword.placeholders.email', 'Enter your email')}
                    required
                    className="w-full h-11 rounded-xl bg-background/70 transition-colors focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>

                {error && (
                  <div className="text-red-600 text-sm text-center">{error}</div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-hover text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isLoading ? t('pages.auth.forgotPassword.cta.sending', 'Sending...') : t('pages.auth.forgotPassword.cta.send', 'Send Reset Link')}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBackToLogin}
                    className="flex items-center gap-2 mx-auto text-text-secondary hover:text-text-primary"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t('pages.auth.forgotPassword.backToLogin', 'Back to Login')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FallbackLoader() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen relative overflow-hidden bg-background flex items-center justify-center p-6">
      <div className="absolute -top-28 -left-28 h-72 w-72 rounded-full bg-gradient-to-br from-primary/25 to-primary-hover/25 blur-3xl opacity-70" />
      <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-gradient-to-tr from-emerald-400/15 to-sky-400/15 blur-3xl opacity-70" />
      <div className="text-center relative">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-text-secondary">{t('common.loading', 'Loading...')}</p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
  <Suspense fallback={<FallbackLoader />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
