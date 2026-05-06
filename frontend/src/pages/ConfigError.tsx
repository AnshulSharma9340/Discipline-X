import { AlertTriangle, ExternalLink, Copy } from 'lucide-react';
import { missingEnv } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function ConfigError() {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const expected = [
    { name: 'VITE_SUPABASE_URL', present: Boolean(import.meta.env.VITE_SUPABASE_URL), example: 'https://abcdef.supabase.co' },
    { name: 'VITE_SUPABASE_ANON_KEY', present: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY), example: 'eyJhbGciOiJIUzI1...' },
    { name: 'VITE_API_BASE_URL', present: Boolean(apiUrl), example: 'https://your-backend.onrender.com/api/v1' },
  ];

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-aurora opacity-20 pointer-events-none" />
      <div className="relative max-w-2xl w-full glass p-8 shadow-glow">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 grid place-items-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Configuration needed</h1>
            <p className="text-white/70 mt-2">
              The frontend is deployed but missing environment variables. The app needs these to
              connect to Supabase + your backend.
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          {expected.map((e) => (
            <div
              key={e.name}
              className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                e.present
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-red-500/5 border-red-500/30'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm">{e.name}</div>
                <div className="text-xs text-white/50 mt-0.5">
                  {e.present ? (
                    <span className="text-emerald-300">✓ set</span>
                  ) : (
                    <>
                      <span className="text-red-300">✗ missing</span>
                      <span className="text-white/40"> · expected like </span>
                      <code className="text-white/60">{e.example}</code>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {missingEnv.length > 0 && (
          <div className="p-4 rounded-xl bg-neon-violet/10 border border-neon-violet/20 text-sm space-y-3">
            <div className="font-semibold text-neon-violet">How to fix on Vercel</div>
            <ol className="space-y-2 text-white/80 list-decimal list-inside">
              <li>Open your project at <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="text-neon-cyan inline-flex items-center gap-1 hover:underline">vercel.com/dashboard <ExternalLink className="w-3 h-3" /></a></li>
              <li>Click your <strong>Discipline-X</strong> project → <strong>Settings</strong> → <strong>Environment Variables</strong></li>
              <li>
                Add each missing variable with its real value:
                <div className="mt-2 space-y-1">
                  {missingEnv.map((k) => (
                    <button
                      key={k}
                      onClick={() => copy(k)}
                      className="flex items-center gap-2 text-xs font-mono px-2 py-1 rounded bg-black/30 hover:bg-black/50 transition w-full text-left"
                    >
                      <Copy className="w-3 h-3" /> {k}
                    </button>
                  ))}
                </div>
              </li>
              <li>Apply to <strong>Production, Preview, Development</strong> (all three checkboxes)</li>
              <li>Click <strong>Save</strong></li>
              <li>
                Go to <strong>Deployments</strong> tab → top deployment → <strong>...</strong> menu →{' '}
                <strong>Redeploy</strong> (uncheck "Use existing Build Cache")
              </li>
            </ol>
          </div>
        )}

        <div className="mt-6 text-xs text-white/40 text-center">
          Once env vars are saved and the app is redeployed, this page disappears automatically.
        </div>
      </div>
    </div>
  );
}
