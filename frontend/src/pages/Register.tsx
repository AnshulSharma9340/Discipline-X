import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthHero } from './Login';

export default function Register() {
  const { session, fetchProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw error;
      if (!data.session) {
        toast.success('Check your email to confirm your account.');
        navigate('/login');
        return;
      }
      await fetchProfile();
      toast.success('Account created. Welcome to DisciplineX.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthHero />
      <div className="grid place-items-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass w-full max-w-md p-8"
        >
          <div className="mb-6">
            <div className="text-3xl font-display font-bold neon-text">Create your account</div>
            <p className="text-white/60 mt-1">Start your discipline streak today.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-[42px] w-4 h-4 text-white/40" />
              <Input
                label="Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
                placeholder="Your name"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-[42px] w-4 h-4 text-white/40" />
              <Input
                label="Email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                placeholder="you@example.com"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-[42px] w-4 h-4 text-white/40" />
              <Input
                label="Password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                placeholder="At least 8 characters"
              />
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2">
              Create account <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-6 text-sm text-white/60 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-neon-violet hover:text-neon-cyan transition">
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
