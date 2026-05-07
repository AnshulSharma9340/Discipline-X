import { Link } from 'react-router-dom';
import { ArrowLeft, Github } from 'lucide-react';
import { type ReactNode } from 'react';
import { Logo } from '@/components/Logo';

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="fixed top-0 inset-x-0 z-30 backdrop-blur-md bg-black/40 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-display font-semibold tracking-tight">DisciplineX</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <div className="text-xs uppercase tracking-[0.25em] text-white/40 mb-3">Legal</div>
        <h1 className="font-display font-semibold text-4xl md:text-5xl tracking-[-0.02em]">
          {title}
        </h1>
        {updated && (
          <div className="text-sm text-white/40 mt-3">Last updated: {updated}</div>
        )}

        <div className="mt-12 prose-legal">{children}</div>

        <div className="mt-20 pt-8 border-t border-white/10 flex flex-wrap gap-4 text-xs text-white/40">
          <Link to="/privacy" className="hover:text-white/70 transition">Privacy</Link>
          <Link to="/terms" className="hover:text-white/70 transition">Terms</Link>
          <Link to="/docs" className="hover:text-white/70 transition">Docs</Link>
          <span className="ml-auto">© DisciplineX</span>
        </div>
      </article>

      <footer className="border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-white/30">
          <div>Questions? Email <a className="hover:text-white/60 transition" href="mailto:hello@disciplinex.app">hello@disciplinex.app</a></div>
          <a
            href="https://github.com/AnshulSharma9340/Discipline-X"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-white/60 transition"
          >
            <Github className="w-3.5 h-3.5" /> Source
          </a>
        </div>
      </footer>
    </div>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display font-semibold text-2xl md:text-3xl tracking-tight mt-16 mb-4">
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-display font-medium text-lg md:text-xl tracking-tight mt-10 mb-3 text-white/90">
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-white/70 leading-relaxed mb-4">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="text-white/70 leading-relaxed mb-4 space-y-2 pl-5 list-disc marker:text-white/30">
      {children}
    </ul>
  );
}
