import { ReactNode } from 'react';

interface PillProps {
  children: ReactNode;
  variant?: 'default' | 'accent' | 'danger';
  className?: string;
}

export function Pill({ children, variant = 'default', className = '' }: PillProps) {
  const variantClasses = {
    default: "bg-surface text-text-muted",
    accent: "bg-accent-muted text-accent",
    danger: "bg-danger-muted text-danger",
  };
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
