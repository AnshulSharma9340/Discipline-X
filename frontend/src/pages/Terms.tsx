import { LegalPage, H2, P, UL } from '@/components/LegalPage';

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="May 7, 2026">
      <P>
        These terms govern your use of DisciplineX. By creating an account or using the service you
        agree to them. If you don't, please don't use the app.
      </P>

      <H2>1. The service</H2>
      <P>
        DisciplineX is a productivity and discipline platform: daily tasks with verified proof,
        streaks, AI coaching, leaderboards, focus timers, and team accountability. Features may
        change as we improve the product.
      </P>

      <H2>2. Your account</H2>
      <UL>
        <li>You must be at least 13 years old (16 in the EU).</li>
        <li>You're responsible for keeping your password safe and for everything that happens under your account.</li>
        <li>One person per account. Don't share credentials.</li>
        <li>If we detect abuse, fraud, or security risk we may suspend the account.</li>
      </UL>

      <H2>3. What you may not do</H2>
      <UL>
        <li>Upload illegal, hateful, harassing, sexually explicit, or copyrighted material you don't own as proof or in chat.</li>
        <li>Submit fake proof to game the streak system, leaderboard, or shop economy.</li>
        <li>Reverse-engineer, scrape, or hammer the API beyond reasonable rate limits.</li>
        <li>Impersonate another user, an admin, or DisciplineX staff.</li>
        <li>Use the AI coach to generate content that violates these rules or applicable law.</li>
      </UL>

      <H2>4. Your content</H2>
      <P>
        You keep ownership of everything you upload (task proofs, reflections, chat messages). You
        grant us a limited license to store, display, and process it solely to operate the service —
        for example, showing your proof to your org admin, displaying chat messages to other org
        members, and generating analytics from your data.
      </P>

      <H2>5. Discipline engine — important</H2>
      <P>
        The point of DisciplineX is real consequences. If you miss your required tasks before the
        daily cutoff, your account locks at midnight. You can submit an emergency request to regain
        access, which your admin reviews. <strong>By using DisciplineX you accept these
        consequences as a feature, not a bug.</strong>
      </P>

      <H2>6. AI features</H2>
      <P>
        AI-generated coaching, task suggestions, and insights are produced by a third-party model
        (Groq). They can be wrong, biased, or out-of-date. Treat AI output as a suggestion, not
        professional advice. Do not rely on it for medical, legal, financial, or safety decisions.
      </P>

      <H2>7. Organizations & admins</H2>
      <P>
        If you join a squad / organization, the org owner and moderators can see your submissions,
        streak, and basic profile. They can approve or reject your proof, kick you from the org, or
        promote/demote you. Choose your org carefully.
      </P>

      <H2>8. Termination</H2>
      <UL>
        <li>You may delete your account at any time by emailing us — see the Privacy Policy.</li>
        <li>We may suspend or terminate accounts that violate these terms or pose a security risk.</li>
      </UL>

      <H2>9. No warranties</H2>
      <P>
        DisciplineX is provided "as is". We don't promise the service will be uninterrupted or
        error-free, and we don't guarantee a particular outcome (e.g., that you'll achieve your goals).
        We do our best, but the work is yours.
      </P>

      <H2>10. Liability</H2>
      <P>
        To the maximum extent allowed by law, DisciplineX is not liable for indirect, incidental, or
        consequential damages arising from your use of the service. Our total liability is limited to
        what you paid us in the past 12 months — for free users, this means no monetary liability.
      </P>

      <H2>11. Changes to these terms</H2>
      <P>
        We may update these terms. Material changes will be announced in-app or by email at least 14
        days before they take effect. Continuing to use DisciplineX after that means you accept the
        new terms.
      </P>

      <H2>12. Governing law</H2>
      <P>
        These terms are governed by the laws of India. Disputes go to the courts of New Delhi, unless
        your local consumer-protection law gives you a stronger right.
      </P>

      <H2>13. Contact</H2>
      <P>
        Questions about these terms —{' '}
        <a className="text-neon-cyan hover:underline" href="mailto:hello@disciplinex.app">
          hello@disciplinex.app
        </a>
        .
      </P>
    </LegalPage>
  );
}
