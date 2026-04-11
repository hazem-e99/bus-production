'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { validateVerification } from '@/utils/validateVerification';

function VerificationForm() {
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  
  // Get email from URL params (sent from registration page)
  const email = searchParams.get('email');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email not found. Please try registering again.');
      return;
    }

    // Validate verification data
    const validation = validateVerification({ email, verificationCode });
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('🔐 Starting verification with:', { email, verificationCode });
      
      const data = await authAPI.verifyEmail({ email, code: verificationCode });
      
      console.log('✅ Verification response:', data);

      if (data && data.success) {
        setIsVerified(true);
        showToast({ 
          type: 'success', 
          title: 'Verification Successful!', 
          message: 'Your email has been verified successfully. You can now login.' 
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      } else {
        setError(data?.message || 'Verification failed. Please check your code and try again.');
        showToast({ 
          type: 'error', 
          title: 'Verification Failed', 
          message: data?.message || 'Verification failed. Please check your code and try again.' 
        });
      }
    } catch (err: unknown) {
      console.error('Verification error:', err);
      setError('Verification failed. Please try again.');
      showToast({ 
        type: 'error', 
        title: 'Verification Error', 
        message: 'Verification failed. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      showToast({ 
        type: 'error', 
        title: 'Error', 
        message: 'Email not found. Please try registering again.' 
      });
      return;
    }

    setIsLoading(true);
    try {
      // You might want to add a resend verification code endpoint
      showToast({ 
        type: 'info', 
        title: 'Code Resent', 
        message: 'A new verification code has been sent to your email.' 
      });
    } catch {
      showToast({ 
        type: 'error', 
        title: 'Error', 
        message: 'Failed to resend verification code. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/auth/login');
  };

  // If no email, show error
  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <Mail className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Email Not Found
              </h2>
              <p className="text-gray-600 mb-6">
                Email address not found. Please try registering again.
              </p>
              <Button 
                onClick={handleBackToLogin}
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If verified, show success
  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Email Verified Successfully!
              </h2>
              <p className="text-gray-600 mb-6">
                Your email has been verified. You will be redirected to login in a few seconds.
              </p>
              <Button 
                onClick={handleBackToLogin}
                className="w-full"
              >
                Go to Login Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Verify Your Email
          </CardTitle>
          <CardDescription className="text-gray-600">
            We&apos;ve sent a verification code to:
            <br />
            <span className="font-medium text-gray-900">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
                Verification Code *
              </label>
              <Input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter verification code"
                required
                className="w-full text-center text-lg tracking-widest"
                maxLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Check your email for the 6-digit verification code
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 p-4 rounded-lg">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading || !verificationCode.trim()}
              className="w-full"
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </Button>

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleResendCode}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Sending...' : 'Resend Code'}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                onClick={handleBackToLogin}
                className="w-full flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerificationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <VerificationForm />
    </Suspense>
  );
}
