import { motion } from 'framer-motion';
import { Construction } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto mt-12"
    >
      <Card className="text-center py-12">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-violet/30 to-neon-cyan/20 border border-white/10 grid place-items-center mb-4">
          <Construction className="w-6 h-6 text-neon-cyan" />
        </div>
        <h1 className="text-2xl font-display font-bold">{title}</h1>
        <p className="text-white/60 mt-2 max-w-md mx-auto">
          This screen ships in <span className="text-neon-violet font-medium">{phase}</span>. The
          backend models and routes are scaffolded — the UI lands in the next build pass.
        </p>
      </Card>
    </motion.div>
  );
}
