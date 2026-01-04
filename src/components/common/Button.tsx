import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'link';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary:
      'bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-[var(--radius-default)] shadow-lg hover:shadow-xl hover:-translate-y-0.5',
    secondary:
      'bg-bg-cell hover:bg-bg-cell-hover text-text-primary px-6 py-3 rounded-[var(--radius-default)] border border-primary/30',
    link: 'bg-transparent text-text-muted hover:text-text-primary px-4 py-2 underline-offset-4 hover:underline',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
