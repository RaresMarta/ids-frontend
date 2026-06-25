import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Shield, ChevronRight } from 'lucide-react';
import DetectionFeed from '../components/DetectionFeed';
import UserMenu from '../components/UserMenu';
import { useAuth } from '../../hooks/useAuth';

// ─────────────────────────────────────────────────────────────────────────────
// Landing page — hero only. Left: framing copy. Right: a looping replay of the
// live monitor's detection feed (see DetectionFeed). Everything is theme-token
// aware so it tracks light/dark.
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col">
      {/* Nav */}
      <header>
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-display text-sm tracking-wide">Neural IDS</span>
          </div>
          <div className="flex items-center gap-3">
            {authLoading ? (
              <div className="w-10 h-10" aria-hidden />
            ) : user ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center px-5 py-2.5 bg-foreground text-background text-sm rounded-md hover:opacity-90 transition-opacity"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center py-16 lg:py-20">
          {/* Left — copy */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col"
          >
            <h1 className="font-display text-4xl md:text-5xl lg:text-[3.25rem] leading-[1.08] tracking-tight mb-6">
              Classify network threats with machine learning
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-9 max-w-md">
              Analyzes out-of-band network traffic, classifies every flow into
              attack families, and reports with calibrated confidence — an MLP and a Random Forest.
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(user ? '/dashboard' : '/login')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-sm rounded-md hover:opacity-90 transition-opacity"
              >
                {user ? 'Go to dashboard' : 'Get started'}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              {!user && (
                <button
                  onClick={() => navigate('/register')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Create account
                </button>
              )}
            </div>
          </motion.div>

          {/* Right — detection feed */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full"
          >
            <DetectionFeed />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
