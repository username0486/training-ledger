import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'neutral' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
}

export function Button({ 
  children, 
  variant = 'neutral', 
  size = 'md', 
  disabled = false,
  onClick,
  type = 'button',
  className = ''
}: ButtonProps) {
  const baseClasses = "rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  
  const variantClasses = {
    primary: "bg-gradient-to-br from-accent to-[#4a7de3] text-white hover:from-accent-hover hover:to-[#5a8df4] shadow-lg shadow-accent/20",
    neutral: "bg-gradient-to-br from-surface to-surface-secondary text-text-primary hover:from-surface-secondary hover:to-surface border border-border-subtle",
    danger: "bg-gradient-to-br from-danger to-[#d74d4d] text-white hover:from-danger-hover hover:to-[#e76d6d] shadow-lg shadow-danger/20",
  };
  
  const sizeClasses = {
    sm: "px-3 py-1.5",
    md: "px-5 py-2.5",
    lg: "px-6 py-3.5",
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  );
}
