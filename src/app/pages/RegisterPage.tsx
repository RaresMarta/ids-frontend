import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router';
import NetworkBackground from '../components/NetworkBackground';
import { Shield, CheckCircle2, XCircle, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordStrength = () => {
    if (!password) return { strength: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['var(--threat)', 'var(--attack-dos)', 'var(--warn)', 'var(--safe)'];
    return {
      strength: (score / 4) * 100,
      label: labels[score - 1] || 'Weak',
      color: colors[score - 1] || 'var(--threat)',
    };
  };

  const { strength, label, color } = passwordStrength();
  const emailValid = email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordsMatch = password === confirmPassword;

  // Already signed in → no reason to show the form.
  if (!authLoading && user) return <Navigate to="/analysis" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(emailValid && passwordsMatch && strength >= 50 && username)) return;
    setLoading(true);
    setError('');
    try {
      await signUp(email, password, username);
      navigate('/analysis');
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 relative flex-col items-center justify-center p-16">
        <NetworkBackground />
        <div className="relative z-10 max-w-sm">
          <div className="flex items-center gap-2.5 mb-8">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display text-sm tracking-wide text-foreground/80">Neural IDS</span>
          </div>
          <h1 className="font-display text-3xl text-foreground mb-4 leading-snug">
            Request system access
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Create an account to begin analyzing network traffic with our machine learning classifiers.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-[440px] flex items-center justify-center p-8 bg-card border-l border-border overflow-y-auto">
        <div className="w-full max-w-sm py-4">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <Shield className="w-4 h-4 text-primary" />
              <span className="font-display text-sm text-foreground/70">Neural IDS</span>
            </div>
            <h2 className="font-display text-2xl text-foreground mb-1">Create account</h2>
            <p className="text-sm text-muted-foreground">Fill in the details below to register</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="register-username" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                id="register-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 bg-input border border-border rounded-md text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                placeholder="jane_analyst"
                required
              />
            </div>

            <div>
              <label htmlFor="register-email" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-md text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all pr-9"
                  placeholder="you@example.com"
                  required
                />
                {email && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    {emailValid ? (
                      <CheckCircle2 className="w-4 h-4 text-safe" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="register-password" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-input border border-border rounded-md text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                placeholder="••••••••"
                required
              />
              {password && (
                <div className="mt-2">
                  <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300 rounded-full"
                      style={{ width: `${strength}%`, backgroundColor: color }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color }}>{label}</p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="register-confirm" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="register-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-md text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all pr-9"
                  placeholder="••••••••"
                  required
                />
                {confirmPassword && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    {passwordsMatch ? (
                      <CheckCircle2 className="w-4 h-4 text-safe" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive" role="alert">{error}</p>
            )}

            <button
              type="submit"
              disabled={!emailValid || !passwordsMatch || strength < 50 || !username || loading}
              className="w-full py-2.5 bg-foreground text-background rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity mt-2"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
