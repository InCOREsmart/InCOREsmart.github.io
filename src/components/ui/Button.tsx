import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = 'primary',
  icon,
  children,
  className = '',
  disabled = false,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-gold hover:bg-gold/90 text-white focus:ring-gold',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-text-primary focus:ring-gray-400',
    danger: 'bg-error hover:bg-error/90 text-white focus:ring-error',
    success: 'bg-success hover:bg-success/90 text-white focus:ring-success',
  };

  return (
    <button
      type="button"
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
}