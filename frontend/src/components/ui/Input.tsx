import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, className, id, ...rest }, ref) => (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <input ref={ref} id={id} className={cn('input', className)} {...rest} />
      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
    </div>
  ),
);
Input.displayName = 'Input';
