'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Lock, ArrowLeft } from 'lucide-react';
import { authAPI } from '@/lib/api';

function NewPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const email = searchParams.get('email') || '';
  const resetToken = searchParams.get('resetToken') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !resetToken) {
      setError('Missing email or reset token. Please restart the flow.');
      return;
    }
    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const resp = await authAPI.resetPassword({ email, resetToken, newPassword: password, confirmPassword });
      if (resp && (resp as { success?: boolean }).success) {
        showToast({ type: 'success', title: 'Password updated', message: 'You can now login with your new password.' });
        router.push('/auth/login');
      } else {
        setError((resp as { message?: string })?.message || 'Failed to reset password.');
      }
    } catch (e: unknown) {
      setError((e as any)?.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => router.push('/auth/login');

  return (
    <div className="min-h-screen relative overflow-hidden bg-background flex items-center justify-center p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-primary/25 to-primary-hover/25 blur-3xl opacity-70 animate-pulse" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-tr from-emerald-400/15 to-sky-400/15 blur-3xl opacity-70 animate-pulse" />
      </div>
      <div className="w-full max-w-md relative">
        <div className="group relative">
          <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-r from-primary/50 via-primary-hover/50 to-primary/50 opacity-70 blur-xl transition-opacity duration-500 group-hover:opacity-90" aria-hidden="true" />
          <Card className="relative rounded-2xl border border-white/10 bg-background/70 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-r from-primary to-primary-hover mb-4 shadow-xl">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-text-primary">Set New Password</CardTitle>
          <CardDescription className="text-text-secondary">Enter your new password for {email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">New Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" required className="h-11 rounded-xl bg-background/70 transition-colors focus:ring-2 focus:ring-primary/40 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Confirm Password</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required className="h-11 rounded-xl bg-background/70 transition-colors focus:ring-2 focus:ring-primary/40 focus:border-primary" />
            </div>

            {error && <div className="text-red-600 text-sm text-center">{error}</div>}

            <Button type="submit" disabled={isLoading || !password || !confirmPassword} className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-hover text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0">
              {isLoading ? 'Saving...' : 'Save Password'}
            </Button>

            <div className="text-center">
              <Button type="button" variant="ghost" onClick={handleBack} className="flex items-center gap-2 mx-auto text-text-secondary hover:text-text-primary">
                <ArrowLeft className="h-4 w-4" />
                Back to Login
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

export default function NewPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen relative overflow-hidden bg-background flex items-center justify-center p-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 -left-28 h-72 w-72 rounded-full bg-gradient-to-br from-primary/25 to-primary-hover/25 blur-3xl opacity-70" />
          <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-gradient-to-tr from-emerald-400/15 to-sky-400/15 blur-3xl opacity-70" />
        </div>
        <div className="text-center relative">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    }>
      <NewPasswordForm />
    </Suspense>
  );
}

