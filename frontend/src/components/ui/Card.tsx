import { type HTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glow?: boolean;
}

export function Card({ children, className, glow, ...rest }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('glass p-6', glow && 'shadow-glow', className)}
      {...(rest as object)}
    >
      {children}
    </motion.div>
  );
}
