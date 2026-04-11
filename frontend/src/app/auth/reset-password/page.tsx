'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { authAPI } from '@/lib/api';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }
    
    try {
      const data = await authAPI.resetPassword({ 
        resetToken: token, 
        email, 
        newPassword: password,
        confirmPassword: confirmPassword
      });

      if (data && data.success) {
        // Show success message
        setIsSuccess(true);
        showToast({ 
          type: 'success', 
          title: 'Success!', 
          message: 'Your password has been reset successfully.' 
        });
      } else {
        setError(data?.error || 'Failed to reset password. Please try again.');
        showToast({ 
          type: 'error', 
          title: 'Error!', 
          message: data?.error || 'Failed to reset password. Please try again.' 
        });
      }
      
    } catch (err) {
      console.error('Failed to reset password:', err);
      setError('Failed to reset password. Please try again.');
      showToast({ 
        type: 'error', 
        title: 'Error!', 
        message: 'Failed to reset password. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/auth/login');
  };

  // If no token or email, show error
  if (!token || !email) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-background flex items-center justify-center p-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-primary/25 to-primary-hover/25 blur-3xl opacity-70" />
          <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-tr from-emerald-400/15 to-sky-400/15 blur-3xl opacity-70" />
        </div>
        <div className="w-full max-w-md relative">
          <div className="group relative">
            <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-r from-primary/50 via-primary-hover/50 to-primary/50 opacity-70 blur-xl" aria-hidden="true" />
            <Card className="relative rounded-2xl border border-white/10 bg-background/70 backdrop-blur-xl shadow-2xl">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-r from-primary to-primary-hover mb-4 shadow-xl">
                    <Lock className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-text-primary mb-2">
                    Invalid Reset Link
                  </h2>
                  <p className="text-text-secondary mb-6">
                    This password reset link is invalid or has expired. Please request a new one.
                  </p>
                  <Button 
                    onClick={handleBackToLogin}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-hover text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Back to Login
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-background flex items-center justify-center p-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-primary/25 to-primary-hover/25 blur-3xl opacity-70" />
          <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-tr from-emerald-400/15 to-sky-400/15 blur-3xl opacity-70" />
        </div>
        <div className="w-full max-w-md relative">
          <div className="group relative">
            <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-r from-primary/50 via-primary-hover/50 to-primary/50 opacity-70 blur-xl" aria-hidden="true" />
            <Card className="relative rounded-2xl border border-white/10 bg-background/70 backdrop-blur-xl shadow-2xl">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-r from-primary to-primary-hover mb-4 shadow-xl">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-text-primary mb-2">
                    Password Reset Successfully!
                  </h2>
                  <p className="text-text-secondary mb-6">
                    Your password has been updated. You can now sign in with your new password.
                  </p>
                  <Button 
                    onClick={handleBackToLogin}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-hover text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Sign In
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background flex items-center justify-center p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-primary/25 to-primary-hover/25 blur-3xl opacity-70" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-tr from-emerald-400/15 to-sky-400/15 blur-3xl opacity-70" />
      </div>
      <div className="w-full max-w-md relative">
        <div className="group relative">
          <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-r from-primary/50 via-primary-hover/50 to-primary/50 opacity-70 blur-xl" aria-hidden="true" />
          <Card className="relative rounded-2xl border border-white/10 bg-background/70 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-r from-primary to-primary-hover mb-4 shadow-xl">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-text-primary">
            Reset Your Password
          </CardTitle>
          <CardDescription className="text-text-secondary">
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="w-full h-11 pr-10 rounded-xl bg-background/70 transition-colors focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="w-full h-11 pr-10 rounded-xl bg-background/70 transition-colors focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading || !password || !confirmPassword}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-hover text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBackToLogin}
                className="text-sm text-text-secondary hover:text-text-primary"
              >
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

export default function ResetPasswordPage() {
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
      <ResetPasswordForm />
    </Suspense>
  );
}
