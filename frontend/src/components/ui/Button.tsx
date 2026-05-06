import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'ghost' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger:
    'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 transition-all',
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', loading, className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(variants[variant], className)}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
