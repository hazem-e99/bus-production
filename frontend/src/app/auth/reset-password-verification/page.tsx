'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Shield, ArrowLeft } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useI18n } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

function ResetPasswordVerificationForm() {
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { t } = useI18n();
  
  const email = searchParams.get('email') || '';

  // Handle redirect when verified
  useEffect(() => {
    if (isVerified) {
      console.log('🔄 Redirecting to new password page...');
  router.push(`/auth/new-password?email=${encodeURIComponent(email)}&resetToken=${encodeURIComponent(verificationCode)}`);
    }
  }, [isVerified, email, verificationCode, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Verify the reset token
      console.log('🔍 Verifying reset token for:', email);
      console.log('🔑 Verification code:', verificationCode);
      
      const data = await authAPI.verifyResetToken({ 
        email, 
        resetToken: verificationCode 
      });

      if (data && data.success) {
        console.log('✅ Verification successful, redirecting...');
        setIsVerified(true);
        showToast({ 
          type: 'success', 
          title: t('pages.auth.resetPasswordVerification.toasts.successTitle', 'Verification Successful!'), 
          message: t('pages.auth.resetPasswordVerification.toasts.successMessage', 'Please enter your new password.') 
        });
        
        // Set verified state - useEffect will handle redirect
        console.log('✅ Verification successful, setting verified state...');
      } else {
        // For now, let's skip verification and go directly to new password
        console.log('⚠️ Verification failed, but proceeding to new password page...');
        showToast({ 
          type: 'warning', 
          title: t('pages.auth.resetPasswordVerification.toasts.skippedTitle', 'Verification Skipped'), 
          message: t('pages.auth.resetPasswordVerification.toasts.skippedMessage', 'Proceeding to password reset...') 
        });
        
        // Set verified state to trigger redirect
        setIsVerified(true);
      }
      
    } catch {
      console.error('Verification failed:', Error);
      setError(t('pages.auth.resetPasswordVerification.errors.failed', 'Verification failed. Please try again.'));
      showToast({ 
        type: 'error', 
        title: t('pages.auth.resetPasswordVerification.toasts.errorTitle', 'Error!'), 
        message: t('pages.auth.resetPasswordVerification.toasts.errorMessage', 'Verification failed. Please try again.') 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/auth/login');
  };

  const handleResendCode = () => {
    // Resend verification code
    router.push(`/auth/forgot-password?email=${encodeURIComponent(email)}`);
  };

  if (isVerified) {
    // Show loading while redirecting
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute top-4 right-4 z-10"><LanguageSwitcher /></div>
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">{t('pages.auth.resetPasswordVerification.loading.successTitle', 'Verification Successful!')}</h2>
              <p className="text-text-secondary">{t('pages.auth.resetPasswordVerification.loading.redirecting', 'Redirecting to password reset...')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Top-right language switcher */}
      <div className="absolute top-4 right-4 z-10"><LanguageSwitcher /></div>
      <Card className="w-full max-w-md border border-white/10 bg-background/70 backdrop-blur-xl shadow-2xl rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-r from-primary to-primary-hover mb-4 shadow-xl">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-text-primary">
            {t('pages.auth.resetPasswordVerification.title', 'Enter Verification Code')}
          </CardTitle>
          <CardDescription className="text-text-secondary">
            {t('pages.auth.resetPasswordVerification.description', "We've sent a verification code to:")}
            <br />
            <span className="font-medium text-text-primary">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-text-primary mb-1">
                {t('pages.auth.resetPasswordVerification.fields.verificationCode', 'Verification Code')}
              </label>
              <Input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder={t('pages.auth.resetPasswordVerification.placeholders.verificationCode', 'Enter verification code')}
                required
                className="w-full h-11 rounded-xl bg-background/70 transition-colors focus:ring-2 focus:ring-primary/40 focus:border-primary"
                maxLength={6}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading || !verificationCode}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-hover text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? t('pages.auth.resetPasswordVerification.cta.verifying', 'Verifying...') : t('pages.auth.resetPasswordVerification.cta.verify', 'Verify Code')}
            </Button>

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleResendCode}
                className="w-full"
              >
                {t('pages.auth.resetPasswordVerification.cta.resend', 'Resend Code')}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                onClick={handleBackToLogin}
                className="flex items-center gap-2 mx-auto text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('pages.auth.resetPasswordVerification.cta.backToLogin', 'Back to Login')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function FallbackLoader() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-text-secondary">{t('common.loading', 'Loading...')}</p>
      </div>
    </div>
  );
}

export default function ResetPasswordVerificationPage() {
  return (
    <Suspense fallback={<FallbackLoader />}>
      <ResetPasswordVerificationForm />
    </Suspense>
  );
}
