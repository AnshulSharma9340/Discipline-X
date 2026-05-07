import { LegalPage, H2, H3, P, UL } from '@/components/LegalPage';

export default function Docs() {
  return (
    <LegalPage title="How to use DisciplineX" updated="May 7, 2026">
      <P>
        Quick start: create an account, join or create an organization, ship your first task with
        proof, and your streak begins. Here's the longer version.
      </P>

      <H2>The basics</H2>

      <H3>Sign up & onboarding</H3>
      <UL>
        <li>Register with your email and a password (8+ characters).</li>
        <li>Confirm your email if asked.</li>
        <li>On first login you'll choose: <em>create an organization</em> (you become the owner) or <em>join with an invite code</em> from someone who already runs one.</li>
      </UL>

      <H3>Daily tasks</H3>
      <UL>
        <li>Your org admin publishes today's tasks. Some are required for your streak; others are optional.</li>
        <li>Open the <strong>Tasks</strong> tab, work on each one, and submit proof when done.</li>
        <li>Proof can be: image, PDF, GitHub commit URL, focus-session log, or written notes.</li>
        <li>Your admin reviews and approves or rejects. Rejected tasks need resubmission.</li>
      </UL>

      <H3>Streaks & midnight cutoff</H3>
      <UL>
        <li>Each day you complete all <em>required</em> tasks before the daily cutoff (default 23:59 IST), your streak ticks +1.</li>
        <li>Miss it and your account <strong>locks at midnight</strong>. You'll see a locked screen on next visit.</li>
        <li>Submit an <strong>emergency request</strong> to regain access. Admins review the queue and unlock you (or not).</li>
        <li>Use freeze tokens (earned via badges/shop) to skip a day without breaking the streak.</li>
      </UL>

      <H2>Features</H2>

      <H3>Focus mode</H3>
      <P>
        A distraction-free Pomodoro / custom-block timer. Survives tab close. Logs your focus minutes
        and can be submitted as proof in one click.
      </P>

      <H3>Habits</H3>
      <P>
        Recurring habits separate from one-off tasks. Track water, meditation, gym — anything daily.
      </P>

      <H3>Reflections</H3>
      <P>
        End-of-day journal entries. Helps you spot patterns the AI Coach picks up on.
      </P>

      <H3>AI Coach</H3>
      <P>
        Conversational coach with context from your last 30 days — burnout score, procrastination
        index, personalized nudges. Powered by Groq.
      </P>

      <H3>Squads & Buddy</H3>
      <UL>
        <li><strong>Squads</strong> — sub-teams within your org. Group accountability.</li>
        <li><strong>Buddy</strong> — pair up with one other person for 1:1 accountability and reactions to each other's submissions.</li>
      </UL>

      <H3>Chat & reactions</H3>
      <P>
        Real-time org chat (Socket.IO). React to others' submissions to keep momentum high.
      </P>

      <H3>Leaderboard</H3>
      <P>
        Daily, weekly, monthly, and all-time. Ranked by streak and XP.
      </P>

      <H3>Achievements & shop</H3>
      <UL>
        <li>Unlock badges by hitting milestones.</li>
        <li>Spend XP in the shop on themes, frames, freeze tokens, and XP boosts.</li>
      </UL>

      <H2>For admins</H2>
      <UL>
        <li><strong>Manage Tasks</strong> — publish today's tasks, mark them required, set point values.</li>
        <li><strong>AI Task Gen</strong> — auto-generate task suggestions based on the org's recent activity.</li>
        <li><strong>Submission Queue</strong> — review proofs, approve fast, reject with feedback.</li>
        <li><strong>Emergency Queue</strong> — review unlock requests from locked users.</li>
        <li><strong>Users</strong> — see everyone in the org with role, streak, XP, status.</li>
        <li><strong>Squads</strong> — create teams users can join.</li>
        <li><strong>Org Settings</strong> — manage invite code, org name, and ownership transfer.</li>
      </UL>

      <H2>Mobile app</H2>
      <P>
        DisciplineX has an Android app built with Capacitor. Same features as the web. Install the
        APK from your admin or the website link.
      </P>

      <H2>Account & data</H2>
      <UL>
        <li><strong>Settings → Export</strong> — download your tasks, submissions, reflections as JSON.</li>
        <li><strong>Settings → Delete account</strong> — or email us to fully erase your data.</li>
        <li><strong>Privacy & Terms</strong> — see the linked pages in the footer.</li>
      </UL>

      <H2>Troubleshooting</H2>
      <UL>
        <li><strong>"Couldn't load profile"</strong> — try sign out and back in. If it persists, your auth token expired.</li>
        <li><strong>Locked out</strong> — submit an emergency request from the lock screen.</li>
        <li><strong>Mobile app feels stale</strong> — uninstall and reinstall the latest APK from your admin.</li>
        <li><strong>Anything else</strong> — email us with the request ID shown in the error toast (we use it to find your case in logs).</li>
      </UL>

      <H2>Contact</H2>
      <P>
        Stuck? Want a feature?{' '}
        <a className="text-neon-cyan hover:underline" href="mailto:hello@disciplinex.app">
          hello@disciplinex.app
        </a>
      </P>
    </LegalPage>
  );
}
