import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy policy · Bunk-o-Meter" };

// Where people write about their data (SPEC R51).
const CONTACT_EMAIL = "shubhammeghanith2@gmail.com";

/** Public privacy policy (SPEC R51); Google needs this URL to publish the OAuth consent screen. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-8 leading-relaxed">
      <header className="space-y-1">
        <Link href="/" className="text-sm font-semibold text-accent">
          ← Bunk-o-Meter
        </Link>
        <h1 className="text-3xl font-bold">Privacy policy</h1>
        <p className="text-sm text-muted">Last updated 22 October 2026</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">What we store</h2>
        <p>When you sign in with Google, we store only your <strong>name, email address and Google ID</strong>. We use them to keep your semesters private and to show the same data on every device you sign in on.</p>
        <p>
          We also store <strong>your attendance data</strong>: the semesters, courses, attendance rules, timetable, holidays and exams you enter, the
          marks you give each class (present, absent, medical, cancelled), extra classes and lab makeups.
        </p>
        <p>We don&apos;t store your profile photo, contacts or Google password, and we never see your Google password.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">What we don&apos;t do</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>We don&apos;t share or sell your data to anyone.</li>
          <li>There are no ads.</li>
          <li>There is no tracking or analytics: no third-party scripts, pixels or cookies.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Cookies and your browser</h2>
        <p>
          We use one sign-in cookie to keep you signed in. Your theme choice, the demo&apos;s data and an offline copy of the app stay in your
          own browser and are never sent to us.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Shared timetable links</h2>
        <p>
          If you publish a share link, anyone with the link can see that semester&apos;s courses, rules, timetable and holidays. It never includes
          your marks, name or email. You can revoke the link at any time in Settings.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Where your data lives</h2>
        <p>
          The app is hosted on Vercel and your data is kept in a Neon Postgres database. They process it only to run Bunk-o-Meter. Sign-in
          goes through Google.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Deleting your account and all data</h2>
        <p>
          Open <strong>Settings → Account → Delete account</strong>, type <strong>DELETE</strong> and confirm. This immediately and permanently
          deletes your account, every semester, course and mark, and your share links. You can also remove the app&apos;s access in your Google
          account&apos;s security settings.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Contact</h2>
        <p data-testid="privacy-contact">
          Questions about your data: <strong>{CONTACT_EMAIL}</strong>
        </p>
      </section>
    </main>
  );
}
