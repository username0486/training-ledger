import { useState } from 'react';
import { Activity, Mail, Lock, User as UserIcon, Chrome, Apple as AppleIcon } from 'lucide-react';
import { FloatingLabelInput } from '../components/FloatingLabelInput';
import { Button } from '../components/Button';
import { signIn, signUp, signInWithOAuth, checkEmailExists } from '../utils/auth';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

type AuthStep = 'email' | 'login' | 'signup';

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailContinue = async () => {
    if (!email) return;
    
    setError(null);
    setLoading(true);

    try {
      // Check if email exists (mock implementation for now)
      const exists = await checkEmailExists(email);
      
      if (exists) {
        setStep('login');
      } else {
        setStep('signup');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        onAuthSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signUp(email, password, name);
      if (result.error) {
        setError(result.error);
      } else {
        onAuthSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError(null);
    setLoading(true);

    try {
      const result = await signInWithOAuth(provider);
      if (result.error) {
        setError(result.error);
      }
      // OAuth will redirect, so we don't call onAuthSuccess here
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setPassword('');
    setName('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-5 py-8">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center mb-4">
            <Activity className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary mb-1">
            {step === 'email' && 'Log in or Sign up'}
            {step === 'login' && 'Welcome back'}
            {step === 'signup' && 'Create your account'}
          </h1>
          <p className="text-sm text-text-muted">
            {step === 'email' && 'Enter your email to continue'}
            {step === 'login' && 'Enter your password to continue'}
            {step === 'signup' && 'Just a few details to get started'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Email Step */}
        {step === 'email' && (
          <>
            <div className="space-y-4 mb-6">
              <FloatingLabelInput
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && email) {
                    handleEmailContinue();
                  }
                }}
                autoFocus
                icon={<Mail />}
              />

              <Button
                variant="primary"
                className="w-full"
                onClick={handleEmailContinue}
                disabled={loading || !email}
              >
                {loading ? 'Loading...' : 'Continue'}
              </Button>
            </div>

            {/* OAuth Options */}
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-subtle"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-background text-text-muted">Or continue with</span>
                </div>
              </div>

              <Button
                variant="neutral"
                onClick={() => handleOAuth('google')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2"
              >
                <Chrome className="w-4 h-4" />
                Log in with Google
              </Button>

              <Button
                variant="neutral"
                onClick={() => handleOAuth('apple')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2"
              >
                <AppleIcon className="w-4 h-4" />
                Log in with Apple
              </Button>

              <div className="text-center text-xs text-text-muted pt-2">
                <p>
                  Note: OAuth providers require additional setup. See{' '}
                  <a
                    href="https://supabase.com/docs/guides/auth/social-login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    Supabase docs
                  </a>
                </p>
              </div>
            </div>
          </>
        )}

        {/* Login Step */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <FloatingLabelInput
              id="email-display"
              label="Email"
              type="email"
              value={email}
              disabled
              icon={<Mail />}
            />

            <FloatingLabelInput
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoFocus
              icon={<Lock />}
            />

            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={loading || !password}
              >
                {loading ? 'Logging in...' : 'Log in'}
              </Button>

              <Button
                type="button"
                variant="neutral"
                className="w-full"
                onClick={handleBack}
              >
                Back
              </Button>
            </div>
          </form>
        )}

        {/* Sign Up Step */}
        {step === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <FloatingLabelInput
              id="email-display"
              label="Email"
              type="email"
              value={email}
              disabled
              icon={<Mail />}
            />

            <FloatingLabelInput
              id="name"
              label="Name (optional)"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              icon={<UserIcon />}
            />

            <FloatingLabelInput
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              icon={<Lock />}
            />

            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={loading || !password}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>

              <Button
                type="button"
                variant="neutral"
                className="w-full"
                onClick={handleBack}
              >
                Back
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
