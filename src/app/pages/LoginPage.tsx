import { useState } from 'react';
import { useNavigate } from 'react-router';
import NetworkBackground from '../components/NetworkBackground';
import { Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message ?? 'Sign-in failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left panel — subtle animated topology */}
      <div className="hidden lg:flex flex-1 relative flex-col items-center justify-center p-16">
        <NetworkBackground />
        <div className="relative z-10 max-w-sm">
          <div className="flex items-center gap-2.5 mb-8">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display text-sm tracking-wide text-foreground/80">Neural IDS</span>
          </div>
          <h1 className="font-display text-3xl text-foreground mb-4 leading-snug">
            AI-Powered Network<br />Intrusion Detection
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Machine learning–based traffic classification for research and academic purposes. Developed as a bachelor thesis demonstration system.
          </p>
          <div className="mt-12 space-y-3">
            {[
              ['MLP Neural Network', '98.7% accuracy'],
              ['Random Forest', '99.2% accuracy'],
              ['XGBoost', '97.4% accuracy'],
            ].map(([model, acc]) => (
              <div key={model} className="flex items-center justify-between py-2.5 border-b border-border">
                <span className="text-xs text-foreground/60">{model}</span>
                <span className="font-mono text-xs text-primary">{acc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-[440px] flex items-center justify-center p-8 bg-card border-l border-border">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <Shield className="w-4 h-4 text-primary" />
              <span className="font-display text-sm text-foreground/70">Neural IDS</span>
            </div>
            <h2 className="font-display text-2xl text-foreground mb-1">Sign in</h2>
            <p className="text-sm text-muted-foreground">Enter your credentials to access the system</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-input border border-border rounded-md text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Password
                </label>
                <button type="button" className="text-xs text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-input border border-border rounded-md text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-xs text-destructive" role="alert">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
