import { ReactNode } from 'react';

interface GlassmorphicCardProps {
  children: ReactNode;
  className?: string;
}

export default function GlassmorphicCard({ children, className = '' }: GlassmorphicCardProps) {
  return (
    <div
      className={`bg-card/60 backdrop-blur-xl border border-primary/20 rounded-xl ${className}`}
      style={{
        boxShadow: '0 0 20px rgba(0, 217, 255, 0.1)',
      }}
    >
      {children}
    </div>
  );
}
