import { LegalPage, H2, H3, P, UL } from '@/components/LegalPage';

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="May 15, 2026">
      <P>
        DisciplineX ("we", "our", "us") helps you build a daily discipline practice with verified task
        proof, streaks, AI coaching, and team accountability. This policy explains what data we collect,
        why we collect it, and the choices you have. Plain language, no dark patterns.
      </P>

      <H2>1. What we collect</H2>

      <H3>Account data</H3>
      <UL>
        <li>Email address and display name (you provide these at sign-up).</li>
        <li>Password — handled by our auth provider Supabase. We never see or store it in plain text.</li>
        <li>Optional: avatar URL, bio, theme preference.</li>
      </UL>

      <H3>Usage data</H3>
      <UL>
        <li>Tasks you create or complete, submission notes, and proof files (images / PDFs / GitHub commit links) you upload.</li>
        <li>Streak counts, XP, level, badges, focus-session logs, reflections, chat messages, reactions.</li>
        <li>Your organization (squad / team) membership and role.</li>
      </UL>

      <H3>Technical data</H3>
      <UL>
        <li>IP address, user agent, and request timestamps — used for security, rate limiting, and debugging. Stored in server logs and rotated automatically.</li>
        <li>A request ID per API call (visible in our error toasts) so support can trace issues.</li>
      </UL>

      <H2>2. How we use your data</H2>
      <UL>
        <li><strong>Run the product.</strong> Show your tasks, score your streak, deliver chat messages, render the leaderboard.</li>
        <li><strong>Verify proof.</strong> Submitted images and links are reviewed by your organization's admin to approve or reject the work.</li>
        <li><strong>AI coaching.</strong> If you use the AI Coach feature, the prompts and a summary of your recent activity are sent to our AI provider (Groq) to generate a response. We do not include your email or name in the prompt content.</li>
        <li><strong>Security.</strong> Detect abuse, block brute-force login attempts, audit privileged actions.</li>
        <li><strong>Service emails.</strong> Account confirmation, password resets, critical security notices. We do not send marketing email.</li>
      </UL>

      <H2>3. Where your data lives</H2>
      <UL>
        <li><strong>Supabase</strong> — authentication and primary database (PostgreSQL).</li>
        <li><strong>Supabase Storage</strong> — proof files (images, PDFs) you upload.</li>
        <li><strong>Google Cloud Run (asia-south1, Mumbai)</strong> — our backend API.</li>
        <li><strong>Vercel</strong> — hosts the web frontend.</li>
        <li><strong>Groq</strong> — only when you actively use AI features. The prompt and response transit through Groq.</li>
      </UL>
      <P>
        We do not sell your data. We do not share it with advertisers. The vendors above are bound by
        their own privacy and security commitments and only process data on our behalf to operate
        the service.
      </P>

      <H2>4. Cookies & local storage</H2>
      <P>
        We keep browser-stored data to a minimum and split it into two categories. The first time
        you visit, you'll see a banner where you can accept the optional category, reject it, or
        customize. Rejecting still lets you use every feature — you'll just be asked to pick your
        sign-in method each time.
      </P>

      <H3>Essential (always on)</H3>
      <P>
        These are strictly necessary for the app to function. They are set without consent because
        the service cannot work without them.
      </P>
      <UL>
        <li><strong>Supabase auth tokens</strong> — keep you signed in across page reloads. Cleared on sign-out.</li>
        <li><strong>Theme</strong> — the colour theme you chose for the dashboard.</li>
        <li><strong>Cookie-consent record</strong> — remembers your choice so we don't show the banner on every visit.</li>
      </UL>

      <H3>Functional (opt-in, off by default)</H3>
      <P>
        Stored only after you accept. Lets us streamline re-login so you don't pick your account
        every time. You can switch this off any time in <strong>Settings → Privacy & cookies</strong>,
        and the data below is deleted from your browser immediately.
      </P>
      <UL>
        <li><strong>Last-used sign-in</strong> — the email address and method (Google, password, or one-time code) you signed in with last time. We use this only to pre-fill the login screen and to pass <code>login_hint</code> to Google so it skips the account picker.</li>
      </UL>

      <P>
        We do <strong>not</strong> use analytics, advertising, or third-party tracking cookies of
        any kind. There are no cross-site cookies. No data leaves your browser unless you take an
        action that requires it (sign in, save a task, etc.).
      </P>

      <H2>5. Your rights</H2>
      <P>You can, at any time:</P>
      <UL>
        <li><strong>Access</strong> your data via the in-app data export (Settings → Export).</li>
        <li><strong>Correct</strong> your name, avatar, bio, and email from your profile.</li>
        <li><strong>Delete</strong> your account by emailing <a className="text-neon-cyan hover:underline" href="mailto:hello@disciplinex.app">hello@disciplinex.app</a>. We will erase your account, submissions, proof files, and chat content within 30 days. Anonymized aggregate stats may be retained.</li>
        <li><strong>Object</strong> to specific processing (e.g. AI coaching) by simply not using that feature.</li>
      </UL>
      <P>
        If you are in the EU/UK, India (DPDP Act), or California, you have additional rights under your
        local law (GDPR, DPDP, CCPA). We will honor any valid request from any user globally —
        contact us at the email above.
      </P>

      <H2>6. Data retention</H2>
      <UL>
        <li>Account, tasks, submissions, and chat — kept while your account is active.</li>
        <li>Server logs — 30 days, then deleted.</li>
        <li>AI prompts to Groq — Groq retains per its policy; we don't store them on our side.</li>
        <li>After account deletion — purged within 30 days, except anonymous aggregate metrics.</li>
      </UL>

      <H2>7. Children</H2>
      <P>
        DisciplineX is not directed to children under 13 (or under 16 in the EU). If you believe a child
        has provided us data, contact us and we will delete it.
      </P>

      <H2>8. Security</H2>
      <UL>
        <li>All traffic uses HTTPS.</li>
        <li>Passwords are hashed and managed by Supabase, never seen by our backend.</li>
        <li>API requests are signed with short-lived JWTs and validated server-side.</li>
        <li>We follow the principle of least privilege for staff access; service-role keys are restricted.</li>
      </UL>

      <H2>9. Changes</H2>
      <P>
        We will post any updates to this page with a new "Last updated" date. Material changes will be
        announced in-app or by email.
      </P>

      <H2>10. Contact</H2>
      <P>
        Questions, requests, or complaints —{' '}
        <a className="text-neon-cyan hover:underline" href="mailto:hello@disciplinex.app">
          hello@disciplinex.app
        </a>
        .
      </P>
    </LegalPage>
  );
}
