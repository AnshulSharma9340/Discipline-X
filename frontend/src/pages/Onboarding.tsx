import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Users, ArrowRight, KeyRound, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/cn';

export default function Onboarding() {
  const { user, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isAddMode = params.get('add') === '1';
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');

  // Already in an org → bounce, unless they explicitly came here to add another.
  if (user?.org_id && !isAddMode) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-black text-white grid place-items-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl space-y-6"
      >
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-xl brand-tile grid place-items-center mb-5">
            <span className="text-black font-display font-bold text-lg leading-none">D</span>
          </div>
          <h1 className="font-display font-semibold tracking-[-0.03em] text-3xl sm:text-4xl md:text-5xl leading-[1.05]">
            {isAddMode ? 'Add another' : 'One last step.'}
            <br />
            <span className="italic font-light text-white/70">
              {isAddMode ? 'organization.' : 'Pick your seat.'}
            </span>
          </h1>
          <p className="text-white/55 mt-4 text-sm sm:text-base max-w-md mx-auto">
            {isAddMode
              ? 'Create a new room or join one with an invite code. You can switch between them anytime from the topbar.'
              : 'DisciplineX is built around organizations. Lead one or join one — you can switch later.'}
          </p>
        </div>

        {mode === 'choose' && (
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            <ChoiceCard
              icon={Crown}
              title="Create an organization"
              body="Teachers, mentors, team leaders. Invite members, manage tasks, verify proof, run the discipline engine."
              cta="I'm a leader"
              onClick={() => setMode('create')}
            />
            <ChoiceCard
              icon={Users}
              title="Join an existing one"
              body="Got an invite code from your leader? Enter it to join their workspace and start your streak."
              cta="I have a code"
              onClick={() => setMode('join')}
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
}: {
  icon: typeof Crown;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        'glass p-5 sm:p-6 text-left group relative overflow-hidden',
      )}
    >
      <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/[0.03] grid place-items-center mb-4">
        <Icon className="w-5 h-5 text-white/85" strokeWidth={1.75} />
      </div>
      <h3 className="font-display font-semibold text-lg sm:text-xl tracking-tight">{title}</h3>
      <p className="text-sm text-white/55 mt-2 leading-relaxed">{body}</p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-white group-hover:translate-x-0.5 transition">
        {cta} <ArrowRight className="w-4 h-4" />
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
    <div className="glass p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/[0.03] grid place-items-center">
          <Building2 className="w-5 h-5 text-white/85" strokeWidth={1.75} />
        </div>
        <h2 className="font-display font-semibold text-lg sm:text-xl tracking-tight">
          Create your organization
        </h2>
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
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-2">
          <button type="button" onClick={onCancel} className="btn-ghost">
            Back
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            <Crown className="w-4 h-4" />
            {loading ? 'Creating…' : 'Create & become owner'}
          </button>
        </div>
      </form>
    </div>
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
    <div className="glass p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/[0.03] grid place-items-center">
          <KeyRound className="w-5 h-5 text-white/85" strokeWidth={1.75} />
        </div>
        <h2 className="font-display font-semibold text-lg sm:text-xl tracking-tight">
          Join with invite code
        </h2>
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
            className="input text-center text-xl sm:text-2xl font-mono tracking-widest"
            maxLength={20}
          />
          <p className="text-xs text-white/40 mt-1.5">
            Ask your leader for the code from their org settings page.
          </p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-2">
          <button type="button" onClick={onCancel} className="btn-ghost">
            Back
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            <Users className="w-4 h-4" />
            {loading ? 'Joining…' : 'Join'}
          </button>
        </div>
      </form>
    </div>
  );
}
