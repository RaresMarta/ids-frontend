import { useState } from 'react';
import { useNavigate } from 'react-router';
import NetworkBackground from '../components/NetworkBackground';
import GlassmorphicCard from '../components/GlassmorphicCard';
import { Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      <div className="flex-1 relative">
        <NetworkBackground />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-8">
            <Shield className="w-24 h-24 mx-auto mb-6" style={{ color: '#00D9FF', filter: 'drop-shadow(0 0 20px rgba(0, 217, 255, 0.6))' }} />
            <h1 className="font-orbitron text-5xl mb-4" style={{ color: '#00D9FF', textShadow: '0 0 30px rgba(0, 217, 255, 0.5)' }}>
              NEURAL IDS
            </h1>
            <p className="text-xl text-foreground/70">AI-Powered Network Intrusion Detection</p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[500px] flex items-center justify-center p-8 bg-background">
        <GlassmorphicCard className="w-full max-w-md p-8">
          <h2 className="font-orbitron text-3xl mb-2" style={{ color: '#00D9FF' }}>Access System</h2>
          <p className="text-muted-foreground mb-8">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm mb-2 text-foreground/80">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-input border border-primary/20 rounded-lg text-foreground focus:outline-none focus:border-primary transition-all"
                style={{ boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)' }}
                placeholder="user@neural-ids.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-foreground/80">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-input border border-primary/20 rounded-lg text-foreground focus:outline-none focus:border-primary transition-all"
                style={{ boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)' }}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-sm font-mono" style={{ color: '#FF0055' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-orbitron transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 0 20px rgba(0, 217, 255, 0.3), 0 0 40px rgba(0, 217, 255, 0.1)' }}
            >
              {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => navigate('/register')} className="text-primary hover:underline">
              Create new account
            </button>
          </div>
        </GlassmorphicCard>
      </div>
    </div>
  );
}
