import { useState } from 'react';
import { useNavigate } from 'react-router';
import NetworkBackground from '../components/NetworkBackground';
import GlassmorphicCard from '../components/GlassmorphicCard';
import { Shield, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordStrength = () => {
    if (!password) return { strength: 0, label: '', color: '' };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#FF0055', '#FF8C00', '#FFD700', '#39FF14'];
    return { strength: (strength / 4) * 100, label: labels[strength - 1] || 'Weak', color: colors[strength - 1] || '#FF0055' };
  };

  const { strength, label, color } = passwordStrength();
  const emailValid = email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordsMatch || strength < 50) return;
    setError('');
    setLoading(true);
    try {
      await signUp(email, password, username);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
            <p className="text-xl text-foreground/70">Secure Your Network Infrastructure</p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[500px] flex items-center justify-center p-8 bg-background overflow-y-auto">
        <GlassmorphicCard className="w-full max-w-md p-8">
          <h2 className="font-orbitron text-3xl mb-2" style={{ color: '#00D9FF' }}>Create Account</h2>
          <p className="text-muted-foreground mb-8">Register for system access</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm mb-2 text-foreground/80">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-input border border-primary/20 rounded-lg text-foreground focus:outline-none focus:border-primary transition-all"
                style={{ boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)' }}
                placeholder="neural_analyst"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-foreground/80">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-input border border-primary/20 rounded-lg text-foreground focus:outline-none focus:border-primary transition-all pr-10"
                  style={{ boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)' }}
                  placeholder="user@neural-ids.com"
                  required
                />
                {email && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailValid
                      ? <CheckCircle2 className="w-5 h-5" style={{ color: '#39FF14' }} />
                      : <XCircle className="w-5 h-5" style={{ color: '#FF0055' }} />}
                  </div>
                )}
              </div>
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
              {password && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground/70">Password Strength</span>
                    <span className="font-mono" style={{ color }}>{label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full transition-all duration-300" style={{ width: `${strength}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm mb-2 text-foreground/80">Confirm Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-input border border-primary/20 rounded-lg text-foreground focus:outline-none focus:border-primary transition-all pr-10"
                  style={{ boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)' }}
                  placeholder="••••••••"
                  required
                />
                {confirmPassword && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {passwordsMatch
                      ? <CheckCircle2 className="w-5 h-5" style={{ color: '#39FF14' }} />
                      : <XCircle className="w-5 h-5" style={{ color: '#FF0055' }} />}
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-sm font-mono" style={{ color: '#FF0055' }}>{error}</p>}

            <button
              type="submit"
              disabled={!emailValid || !passwordsMatch || strength < 50 || loading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-orbitron transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 0 20px rgba(0, 217, 255, 0.3), 0 0 40px rgba(0, 217, 255, 0.1)' }}
            >
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => navigate('/')} className="text-primary hover:underline">
              Already have an account? Login
            </button>
          </div>
        </GlassmorphicCard>
      </div>
    </div>
  );
}
