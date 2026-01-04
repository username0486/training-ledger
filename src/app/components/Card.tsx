import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', gradient = false, onClick }: CardProps) {
  const baseClasses = "rounded-xl p-5 border border-border-subtle";
  const bgClasses = gradient 
    ? "bg-gradient-to-br from-surface/90 to-surface-secondary/60" 
    : "bg-panel";
  const interactiveClasses = onClick ? "cursor-pointer hover:border-border-medium transition-colors" : "";
  
  return (
    <div 
      className={`${baseClasses} ${bgClasses} ${interactiveClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
