import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Users, ArrowRight, Sparkles, KeyRound, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/cn';

export default function Onboarding() {
  const { user, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');

  // Already in an org → bounce
  if (user?.org_id) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen grid place-items-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-aurora opacity-30 animate-gradient-x [background-size:200%_200%] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-2xl w-full space-y-6"
      >
        <div className="text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-violet to-neon-cyan grid place-items-center mb-4 shadow-glow">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-4xl font-display font-bold neon-text">Welcome to DisciplineX</h1>
          <p className="text-white/70 mt-3">
            One last step — choose how you'll use the platform.
          </p>
        </div>

        {mode === 'choose' && (
          <div className="grid md:grid-cols-2 gap-4">
            <ChoiceCard
              icon={Crown}
              title="Create an organization"
              body="You're a teacher, mentor, or team leader. Invite your students/team. You manage tasks, verify proof, and run the discipline engine."
              cta="I'm a leader"
              onClick={() => setMode('create')}
              accent="violet"
            />
            <ChoiceCard
              icon={Users}
              title="Join an existing one"
              body="Your leader gave you an invite code. Enter it to join their workspace, get assigned tasks, and start your streak."
              cta="I have a code"
              onClick={() => setMode('join')}
              accent="cyan"
            />
          </div>
        )}

        {mode === 'create' && (
          <CreateForm
            onCancel={() => setMode('choose')}
            onSuccess={async () => {
              await fetchProfile();
              navigate('/dashboard');
            }}
          />
        )}

        {mode === 'join' && (
          <JoinForm
            onCancel={() => setMode('choose')}
            onSuccess={async () => {
              await fetchProfile();
              navigate('/dashboard');
            }}
          />
        )}

        <div className="text-center text-xs text-white/40">
          You can always switch later from Settings.
        </div>
      </motion.div>
    </div>
  );
}

function ChoiceCard({
  icon: Icon,
  title,
  body,
  cta,
  onClick,
  accent,
}: {
  icon: typeof Crown;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
  accent: 'violet' | 'cyan';
}) {
  return (
    <motion.button
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'glass p-6 text-left group relative overflow-hidden border-2 border-transparent transition',
        accent === 'violet' ? 'hover:border-neon-violet/40' : 'hover:border-neon-cyan/40',
      )}
    >
      <div
        className={cn(
          'absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl opacity-50',
          accent === 'violet' ? 'bg-neon-violet/30' : 'bg-neon-cyan/30',
        )}
      />
      <div className="relative">
        <div
          className={cn(
            'w-12 h-12 rounded-xl grid place-items-center mb-4',
            accent === 'violet'
              ? 'bg-gradient-to-br from-neon-violet to-neon-indigo'
              : 'bg-gradient-to-br from-neon-cyan to-neon-violet',
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="font-display font-semibold text-xl">{title}</h3>
        <p className="text-sm text-white/60 mt-2 leading-relaxed">{body}</p>
        <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium group-hover:translate-x-1 transition">
          {cta} <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </motion.button>
  );
}

function CreateForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post<{ name: string; invite_code: string }>('/orgs/', {
        name,
        description,
      });
      toast.success(`Created "${r.data.name}". Invite code: ${r.data.invite_code}`);
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-violet to-neon-indigo grid place-items-center">
          <Building2 className="w-5 h-5" />
        </div>
        <h2 className="font-display font-semibold text-xl">Create your organization</h2>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Organization name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Anshul's Coding Bootcamp"
        />
        <div>
          <label className="label">Description (optional)</label>
          <textarea
            className="input min-h-[80px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's the focus? Who's it for?"
          />
        </div>
        <div className="flex justify-between gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Back
          </Button>
          <Button type="submit" loading={loading}>
            <Crown className="w-4 h-4" /> Create & become owner
          </Button>
        </div>
      </form>
    </Card>
  );
}

function JoinForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post<{ name: string }>('/orgs/join', { invite_code: code.toUpperCase() });
      toast.success(`Joined ${r.data.name}`);
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-violet grid place-items-center">
          <KeyRound className="w-5 h-5" />
        </div>
        <h2 className="font-display font-semibold text-xl">Join with invite code</h2>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Invite code</label>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXX-XXX-XXX"
            className="input text-center text-2xl font-mono tracking-widest"
            maxLength={20}
          />
          <p className="text-xs text-white/40 mt-1">
            Ask your leader for the code from their org settings page.
          </p>
        </div>
        <div className="flex justify-between gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Back
          </Button>
          <Button type="submit" loading={loading}>
            <Users className="w-4 h-4" /> Join
          </Button>
        </div>
      </form>
    </Card>
  );
}
