import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Save,
  Shield,
  Mail,
  Download,
  FileJson,
  User as UserIcon,
  ExternalLink,
  Sparkles,
  Cookie,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tutorial, resetTutorial } from '@/components/Tutorial';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { openCookiePreferences, useCookieConsent } from '@/lib/consent';

export default function Settings() {
  const user = useAuth((s) => s.user);
  const fetchProfile = useAuth((s) => s.fetchProfile);
  const { consent } = useCookieConsent();
  const [name, setName] = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  function startTour() {
    resetTutorial();
    setTourOpen(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/users/me', { name, avatar_url: avatarUrl || null });
      await api.patch('/profile/me', { bio });
      await fetchProfile();
      toast.success('Profile updated');
    } finally {
      setSaving(false);
    }
  }

  async function downloadCSV() {
    const res = await api.get('/export/me/csv', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disciplinex-${user?.email}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadJSON() {
    const res = await api.get('/export/me/json');
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disciplinex-${user?.email}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Tutorial open={tourOpen} onClose={() => setTourOpen(false)} />

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <SettingsIcon className="w-7 h-7" />
          Settings
        </h1>
        <p className="text-white/60 mt-1">Manage your profile and account.</p>
      </motion.div>

      <Card className="bg-gradient-to-br from-neon-violet/10 to-neon-cyan/5 border-neon-violet/20">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-neon-violet/20 border border-neon-violet/30 grid place-items-center shrink-0">
            <Sparkles className="w-5 h-5 text-neon-violet" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-semibold">New here? Take the tour.</h2>
            <p className="text-sm text-white/60 mt-1">
              A 60-second walkthrough of how DisciplineX works — tasks, streaks, focus, and your AI coach.
            </p>
          </div>
          <Button onClick={startTour}>
            <Sparkles className="w-4 h-4" /> Show me around
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="font-display font-semibold text-lg mb-4">Profile</h2>
        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-violet to-neon-cyan grid place-items-center text-2xl font-semibold">
              {(name || user?.email || '?')[0]?.toUpperCase()}
            </div>
            <div>
              <div className="text-sm text-white/50 inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> {user?.email}
              </div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <Badge tone={user?.role === 'admin' ? 'violet' : 'neutral'}>{user?.role}</Badge>
                <Badge
                  tone={
                    user?.access_status === 'active'
                      ? 'green'
                      : user?.access_status === 'locked'
                      ? 'red'
                      : 'amber'
                  }
                >
                  {user?.access_status?.replace('_', ' ')}
                </Badge>
                <Badge tone="cyan">Lv {user?.level ?? 1}</Badge>
              </div>
            </div>
          </div>

          <Input label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Avatar URL"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
          <div>
            <label className="label">Bio (shows on your public profile)</label>
            <textarea
              className="input min-h-[80px] resize-y"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              placeholder="One-liner about you, your goals, what you're shipping..."
            />
            <div className="text-xs text-white/40 mt-1">{bio.length} / 280</div>
          </div>

          <div className="flex justify-between pt-2">
            {user && (
              <Link to={`/u/${user.id}`} className="btn-ghost">
                <UserIcon className="w-4 h-4" /> View public profile
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
            <Button type="submit" loading={saving}>
              <Save className="w-4 h-4" /> Save changes
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
          <Download className="w-4 h-4" /> Export your data
        </h2>
        <p className="text-sm text-white/60 mb-4">
          Download all your submissions and analytics. Your data, always portable.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Button variant="ghost" onClick={downloadCSV}>
            <Download className="w-4 h-4" /> Download CSV
          </Button>
          <Button variant="ghost" onClick={downloadJSON}>
            <FileJson className="w-4 h-4" /> Download JSON
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
          <Cookie className="w-4 h-4" /> Privacy & cookies
        </h2>
        <div className="space-y-3 text-sm text-white/70">
          <p>
            We store a small amount of data in your browser so the app works and so you don't have
            to pick your account every time you sign in. Update your choice anytime.
          </p>
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-white/[0.08] bg-white/[0.02]">
            <div className="min-w-0">
              <div className="text-sm font-medium text-white">Functional cookies</div>
              <div className="text-xs text-white/55 mt-0.5">
                {consent
                  ? consent.functional
                    ? 'On — your last sign-in is remembered to streamline re-login.'
                    : 'Off — you will pick your sign-in method every time.'
                  : 'No choice recorded yet — you will see the banner on first visit.'}
              </div>
            </div>
            <Badge tone={consent?.functional ? 'green' : 'neutral'}>
              {consent?.functional ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <div>
            <Button variant="ghost" onClick={openCookiePreferences}>
              <Cookie className="w-4 h-4" /> Change cookie preferences
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4" /> Security
        </h2>
        <div className="space-y-3 text-sm text-white/70">
          <p>
            Your authentication is handled by Supabase. Sessions auto-refresh every hour and are
            revoked instantly when you sign out.
          </p>
          <p>
            To change your password or enable MFA, use Supabase Auth tools. We never see or store
            your password.
          </p>
        </div>
      </Card>
    </div>
  );
}
