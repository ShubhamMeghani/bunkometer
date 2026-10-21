import Link from "next/link";

export default function ShareNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-bold">This link is no longer active</h1>
      <p className="text-muted">Ask your classmate for a new link, or set up your semester yourself.</p>
      <Link href="/" className="font-semibold text-accent">
        Go to Bunk-o-Meter
      </Link>
    </main>
  );
}
