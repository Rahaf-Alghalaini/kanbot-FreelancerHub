import type { ButtonHTMLAttributes } from 'react';
import { Loader } from './Loader';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
};

export function Button({ variant = 'primary', loading, disabled, children, className = '', ...rest }: Props) {
  return (
    <button className={`btn btn-${variant} ${className}`} disabled={disabled || loading} {...rest}>
      {loading && <Loader size={14} />}
      {children}
    </button>
  );
}
