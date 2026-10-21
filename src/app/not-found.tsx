import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="text-muted">This page doesn&apos;t exist, or it isn&apos;t yours.</p>
      <Link href="/" className="font-semibold text-accent">
        Go home
      </Link>
    </main>
  );
}
