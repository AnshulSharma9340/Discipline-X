import { useState, type FormEvent } from 'react';
import {
  Upload,
  Link as LinkIcon,
  FileText,
  Github,
  CheckCircle2,
  XCircle,
  Loader2,
  GitCommit,
  Image as ImageIcon,
  Timer,
  Code2,
  FileType,
  StickyNote,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import type { ProofType, Task, GitHubVerifyResult } from '@/types';

interface Props {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const proofTypes: {
  value: ProofType;
  label: string;
  hint: string;
  icon: typeof ImageIcon;
  accent: string;
}[] = [
  { value: 'image', label: 'Image', hint: 'Photo / screenshot', icon: ImageIcon, accent: 'from-neon-violet to-neon-indigo' },
  { value: 'stopwatch', label: 'Stopwatch', hint: 'Timer screenshot', icon: Timer, accent: 'from-neon-cyan to-neon-violet' },
  { value: 'code_screenshot', label: 'Code', hint: 'IDE / LeetCode', icon: Code2, accent: 'from-neon-lime to-neon-cyan' },
  { value: 'pdf', label: 'PDF', hint: 'Notes, docs', icon: FileType, accent: 'from-neon-pink to-neon-violet' },
  { value: 'github_link', label: 'GitHub', hint: 'Commit / PR URL', icon: Github, accent: 'from-amber-400 to-orange-500' },
  { value: 'notes', label: 'Notes only', hint: 'Self-report', icon: StickyNote, accent: 'from-slate-400 to-slate-600' },
];

export function SubmitProofModal({ task, open, onClose, onSuccess }: Props) {
  const [proofType, setProofType] = useState<ProofType>('image');
  const [file, setFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<GitHubVerifyResult | null>(null);

  async function verifyGithub() {
    if (!proofUrl) {
      toast.error('Paste a GitHub URL first');
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const r = await api.post<GitHubVerifyResult>('/github/verify', { url: proofUrl });
      setVerifyResult(r.data);
      if (r.data.verified) {
        toast.success('Verified against GitHub');
      } else {
        toast.error(r.data.error ?? 'Could not verify');
      }
    } finally {
      setVerifying(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!task) return;
    if (proofType !== 'github_link' && proofType !== 'notes' && !file) {
      toast.error('Attach a file');
      return;
    }
    if (proofType === 'github_link' && !proofUrl) {
      toast.error('Paste your GitHub URL');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('task_id', task.id);
      fd.append('proof_type', proofType);

      let combinedNotes = notes;
      if (verifyResult?.verified) {
        const tag =
          verifyResult.kind === 'commit'
            ? `[GitHub-verified commit ${verifyResult.sha} by ${verifyResult.author_name}: "${verifyResult.message}" — +${verifyResult.additions}/-${verifyResult.deletions} across ${verifyResult.files_changed} files]`
            : `[GitHub-verified PR #${verifyResult.number} (${verifyResult.state}${verifyResult.merged ? ', merged' : ''}): "${verifyResult.title}" — +${verifyResult.additions}/-${verifyResult.deletions} across ${verifyResult.files_changed} files]`;
        combinedNotes = combinedNotes ? `${tag}\n\n${combinedNotes}` : tag;
      }
      fd.append('notes', combinedNotes);
      if (proofUrl) fd.append('proof_url', proofUrl);
      if (file) fd.append('file', file);

      await api.post('/submissions/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Submitted. Admin will review shortly.');
      setFile(null);
      setProofUrl('');
      setNotes('');
      setVerifyResult(null);
      onSuccess();
      onClose();
    } catch {
      // toast already shown by interceptor
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={task?.title} size="lg">
      <form onSubmit={onSubmit} className="space-y-5">
        {task?.proof_instructions && (
          <div className="p-3 rounded-lg bg-neon-violet/10 border border-neon-violet/20 text-sm">
            <div className="font-medium mb-1 text-neon-violet">Proof instructions</div>
            <div className="text-white/70">{task.proof_instructions}</div>
          </div>
        )}

        <div>
          <label className="label">Proof type</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {proofTypes.map((p) => {
              const active = proofType === p.value;
              const Icon = p.icon;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    setProofType(p.value);
                    setVerifyResult(null);
                  }}
                  className={`relative text-left p-3.5 rounded-xl border transition overflow-hidden ${
                    active
                      ? 'border-neon-violet/50 shadow-glow scale-[1.02]'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(34,211,238,0.08))'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                  }}
                >
                  <div
                    className={`absolute -right-3 -top-3 w-14 h-14 rounded-full blur-xl opacity-50 bg-gradient-to-br ${p.accent}`}
                  />
                  <div className="relative">
                    <div
                      className={`w-9 h-9 rounded-lg bg-gradient-to-br ${p.accent} grid place-items-center mb-2 shadow-soft`}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="font-medium text-sm">{p.label}</div>
                    <div className="text-[11px] text-white/50 mt-0.5">{p.hint}</div>
                    {active && (
                      <CheckCircle2 className="absolute top-0 right-0 w-4 h-4 text-neon-cyan" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {proofType !== 'github_link' && proofType !== 'notes' && (
          <div>
            <label className="label">File upload</label>
            <label
              className={`relative flex items-center gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer transition overflow-hidden ${
                file
                  ? 'border-neon-cyan/40 bg-neon-cyan/5'
                  : 'border-white/15 hover:border-neon-violet/40 hover:bg-white/[0.03]'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl grid place-items-center shrink-0 ${
                  file
                    ? 'bg-gradient-to-br from-neon-cyan to-neon-violet'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                {file ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Upload className="w-5 h-5 text-white/50" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {file ? file.name : 'Choose image or PDF'}
                </div>
                <div className="text-xs text-white/50 mt-0.5">
                  {file
                    ? `${(file.size / 1024).toFixed(0)} KB · ${file.type || 'unknown'}`
                    : 'PNG, JPG, WEBP, PDF · max 10 MB'}
                </div>
              </div>
              {file && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setFile(null);
                  }}
                  className="text-xs text-white/50 hover:text-red-300 px-2"
                >
                  Remove
                </button>
              )}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        )}

        {(proofType === 'github_link' || proofType === 'code_screenshot') && (
          <div>
            <label className="label">
              <LinkIcon className="inline w-3.5 h-3.5 mr-1" />
              {proofType === 'github_link' ? 'GitHub commit or PR URL' : 'Link (optional for screenshots)'}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                className="input flex-1"
                placeholder="https://github.com/owner/repo/commit/<sha>  or  /pull/<n>"
                value={proofUrl}
                onChange={(e) => {
                  setProofUrl(e.target.value);
                  setVerifyResult(null);
                }}
              />
              {proofType === 'github_link' && (
                <Button type="button" variant="ghost" onClick={verifyGithub} loading={verifying}>
                  <Github className="w-4 h-4" /> Verify
                </Button>
              )}
            </div>

            {verifyResult && (
              <div
                className={`mt-2 p-3 rounded-lg border text-sm ${
                  verifyResult.verified
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                {verifyResult.verified ? (
                  <div>
                    <div className="flex items-center gap-2 text-emerald-300 font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Verified by GitHub public API
                    </div>
                    <div className="mt-1.5 text-white/80 text-xs space-y-0.5">
                      {verifyResult.kind === 'commit' ? (
                        <>
                          <div className="inline-flex items-center gap-1.5">
                            <GitCommit className="w-3.5 h-3.5" />
                            <span className="font-mono">{verifyResult.sha}</span> ·{' '}
                            <span>{verifyResult.author_name}</span>
                          </div>
                          <div>"{verifyResult.message}"</div>
                          <div className="text-white/50">
                            +{verifyResult.additions} / -{verifyResult.deletions} across{' '}
                            {verifyResult.files_changed} files
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            PR #{verifyResult.number} · {verifyResult.state}
                            {verifyResult.merged ? ' (merged)' : ''}
                          </div>
                          <div>"{verifyResult.title}"</div>
                          <div className="text-white/50">
                            +{verifyResult.additions} / -{verifyResult.deletions} across{' '}
                            {verifyResult.files_changed} files
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-300">
                    <XCircle className="w-4 h-4" /> {verifyResult.error}
                  </div>
                )}
              </div>
            )}

            {proofType === 'github_link' && verifying && (
              <div className="mt-2 text-xs text-white/50 inline-flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Hitting GitHub public API…
              </div>
            )}
          </div>
        )}

        <div>
          <label className="label">
            <FileText className="inline w-3.5 h-3.5 mr-1" />
            Notes
          </label>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder="What did you do? How did it go?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            <Upload className="w-4 h-4" /> Submit proof
          </Button>
        </div>
      </form>
    </Modal>
  );
}
