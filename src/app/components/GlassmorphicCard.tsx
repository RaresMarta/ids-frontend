import { ReactNode, CSSProperties } from 'react';

interface GlassmorphicCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function GlassmorphicCard({ children, className = '', style }: GlassmorphicCardProps) {
  return (
    <div
      className={`bg-card border border-border rounded-md ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
